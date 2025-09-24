/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AURELION - Cosmos Visualizer
 */

import {LitElement, html, css, PropertyValueMap} from 'lit';
import {customElement, property, state, query} from 'lit/decorators.js';
import {styleMap} from 'lit/directives/style-map.js';
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
import { vs as starVs, fs as starFs } from './star-shader.tsx';
import { vs as creatureVs, fs as creatureFs } from './space-creature-shader.tsx';

export interface Waypoint {
  name: string;
  description: string;
  coords: [number, number, number];
}

type ViewMode = 'intergalactic' | 'galaxy' | 'system';

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
  private galaxyPlanetMeshes = new Map<string, THREE.Group>();
  private routeLine: THREE.Mesh | null = null;
  
  // System View
  private systemGroup: THREE.Group | null = null;
  private starMesh: THREE.Mesh | null = null;
  private systemPlanetMeshes = new Map<string, THREE.Group>();

  // Ambient Life
  private spaceCreatures: THREE.Group[] = [];

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
    const newMode: ViewMode = this.selectedPlanetId ? 'system' : (this.activeGalaxyId ? 'galaxy' : 'intergalactic');
    
    if (this.viewMode !== newMode) {
        this.transitionView(newMode);
    } else {
        // If view mode is the same, just update the visuals for that mode
        if (newMode === 'intergalactic' && (changedProperties.has('galaxies') || changedProperties.has('isUnseenRevealed'))) {
            this.updateGalaxyMarkers();
            this.updateDarkMatterFilaments();
        } else if (newMode === 'galaxy' && (changedProperties.has('activePlanets') || changedProperties.has('navigationRoute'))) {
            this.updatePlanetVisuals();
            this.updateNavigationRoute();
        } else if (newMode === 'system' && changedProperties.has('activePlanets')) {
            // Rebuild system if the list of planets changes
            this.updateSystemVisuals(); 
        }
    }
    
    // Always update highlights and camera when selection changes, regardless of mode transition
    if (changedProperties.has('selectedPlanetId')) {
        if (this.viewMode === 'system') {
            this.updatePlanetHighlights();
            this.updateSystemCameraTarget();
        } else if (this.viewMode === 'galaxy') {
            this.updatePlanetHighlights();
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
    this.createSpaceCreatures();
    this.transitionView('intergalactic'); // Start in intergalactic view

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('click', this.onCanvasClick);
    this.runAnimationLoop();
  }

  // --- VIEW TRANSITIONS ---
  
  private clearViewObjects() {
      const objectsToRemove = this.scene.children.filter(c => c.userData.isViewObject);
      objectsToRemove.forEach(obj => {
          this.scene.remove(obj);
          if (obj instanceof THREE.Group) {
              obj.traverse(child => {
                  if (child instanceof THREE.Mesh) {
                      child.geometry.dispose();
                      (child.material as THREE.Material).dispose();
                  }
              });
          }
      });
      this.galaxyMarkers.clear();
      this.galaxyVisuals = null;
      this.galaxyPlanetMeshes.clear();
      this.systemGroup = null;
      this.systemPlanetMeshes.clear();
      this.starMesh = null;
      this.routeLine = null;
  }

  private transitionView(newMode: ViewMode) {
    if (this.isTransitioning && this.viewMode === newMode) return;
    this.isTransitioning = true;
    this.viewMode = newMode;
    this.hoveredObjectId = null;
    this.tooltip.visible = false;

    const fadeOutPromises: Promise<void>[] = [];
    const objectsToFade = this.scene.children.filter(c => c.userData.isViewObject);
    objectsToFade.forEach(obj => fadeOutPromises.push(this.fadeObject(obj, 0, 500)));

    Promise.all(fadeOutPromises).then(() => {
        this.clearViewObjects();

        this.spaceCreatures.forEach(creature => {
            const isVisible = newMode === 'intergalactic' || newMode === 'galaxy';
            creature.visible = isVisible;
        });

        if (newMode === 'galaxy') {
            this.updateGalaxyVisuals();
            this.updatePlanetVisuals();
            this.updateNavigationRoute();
            this.controls.minDistance = 20;
            this.controls.maxDistance = 500;
            this.targetPosition.set(0, 80, 250);
            this.targetLookAt.set(0, 0, 0);
        } else if (newMode === 'intergalactic') {
            this.updateGalaxyMarkers();
            this.updateDarkMatterFilaments();
            this.controls.minDistance = 200;
            this.controls.maxDistance = 2000;
            this.targetPosition.set(0, 400, 1000);
            this.targetLookAt.set(0, 0, 0);
        } else if (newMode === 'system') {
            this.updateSystemVisuals();
            this.controls.minDistance = 5;
            this.controls.maxDistance = 150;
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
    const currentPlanetIds = new Set(this.activePlanets.map(p => p.celestial_body_id));

    // Remove planets that are no longer in the active list
    this.galaxyPlanetMeshes.forEach((group, id) => {
        if (!currentPlanetIds.has(id)) {
            this.scene.remove(group);
            // dispose geometry and material
            group.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.galaxyPlanetMeshes.delete(id);
        }
    });

    // Add new or update existing planets
    this.activePlanets.forEach((planet) => {
      const coords = this.activePlanetCoords.get(planet.celestial_body_id);
      if (!coords) return;

      if (!this.galaxyPlanetMeshes.has(planet.celestial_body_id)) {
        const planetMeshGroup = this.createPlanetMeshGroup(planet, 'low');
        
        const radius = planet.planetRadiusEarths ?? 1;
        // Use a non-linear scale to keep giants from being absurdly large and small planets visible.
        const scale = 0.3 * Math.log1p(radius * 2) + 0.3;
        planetMeshGroup.scale.set(scale, scale, scale);
        
        planetMeshGroup.position.set(...coords);
        planetMeshGroup.userData = {
          isViewObject: true,
          id: planet.celestial_body_id,
          isPlanet: true,
          name: planet.planetName,
        };
        this.galaxyPlanetMeshes.set(planet.celestial_body_id, planetMeshGroup);
        this.scene.add(planetMeshGroup);
        this.fadeObject(planetMeshGroup, 1, 1000);
      } else {
        // Just update position if it exists, in case coords changed
        this.galaxyPlanetMeshes.get(planet.celestial_body_id)!.position.set(...coords);
      }
    });

    this.updatePlanetHighlights();
  }

  private updatePlanetHighlights() {
    const meshMap = this.viewMode === 'galaxy' ? this.galaxyPlanetMeshes : this.systemPlanetMeshes;
    meshMap.forEach((group, id) => {
        const isSelected = id === this.selectedPlanetId;
        const isHovered = id === this.hoveredObjectId;
        group.traverse(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                if (child.material.uniforms.uIsSelected) {
                    child.material.uniforms.uIsSelected.value = isSelected;
                }
                if (child.material.uniforms.uIsHovered) {
                    child.material.uniforms.uIsHovered.value = isHovered;
                }
            }
        });
    });
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

  private updateSystemVisuals() {
    if (this.systemGroup) { this.clearViewObjects(); }
    this.systemGroup = new THREE.Group();
    this.systemGroup.userData.isViewObject = true;
    this.systemPlanetMeshes.clear();

    const selectedPlanet = this.activePlanets.find(p => p.celestial_body_id === this.selectedPlanetId);
    if (!selectedPlanet) {
        this.scene.add(this.systemGroup);
        return;
    }

    const systemPlanets = this.activePlanets.filter(p => p.starSystem === selectedPlanet.starSystem);
    systemPlanets.sort((a, b) => (a.orbitalPeriodDays ?? 0) - (b.orbitalPeriodDays ?? 0));

    // Create Star
    const starVisuals = this.getStarVisuals(selectedPlanet.starType);
    const starGeometry = new THREE.SphereGeometry(starVisuals.scale * 5, 128, 128);
    const starMaterial = new THREE.ShaderMaterial({
        vertexShader: starVs,
        fragmentShader: starFs,
        uniforms: {
            uTime: { value: 0.0 },
            uColor1: { value: starVisuals.color1 },
            uColor2: { value: starVisuals.color2 },
            uStarType: { value: starVisuals.typeId }
        },
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    this.starMesh = new THREE.Mesh(starGeometry, starMaterial);
    this.systemGroup.add(this.starMesh);
    
    const starLight = new THREE.PointLight(starVisuals.color1, 2, 500);
    this.systemGroup.add(starLight);

    // Create Planets and Orbits
    systemPlanets.forEach((planet, index) => {
        const orbitalRadius = 20 + index * 15;
        const planetMeshGroup = this.createPlanetMeshGroup(planet, 'high');
        
        const radius = planet.planetRadiusEarths ?? 1;
        const scale = THREE.MathUtils.clamp(radius * 0.2, 0.1, 5.0); // Earth will be 0.2, Jupiter 2.24
        planetMeshGroup.scale.set(scale, scale, scale);

        planetMeshGroup.userData = { id: planet.celestial_body_id, isPlanet: true, name: planet.planetName, orbitalRadius };
        this.systemPlanetMeshes.set(planet.celestial_body_id, planetMeshGroup);
        this.systemGroup!.add(planetMeshGroup);

        const orbitGeometry = new THREE.RingGeometry(orbitalRadius - 0.1, orbitalRadius + 0.1, 128);
        const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide, transparent: true, opacity: 0.2 });
        const orbitMesh = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbitMesh.rotation.x = Math.PI / 2;
        this.systemGroup!.add(orbitMesh);
    });

    this.scene.add(this.systemGroup);
    this.updatePlanetHighlights();
    this.updateSystemCameraTarget();
    this.fadeObject(this.systemGroup, 1, 1000);
  }

  private updateNavigationRoute() {
    if (this.routeLine) {
      this.scene.remove(this.routeLine);
      this.routeLine.geometry.dispose();
      (this.routeLine.material as THREE.Material).dispose();
      this.routeLine = null;
    }

    if (!this.navigationRoute || this.navigationRoute.length < 2) return;

    const points = this.navigationRoute.map((wp) => new THREE.Vector3(...wp.coords));
    const curve = new THREE.CatmullRomCurve3(points);

    const geometry = new THREE.TubeGeometry(curve, 64, 0.5, 8, false);
    const material = new THREE.MeshBasicMaterial({
      color: 0x61faff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.routeLine = new THREE.Mesh(geometry, material);
    this.routeLine.userData.isViewObject = true;
    this.scene.add(this.routeLine);
    this.fadeObject(this.routeLine, 0.7, 1000);
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

  private createSpaceCreatures() {
    const creatureCount = 5;
    const creatureColors = [new THREE.Color(0x61faff), new THREE.Color(0xff61c3), new THREE.Color(0x61ffca)];

    for (let i = 0; i < creatureCount; i++) {
        const path = new THREE.CatmullRomCurve3([
            new THREE.Vector3(Math.random() * 1000 - 500, Math.random() * 200 - 100, Math.random() * 1000 - 500),
            new THREE.Vector3(Math.random() * 1000 - 500, Math.random() * 200 - 100, Math.random() * 1000 - 500),
            new THREE.Vector3(Math.random() * 1000 - 500, Math.random() * 200 - 100, Math.random() * 1000 - 500),
            new THREE.Vector3(Math.random() * 1000 - 500, Math.random() * 200 - 100, Math.random() * 1000 - 500),
        ], true, 'catmullrom', 0.8);

        const bodyPath = new THREE.LineCurve3(new THREE.Vector3(-30, 0, 0), new THREE.Vector3(30, 0, 0));
        const geometry = new THREE.TubeGeometry(bodyPath, 64, 2, 8, false);
        const material = new THREE.ShaderMaterial({
            vertexShader: creatureVs,
            fragmentShader: creatureFs,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: creatureColors[i % creatureColors.length] },
                uSpeed: { value: Math.random() * 2.0 + 1.0 },
                uAmplitude: { value: Math.random() * 2.5 + 1.0 },
                uFrequency: { value: Math.random() * 0.1 + 0.05 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const creature = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        group.add(creature);
        group.userData.path = path;
        group.userData.progress = Math.random();
        group.userData.speed = (Math.random() * 0.005 + 0.002);
        group.visible = false; // Initially hidden

        this.spaceCreatures.push(group);
        this.scene.add(group);
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
  
  private getStarVisuals(starType: string): {
    color1: THREE.Color, // Core color
    color2: THREE.Color, // Surface/corona color
    scale: number,
    typeId: number // 1:G, 2:K, 3:M, 4:Pulsar
  } {
    const st = starType.toLowerCase();
    if (st.includes('g-type') || st.includes('main-sequence')) {
        return { color1: new THREE.Color(0xfff000), color2: new THREE.Color(0xff8800), scale: 1.0, typeId: 1 };
    }
    if (st.includes('k-type') || st.includes('orange dwarf')) {
        return { color1: new THREE.Color(0xffddaa), color2: new THREE.Color(0xffa050), scale: 0.8, typeId: 2 };
    }
    if (st.includes('m-type') || st.includes('red dwarf')) {
        return { color1: new THREE.Color(0xffaa88), color2: new THREE.Color(0xff6633), scale: 0.6, typeId: 3 };
    }
    if (st.includes('pulsar')) {
        return { color1: new THREE.Color(0xffffff), color2: new THREE.Color(0xaaddff), scale: 0.2, typeId: 4 };
    }
    return { color1: new THREE.Color(0xfff4e3), color2: new THREE.Color(0xff9966), scale: 1.0, typeId: 1 }; // Default to G-type
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
    return new THREE.CanvasTexture(canvas);
  }

  private createPlanetMeshGroup(planet: PlanetData, detailLevel: 'low' | 'high'): THREE.Group {
      const group = new THREE.Group();
      const { visualization, celestial_body_id } = planet;
      const textureTypeMap: {[key: string]: number} = { TERRESTRIAL: 1, GAS_GIANT: 2, VOLCANIC: 3, ICY: 4, ORGANIC: 5 };
      
      const segments = detailLevel === 'high' ? 128 : 32;

      const planetMaterial = new THREE.ShaderMaterial({
          vertexShader: planetVs, fragmentShader: planetFs,
          uniforms: THREE.UniformsUtils.clone({
              uTime: { value: 0.0 }, uColor1: { value: new THREE.Color(visualization.color1) },
              uColor2: { value: new THREE.Color(visualization.color2) }, uOceanColor: { value: new THREE.Color(visualization.oceanColor || '#000033') },
              uCloudiness: { value: visualization.cloudiness || 0.0 }, uIceCoverage: { value: visualization.iceCoverage || 0.0 },
              uTextureType: { value: textureTypeMap[visualization.surfaceTexture] || 1 }, uIsSelected: { value: false }, uIsHovered: { value: false },
              uAxialTilt: { value: 0.1 }, uLightDirection: { value: new THREE.Vector3(-1, 0.5, 0).normalize() },
          })
      });
      const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(2, segments, segments), planetMaterial);
      sphereMesh.userData.isPlanetMesh = true;
      group.add(sphereMesh);

      const atmosphereMaterial = new THREE.ShaderMaterial({
          vertexShader: atmosphereVs, fragmentShader: atmosphereFs,
          uniforms: THREE.UniformsUtils.clone({
              uAtmosphereColor: { value: new THREE.Color(visualization.atmosphereColor) }, uFresnelPower: { value: 4.0 }, uTime: { value: 0.0 },
              uIsSelected: { value: false }, uHasAuroras: { value: visualization.surfaceTexture === 'ICY' }, uLightDirection: { value: new THREE.Vector3(-1, 0.5, 0).normalize() },
          })
      });
      const atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry(2.1, segments, segments), atmosphereMaterial);
      group.add(atmosphereMesh);
      
      if (visualization.hasRings && detailLevel === 'high') {
        const ringGeo = new THREE.RingGeometry(2.8, 4.5, 128);
        const ringMat = new THREE.MeshBasicMaterial({ map: this.createRingTexture(), color: visualization.atmosphereColor, side: THREE.DoubleSide, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2 - 0.1;
        group.add(ringMesh);
      }
      return group;
  }
  
  private updateSystemCameraTarget() {
    this.isManualControl = false;
    if (this.selectedPlanetId) {
        const planetGroup = this.systemPlanetMeshes.get(this.selectedPlanetId);
        if (planetGroup) {
            const worldPosition = new THREE.Vector3();
            planetGroup.getWorldPosition(worldPosition);

            const offset = new THREE.Vector3(0, 3, 8);
            this.targetPosition.copy(worldPosition).add(offset);
            this.targetLookAt.copy(worldPosition);
        }
    } else {
        // Look at the whole system (star) if no planet is selected
        this.targetPosition.set(0, 40, 100);
        this.targetLookAt.set(0, 0, 0);
    }
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

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isTransitioning) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    let intersects: THREE.Intersection[] = [];
    let intersectedObject: THREE.Object3D | null = null;
    
    if (this.viewMode === 'intergalactic') {
        intersects = this.raycaster.intersectObjects(Array.from(this.galaxyMarkers.values()), true);
    } else if (this.viewMode === 'galaxy') {
        intersects = this.raycaster.intersectObjects(Array.from(this.galaxyPlanetMeshes.values()), true);
    } else if (this.viewMode === 'system') {
        intersects = this.raycaster.intersectObjects(Array.from(this.systemPlanetMeshes.values()), true);
    }

    if (intersects.length > 0) {
        intersectedObject = intersects[0].object;
        while(intersectedObject && !intersectedObject.userData.id) {
            intersectedObject = intersectedObject.parent;
        }
    }

    if (intersectedObject && intersectedObject.userData.id) {
        if (this.hoveredObjectId !== intersectedObject.userData.id) {
            this.hoveredObjectId = intersectedObject.userData.id;
            this.updatePlanetHighlights();
            // FIX: Cast `this` to EventTarget to dispatch event.
            (this as unknown as EventTarget).dispatchEvent(new CustomEvent('object-hovered'));

            this.tooltip = {
                visible: true,
                content: intersectedObject.userData.name,
                x: event.clientX,
                y: event.clientY,
            };
        } else if (this.tooltip.visible) {
            this.tooltip.x = event.clientX;
            this.tooltip.y = event.clientY;
        }
    } else {
        if (this.hoveredObjectId !== null) {
            this.hoveredObjectId = null;
            this.updatePlanetHighlights();
            this.tooltip.visible = false;
        }
    }

    this.canvas.style.cursor = this.hoveredObjectId ? 'pointer' : 'grab';
  };

  private onCanvasClick = (event: MouseEvent) => {
    if (this.isTransitioning) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    let intersects: THREE.Intersection[] = [];
    let intersectedObject: THREE.Object3D | null = null;
    
    if (this.viewMode === 'intergalactic') {
        intersects = this.raycaster.intersectObjects(Array.from(this.galaxyMarkers.values()), true);
    } else if (this.viewMode === 'galaxy') {
        intersects = this.raycaster.intersectObjects(Array.from(this.galaxyPlanetMeshes.values()), true);
    } else if (this.viewMode === 'system') {
        intersects = this.raycaster.intersectObjects(Array.from(this.systemPlanetMeshes.values()), true);
    }
    
    if (intersects.length > 0) {
        intersectedObject = intersects[0].object;
        while(intersectedObject && !intersectedObject.userData.id) {
            intersectedObject = intersectedObject.parent;
        }
    }

    if (intersectedObject && intersectedObject.userData.id) {
        const id = intersectedObject.userData.id;
        if (intersectedObject.userData.isGalaxy) {
            this.createShockwave(intersectedObject.position, 100);
            // FIX: Cast `this` to EventTarget to dispatch event.
            (this as unknown as EventTarget).dispatchEvent(new CustomEvent('galaxy-selected', { detail: { galaxyId: id }, bubbles: true, composed: true }));
        } else if (intersectedObject.userData.isPlanet) {
            this.createShockwave(intersectedObject.position, 10);
            // FIX: Cast `this` to EventTarget to dispatch event.
            (this as unknown as EventTarget).dispatchEvent(new CustomEvent('planet-selected', { detail: { planetId: id }, bubbles: true, composed: true }));
        }
    }
  };

  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();

    if (!this.isManualControl) {
        this.camera.position.lerp(this.targetPosition, 0.05);
        this.controls.target.lerp(this.targetLookAt, 0.05);
    }
    this.controls.update();

    if (this.starfield) {
        (this.starfield.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
    }

    this.backgroundNebulae.forEach(nebula => {
        const material = nebula.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = elapsedTime;
        const dist = this.camera.position.distanceTo(nebula.position);
        material.uniforms.uCameraDistance.value = dist;
    });

    if (this.galaxyVisuals) {
        this.galaxyVisuals.rotation.y += 0.0001; // Slow majestic rotation
        (this.galaxyVisuals.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
    }
    
    if (this.systemGroup) {
      this.systemGroup.rotation.y += 0.0001;
      if (this.starMesh) {
        (this.starMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
      }
      this.systemPlanetMeshes.forEach((group, id) => {
          const planetData = this.activePlanets.find(p => p.celestial_body_id === id);
          if (planetData && planetData.orbitalPeriodDays) {
              const orbitalSpeed = 20 / planetData.orbitalPeriodDays; // A factor to make it look decent
              const angle = elapsedTime * orbitalSpeed;
              const orbitalRadius = group.userData.orbitalRadius;
              group.position.x = Math.cos(angle) * orbitalRadius;
              group.position.z = Math.sin(angle) * orbitalRadius;
          }
          group.rotation.y += delta * 0.1;
      });
    }

    this.spaceCreatures.forEach(creature => {
        if (!creature.visible) return;
        
        creature.userData.progress = (creature.userData.progress + creature.userData.speed * delta);
        if (creature.userData.progress > 1) {
            creature.userData.progress = 0;
            // Optional: Create a new random path to prevent looping
        }

        const position = creature.userData.path.getPointAt(creature.userData.progress);
        creature.position.copy(position);

        const tangent = creature.userData.path.getTangentAt(creature.userData.progress);
        creature.lookAt(position.clone().add(tangent));
        
        const mesh = creature.children[0] as THREE.Mesh;
        if (mesh) {
            (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
        }
    });

    this.shockwaves.forEach((shockwave, index) => {
      const elapsed = elapsedTime - shockwave.startTime;
      const progress = elapsed / shockwave.duration;
      if (progress > 1) {
          this.scene.remove(shockwave.mesh);
          this.shockwaves.splice(index, 1);
      } else {
          const scale = 1 + progress * 50;
          shockwave.mesh.scale.set(scale, scale, scale);
          (shockwave.mesh.material as THREE.MeshBasicMaterial).opacity = 1.0 - progress;
      }
    });

    this.lastCameraPosition.copy(this.camera.position);

    this.composer.render();
  };

  private fadeObject(object: THREE.Object3D, targetOpacity: number, duration: number): Promise<void> {
    return new Promise(resolve => {
        let startOpacity = -1;

        const animate = (time: number) => {
            const progress = Math.min(time / duration, 1);
            
            object.traverse(child => {
                if ((child instanceof THREE.Mesh || child instanceof THREE.Sprite || child instanceof THREE.LineSegments) && child.material) {
                    const mat = child.material as THREE.Material;
                    if (startOpacity === -1) {
                        startOpacity = mat.opacity;
                    }
                    mat.opacity = THREE.MathUtils.lerp(startOpacity, targetOpacity, progress);
                }
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        };
        requestAnimationFrame(animate);
    });
  }

  private getGalaxyCoords(galaxyId: string): [number, number, number] {
    let seed = 0;
    for (let i = 0; i < galaxyId.length; i++) {
      seed += galaxyId.charCodeAt(i);
    }
    const seededRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    const x = (seededRandom(seed++) - 0.5) * 1500;
    const y = (seededRandom(seed++) - 0.5) * 300;
    const z = (seededRandom(seed++) - 0.5) * 1500;
    return [x, y, z];
  }

  render() {
    const tooltipStyles = {
        display: this.tooltip.visible ? 'block' : 'none',
        left: `${this.tooltip.x + 15}px`,
        top: `${this.tooltip.y + 15}px`,
    };

    return html`
        <canvas id="canvas"></canvas>
        <div class="tooltip" style=${styleMap(tooltipStyles)}>${this.tooltip.content}</div>
    `;
  }
  
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
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      pointer-events: none;
      font-size: 12px;
      z-index: 10;
      white-space: nowrap;
      transition: opacity 0.2s;
    }
  `;
}