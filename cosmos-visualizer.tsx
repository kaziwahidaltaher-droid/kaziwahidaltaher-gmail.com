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
import { vs as routeVs, fs as routeFs } from './route-shader.tsx';
// FIX: Corrected import names to match exports from galaxy-point-shaders.tsx
import { galaxyVertexShader as galaxyVs, galaxyFragmentShader as galaxyFs } from './galaxy-point-shaders.tsx';


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
  @property({type: Boolean}) isJumping = false;


  // --- STATE ---
  @state() private viewMode: ViewMode = 'intergalactic';
  @state() private tooltip = {visible: false, content: '', x: 0, y: 0};
  @state() private hoveredObjectId: string | null = null;
  @state() private hoveredSectorIndex: number | null = null;
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
  private galaxyOrbits = new Map<string, THREE.Line>();
  private routeLine: THREE.Object3D | null = null;
  private galaxyInteractionPlane: THREE.Mesh | null = null;
  private galaxyDataCache = { numBranches: 5 };
  
  // System View
  private systemGroup: THREE.Group | null = null;
  private starMesh: THREE.Mesh | null = null;
  private systemPlanetMeshes = new Map<string, THREE.Group>();
  private systemOrbits = new Map<string, THREE.Line>();

  // Ambient Life
  private spaceCreatures: THREE.Group[] = [];

  // Effects
  private shockwaves: {mesh: THREE.Mesh; startTime: number; duration: number}[] = [];


  // --- CAMERA & CONTROLS ---
  private targetPosition = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private isManualControl = false;
  private lastCameraPosition = new THREE.Vector3();

  // FIX: Added missing property.
  private colors = ['#ff61c3', '#61ffca', '#ffc261', '#61faff', '#d861ff'];
  private armNames = ["Orion-Cygnus Arm", "Sagittarius Arm", "Perseus Arm", "Norma Arm", "Scutum-Centaurus Arm"];
  
  // Warp effect state
  private warpEffectActive = false;
  private warpStarfield!: THREE.Points;
  private warpStartTime = 0;


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
    
    if (changedProperties.has('isJumping') && this.isJumping) {
        this.startWarpEffect();
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
    this.createWarpStarfield();
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
      this.galaxyOrbits.clear();
      this.systemGroup = null;
      this.systemPlanetMeshes.clear();
      this.systemOrbits.clear();
      this.starMesh = null;
      this.routeLine = null;
      if (this.galaxyInteractionPlane) this.galaxyInteractionPlane.visible = false;
  }

  private transitionView(newMode: ViewMode) {
    if (this.isTransitioning && this.viewMode === newMode) return;
    this.isTransitioning = true;
    this.viewMode = newMode;
    this.hoveredObjectId = null;
    this.hoveredSectorIndex = null;
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

  // FIX: Implement missing methods.
  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();
    const deltaTime = this.clock.getDelta();

    // Update camera and controls
    if (!this.isManualControl) {
        this.camera.position.lerp(this.targetPosition, 0.04);
        this.controls.target.lerp(this.targetLookAt, 0.04);
    }
    this.controls.update();

    // Animate scene objects
    this.starfield.rotation.y += 0.00005;
    this.backgroundNebulae.forEach(nebula => {
        (nebula.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
        (nebula.material as THREE.ShaderMaterial).uniforms.uCameraDistance.value = this.camera.position.length();
    });

    if (this.galaxyVisuals) {
      this.galaxyVisuals.rotation.y += 0.0003;
      const mat = this.galaxyVisuals.material as THREE.ShaderMaterial;
      if (mat) {
        mat.uniforms.uTime.value = elapsedTime;
        mat.uniforms.uHoveredSectorIndex.value = this.hoveredSectorIndex ?? -1;
      }
    }
    
    // Animate orbits and planets in galaxy view
    if (this.viewMode === 'galaxy') {
        this.galaxyOrbits.forEach((orbit, id) => {
            const material = orbit.material as THREE.LineBasicMaterial;
            const isSelected = id === this.selectedPlanetId;
            const isHovered = id === this.hoveredObjectId;

            if (isSelected) {
                // Intense pulse for selected orbit
                material.opacity = 0.6 + Math.sin(elapsedTime * 5) * 0.3;
                material.color.set(0xffffff);
            } else if (isHovered) {
                // Medium pulse for hovered orbit
                material.opacity = 0.4 + Math.sin(elapsedTime * 4) * 0.2;
                material.color.set(0x99ffff);
            } else {
                // Subtle pulse for non-selected orbits
                material.opacity = 0.08 + Math.sin(elapsedTime * 0.5 + orbit.rotation.y) * 0.07;
                material.color.set(0x61faff);
            }
        });

        this.galaxyPlanetMeshes.forEach((group, id) => {
            const isSelected = id === this.selectedPlanetId;
            const isHovered = id === this.hoveredObjectId;
            let pulseScale = 1.0;

            if (isSelected) {
                pulseScale = 1.0 + Math.sin(elapsedTime * 5.0) * 0.2;
            } else if (isHovered) {
                pulseScale = 1.0 + Math.sin(elapsedTime * 5.0) * 0.1;
            }
            
            const baseScale = group.userData.baseScale || 1.0;
            group.scale.set(baseScale * pulseScale, baseScale * pulseScale, baseScale * pulseScale);
        });
    }
    
    // Update planets orbiting in system view
    if (this.viewMode === 'system') {
        this.systemPlanetMeshes.forEach((group, id) => {
            const a = group.userData.orbitRadius; // semi-major axis
            const speed = group.userData.orbitSpeed;
            const eccentricity = group.userData.orbitEccentricity;
            const c = a * eccentricity; // distance from center to focus
            const b = Math.sqrt(a*a - c*c); // semi-minor axis

            const angle = elapsedTime * speed;
            // Parametric equation for an ellipse with one focus at the origin
            group.position.set(
                Math.cos(angle) * a - c,
                0,
                Math.sin(angle) * b
            );
            
            // Pulse effect
            const isSelected = id === this.selectedPlanetId;
            const isHovered = id === this.hoveredObjectId;
            let scale = 1.0;
            if (isSelected) {
                scale = 1.0 + Math.sin(elapsedTime * 5.0) * 0.05; // More subtle for realistic planets
            } else if (isHovered) {
                scale = 1.0 + Math.sin(elapsedTime * 5.0) * 0.03;
            }
            group.scale.set(scale, scale, scale);
        });
        
        this.systemOrbits.forEach((orbit, id) => {
            const material = orbit.material as THREE.LineBasicMaterial;
            const isSelected = id === this.selectedPlanetId;
            const isHovered = id === this.hoveredObjectId;
            
            if (isSelected) {
                // More prominent pulse for the selected planet's orbit
                material.opacity = 0.8 + Math.sin(elapsedTime * 5) * 0.2;
                material.color.set(0xffffff);
            } else if (isHovered) {
                material.opacity = 0.5 + Math.sin(elapsedTime * 4) * 0.2;
                material.color.set(0xffffff);
            } else {
                // Subtle pulse for other orbits
                material.opacity = 0.2 + Math.sin(elapsedTime * 0.8 + orbit.position.x) * 0.15;
                material.color.set(0x61faff);
            }
        });
    }
    
    if (this.routeLine && (this.routeLine as THREE.Points).material instanceof THREE.ShaderMaterial) {
        const routeMaterial = (this.routeLine as THREE.Points).material as THREE.ShaderMaterial;
        routeMaterial.uniforms.uTime.value = elapsedTime;

        // Dynamic speed calculation
        if (this.navigationRoute && this.navigationRoute.length > 0) {
            const destination = this.navigationRoute[this.navigationRoute.length - 1];
            const destinationPos = new THREE.Vector3(...destination.coords);
            const distance = this.camera.position.distanceTo(destinationPos);
            
            const minDistance = 50;
            const maxDistance = 400;
            const minSpeed = 1.5;
            const maxSpeed = 8.0;

            const speedFactor = (distance - minDistance) / (maxDistance - minDistance);
            const clampedFactor = Math.max(0.0, Math.min(1.0, speedFactor));
            const speed = minSpeed + clampedFactor * (maxSpeed - minSpeed);

            routeMaterial.uniforms.uSpeed.value = speed;
        }
    }

    // Update shader times for planets
    const planetMeshes = this.viewMode === 'system' ? this.systemPlanetMeshes : this.galaxyPlanetMeshes;
    planetMeshes.forEach(group => {
        group.traverse(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                child.material.uniforms.uTime.value = elapsedTime;
            }
        });
    });

    if(this.starMesh && this.starMesh.material instanceof THREE.ShaderMaterial) {
        this.starMesh.material.uniforms.uTime.value = elapsedTime;
    }

    // Update creatures
    this.spaceCreatures.forEach(creature => {
        creature.userData.update(elapsedTime);
        (creature.children[0] as THREE.Mesh<any, THREE.ShaderMaterial>).material.uniforms.uTime.value = elapsedTime;
    });
    
    // Update shockwaves
    this.updateShockwaves(elapsedTime);

    // Update warp effect
    if (this.warpEffectActive) {
        this.updateWarpEffect(elapsedTime);
    }

    this.composer.render();
    this.lastCameraPosition.copy(this.camera.position);
  };

  private fadeObject(object: THREE.Object3D, targetOpacity: number, duration: number): Promise<void> {
      return new Promise(resolve => {
          object.visible = targetOpacity > 0;
          setTimeout(resolve, duration);
      });
  }

  private handleResize = () => {
    if (!this.renderer || !this.camera) return;
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

    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    let objectsToIntersect: THREE.Object3D[] = [];
    if (this.viewMode === 'intergalactic') {
        objectsToIntersect = Array.from(this.galaxyMarkers.values()).map(g => g.children[0]);
    } else if (this.viewMode === 'galaxy') {
        if (this.galaxyInteractionPlane) {
          const intersects = this.raycaster.intersectObject(this.galaxyInteractionPlane);
          if (intersects.length > 0) {
            const point = intersects[0].point;
            const angle = Math.atan2(point.z, point.x);
            const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
            const numBranches = this.galaxyDataCache.numBranches;
            const sectorIndex = Math.floor(normalizedAngle / (2 * Math.PI / numBranches));
            
            if (this.hoveredSectorIndex !== sectorIndex) {
              this.hoveredSectorIndex = sectorIndex;
              const sectorName = this.armNames[sectorIndex % this.armNames.length];
              this.tooltip = { visible: true, content: sectorName, x: event.clientX, y: event.clientY };
            }
          } else {
            this.hoveredSectorIndex = null;
          }
        }
        objectsToIntersect = Array.from(this.galaxyPlanetMeshes.values()).map(g => g.children[0]);
    } else if (this.viewMode === 'system') {
        objectsToIntersect = Array.from(this.systemPlanetMeshes.values()).map(g => g.children[0]);
    }

    const intersects = this.raycaster.intersectObjects(objectsToIntersect);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const id = intersectedObject.userData.id;
        if (id !== this.hoveredObjectId) {
            // FIX: Cast `this` to EventTarget to dispatch event.
            (this as unknown as EventTarget).dispatchEvent(new CustomEvent('object-hovered', { bubbles: true, composed: true }));
            this.hoveredObjectId = id;
            
            let name = '';
            if (this.viewMode === 'intergalactic') {
                const { galaxyName, galaxyType } = intersectedObject.userData;
                name = galaxyName && galaxyType ? `${galaxyName} - ${galaxyType}` : 'Unknown Galaxy';
            } else {
                const planet = this.activePlanets.find(p => p.celestial_body_id === id);
                name = planet?.planetName || 'Unknown Planet';
            }
            this.tooltip.visible = true;
            this.tooltip.content = name;
        }
        this.tooltip.x = event.clientX;
        this.tooltip.y = event.clientY;
        this.canvas.style.cursor = 'pointer';
    } else {
        if (this.hoveredObjectId !== null) {
            this.hoveredObjectId = null;
            if (this.viewMode !== 'galaxy' || this.hoveredSectorIndex === null) {
              this.tooltip.visible = false;
            }
        }
        if (this.viewMode === 'galaxy' && this.hoveredSectorIndex === null) {
          this.tooltip.visible = false;
        }

        this.canvas.style.cursor = 'grab';
    }
  };

  private onCanvasClick = (event: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    let objectsToIntersect: THREE.Object3D[] = [];
    if (this.viewMode === 'intergalactic') {
        objectsToIntersect = Array.from(this.galaxyMarkers.values()).map(g => g.children[0]);
    } else if (this.viewMode === 'galaxy') {
        const planetMeshes = this.galaxyPlanetMeshes;
        objectsToIntersect = Array.from(planetMeshes.values()).map(g => g.children[0]);
    } else {
        const planetMeshes = this.systemPlanetMeshes;
        objectsToIntersect = Array.from(planetMeshes.values()).map(g => g.children[0]);
    }
    
    const intersects = this.raycaster.intersectObjects(objectsToIntersect);

    if (intersects.length > 0) {
        const id = intersects[0].object.userData.id;
        if (this.viewMode === 'intergalactic') {
            if (this.activeGalaxyId !== id) {
                (this as unknown as EventTarget).dispatchEvent(new CustomEvent('galaxy-selected', { detail: { galaxyId: id }, bubbles: true, composed: true }));
                this.createShockwave(this.galaxyMarkers.get(id)!.position);
            }
        } else {
             if (this.selectedPlanetId !== id) {
                 (this as unknown as EventTarget).dispatchEvent(new CustomEvent('planet-selected', { detail: { planetId: id }, bubbles: true, composed: true }));
             }
        }
    } else {
        // Clicked on empty space
        if (this.viewMode === 'galaxy' && this.hoveredSectorIndex !== null) {
            const sectorName = this.armNames[this.hoveredSectorIndex % this.armNames.length];
            (this as unknown as EventTarget).dispatchEvent(new CustomEvent('galaxy-sector-clicked', { detail: { sectorIndex: this.hoveredSectorIndex, sectorName }, bubbles: true, composed: true }));
        } else if ((this.viewMode === 'galaxy' || this.viewMode === 'system') && this.selectedPlanetId) {
             (this as unknown as EventTarget).dispatchEvent(new CustomEvent('planet-selected', { detail: { planetId: null }, bubbles: true, composed: true }));
        }
    }
  };

  private updateGalaxyMarkers() {
    const currentIds = new Set(this.galaxies.map(g => g.id));
    this.galaxyMarkers.forEach((marker, id) => {
        if (!currentIds.has(id)) {
            this.scene.remove(marker);
            this.galaxyMarkers.delete(id);
        }
    });

    this.galaxies.forEach((galaxy, i) => {
        if (!this.galaxyMarkers.has(galaxy.id)) {
            const group = new THREE.Group();
            const nebula = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 100),
                new THREE.ShaderMaterial({
                    vertexShader: nebulaVs,
                    fragmentShader: nebulaFs,
                    uniforms: {
                        uTime: { value: 0.0 },
                        uColor1: { value: new THREE.Color(galaxy.visualization.color1) },
                        uColor2: { value: new THREE.Color(galaxy.visualization.color2) },
                        uSeed: { value: galaxy.visualization.nebulaSeed },
                        uCameraDistance: { value: 0.0 },
                    },
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            );
            nebula.userData.id = galaxy.id;
            nebula.userData.galaxyName = galaxy.galaxyName;
            nebula.userData.galaxyType = galaxy.galaxyType;
            group.add(nebula);
            group.userData.isViewObject = true;
            this.galaxyMarkers.set(galaxy.id, group);
            this.scene.add(group);
            this.fadeObject(group, 1, 1000);
        }
        const marker = this.galaxyMarkers.get(galaxy.id)!;
        marker.position.set((i % 10 - 4.5) * 200, Math.floor(i / 10) * -200 + 200, 0);
        marker.lookAt(this.camera.position);
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

    const points = [];
    for (let i = 0; i < this.galaxies.length; i++) {
        for (let j = i + 1; j < this.galaxies.length; j++) {
            const marker1 = this.galaxyMarkers.get(this.galaxies[i].id);
            const marker2 = this.galaxyMarkers.get(this.galaxies[j].id);
            if(marker1 && marker2) {
                const dist = marker1.position.distanceTo(marker2.position);
                if (dist < 450) {
                    points.push(marker1.position);
                    points.push(marker2.position);
                }
            }
        }
    }
    if(points.length === 0) return;

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: 0x4a3b8e,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
    });
    this.darkMatterFilaments = new THREE.LineSegments(geometry, material);
    this.darkMatterFilaments.userData.isViewObject = true;
    this.scene.add(this.darkMatterFilaments);
    this.fadeObject(this.darkMatterFilaments, 1, 1000);
  }

  private updatePlanetVisuals() {
    const currentIds = new Set(this.activePlanets.map(p => p.celestial_body_id));
    
    // Remove old planet meshes and their orbits
    this.galaxyPlanetMeshes.forEach((mesh, id) => {
        if (!currentIds.has(id)) {
            this.scene.remove(mesh);
            mesh.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    (child.material as THREE.Material).dispose();
                } else if (child instanceof THREE.Sprite) {
                    child.material.dispose();
                }
            });
            this.galaxyPlanetMeshes.delete(id);

            const orbit = this.galaxyOrbits.get(id);
            if (orbit) {
                this.scene.remove(orbit);
                orbit.geometry.dispose();
                (orbit.material as THREE.Material).dispose();
                this.galaxyOrbits.delete(id);
            }
        }
    });

    // Add/update planets and orbits
    this.activePlanets.forEach(planet => {
        const coords = this.activePlanetCoords.get(planet.celestial_body_id);
        if (!coords) return;

        if (!this.galaxyPlanetMeshes.has(planet.celestial_body_id)) {
            const group = this.createPlanetMesh(planet);

            // Normalize scale for galaxy view
            const baseRadius = planet.planetRadiusEarths || 1;
            const desiredRadius = 1.5; // All planets will appear this size
            const scale = desiredRadius / baseRadius;
            group.userData.baseScale = scale; // Store base scale for animation
            group.scale.set(scale, scale, scale);

            const label = this.createSpriteLabel(planet.planetName);
            label.position.y = desiredRadius + 1.0; // Position above scaled planet
            group.add(label);
            
            group.position.set(...coords);
            group.userData.isViewObject = true;
            this.galaxyPlanetMeshes.set(planet.celestial_body_id, group);
            this.scene.add(group);
            this.fadeObject(group, 1, 500);
            
            // Create corresponding elliptical orbit
            const position = new THREE.Vector3(...coords);
            const radius = position.length(); // This is the distance to the planet
            const planetAngle = Math.atan2(position.z, position.x);

            let seed = 0;
            for (let j = 0; j < planet.celestial_body_id.length; j++) {
                seed += planet.celestial_body_id.charCodeAt(j);
            }
            const seededRandom = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
            
            const eccentricity = 0.1 + seededRandom(seed * 2) * 0.2;
            const a = radius; // Set semi-major axis to planet's distance
            const b = a * Math.sqrt(1 - eccentricity * eccentricity);
            
            const curve = new THREE.EllipseCurve(0, 0, a, b, 0, 2 * Math.PI, false, 0); // Unrotated curve
            const points = curve.getPoints(128);
            const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const orbitMaterial = new THREE.LineBasicMaterial({
                color: 0x61faff,
                transparent: true,
                opacity: 0.1,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
            // Rotate to XZ plane, then rotate around Y to align the major axis with the planet
            orbitLine.rotation.x = Math.PI / 2;
            orbitLine.rotation.y = planetAngle;
            
            orbitLine.userData.isViewObject = true;
            this.galaxyOrbits.set(planet.celestial_body_id, orbitLine);
            this.scene.add(orbitLine);
        }
    });
    this.updatePlanetHighlights();
  }

  private updateNavigationRoute() {
    // Clean up old route
    if (this.routeLine) {
        this.scene.remove(this.routeLine);
        if (this.routeLine instanceof THREE.Points || this.routeLine instanceof THREE.Mesh) {
            (this.routeLine.geometry as THREE.BufferGeometry).dispose();
            // FIX: Properly dispose of material(s), handling both single material and array of materials.
            const material = this.routeLine.material;
            if (Array.isArray(material)) {
                material.forEach(m => m.dispose());
            } else {
                material.dispose();
            }
        }
        this.routeLine = null;
    }

    if (!this.navigationRoute || this.navigationRoute.length < 2) return;

    const points = this.navigationRoute.map(
        (wp) => new THREE.Vector3(...wp.coords),
    );
    const curve = new THREE.CatmullRomCurve3(points);
    
    const numPoints = 1000;
    const curvePoints = curve.getPoints(numPoints);
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    
    // Add progress attribute for the shader
    const progress = new Float32Array(numPoints + 1);
    for(let i=0; i <= numPoints; i++) {
        progress[i] = i / numPoints;
    }
    geometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));

    const material = new THREE.ShaderMaterial({
        vertexShader: routeVs,
        fragmentShader: routeFs,
        uniforms: {
            uTime: { value: 0.0 },
            uSpeed: { value: 3.0 }, // Add speed uniform with a default
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    this.routeLine = new THREE.Points(geometry, material);
    this.routeLine.userData.isViewObject = true;
    this.scene.add(this.routeLine);
  }

  private updateSystemVisuals() {
    const selectedPlanet = this.activePlanets.find(p => p.celestial_body_id === this.selectedPlanetId);
    if (!selectedPlanet) return;
    
    this.systemGroup = new THREE.Group();
    this.systemGroup.userData.isViewObject = true;
    
    // Create star
    const starTypeMap = {'G-type main-sequence': 1, 'K-type orange dwarf': 2, 'M-type red dwarf': 3, 'Pulsar': 4};
    const starMaterial = new THREE.ShaderMaterial({
        vertexShader: starVs, fragmentShader: starFs,
        uniforms: {
            uTime: { value: 0.0 },
            uColor1: { value: new THREE.Color(0xffe484) },
            uColor2: { value: new THREE.Color(0xff8833) },
            uStarType: { value: starTypeMap[selectedPlanet.starType as keyof typeof starTypeMap] || 1 }
        },
        transparent: true, blending: THREE.AdditiveBlending,
    });
    this.starMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 64), starMaterial);
    this.systemGroup.add(this.starMesh);

    // Create planets
    this.activePlanets.filter(p => p.starSystem === selectedPlanet.starSystem).forEach((planet, i) => {
        const planetGroup = this.createPlanetMesh(planet);
        const orbitRadius = 20 + (planet.planetRadiusEarths || 1) * 2 + i * 15;
        
        let seed = 0;
        for (let j = 0; j < planet.celestial_body_id.length; j++) {
            seed += planet.celestial_body_id.charCodeAt(j);
        }
        const seededRandom = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
        const eccentricity = 0.05 + seededRandom(seed) * 0.15;
        
        planetGroup.userData.orbitRadius = orbitRadius; // semi-major axis 'a'
        planetGroup.userData.orbitSpeed = 0.1 / Math.sqrt(orbitRadius);
        planetGroup.userData.orbitEccentricity = eccentricity;

        this.systemPlanetMeshes.set(planet.celestial_body_id, planetGroup);
        this.systemGroup!.add(planetGroup);
        
        const a = orbitRadius;
        const c = a * eccentricity;
        const b = Math.sqrt(a*a - c*c);

        const curve = new THREE.EllipseCurve(c, 0, a, b, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(256);
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x61faff,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        orbitLine.rotation.x = Math.PI / 2;
        this.systemOrbits.set(planet.celestial_body_id, orbitLine);
        this.systemGroup!.add(orbitLine);
    });
    
    this.scene.add(this.systemGroup);
    this.fadeObject(this.systemGroup, 1, 1000);
    this.updatePlanetHighlights();
    this.updateSystemCameraTarget();
  }

  private updatePlanetHighlights() {
    const meshes = this.viewMode === 'galaxy' ? this.galaxyPlanetMeshes : this.systemPlanetMeshes;
    meshes.forEach((group, id) => {
        const isSelected = id === this.selectedPlanetId;
        const isHovered = id === this.hoveredObjectId;

        group.traverse(child => {
            if (child instanceof THREE.Mesh) {
                if (child.material instanceof THREE.ShaderMaterial) {
                    if (child.material.uniforms.uIsSelected) {
                        child.material.uniforms.uIsSelected.value = isSelected;
                    }
                    if (child.material.uniforms.uIsHovered) {
                        child.material.uniforms.uIsHovered.value = isHovered;
                    }
                } else if (child.material instanceof THREE.MeshBasicMaterial) {
                    child.material.color.set(isSelected ? 0x61faff : 0xffffff);
                    child.material.opacity = isSelected || isHovered ? 1.0 : 0.6;
                }
            } else if (child instanceof THREE.Sprite) {
                child.visible = isSelected || isHovered;
            }
        });
    });

    if (this.viewMode === 'galaxy') {
        this.galaxyOrbits.forEach((orbit, id) => {
            const isSelected = id === this.selectedPlanetId;
            (orbit.material as THREE.LineBasicMaterial).userData.isSelected = isSelected;
        });
    }
  }

  private updateSystemCameraTarget() {
    if (this.viewMode !== 'system') return;
    this.isManualControl = false;
    const selectedMesh = this.systemPlanetMeshes.get(this.selectedPlanetId!);
    const selectedPlanet = this.activePlanets.find(p => p.celestial_body_id === this.selectedPlanetId);
    if (selectedMesh && selectedPlanet) {
        const worldPos = new THREE.Vector3();
        selectedMesh.getWorldPosition(worldPos);
        this.targetLookAt.copy(worldPos);
        const offset = new THREE.Vector3(0, 3, (selectedPlanet.planetRadiusEarths || 1) * 5);
        this.targetPosition.copy(worldPos).add(offset);
    } else {
        // Look at the star if no planet selected
        this.targetPosition.set(0, 20, 80);
        this.targetLookAt.set(0, 0, 0);
    }
  }

  private createStarfield() {
    const geometry = new THREE.BufferGeometry();
    const count = 200000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 4000;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 4000;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 4000;
        
        // Generate a more plausible distribution of star colors.
        const rand = Math.random();
        if (rand < 0.8) { // 80% are blue/white stars
            color.setHSL(0.55 + Math.random() * 0.15, 0.5 + Math.random() * 0.5, 0.7 + Math.random() * 0.2);
        } else if (rand < 0.95) { // 15% are yellow/white stars
            color.setHSL(0.1 + Math.random() * 0.05, 0.7 + Math.random() * 0.3, 0.8 + Math.random() * 0.1);
        } else { // 5% are reddish stars
            color.setHSL(0.0 + Math.random() * 0.05, 0.8 + Math.random() * 0.2, 0.7 + Math.random() * 0.1);
        }
        
        colors[i * 3 + 0] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        // Tweak scale for a more subtle distribution with fewer large stars.
        scales[i] = Math.pow(Math.random(), 4.0) * 6.0 + 0.5;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    const material = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0.0 }, uPixelRatio: { value: window.devicePixelRatio } },
        vertexShader: starfieldVs,
        fragmentShader: starfieldFs,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true,
    });
    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }
  
  private createWarpStarfield() {
    const numParticles = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(numParticles * 3);
    for (let i = 0; i < numParticles; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    this.warpStarfield = new THREE.Points(geometry, material);
    this.warpStarfield.visible = false;
    this.scene.add(this.warpStarfield);
  }

  private startWarpEffect() {
    this.warpEffectActive = true;
    this.warpStartTime = this.clock.getElapsedTime();
    this.warpStarfield.visible = true;
    this.starfield.visible = false; // Hide normal stars
    this.controls.enabled = false;
  }

  private updateWarpEffect(elapsedTime: number) {
    const warpDuration = 2.5;
    const progress = (elapsedTime - this.warpStartTime) / warpDuration;
    if (progress >= 1.0) {
      this.warpEffectActive = false;
      this.warpStarfield.visible = false;
      this.starfield.visible = true;
      this.controls.enabled = true;
      return;
    }
    
    // Stretch effect
    const stretch = 1.0 + progress * 20.0;
    this.warpStarfield.scale.z = stretch;
    
    // Fade in/out
    const opacity = Math.sin(progress * Math.PI);
    (this.warpStarfield.material as THREE.PointsMaterial).opacity = opacity;
  }

  private createBackgroundNebulae() {
    for (let i = 0; i < 6; i++) {
        const geometry = new THREE.PlaneGeometry(1500, 1500);
        const material = new THREE.ShaderMaterial({
            vertexShader: nebulaVs,
            fragmentShader: nebulaFs,
            uniforms: {
                uTime: { value: 0.0 },
                uColor1: { value: new THREE.Color(this.colors[i % this.colors.length]) },
                uColor2: { value: new THREE.Color(this.colors[(i + 2) % this.colors.length]) },
                uSeed: { value: Math.random() * 100 },
                uCameraDistance: { value: 0.0 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const nebula = new THREE.Mesh(geometry, material);
        nebula.position.set((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 2000 - 1000);
        nebula.lookAt(this.camera.position);
        this.backgroundNebulae.push(nebula);
        this.scene.add(nebula);
    }
  }

  private createSpaceCreatures() {
    for(let i=0; i<5; i++) {
        const geometry = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(-15,0,0), new THREE.Vector3(15,0,0)), 64, 0.5, 8, false);
        const material = new THREE.ShaderMaterial({
            vertexShader: creatureVs,
            fragmentShader: creatureFs,
            uniforms: {
                uTime: { value: 0.0 },
                uSpeed: { value: 2.0 + Math.random() * 2.0 },
                uAmplitude: { value: 1.0 + Math.random() * 2.0 },
                uFrequency: { value: 0.5 + Math.random() * 0.5 },
                uColor: { value: new THREE.Color().setHSL(0.5 + Math.random() * 0.2, 1.0, 0.6) }
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        const creature = new THREE.Group();
        creature.add(new THREE.Mesh(geometry, material));

        const path = {
            center: new THREE.Vector3((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 1000),
            rx: 200 + Math.random() * 200,
            ry: 50 + Math.random() * 50,
            rz: 200 + Math.random() * 200,
            speed: 0.02 + Math.random() * 0.02,
            offset: Math.random() * Math.PI * 2,
        }
        
        creature.userData.update = (time: number) => {
            const angle = time * path.speed + path.offset;
            creature.position.set(
                path.center.x + Math.cos(angle) * path.rx,
                path.center.y + Math.sin(angle * 2) * path.ry,
                path.center.z + Math.sin(angle) * path.rz
            );
            creature.lookAt(
                path.center.x + Math.cos(angle + 0.1) * path.rx,
                path.center.y + Math.sin((angle + 0.1) * 2) * path.ry,
                path.center.z + Math.sin(angle + 0.1) * path.rz
            );
        };
        
        creature.visible = false;
        this.spaceCreatures.push(creature);
        this.scene.add(creature);
    }
  }

  private createSpriteLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const fontSize = 24;
    context.font = `${fontSize}px Exo 2`;
    const width = context.measureText(text).width;
    canvas.width = width;
    canvas.height = fontSize;
    context.font = `${fontSize}px Exo 2`;
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fillText(text, 0, fontSize - 4);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(width/fontSize * 3, 3, 1.0);
    return sprite;
  }

  private createPlanetMesh(planet: PlanetData): THREE.Group {
    const group = new THREE.Group();
    group.userData.id = planet.celestial_body_id;

    const textureTypeMap: {[key: string]: number} = { TERRESTRIAL: 1, GAS_GIANT: 2, VOLCANIC: 3, ICY: 4, ORGANIC: 5 };
    const planetMaterial = new THREE.ShaderMaterial({
        vertexShader: planetVs, fragmentShader: planetFs,
        uniforms: {
            uTime: { value: 0.0 },
            uColor1: { value: new THREE.Color(planet.visualization.color1) },
            uColor2: { value: new THREE.Color(planet.visualization.color2) },
            uOceanColor: { value: new THREE.Color(planet.visualization.oceanColor || '#000033') },
            uCloudiness: { value: planet.visualization.cloudiness || 0.0 },
            uIceCoverage: { value: planet.visualization.iceCoverage || 0.0 },
            uTextureType: { value: textureTypeMap[planet.visualization.surfaceTexture] || 1 },
            uIsSelected: { value: false }, uIsHovered: { value: false },
            uAxialTilt: { value: Math.random() * 0.5 },
            uLightDirection: { value: new THREE.Vector3(0,0,0) },
        }
    });
    const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(planet.planetRadiusEarths || 1, 64, 64), planetMaterial);
    sphereMesh.userData.id = planet.celestial_body_id;
    group.add(sphereMesh);

    const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: atmosphereVs, fragmentShader: atmosphereFs,
        uniforms: {
            uAtmosphereColor: { value: new THREE.Color(planet.visualization.atmosphereColor) },
            uFresnelPower: { value: 4.0 }, uTime: { value: 0.0 },
            uIsSelected: { value: false },
            uHasAuroras: { value: planet.visualization.surfaceTexture === 'ICY' || planet.visualization.iceCoverage > 0.5 },
            uLightDirection: { value: new THREE.Vector3(0,0,0) },
        },
        blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true
    });
    const atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry((planet.planetRadiusEarths || 1) * 1.05, 64, 64), atmosphereMaterial);
    group.add(atmosphereMesh);

    return group;
  }

  private createShockwave(position: THREE.Vector3) {
    const geometry = new THREE.RingGeometry(0.1, 1, 64);
    const material = new THREE.MeshBasicMaterial({
        color: 0x61faff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.lookAt(this.camera.position);
    this.scene.add(mesh);
    this.shockwaves.push({ mesh, startTime: this.clock.getElapsedTime(), duration: 1.5 });
  }

  private updateShockwaves(elapsedTime: number) {
    this.shockwaves = this.shockwaves.filter(wave => {
        const age = elapsedTime - wave.startTime;
        if (age > wave.duration) {
            this.scene.remove(wave.mesh);
            wave.mesh.geometry.dispose();
            (wave.mesh.material as THREE.Material).dispose();
            return false;
        }
        const progress = age / wave.duration;
        const scale = 1 + progress * 50;
        wave.mesh.scale.set(scale, scale, scale);
        (wave.mesh.material as THREE.MeshBasicMaterial).opacity = 1.0 - progress;
        return true;
    });
  }

  // --- SCENE OBJECT CREATION & UPDATES ---

  private updateGalaxyVisuals() {
    const activeGalaxy = this.galaxies.find(g => g.id === this.activeGalaxyId);
    if (!activeGalaxy) return;

    if (!this.galaxyInteractionPlane) {
        const planeGeom = new THREE.PlaneGeometry(300, 300);
        const planeMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
        this.galaxyInteractionPlane = new THREE.Mesh(planeGeom, planeMat);
        this.galaxyInteractionPlane.rotation.x = -Math.PI / 2;
        this.galaxyInteractionPlane.userData.isInteractionPlane = true;
        this.scene.add(this.galaxyInteractionPlane);
    }
    this.galaxyInteractionPlane.visible = true;

    this.galaxyVisuals = this.createGalaxyPointCloud(activeGalaxy);
    this.galaxyVisuals.userData.isViewObject = true;
    this.scene.add(this.galaxyVisuals);
    this.fadeObject(this.galaxyVisuals, 1, 1000);
  }

  private createGalaxyPointCloud(galaxyData: GalaxyData): THREE.Points {
    const params = {
        count: 150000, size: 1.5, radius: 150, spin: 1.5,
        randomness: 0.5,
        randomnessPower: 3.5
    };

    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const branchAngles = new Float32Array(params.count);
    const colorInside = new THREE.Color(galaxyData.visualization.color1);
    const colorOutside = new THREE.Color(galaxyData.visualization.color2);
    const hotColor = new THREE.Color(0xff61c3); 

    let branches = 5;
    if (galaxyData.galaxyType.toLowerCase().includes('barred')) branches = 2;
    if (galaxyData.galaxyType.toLowerCase().includes('elliptical')) branches = 0;
    this.galaxyDataCache.numBranches = branches;

    for (let i = 0; i < params.count; i++) {
        const i3 = i * 3;
        const radius = Math.pow(Math.random(), 2.5) * params.radius; 
        const spinAngle = radius * params.spin;
        const branchAngle = ((i % branches) / branches) * Math.PI * 2;
        
        branchAngles[i] = branchAngle;
        
        const angleRandomness = (Math.random() - 0.5) * 0.2;
        const effectiveBranchAngle = branchAngle + angleRandomness;

        const randomX = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
        const randomY = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * 0.2;
        const randomZ = Math.pow(Math.random(), params.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * params.randomness * radius;
        
        positions[i3 + 0] = Math.cos(effectiveBranchAngle + spinAngle) * radius + randomX;
        positions[i3 + 1] = randomY;
        positions[i3 + 2] = Math.sin(effectiveBranchAngle + spinAngle) * radius + randomZ;

        const mixedColor = colorInside.clone().lerp(colorOutside, radius / params.radius);
        
        const clumpFactor = Math.sin(branchAngle * 8.0 - radius * 0.1 + 5.0) * 0.5 + 0.5;
        const starFormationChance = Math.pow(clumpFactor, 4.0) * (1.0 - radius / params.radius);

        if (Math.random() < starFormationChance * 0.3) {
            mixedColor.lerp(hotColor, 0.6);
        }

        colors[i3 + 0] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aBranchAngle', new THREE.BufferAttribute(branchAngles, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uSize: { value: params.size },
            uHoveredSectorIndex: { value: -1 },
            uNumBranches: { value: branches },
        },
        vertexShader: galaxyVs,
        fragmentShader: galaxyFs,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true,
    });
    
    return new THREE.Points(geometry, material);
  }

  render() {
    const tooltipStyles = {
      left: `${this.tooltip.x + 15}px`,
      top: `${this.tooltip.y + 15}px`,
      opacity: this.tooltip.visible ? 1 : 0,
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
        background: rgba(1, 2, 6, 0.8);
        border: 1px solid rgba(97, 250, 255, 0.4);
        color: #c0f0ff;
        padding: 4px 8px;
        border-radius: 4px;
        pointer-events: none;
        transition: opacity 0.2s;
        font-size: 0.8rem;
    }
  `;
}