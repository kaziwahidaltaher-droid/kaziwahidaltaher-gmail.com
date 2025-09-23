/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AURELION - Cosmos Visualizer
 */

import {LitElement, html, css, PropertyValueMap} from 'lit';
import {customElement, property, state, query} from 'lit/decorators.js';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {GalaxyData, PlanetData} from './index.tsx';
import {vs as nebulaVs, fs as nebulaFs} from './nebula-shader.tsx';
import {vs as starfieldVs, fs as starfieldFs} from './starfield-shaders.tsx';
import {vs as planetVs, fs as planetFs} from './planet-shader.tsx';
import {vs as atmosphereVs, fs as atmosphereFs} from './atmosphere-shader.tsx';

export interface Waypoint {
  name: string;
  description: string;
  coords: [number, number, number];
}

type ViewMode = 'intergalactic' | 'galaxy';

@customElement('cosmos-visualizer')
export class CosmosVisualizer extends LitElement {
  // --- PROPERTIES ---
  @property({type: Array}) galaxies: GalaxyData[] = [];
  @property({type: String}) activeGalaxyId: string | null = null;
  @property({type: Array}) activePlanets: PlanetData[] = [];
  @property({type: Object}) activePlanetCoords = new Map<string, [number, number, number]>();
  @property({type: String}) selectedPlanetId: string | null = null;
  @property({type: Array}) navigationRoute: Waypoint[] | null = null;
  @property({type: Boolean}) isUnseenRevealed = false;

  // --- STATE ---
  @state() private viewMode: ViewMode = 'intergalactic';
  @state() private tooltip = {visible: false, content: '', x: 0, y: 0};
  @state() private hoveredObjectId: string | null = null;
  @state() private isTransitioning = false;

  // --- QUERIES ---
  @query('#canvas') private canvas!: HTMLCanvasElement;

  // --- THREE.js CORE ---
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();
  private animationFrameId = 0;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  // --- SCENE OBJECTS ---
  private starfield!: THREE.Points;
  private backgroundNebulae: THREE.Mesh[] = [];

  // Intergalactic View
  private galaxyMarkers = new Map<string, THREE.Group>();
  private darkMatterFilaments: THREE.LineSegments | null = null;

  // Galaxy View
  private galaxyVisuals: THREE.Points | null = null;
  private planetInstances: THREE.InstancedMesh | null = null;
  private planetIdMap = new Map<number, string>(); // Maps instanceId to planetId
  private galaxyHighlights = new Map<string, THREE.Mesh>();
  
  // Effects
  private shockwaves: {mesh: THREE.Mesh; startTime: number; duration: number}[] = [];


  // --- CAMERA & CONTROLS ---
  private targetPosition = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private isManualControl = false;
  private lastCameraPosition = new THREE.Vector3();

  // --- LIFECYCLE METHODS ---

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this.handleResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleResize);
    this.canvas?.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas?.removeEventListener('pointermove', this.onPointerMove);
    this.canvas?.removeEventListener('click', this.onCanvasClick);
    cancelAnimationFrame(this.animationFrameId);
    this.renderer?.dispose();
    // TODO: Add full scene cleanup
  }

  firstUpdated() {
    this.initThree();
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (changedProperties.has('activeGalaxyId')) {
      this.transitionView(this.activeGalaxyId ? 'galaxy' : 'intergalactic');
    }
    if (changedProperties.has('galaxies') && this.viewMode === 'intergalactic') {
      this.updateGalaxyMarkers();
      this.updateDarkMatterFilaments();
    }
    if (changedProperties.has('activePlanets') && this.viewMode === 'galaxy') {
      this.updatePlanetVisuals();
    }
    if (changedProperties.has('selectedPlanetId')) {
      this.updatePlanetVisuals();
      if (this.selectedPlanetId) {
        const coords = this.activePlanetCoords.get(this.selectedPlanetId);
        if (coords) this.createShockwave(new THREE.Vector3(...coords), 2.0);
      }
    }
    if (changedProperties.has('isUnseenRevealed')) {
      this.updateDarkMatterFilaments();
    }
  }

  // --- INITIALIZATION ---

  private initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 8000);
    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight), 0.6, 0.3, 0.1);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.createStarfield();
    this.createBackgroundNebulae();
    this.transitionView('intergalactic'); // Start in intergalactic view

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('click', this.onCanvasClick);
    this.runAnimationLoop();
  }

  // --- VIEW TRANSITIONS ---

  private transitionView(newMode: ViewMode) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.viewMode = newMode;
    this.hoveredObjectId = null;
    this.tooltip.visible = false;

    // Fade out current objects
    const fadeOutPromises: Promise<void>[] = [];
    if (newMode === 'galaxy') {
      this.galaxyMarkers.forEach(marker => fadeOutPromises.push(this.fadeObject(marker, 0, 500)));
      if (this.darkMatterFilaments) fadeOutPromises.push(this.fadeObject(this.darkMatterFilaments, 0, 500));
    } else {
      if (this.galaxyVisuals) fadeOutPromises.push(this.fadeObject(this.galaxyVisuals, 0, 500));
      if (this.planetInstances) fadeOutPromises.push(this.fadeObject(this.planetInstances, 0, 500));
    }

    Promise.all(fadeOutPromises).then(() => {
      this.scene.remove(...this.scene.children.filter(c => c.userData.isViewObject));
      this.galaxyMarkers.clear();
      this.galaxyVisuals = null;
      this.planetInstances = null;

      if (newMode === 'galaxy') {
        this.updateGalaxyVisuals();
        this.updatePlanetVisuals();
        this.controls.minDistance = 20;
        this.controls.maxDistance = 500;
        this.targetPosition.set(0, 80, 250);
        this.targetLookAt.set(0, 0, 0);
      } else {
        this.updateGalaxyMarkers();
        this.updateDarkMatterFilaments();
        this.controls.minDistance = 200;
        this.controls.maxDistance = 2000;
        this.targetPosition.set(0, 400, 1000);
        this.targetLookAt.set(0, 0, 0);
      }
      this.isManualControl = false;
      this.isTransitioning = false;
    });
  }

  // --- SCENE OBJECT CREATION & UPDATES ---

  private updateGalaxyVisuals() {
    const activeGalaxy = this.galaxies.find(g => g.id === this.activeGalaxyId);
    if (!activeGalaxy) return;

    this.galaxyVisuals = this.createGalaxyPointCloud(activeGalaxy);
    this.galaxyVisuals.userData.isViewObject = true;
    this.scene.add(this.galaxyVisuals);
    this.fadeObject(this.galaxyVisuals, 1, 1000);
  }

  private createGalaxyPointCloud(galaxyData: GalaxyData): THREE.Points {
    const params = {
        count: 150000, size: 0.8, radius: 150, spin: 1.5,
        randomness: 0.6, randomnessPower: 3.0
    };

    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const distances = new Float32Array(params.count); // For differential rotation
    const colorInside = new THREE.Color(galaxyData.visualization.color1);
    const colorOutside = new THREE.Color(galaxyData.visualization.color2);
    let branches = 5;
    if (galaxyData.galaxyType.toLowerCase().includes('barred')) branches = 2;
    if (galaxyData.galaxyType.toLowerCase().includes('elliptical')) branches = 0;

    for (let i = 0; i < params.count; i++) {
        const i3 = i * 3;
        const radius = Math.random() * params.radius;
        const spinAngle = radius * params.spin;
        const branchAngle = ((i % branches) / branches) * Math.PI * 2;
        
        const randomX = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
        const randomY = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * 0.2;
        const randomZ = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
        
        if (branches > 0) {
            positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
            positions[i3 + 1] = randomY;
            positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;
        } else { // Elliptical or irregular
            positions[i3] = randomX * 2;
            positions[i3 + 1] = randomY * 2;
            positions[i3 + 2] = randomZ * 2;
        }

        distances[i] = radius;
        const mixedColor = colorInside.clone().lerp(colorOutside, radius / params.radius);
        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aDistance', new THREE.BufferAttribute(distances, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSize: { value: params.size } },
        vertexShader: `
            uniform float uTime;
            uniform float uSize;
            attribute float aDistance;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec3 pos = position;
                float angle = uTime * (20.0 / (aDistance + 20.0));
                float s = sin(angle);
                float c = cos(angle);
                mat2 rot = mat2(c, -s, s, c);
                pos.xz = rot * pos.xz;
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = uSize * (200.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }`,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                float d = distance(gl_PointCoord, vec2(0.5));
                if (d > 0.5) discard;
                gl_FragColor = vec4(vColor, (1.0 - d) * 2.0);
            }`,
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true
    });
    return new THREE.Points(geometry, material);
  }

  private updatePlanetVisuals() {
    if (this.planetInstances) {
      this.scene.remove(this.planetInstances);
      this.planetInstances.geometry.dispose();
      (this.planetInstances.material as THREE.Material).dispose();
      this.planetInstances = null;
    }

    if (this.activePlanets.length === 0) return;

    const count = this.activePlanets.length;
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
    this.planetInstances = new THREE.InstancedMesh(geometry, material, count);
    this.planetInstances.userData.isViewObject = true;

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    this.planetIdMap.clear();

    this.activePlanets.forEach((planet, i) => {
      this.planetIdMap.set(i, planet.celestial_body_id);
      const coords = this.activePlanetCoords.get(planet.celestial_body_id);
      if (coords) {
        const isSelected = planet.celestial_body_id === this.selectedPlanetId;
        const isHovered = planet.celestial_body_id === this.hoveredObjectId;

        const scale = isSelected ? 3.0 : isHovered ? 2.5 : 1.5;
        matrix.compose(new THREE.Vector3(...coords), new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
        this.planetInstances!.setMatrixAt(i, matrix);
        
        let c = color.set(planet.visualization.atmosphereColor);
        if (isSelected) c = color.set(0xffffff);
        this.planetInstances!.setColorAt(i, c);
      }
    });
    
    this.planetInstances.instanceMatrix.needsUpdate = true;
    if (this.planetInstances.instanceColor) this.planetInstances.instanceColor.needsUpdate = true;

    this.scene.add(this.planetInstances);
    this.fadeObject(this.planetInstances, 1, 1000);
  }

  private updateDarkMatterFilaments() {
    if (this.darkMatterFilaments) {
      this.scene.remove(this.darkMatterFilaments);
      this.darkMatterFilaments.geometry.dispose();
      (this.darkMatterFilaments.material as THREE.Material).dispose();
      this.darkMatterFilaments = null;
    }

    if (!this.isUnseenRevealed || this.galaxies.length < 2) return;

    const points = this.galaxies.map(g => new THREE.Vector3(...this.getGalaxyCoords(g.id)));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: 0x4a3b8e,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    this.darkMatterFilaments = new THREE.LineSegments(geometry, material); // Not quite a full web, but shows connections
    this.darkMatterFilaments.userData.isViewObject = true;
    this.scene.add(this.darkMatterFilaments);
    this.fadeObject(this.darkMatterFilaments, 0.2, 1000);
  }

  private updateGalaxyMarkers() {
    this.galaxies.forEach(galaxy => {
      const coords = this.getGalaxyCoords(galaxy.id);
      let markerGroup = this.galaxyMarkers.get(galaxy.id);
      if (!markerGroup) {
          markerGroup = this.createGalaxyMarker(galaxy);
          markerGroup.userData.isViewObject = true;
          this.galaxyMarkers.set(galaxy.id, markerGroup);
          this.scene.add(markerGroup);
      }
      markerGroup.position.set(...coords);
      this.fadeObject(markerGroup, 1, 1000);
    });
  }

  // --- PRIMITIVE CREATION ---

  private createStarfield() {
    const starCount = 50000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const scales = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 4000;
        positions[i3 + 1] = (Math.random() - 0.5) * 4000;
        positions[i3 + 2] = (Math.random() - 0.5) * 4000;
        scales[i] = Math.random() * 5 + 1;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    const material = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0.0 }, uPixelRatio: {value: window.devicePixelRatio } },
        vertexShader: starfieldVs,
        fragmentShader: starfieldFs,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
    });
    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  private createBackgroundNebulae() {
    for (let i = 0; i < 5; i++) {
        const geometry = new THREE.PlaneGeometry(1500, 1500);
        const material = new THREE.ShaderMaterial({
            vertexShader: nebulaVs,
            fragmentShader: nebulaFs,
            uniforms: {
                uTime: { value: 0.0 },
                uColor1: { value: new THREE.Color(0x61faff).multiplyScalar(Math.random() * 0.5 + 0.5) },
                uColor2: { value: new THREE.Color(0xff61c3).multiplyScalar(Math.random() * 0.5 + 0.5) },
                uSeed: { value: Math.random() * 100.0 },
                uCameraDistance: { value: 0.0 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const nebula = new THREE.Mesh(geometry, material);
        nebula.position.set((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 500, (Math.random() - 0.5) * 2000 - 1000);
        nebula.lookAt(this.camera.position);
        this.backgroundNebulae.push(nebula);
        this.scene.add(nebula);
    }
  }

  private createShockwave(position: THREE.Vector3, size: number) {
    const geometry = new THREE.RingGeometry(0.01, 0.02, 64);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const shockwave = new THREE.Mesh(geometry, material);
    shockwave.position.copy(position);
    shockwave.lookAt(this.camera.position);
    this.shockwaves.push({ mesh: shockwave, startTime: this.clock.getElapsedTime(), duration: 1.0 });
    this.scene.add(shockwave);
  }

  private createGalaxyMarker(galaxy: GalaxyData): THREE.Group {
    const group = new THREE.Group();
    const spriteMaterial = new THREE.SpriteMaterial({
        map: this.createGalaxyTexture(galaxy.visualization.color1),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(100, 100, 1);
    group.add(sprite);
    group.userData = { id: galaxy.id, name: galaxy.galaxyName, isGalaxy: true };
    return group;
  }
  
  private createGalaxyTexture(color: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, `${color}88`);
    gradient.addColorStop(1, `${color}00`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  // --- EVENT HANDLERS & INTERACTIONS ---
  
  private onPointerDown = () => { this.isManualControl = true; };
  private handleResize = () => { /* ... implementation ... */ };

  private onPointerMove = (event: PointerEvent) => {
    this.pointer.x = (event.clientX / this.canvas.clientWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / this.canvas.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    let intersects: THREE.Intersection[] = [];
    if (this.viewMode === 'intergalactic') {
        intersects = this.raycaster.intersectObjects(Array.from(this.galaxyMarkers.values()), true);
    } else if (this.planetInstances) {
        intersects = this.raycaster.intersectObject(this.planetInstances);
    }

    if (intersects.length > 0) {
      const intersected = intersects[0];
      let id: string | null = null;
      let name: string | null = null;
      
      if (this.viewMode === 'intergalactic' && intersected.object.parent?.userData.isGalaxy) {
        id = intersected.object.parent.userData.id;
        name = intersected.object.parent.userData.name;
      } else if (this.viewMode === 'galaxy' && intersected.instanceId !== undefined) {
        id = this.planetIdMap.get(intersected.instanceId) || null;
        if (id) name = this.activePlanets.find(p => p.celestial_body_id === id)?.planetName || null;
      }
      
      if (id && id !== this.hoveredObjectId) {
        this.hoveredObjectId = id;
        this.updatePlanetVisuals(); // Update hover highlights
        this.tooltip = { visible: true, content: name || 'Unknown', x: event.clientX, y: event.clientY };
      }
    } else if (this.hoveredObjectId) {
      this.hoveredObjectId = null;
      this.updatePlanetVisuals();
      this.tooltip = { ...this.tooltip, visible: false };
    }
  };

  private onCanvasClick = () => {
    if (this.hoveredObjectId) {
      if (this.viewMode === 'intergalactic') {
        this.createShockwave(this.galaxyMarkers.get(this.hoveredObjectId)!.position, 20.0);
        (this as unknown as EventTarget).dispatchEvent(new CustomEvent('galaxy-selected', { detail: { galaxyId: this.hoveredObjectId } }));
      } else {
        (this as unknown as EventTarget).dispatchEvent(new CustomEvent('planet-selected', { detail: { planetId: this.hoveredObjectId } }));
      }
    }
  };

  // --- ANIMATION LOOP ---
  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();

    if (!this.isManualControl) {
      this.camera.position.lerp(this.targetPosition, 0.03);
      this.controls.target.lerp(this.targetLookAt, 0.03);
    }
    this.controls.update(delta);
    
    // Starfield parallax
    const parallaxFactor = 0.1;
    const cameraDelta = this.camera.position.clone().sub(this.lastCameraPosition);
    (this.starfield.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
    this.starfield.position.add(cameraDelta.multiplyScalar(parallaxFactor));
    this.lastCameraPosition.copy(this.camera.position);

    // Animate galaxy visuals
    if (this.galaxyVisuals) {
      (this.galaxyVisuals.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime * 0.2;
    }
    
    // Animate nebulae
    const camDist = this.camera.position.length();
    this.backgroundNebulae.forEach(n => {
        (n.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime * 0.1;
        (n.material as THREE.ShaderMaterial).uniforms.uCameraDistance.value = camDist;
    });

    // Animate shockwaves
    this.shockwaves.forEach((sw, index) => {
        const progress = (elapsedTime - sw.startTime) / sw.duration;
        if (progress > 1) {
            this.scene.remove(sw.mesh);
            this.shockwaves.splice(index, 1);
        } else {
            const scale = 1 + progress * 50;
            sw.mesh.scale.set(scale, scale, 1);
            (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 1.0 - progress;
        }
    });

    this.composer.render();
  };
  
  // --- UTILS ---
  private getGalaxyCoords(galaxyId: string): [number, number, number] {
      let hash = 0;
      for (let i = 0; i < galaxyId.length; i++) {
          hash = galaxyId.charCodeAt(i) + ((hash << 5) - hash);
      }
      const x = (Math.sin(hash) * 10000 % 1000 - 500) * 1.5;
      const y = (Math.cos(hash) * 10000 % 200 - 100) * 1.5;
      const z = (Math.sin(hash * 2) * 10000 % 1000 - 500) * 1.5;
      return [x, y, z];
  }

  private fadeObject(object: THREE.Object3D, targetOpacity: number, duration: number): Promise<void> {
    return new Promise(resolve => {
        const material = (object as any).material;
        if (!material) return resolve();
        const startOpacity = material.opacity;
        const startTime = this.clock.getElapsedTime();
        const update = () => {
            const progress = Math.min((this.clock.getElapsedTime() - startTime) * 1000 / duration, 1);
            material.opacity = THREE.MathUtils.lerp(startOpacity, targetOpacity, progress);
            if (progress < 1) requestAnimationFrame(update);
            else resolve();
        };
        update();
    });
  }

  // --- RENDER METHOD ---
  render() {
    return html`
      <canvas id="canvas"></canvas>
      ${this.tooltip.visible ? html`
        <div class="tooltip" style="position:fixed; left:${this.tooltip.x + 15}px; top:${this.tooltip.y}px;">
          ${this.tooltip.content}
        </div>
      ` : ''}
    `;
  }

  // --- STYLES ---
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 0;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      cursor: grab;
    }
    canvas:active {
      cursor: grabbing;
    }
    .tooltip {
      background: rgba(1, 2, 6, 0.75);
      backdrop-filter: blur(5px);
      border: 1px solid rgba(97, 250, 255, 0.2);
      color: #c0f0ff;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
      pointer-events: none;
      transform: translateY(-50%);
      white-space: nowrap;
    }
  `;
}