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

  // --- THREE.js CORE ---
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();
  private animationFrameId = 0;

  // --- SCENE OBJECTS ---
  private starfield!: THREE.Points;
  private starfieldMaterial!: THREE.ShaderMaterial;
  private galaxyGroup = new THREE.Group(); // For planets and local objects
  private intergalacticGroup = new THREE.Group(); // For galaxies
  private galaxyVisuals = new Map<string, THREE.Group>();
  private planetVisuals = new Map<string, THREE.Group>();
  private routeLine: THREE.Mesh | null = null;
  private localGalaxyPoints!: THREE.Points;

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
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this.handleResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleResize);
    this.canvas?.removeEventListener('click', this.onCanvasClick);
    this.canvas?.removeEventListener('pointerdown', this.onPointerDown);
    cancelAnimationFrame(this.animationFrameId);
    this.renderer?.dispose();
  }

  firstUpdated() {
    this.initThree();
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    const previousViewMode = this.viewMode;
    this.viewMode = this.activeGalaxyId ? 'galaxy' : 'intergalactic';

    if (previousViewMode !== this.viewMode) {
      this.transitionView();
    }

    if (this.viewMode === 'intergalactic') {
        if (changedProperties.has('galaxies')) this.updateGalaxyVisuals();
    } else { // galaxy view
        if (changedProperties.has('activePlanets')) this.updatePlanetVisuals();
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
    this.createLocalGalaxy();
    this.scene.add(this.galaxyGroup);
    this.scene.add(this.intergalacticGroup);

    this.updateGalaxyVisuals();
    this.updatePlanetVisuals();
    this.transitionView(true); // Initial setup

    this.canvas.addEventListener('click', this.onCanvasClick);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);

    this.runAnimationLoop();
  }

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
    const range = 2000;

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * range * 2;
        positions[i3 + 1] = (Math.random() - 0.5) * range * 2;
        positions[i3 + 2] = (Math.random() - 0.5) * range * 2;
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

  private createGalaxyVisual(galaxy: GalaxyData) {
    const group = new THREE.Group();
    const geometry = new THREE.PlaneGeometry(80, 80);
    const material = new THREE.ShaderMaterial({
      vertexShader: nebulaVs,
      fragmentShader: nebulaFs,
      uniforms: {
        uTime: {value: 0.0},
        uColor1: {value: new THREE.Color(galaxy.visualization.color1)},
        uColor2: {value: new THREE.Color(galaxy.visualization.color2)},
        uSeed: {value: galaxy.visualization.nebulaSeed || Math.random() * 100},
        uCameraDistance: {value: 0.0},
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const nebulaMesh = new THREE.Mesh(geometry, material);
    nebulaMesh.userData = { id: galaxy.id, isGalaxy: true };

    const coreMaterial = new THREE.PointsMaterial({
        color: galaxy.visualization.color1,
        size: 20,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    const coreGeometry = new THREE.BufferGeometry();
    coreGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,0]), 3));
    const corePoint = new THREE.Points(coreGeometry, coreMaterial);
    corePoint.userData = { id: galaxy.id, isGalaxy: true };

    group.add(nebulaMesh);
    group.add(corePoint);
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
      this.galaxies.forEach((galaxy, index) => {
          if (!this.galaxyVisuals.has(galaxy.id)) {
              const visual = this.createGalaxyVisual(galaxy);
              visual.position.set((index % 5 - 2) * 200, 0, Math.floor(index / 5) * -200);
              this.galaxyVisuals.set(galaxy.id, visual);
              this.intergalacticGroup.add(visual);
          }
      });
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

  private updatePlanetVisuals() {
    const currentPlanetIds = new Set(this.activePlanets.map(p => p.celestial_body_id));
    this.planetVisuals.forEach((group, id) => {
        if (!currentPlanetIds.has(id)) {
            this.galaxyGroup.remove(group);
            this.planetVisuals.delete(id);
        }
    });

    this.activePlanets.forEach((planet) => {
        const coords = this.activePlanetCoords.get(planet.celestial_body_id);
        if (!coords) return;

        let planetGroup = this.planetVisuals.get(planet.celestial_body_id);
        if (!planetGroup) {
            planetGroup = new THREE.Group();
            planetGroup.userData = { id: planet.celestial_body_id, isPlanet: true };

            let seed = 0;
            for (let i = 0; i < planet.celestial_body_id.length; i++) {
                seed += planet.celestial_body_id.charCodeAt(i);
            }
            const seededRandom = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
            const axialTilt = seededRandom(seed) * (Math.PI / 6);

            const textureTypeMap: {[key: string]: number} = { TERRESTRIAL: 1, GAS_GIANT: 2, VOLCANIC: 3, ICY: 4 };

            const planetMaterial = new THREE.ShaderMaterial({
                vertexShader: planetVs, fragmentShader: planetFs,
                uniforms: {
                    uTime: {value: 0.0}, uColor1: {value: new THREE.Color(planet.visualization.color1)}, uColor2: {value: new THREE.Color(planet.visualization.color2)}, uOceanColor: {value: new THREE.Color(planet.visualization.oceanColor || '#000033')}, uCloudiness: {value: planet.visualization.cloudiness || 0.0}, uIceCoverage: {value: planet.visualization.iceCoverage || 0.0}, uTextureType: {value: textureTypeMap[planet.visualization.surfaceTexture] || 1}, uIsSelected: {value: false}, uAxialTilt: {value: axialTilt}, uAtmosphereColor: {value: new THREE.Color(planet.visualization.atmosphereColor)}, uLightDirection: {value: new THREE.Vector3(1, 1, 1).normalize()},
                },
            });
            const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 64), planetMaterial);
            sphereMesh.userData.isPlanetMesh = true;
            planetGroup.add(sphereMesh);

            const atmosphereMaterial = new THREE.ShaderMaterial({
                vertexShader: atmosphereVs, fragmentShader: atmosphereFs,
                uniforms: {
                    uAtmosphereColor: { value: new THREE.Color(planet.visualization.atmosphereColor) }, uTime: { value: 0.0 }, uFresnelPower: { value: 4.0 }, uIsSelected: { value: false },
                    uHasAuroras: { value: planet.visualization.surfaceTexture === 'ICY' || (planet.visualization.surfaceTexture === 'TERRESTRIAL' && planet.visualization.iceCoverage > 0.5) },
                },
                blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true,
            });
            const atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry(2.1, 64, 64), atmosphereMaterial);
            planetGroup.add(atmosphereMesh);

            if (planet.visualization.hasRings) {
                const ringGeometry = new THREE.RingGeometry(2.8, 4.5, 64);
                const ringMaterial = new THREE.MeshBasicMaterial({ map: this.createRingTexture(), color: planet.visualization.atmosphereColor, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
                const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                ringMesh.rotation.x = Math.PI / 2 - 0.2;
                planetGroup.add(ringMesh);
            }

            this.planetVisuals.set(planet.celestial_body_id, planetGroup);
            this.galaxyGroup.add(planetGroup);
        }
        
        planetGroup.position.set(...coords);
        
        const isSelected = planet.celestial_body_id === this.selectedPlanetId;
        (planetGroup.children[0] as THREE.Mesh<any, THREE.ShaderMaterial>).material.uniforms.uIsSelected.value = isSelected;
        (planetGroup.children[1] as THREE.Mesh<any, THREE.ShaderMaterial>).material.uniforms.uIsSelected.value = isSelected;
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
    const material = new THREE.MeshBasicMaterial({color: 0x61faff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending});
    this.routeLine = new THREE.Mesh(geometry, material);
    this.galaxyGroup.add(this.routeLine);
  }

  private updateTarget() {
    this.isManualControl = false;
    if (this.viewMode === 'galaxy') {
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
        this.controls.minDistance = 5;
        this.controls.maxDistance = 500;
    } else { // Intergalactic
        this.targetPosition.set(0, 400, 800);
        this.targetLookAt.set(0, 0, 0);
        this.controls.minDistance = 100;
        this.controls.maxDistance = 2000;
    }
  }

  private onPointerDown = () => { this.isManualControl = true; };

  private onCanvasClick = (event: MouseEvent) => {
    if (this.isTransitioning) return;
    const pointer = new THREE.Vector2((event.clientX / this.canvas.clientWidth) * 2 - 1, -(event.clientY / this.canvas.clientHeight) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);

    if (this.viewMode === 'galaxy') {
        const planetMeshes = Array.from(this.planetVisuals.values()).map(g => g.children[0]);
        const intersects = raycaster.intersectObjects(planetMeshes);
        if (intersects.length > 0) {
            const id = intersects[0].object.parent?.userData.id;
            if (id) this.dispatchEvent(new CustomEvent('planet-selected', {detail: {planetId: id}, bubbles: true, composed: true}));
        }
    } else { // Intergalactic
        const galaxyObjects = Array.from(this.galaxyVisuals.values()).flatMap(g => g.children);
        const intersects = raycaster.intersectObjects(galaxyObjects, true);
        if (intersects.length > 0) {
            const id = intersects[0].object.userData.id;
            this.dispatchEvent(new CustomEvent('galaxy-selected', {detail: {galaxyId: id}, bubbles: true, composed: true}));
        }
    }
  };

  private handleResize = () => {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.composer.setSize(this.canvas.clientWidth, this.clientHeight);
  };

  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();

    if (!this.isManualControl && !this.isTransitioning) {
        this.camera.position.lerp(this.targetPosition, 0.03);
        this.controls.target.lerp(this.targetLookAt, 0.03);
    }
    this.controls.update();

    this.intergalacticGroup.rotation.y += 0.0001;
    this.galaxyGroup.rotation.y += 0.0002;
    this.starfieldMaterial.uniforms.uTime.value = elapsedTime;

    if (this.viewMode === 'intergalactic') {
        this.galaxyVisuals.forEach((group) => {
            const nebulaMesh = group.children[0] as THREE.Mesh;
            if (nebulaMesh && nebulaMesh.material instanceof THREE.ShaderMaterial) {
                const material = nebulaMesh.material;
                material.uniforms.uTime.value = elapsedTime;
                nebulaMesh.quaternion.copy(this.camera.quaternion);
                const distance = this.camera.position.distanceTo(group.position);
                material.uniforms.uCameraDistance.value = distance;
            }
        });
    } else if (this.viewMode === 'galaxy') {
        this.planetVisuals.forEach((group) => {
            (group.children[0] as THREE.Mesh<any, THREE.ShaderMaterial>).material.uniforms.uTime.value = elapsedTime;
            (group.children[1] as THREE.Mesh<any, THREE.ShaderMaterial>).material.uniforms.uTime.value = elapsedTime;
        });
    }

    this.composer.render();
  };

  render() {
    return html`<canvas id="canvas"></canvas>`;
  }
}