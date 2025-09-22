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

@customElement('cosmos-visualizer')
export class CosmosVisualizer extends LitElement {
  // --- PROPERTIES ---
  @property({type: Array}) galaxies: GalaxyData[] = [];
  @property({type: String}) activeGalaxyId: string | null = null;
  @property({type: Array}) activePlanets: PlanetData[] = [];
  @property({type: Object}) activePlanetCoords = new Map<string, [number, number, number]>();
  @property({type: String}) selectedPlanetId: string | null = null;
  @property({type: Array}) navigationRoute: Waypoint[] | null = null;

  @query('#canvas') private canvas!: HTMLCanvasElement;
  @state() private viewMode: 'intergalactic' | 'galaxy' = 'galaxy';
  @state() private hoveredObjectId: string | null = null;
  @state() private hoveredObjectName: string = '';
  @state() private tooltipPosition = { x: 0, y: 0, visible: false };
  @state() private highlightedPlanets = new Map<string, number>();
  @state() private lastActiveGalaxyId: string | null = null;

  // --- THREE.js CORE ---
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();
  private animationFrameId = 0;
  private raycaster = new THREE.Raycaster();

  // --- SCENE OBJECTS ---
  private starfield!: THREE.Points;
  private starfieldMaterial!: THREE.ShaderMaterial;
  private galaxyGroup = new THREE.Group(); // For planets and local objects
  private intergalacticGroup = new THREE.Group(); // For galaxies
  private galaxyVisuals = new Map<string, THREE.Group>();
  private backgroundNebulae: THREE.Mesh[] = [];
  private planetVisuals = new Map<string, THREE.Group>();
  private planetOrbits = new Map<string, THREE.Mesh>();
  private routeLine: THREE.Mesh | null = null;
  private localGalaxyPoints!: THREE.Points;
  private previouslyRenderedPlanetIds = new Set<string>();
  private shockwaves: { mesh: THREE.Mesh, startTime: number }[] = [];


  // --- CAMERA & CONTROL ---
  private targetPosition = new THREE.Vector3(0, 0, 0);
  private targetLookAt = new THREE.Vector3(0, 0, 0);
  private isManualControl = false;
  private isTransitioning = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
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
      position: fixed;
      transform: translate(15px, 15px);
      background: rgba(1, 2, 6, 0.75);
      backdrop-filter: blur(5px);
      border: 1px solid rgba(97, 250, 255, 0.4);
      color: #c0f0ff;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
      pointer-events: none;
      white-space: nowrap;
      z-index: 100;
      transition: opacity 0.2s ease;
      animation: fadeIn 0.2s ease-out;
      opacity: 0;
    }
    .tooltip.visible {
        opacity: 1;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this.handleResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleResize);
    this.canvas?.removeEventListener('click', this.onCanvasClick);
    this.canvas?.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas?.removeEventListener('pointermove', this.onCanvasPointerMove);
    cancelAnimationFrame(this.animationFrameId);
    this.renderer?.dispose();
  }

  firstUpdated() {
    this.initThree();
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (changedProperties.has('activeGalaxyId')) {
      const previousGalaxyId = changedProperties.get('activeGalaxyId') as string | null | undefined;
      if (this.activeGalaxyId) {
          this.lastActiveGalaxyId = this.activeGalaxyId;
      } else if (previousGalaxyId) {
          this.lastActiveGalaxyId = previousGalaxyId;
      }
    }

    const previousViewMode = this.viewMode;
    this.viewMode = this.activeGalaxyId ? 'galaxy' : 'intergalactic';

    if (previousViewMode !== this.viewMode) {
      this.transitionView();
    }

    if (this.viewMode === 'intergalactic') {
      if (changedProperties.has('galaxies')) this.updateGalaxyVisuals();
      if (changedProperties.has('activeGalaxyId') || changedProperties.has('galaxies')) {
           this.updateGalaxyHighlights();
      }
    } else { // galaxy view
      if (changedProperties.has('activePlanets')) {
          const currentPlanetIds = new Set(this.activePlanets.map(p => p.celestial_body_id));
          currentPlanetIds.forEach(id => {
            if (!this.previouslyRenderedPlanetIds.has(id)) {
              this.highlightedPlanets.set(id, Date.now());
            }
          });
          this.previouslyRenderedPlanetIds = currentPlanetIds;
          this.updatePlanetVisuals();
      }
      if (changedProperties.has('selectedPlanetId')) {
          this.updateTarget();
          this.updatePlanetVisuals();
      }
      if (changedProperties.has('navigationRoute')) this.updateNavigationRoute();
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 8000);

    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true, alpha: true});
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight), 0.4, 0.2, 0.8);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.createStarfield();
    this.createBackgroundNebulae();
    this.createLocalGalaxy();
    this.scene.add(this.galaxyGroup);
    this.scene.add(this.intergalacticGroup);

    this.updateGalaxyVisuals();
    this.updatePlanetVisuals();
    this.transitionView(true); // Initial setup

    this.canvas.addEventListener('click', this.onCanvasClick);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onCanvasPointerMove);

    this.runAnimationLoop();
  }

  private handleResize = () => {
    if (!this.renderer || !this.camera || !this.composer) return;
    const { clientWidth, clientHeight } = this.canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
    this.composer.setSize(clientWidth, clientHeight);
  };

  private onPointerDown = () => {
    this.isManualControl = true;
  };

  private onCanvasClick = (event: MouseEvent) => {
    const pointer = new THREE.Vector2(
        (event.clientX / this.canvas.clientWidth) * 2 - 1,
        -(event.clientY / this.canvas.clientHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);

    if (this.viewMode === 'intergalactic') {
        const galaxyObjects = Array.from(this.galaxyVisuals.values()).flatMap(group => group.children);
        const intersects = this.raycaster.intersectObjects(galaxyObjects);
        if (intersects.length > 0) {
            const id = intersects[0].object.userData.id;
            if (id) {
                // FIX: Cast `this` to `EventTarget` to resolve TypeScript error.
                (this as unknown as EventTarget).dispatchEvent(new CustomEvent('galaxy-selected', {
                    detail: { galaxyId: id },
                    bubbles: true,
                    composed: true,
                }));
                this.createShockwave(id);
            }
        }
    } else { // 'galaxy' view
        const planetObjects = Array.from(this.planetVisuals.values()).flatMap(group => group.children);
        const intersects = this.raycaster.intersectObjects(planetObjects, true);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            const id = clickedObject.userData.id;
            if (id) {
                // FIX: Cast `this` to `EventTarget` to resolve TypeScript error.
                (this as unknown as EventTarget).dispatchEvent(new CustomEvent('planet-selected', {
                    detail: { planetId: id },
                    bubbles: true,
                    composed: true,
                }));
            }
        }
    }
  };

  private onCanvasPointerMove = (event: PointerEvent) => {
    const pointer = new THREE.Vector2(
        (event.clientX / this.canvas.clientWidth) * 2 - 1,
        -(event.clientY / this.canvas.clientHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);

    let hovering = false;
    let hoveredId: string | null = null;
    let hoveredName = '';

    if (this.viewMode === 'intergalactic') {
        const galaxyObjects = Array.from(this.galaxyVisuals.values()).flatMap(group => group.children);
        const intersects = this.raycaster.intersectObjects(galaxyObjects);
        if (intersects.length > 0) {
            hovering = true;
            hoveredId = intersects[0].object.userData.id;
            const galaxy = this.galaxies.find(g => g.id === hoveredId);
            if (galaxy) hoveredName = galaxy.galaxyName;
        }
    } else {
        const planetObjects = Array.from(this.planetVisuals.values()).flatMap(group => group.children.filter(c => c.userData.isPlanet));
        const intersects = this.raycaster.intersectObjects(planetObjects, true);
        if (intersects.length > 0) {
            hovering = true;
            hoveredId = intersects[0].object.userData.id;
            const planet = this.activePlanets.find(p => p.celestial_body_id === hoveredId);
            if (planet) hoveredName = planet.planetName;
        }
    }
    
    if (this.hoveredObjectId !== hoveredId) {
        this.hoveredObjectId = hoveredId;
        this.updatePlanetVisuals(); // to update shader uniform for planets
    }

    this.canvas.style.cursor = hovering ? 'pointer' : 'grab';
    this.tooltipPosition = { x: event.clientX, y: event.clientY, visible: hovering };
    this.hoveredObjectName = hoveredName;
  };

  private updateTarget() {
    this.isManualControl = false;

    if (this.viewMode === 'galaxy') {
        this.controls.minDistance = 5;
        this.controls.maxDistance = 500;
        if (this.selectedPlanetId) {
            const coords = this.activePlanetCoords.get(this.selectedPlanetId);
            if (coords) {
                const planetPos = new THREE.Vector3(...coords);
                this.targetPosition.copy(planetPos).add(new THREE.Vector3(0, 5, 15));
                this.targetLookAt.copy(planetPos);
            }
        } else {
            this.targetPosition.set(0, 80, 250);
            this.targetLookAt.set(0, 0, 0);
        }
    } else { // Intergalactic view
        this.controls.minDistance = 200;
        this.controls.maxDistance = 3000;
        this.targetPosition.set(0, 400, 1500);
        this.targetLookAt.set(0, 0, 0);
    }
  }

  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();

    if (!this.isManualControl && !this.isTransitioning) {
      this.camera.position.lerp(this.targetPosition, 0.03);
      this.controls.target.lerp(this.targetLookAt, 0.03);
    }
    this.controls.update();

    // Update shaders
    this.starfieldMaterial.uniforms.uTime.value = elapsedTime;

    this.galaxyVisuals.forEach(group => {
        const nebula = group.children[0] as THREE.Mesh;
        if (nebula) {
            const material = nebula.material as THREE.ShaderMaterial;
            material.uniforms.uTime.value = elapsedTime;
            material.uniforms.uCameraDistance.value = this.camera.position.distanceTo(group.position);
        }
    });

    this.backgroundNebulae.forEach(nebula => {
        const material = nebula.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = elapsedTime;
        material.uniforms.uCameraDistance.value = this.camera.position.distanceTo(nebula.position);
    });

    this.planetVisuals.forEach((group, id) => {
        const highlightStartTime = this.highlightedPlanets.get(id);
        const highlightAge = highlightStartTime ? (Date.now() - highlightStartTime) / 1000 : null;
        
        if (highlightAge !== null && highlightAge > 3.0) {
            this.highlightedPlanets.delete(id);
        }

        group.traverse(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                child.material.uniforms.uTime.value = elapsedTime;
            }
        });
    });

    this.localGalaxyPoints.rotation.y += 0.0003;
    
    this.shockwaves.forEach((shockwave, index) => {
        const age = elapsedTime - shockwave.startTime;
        if (age > 1.5) {
            this.intergalacticGroup.remove(shockwave.mesh);
            shockwave.mesh.geometry.dispose();
            (shockwave.mesh.material as THREE.Material).dispose();
            this.shockwaves.splice(index, 1);
        } else {
            const scale = 1.0 + age * 150.0;
            shockwave.mesh.scale.set(scale, scale, scale);
            (shockwave.mesh.material as THREE.ShaderMaterial).uniforms.opacity.value = 1.0 - (age / 1.5);
        }
    });

    this.composer.render();
  };

  private transitionView(isInitial = false) {
    this.isTransitioning = true;
    this.isManualControl = false;

    this.galaxyGroup.visible = this.viewMode === 'galaxy';
    this.intergalacticGroup.visible = this.viewMode === 'intergalactic';

    this.updateTarget();
    if (isInitial) {
        this.camera.position.copy(this.targetPosition);
        this.controls.target.copy(this.targetLookAt);
    }

    setTimeout(() => { this.isTransitioning = false; }, 1000);
  }

  private createStarfield() {
    const starCount = 150000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const scales = new Float32Array(starCount);
    const color = new THREE.Color();
    const range = 4000;

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * range;
        positions[i3 + 1] = (Math.random() - 0.5) * range;
        positions[i3 + 2] = (Math.random() - 0.5) * range;
        const randomHue = 0.55 + Math.random() * 0.15;
        const randomSaturation = 0.2 + Math.random() * 0.4;
        const randomLightness = 0.6 + Math.random() * 0.4;
        color.setHSL(randomHue, randomSaturation, randomLightness);
        colors[i3] = color.r; colors[i3+1] = color.g; colors[i3+2] = color.b;
        scales[i] = Math.pow(Math.random(), 3.0) * 5.0 + 0.5;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    this.starfieldMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: {value: 0.0} },
        vertexShader: starfieldVs,
        fragmentShader: starfieldFs,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true,
    });
    this.starfield = new THREE.Points(geometry, this.starfieldMaterial);
    this.scene.add(this.starfield);
  }

  private createLocalGalaxy() {
    const params = { count: 200000, size: 0.5, radius: 150, branches: 5, spin: 1.5, randomness: 0.6, randomnessPower: 3.0, insideColor: '#ffc261', outsideColor: '#61faff' };
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const colorInside = new THREE.Color(params.insideColor);
    const colorOutside = new THREE.Color(params.outsideColor);

    for (let i = 0; i < params.count; i++) {
        const i3 = i * 3;
        const r = Math.random() * params.radius;
        const spinAngle = r * params.spin;
        const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2;
        const randomX = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * r;
        const randomY = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * 0.2;
        const randomZ = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * r;
        positions[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
        positions[i3 + 1] = randomY;
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;
        const mixedColor = colorInside.clone().lerp(colorOutside, r / params.radius);
        colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: params.size, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true });
    this.localGalaxyPoints = new THREE.Points(geometry, material);
    this.galaxyGroup.add(this.localGalaxyPoints);
  }

  private createBackgroundNebulae() {
    const nebulaColors = [ { c1: '#1c0d2b', c2: '#682a5c' }, { c1: '#0d1b2b', c2: '#2a5c68' } ];
    for (let i = 0; i < 8; i++) {
        const colors = nebulaColors[i % nebulaColors.length];
        const geometry = new THREE.PlaneGeometry(1000, 1000);
        const material = new THREE.ShaderMaterial({
            vertexShader: nebulaVs, fragmentShader: nebulaFs,
            uniforms: {
                uTime: { value: 0.0 }, uColor1: { value: new THREE.Color(colors.c1) }, uColor2: { value: new THREE.Color(colors.c2) },
                uSeed: { value: Math.random() * 100 }, uCameraDistance: { value: 0.0 },
            },
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0.5,
        });
        const nebula = new THREE.Mesh(geometry, material);
        nebula.position.set( (Math.random() - 0.5) * 5000, (Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 5000 - 1500 );
        nebula.scale.setScalar(2 + Math.random() * 3);
        this.backgroundNebulae.push(nebula);
        this.scene.add(nebula);
    }
  }

  private createGalaxyVisual(galaxy: GalaxyData) {
    const group = new THREE.Group();
    const geometry = new THREE.PlaneGeometry(120, 120);
    const material = new THREE.ShaderMaterial({
      vertexShader: nebulaVs, fragmentShader: nebulaFs,
      uniforms: {
        uTime: {value: 0.0}, uColor1: {value: new THREE.Color(galaxy.visualization.color1)}, uColor2: {value: new THREE.Color(galaxy.visualization.color2)},
        uSeed: {value: galaxy.visualization.nebulaSeed || Math.random() * 100}, uCameraDistance: {value: 0.0},
      },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const nebulaMesh = new THREE.Mesh(geometry, material);
    nebulaMesh.userData = { id: galaxy.id };

    const highlightRingGeometry = new THREE.RingGeometry(70, 72, 64);
    const highlightRingMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, visible: false,
    });
    const highlightRing = new THREE.Mesh(highlightRingGeometry, highlightRingMaterial);
    highlightRing.userData.isHighlight = true;
    
    group.add(nebulaMesh);
    group.add(highlightRing);
    return group;
  }

  private updateGalaxyVisuals() {
    const currentGalaxyIds = new Set(this.galaxies.map(g => g.id));
    this.galaxyVisuals.forEach((group, id) => {
        if (!currentGalaxyIds.has(id)) {
            this.intergalacticGroup.remove(group);
            this.galaxyVisuals.delete(id);
        }
    });

    this.galaxies.forEach((galaxy, i) => {
        let visual = this.galaxyVisuals.get(galaxy.id);
        if (!visual) {
            visual = this.createGalaxyVisual(galaxy);
            this.galaxyVisuals.set(galaxy.id, visual);
            this.intergalacticGroup.add(visual);
        }
        visual.position.set((i % 5 - 2) * 600, 0, Math.floor(i / 5) * -600);
    });
  }

  private updateGalaxyHighlights() {
    this.galaxyVisuals.forEach((group, id) => {
        const highlightRing = group.children.find(c => c.userData.isHighlight) as THREE.Mesh;
        if (highlightRing) {
            const isActive = id === this.activeGalaxyId || id === this.lastActiveGalaxyId;
            highlightRing.visible = isActive;
            if (isActive) {
                (highlightRing.material as THREE.MeshBasicMaterial).opacity = id === this.activeGalaxyId ? 0.75 : 0.3;
            }
        }
    });
  }

  private createPlanetVisual(planet: PlanetData): THREE.Group {
    const group = new THREE.Group();
    const { visualization, celestial_body_id } = planet;
    
    let seed = 0;
    for (let i = 0; i < celestial_body_id.length; i++) seed += celestial_body_id.charCodeAt(i);
    const seededRandom = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
    const axialTilt = seededRandom(seed) * (Math.PI / 6);

    const textureTypeMap: {[key: string]: number} = { TERRESTRIAL: 1, GAS_GIANT: 2, VOLCANIC: 3, ICY: 4 };
    
    const planetMaterial = new THREE.ShaderMaterial({
        vertexShader: planetVs, fragmentShader: planetFs,
        uniforms: {
            uTime: { value: 0.0 }, uColor1: { value: new THREE.Color(visualization.color1) }, uColor2: { value: new THREE.Color(visualization.color2) },
            uOceanColor: { value: new THREE.Color(visualization.oceanColor || '#000033') }, uCloudiness: { value: visualization.cloudiness || 0.0 }, uIceCoverage: { value: visualization.iceCoverage || 0.0 },
            uTextureType: { value: textureTypeMap[visualization.surfaceTexture] || 1 }, uIsSelected: { value: false }, uIsHovered: { value: false }, uAxialTilt: { value: axialTilt },
            uAtmosphereColor: { value: new THREE.Color(visualization.atmosphereColor) }, uLightDirection: { value: new THREE.Vector3(1, 0.5, 1).normalize() },
        }
    });
    const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 64), planetMaterial);
    sphereMesh.userData = { id: celestial_body_id, isPlanet: true };
    group.add(sphereMesh);

    const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: atmosphereVs, fragmentShader: atmosphereFs,
        uniforms: {
            uAtmosphereColor: { value: new THREE.Color(visualization.atmosphereColor) }, uFresnelPower: { value: 4.0 }, uTime: { value: 0.0 },
            uIsSelected: { value: false }, uHasAuroras: { value: visualization.surfaceTexture === 'ICY' || (visualization.surfaceTexture === 'TERRESTRIAL' && visualization.iceCoverage > 0.5) },
        },
        blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry(2.1, 64, 64), atmosphereMaterial);
    atmosphereMesh.userData = { id: celestial_body_id };
    group.add(atmosphereMesh);
    
    if (visualization.hasRings) {
      const ringGeometry = new THREE.RingGeometry(2.8, 4.5, 128);
      const ringMaterial = new THREE.MeshBasicMaterial({ map: this.createRingTexture(), color: visualization.atmosphereColor, side: THREE.DoubleSide, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = Math.PI / 2 - axialTilt - 0.1;
      group.add(ringMesh);
    }
    return group;
  }

  private updatePlanetVisuals() {
    if (!this.activeGalaxyId) {
        this.planetVisuals.forEach(group => { this.galaxyGroup.remove(group); });
        this.planetVisuals.clear();
        this.planetOrbits.forEach(orbit => { this.galaxyGroup.remove(orbit); });
        this.planetOrbits.clear();
        return;
    };

    const currentPlanetIds = new Set(this.activePlanets.map((p) => p.celestial_body_id));

    this.planetVisuals.forEach((group, id) => {
      if (!currentPlanetIds.has(id)) {
        this.galaxyGroup.remove(group);
        this.planetVisuals.delete(id);
      }
    });
    this.planetOrbits.forEach((orbit, id) => {
        if (!currentPlanetIds.has(id)) {
            this.galaxyGroup.remove(orbit);
            this.planetOrbits.delete(id);
        }
    });

    this.activePlanets.forEach((planet) => {
      const coords = this.activePlanetCoords.get(planet.celestial_body_id);
      if (!coords) return;

      let planetGroup = this.planetVisuals.get(planet.celestial_body_id);

      if (!planetGroup) {
        planetGroup = this.createPlanetVisual(planet);
        this.planetVisuals.set(planet.celestial_body_id, planetGroup);
        this.galaxyGroup.add(planetGroup);
      }
      
      planetGroup.position.set(...coords);

      const planetMesh = planetGroup.children.find(c => c.userData.isPlanet) as THREE.Mesh;
      if (planetMesh && planetMesh.material instanceof THREE.ShaderMaterial) {
        planetMesh.material.uniforms.uIsSelected.value = planet.celestial_body_id === this.selectedPlanetId;
        planetMesh.material.uniforms.uIsHovered.value = planet.celestial_body_id === this.hoveredObjectId;
      }
      const atmosphereMesh = planetGroup.children[1] as THREE.Mesh;
      if (atmosphereMesh && atmosphereMesh.material instanceof THREE.ShaderMaterial) {
        atmosphereMesh.material.uniforms.uIsSelected.value = planet.celestial_body_id === this.selectedPlanetId;
      }

      let orbitMesh = this.planetOrbits.get(planet.celestial_body_id);
      const radius = new THREE.Vector3(...coords).length();
      if (!orbitMesh) {
          const orbitGeometry = new THREE.RingGeometry(radius, radius + 0.05, 128);
          const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x4d7aa5, side: THREE.DoubleSide, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
          orbitMesh = new THREE.Mesh(orbitGeometry, orbitMaterial);
          orbitMesh.rotation.x = Math.PI / 2;
          this.galaxyGroup.add(orbitMesh);
          this.planetOrbits.set(planet.celestial_body_id, orbitMesh);
      }
    });
  }

  private updateNavigationRoute() {
    if (this.routeLine) {
      this.galaxyGroup.remove(this.routeLine);
      this.routeLine.geometry.dispose();
      (this.routeLine.material as THREE.Material).dispose();
      this.routeLine = null;
    }

    if (!this.navigationRoute || this.navigationRoute.length < 2) return;

    const points = this.navigationRoute.map((wp) => new THREE.Vector3(...wp.coords));
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 64, 0.5, 8, false);
    const material = new THREE.MeshBasicMaterial({ color: 0x61faff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
    this.routeLine = new THREE.Mesh(geometry, material);
    this.galaxyGroup.add(this.routeLine);
  }
  
  private createRingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1;
    canvas.height = 128;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0.0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
      ctx.fillRect(0, Math.random() * canvas.height, 1, 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createShockwave(galaxyId: string) {
    const visual = this.galaxyVisuals.get(galaxyId);
    if (!visual) return;

    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.ShaderMaterial({
        uniforms: { opacity: { value: 1.0 } },
        vertexShader: `
            varying vec3 vNormal; void main() { vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            varying vec3 vNormal; uniform float opacity; void main() {
                float intensity = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(0.38, 0.98, 1.0, intensity * opacity); }`,
        transparent: true, blending: THREE.AdditiveBlending,
    });
    const shockwave = {
        mesh: new THREE.Mesh(geometry, material),
        startTime: this.clock.getElapsedTime(),
    };
    shockwave.mesh.position.copy(visual.position);
    this.shockwaves.push(shockwave);
    this.intergalacticGroup.add(shockwave.mesh);
  }

  render() {
    const tooltipClasses = { tooltip: true, visible: this.tooltipPosition.visible };
    const tooltipStyles = {
        left: `${this.tooltipPosition.x}px`,
        top: `${this.tooltipPosition.y}px`,
    };
    return html`
      <canvas id="canvas"></canvas>
      <div class=${Object.keys(tooltipClasses).filter(k => (tooltipClasses as any)[k]).join(' ')} style=${Object.entries(tooltipStyles).map(([k,v])=>`${k}:${v}`).join(';')}>
        ${this.hoveredObjectName}
      </div>`;
  }
}
