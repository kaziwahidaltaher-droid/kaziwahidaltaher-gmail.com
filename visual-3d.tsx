/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, html, css, PropertyValueMap, nothing} from 'lit';
import {customElement, property, state, query} from 'lit/decorators.js';
import * as THREE from 'three';
import {
  EffectComposer,
} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {
  UnrealBloomPass,
} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js';
import {
  CSS2DRenderer,
  CSS2DObject,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as TWEEN from '@tweenjs/tween.js';

import type {
  PlanetData,
  GalaxyData,
  GroundingChunk,
  Annotation,
  ML_Lab_State,
} from './index.tsx';
import {vs as starfieldVs, fs as starfieldFs} from './starfield-shaders.tsx';
import {vs as galaxyVs, fs as galaxyFs} from './galaxy-point-shaders.tsx';
import {vs as planetVs, fs as planetFs} from './planet-shader.tsx';
import {
  vs as atmosphereVs,
  fs as atmosphereFs,
} from './atmosphere-shader.tsx';

const GALAXY_RADIUS = 20;
const GALAXY_THICKNESS = 1.5;
const GALAXY_PARTICLE_COUNT = 80000;
const GALAXY_PARTICLE_SIZE = 1.5;

const INTERGALACTIC_CAMERA_POS = new THREE.Vector3(0, 150, 250);
const GALAXY_CAMERA_POS = new THREE.Vector3(0, 40, 70);
const PLANET_CAMERA_POS = new THREE.Vector3(0, 3, 10);

const trailVs = `
  attribute float alpha;
  attribute float size;
  varying float vAlpha;

  void main() {
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const trailFs = `
  uniform vec3 color;
  uniform float uTime;
  uniform float uPulseIntensity;
  varying float vAlpha;

  void main() {
    if (vAlpha <= 0.0) {
      discard;
    }
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    if (d > 0.5) {
      discard;
    }

    // Gentle pulse effect. sin maps to [-1, 1], so we map it to [0, 1].
    // The pulse is faster for more intense trails.
    float pulse = (sin(uTime * (1.5 + uPulseIntensity) - vAlpha * 8.0) + 1.0) * 0.5;
    
    // Modulate the alpha with the pulse.
    // Base alpha is vAlpha. Pulse adds on top of it.
    // The range will be from vAlpha to vAlpha * (1 + 0.5 * uPulseIntensity)
    float pulseAlpha = vAlpha * (1.0 + pulse * 0.5 * uPulseIntensity);

    gl_FragColor = vec4(color, pulseAlpha * pow(1.0 - d * 2.0, 2.0));
  }
`;

export type FocusType =
  | 'intergalactic'
  | 'galaxy'
  | 'planet'
  | 'solar_system'
  | 'solar_system_planet'
  | 'earth'
  | 'nebula'
  | 'research'
  | 'imap';

export interface FocusChangeEvent {
  type: FocusType;
  id?: string;
}

@customElement('axee-visuals-3d')
export class AxeeVisuals3D extends LitElement {
  @property({type: Array}) galaxiesData: GalaxyData[] = [];
  @property({type: Object}) currentFocus: FocusChangeEvent = {
    type: 'intergalactic',
  };
  @property({type: Boolean}) isScanning = false;
  @property({type: Array}) groundingChunks: GroundingChunk[] = [];
  @property({type: Array}) annotations: Annotation[] = [];
  @property({type: String}) activeAnnotationId: string | null = null;
  @property({type: Boolean}) isDrawingAnnotation = false;
  @property({type: Object}) mlLabState?: ML_Lab_State;
  @property({type: Boolean}) isComparisonModeActive = false;
  @property({type: Array}) comparisonList: string[] = [];

  @query('canvas') private canvasEl!: HTMLCanvasElement;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private labelRenderer!: CSS2DRenderer;
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private mousePosition = new THREE.Vector2();

  private starfield?: THREE.Points;
  private galaxyGroup = new THREE.Group();
  private objectMap = new Map<string, THREE.Object3D>();
  private materialsMap = new Map<
    string,
    THREE.ShaderMaterial | THREE.ShaderMaterial[]
  >();
  private trailSystems = new Map<
    string,
    {
      points: THREE.Points;
      attributes: {
        positions: THREE.BufferAttribute;
        alphas: THREE.BufferAttribute;
        sizes: THREE.BufferAttribute;
        lifetimes: Float32Array;
      };
      currentIndex: number;
    }
  >();

  private isShaking = false;
  private shakeDuration = 0;
  private shakeStartTime = 0;
  private shakeIntensity = 0;
  private initialCameraPos = new THREE.Vector3();

  private animationFrameId = 0;
  private cameraTween: TWEEN.Tween<THREE.Vector3> | null = null;
  private targetTween: TWEEN.Tween<THREE.Vector3> | null = null;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      cursor: default;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .label {
      color: #fff;
      font-family: 'Orbitron', sans-serif;
      text-shadow: 0 0 5px #0f0;
      font-size: 14px;
      background: rgba(0, 20, 0, 0.5);
      padding: 2px 8px;
      border: 1px solid #0f0;
      border-radius: 4px;
      cursor: pointer;
      pointer-events: auto; /* Allow clicks on labels */
    }
    .label.hidden {
      display: none;
    }
  `;

  render() {
    return html`<canvas></canvas>`;
  }

  connectedCallback() {
    super.connectedCallback();
    // FIX: Cast `this` to `any` to resolve TypeScript error about missing 'addEventListener' property.
    (this as any).addEventListener('click', this.onCanvasClick);
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('mousemove', this.onMouseMove);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    // FIX: Cast `this` to `any` to resolve TypeScript error about missing 'removeEventListener' property.
    (this as any).removeEventListener('click', this.onCanvasClick);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.trailSystems.forEach((system, planetId) => {
      this.removePlanetTrail(planetId);
    });
    this.renderer?.dispose();
    this.labelRenderer?.domElement.remove();
  }

  firstUpdated() {
    this.initThree();
    this._renderLoop();
  }

  protected updated(
    changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>,
  ): void {
    if (changedProperties.has('galaxiesData')) {
      const oldData = changedProperties.get('galaxiesData') as
        | GalaxyData[]
        | undefined;
      if (oldData && this.galaxiesData.length > oldData.length) {
        this.triggerCameraShake(0.3, 500);
      }
      this.updateGalaxyVisuals();
    }
    if (changedProperties.has('currentFocus')) {
      const oldFocus = changedProperties.get('currentFocus') as
        | FocusChangeEvent
        | undefined;
      this.transitionView(oldFocus);
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    // FIX: Use `this.canvasEl` for dimensions to resolve TypeScript error.
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvasEl.clientWidth / this.canvasEl.clientHeight,
      0.1,
      10000,
    );
    this.camera.position.copy(INTERGALACTIC_CAMERA_POS);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasEl,
      antialias: true,
      alpha: true,
    });
    // FIX: Use `this.canvasEl` for dimensions to resolve TypeScript error.
    this.renderer.setSize(this.canvasEl.clientWidth, this.canvasEl.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const renderPass = new RenderPass(this.scene, this.camera);
    // FIX: Use `this.canvasEl` for dimensions to resolve TypeScript error.
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.canvasEl.clientWidth, this.canvasEl.clientHeight),
      0.8,
      0.5,
      0.1,
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(bloomPass);

    this.labelRenderer = new CSS2DRenderer();
    // FIX: Use `this.canvasEl` for dimensions to resolve TypeScript error.
    this.labelRenderer.setSize(this.canvasEl.clientWidth, this.canvasEl.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    // FIX: Cast `this` to `any` to resolve TypeScript error about missing 'shadowRoot' property.
    (this as any).shadowRoot!.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.canvasEl);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 800;
    this.controls.target.set(0, 0, 0);

    this.createStarfield();
    this.scene.add(this.galaxyGroup);
  }

  private createStarfield() {
    const vertices = [];
    const colors = [];
    const scales = [];
    const starCount = 200000;
    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const x = THREE.MathUtils.randFloatSpread(4000);
      const y = THREE.MathUtils.randFloatSpread(4000);
      const z = THREE.MathUtils.randFloatSpread(4000);
      vertices.push(x, y, z);

      color.setHSL(THREE.MathUtils.randFloat(0.5, 0.7), 1.0, 0.9);
      colors.push(color.r, color.g, color.b);
      scales.push(THREE.MathUtils.randFloat(1, 3));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute(
      'aScale',
      new THREE.Float32BufferAttribute(scales, 1),
    );

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {value: 0},
        uMousePos: {value: new THREE.Vector2(0, 0)},
      },
      vertexShader: starfieldVs,
      fragmentShader: starfieldFs,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
    this.materialsMap.set('starfield', material);
  }

  private updateGalaxyVisuals() {
    const currentGalaxyIds = new Set(this.galaxiesData.map((g) => g.id));
    // FIX: Explicitly typed `sceneGalaxyIds` as `Set<string>` to prevent it from being inferred as `Set<never>`.
    const sceneGalaxyIds = new Set<string>();

    for (const child of this.galaxyGroup.children) {
      if (child.userData.id && typeof child.userData.id === 'string') {
        sceneGalaxyIds.add(child.userData.id);
      }
    }

    for (const sceneId of sceneGalaxyIds) {
      if (!currentGalaxyIds.has(sceneId)) {
        const galaxyObj = this.objectMap.get(sceneId);
        if (galaxyObj) {
          galaxyObj.traverse((child) => {
            if (
              (child as THREE.Points).isPoints ||
              (child as THREE.Mesh).isMesh
            ) {
              const mesh = child as THREE.Points | THREE.Mesh;
              mesh.geometry.dispose();
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((m) => m.dispose());
              } else {
                mesh.material.dispose();
              }
            } else if (child instanceof CSS2DObject) {
              child.element.remove();
            }
          });
          this.galaxyGroup.remove(galaxyObj);
          this.objectMap.delete(sceneId);
          // Clean up materials from the map
          for (const key of this.materialsMap.keys()) {
            if (key.startsWith(`galaxy-${sceneId}`)) {
              this.materialsMap.delete(key);
            }
          }
        }
      }
    }

    for (const galaxyData of this.galaxiesData) {
      if (!sceneGalaxyIds.has(galaxyData.id)) {
        this.createGalaxy(galaxyData);
      }
      this.updatePlanetVisuals(galaxyData);
    }
  }

  private createGalaxyPoints(
    galaxyData: GalaxyData,
    particleCount: number,
    sizeMultiplier: number,
  ): THREE.Points {
    const vertices = [];
    const colors = [];
    const scales = [];
    const colorInside = new THREE.Color(galaxyData.visualization.insideColor);
    const colorOutside = new THREE.Color(
      galaxyData.visualization.outsideColor,
    );

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.random() * GALAXY_RADIUS;
      const spinAngle =
        radius * (galaxyData.visualization.armTightness ?? 1.0);
      const branchAngle = (i % 5) * ((2 * Math.PI) / 5);
      const randomX =
        Math.pow(Math.random(), 2) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.5;
      const randomY =
        Math.pow(Math.random(), 2) *
        (Math.random() < 0.5 ? 1 : -1) *
        GALAXY_THICKNESS;
      const randomZ =
        Math.pow(Math.random(), 2) *
        (Math.random() < 0.5 ? 1 : -1) *
        0.5;

      const x = Math.cos(branchAngle + spinAngle) * radius + randomX;
      const y = randomY;
      const z = Math.sin(branchAngle + spinAngle) * radius + randomZ;
      vertices.push(x, y, z);

      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, radius / GALAXY_RADIUS);
      colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
      scales.push(THREE.MathUtils.randFloat(0.5, 1.2));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute(
      'aScale',
      new THREE.Float32BufferAttribute(scales, 1),
    );

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {value: 0},
        uSize: {value: GALAXY_PARTICLE_SIZE * sizeMultiplier},
        uSpinRate: {value: 0.05},
        uMousePos: {value: new THREE.Vector3()},
        uMouseInteraction: {value: 0},
        uGravityAmount: {value: 0.0},
      },
      vertexShader: galaxyVs,
      fragmentShader: galaxyFs,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });

    this.materialsMap.set(`galaxy-${galaxyData.id}-${particleCount}`, material);

    const points = new THREE.Points(geometry, material);
    return points;
  }

  private createGalaxy(galaxyData: GalaxyData) {
    const galaxyContainer = new THREE.Group();
    galaxyContainer.userData = {id: galaxyData.id, type: 'galaxy'};

    const galaxyLOD = new THREE.LOD();

    const highDetailPoints = this.createGalaxyPoints(
      galaxyData,
      GALAXY_PARTICLE_COUNT,
      1.0,
    );
    galaxyLOD.addLevel(highDetailPoints, 0);

    const mediumDetailPoints = this.createGalaxyPoints(galaxyData, 20000, 1.5);
    galaxyLOD.addLevel(mediumDetailPoints, 120);

    const lowDetailPoints = this.createGalaxyPoints(galaxyData, 5000, 2.0);
    galaxyLOD.addLevel(lowDetailPoints, 300);

    galaxyContainer.add(galaxyLOD);

    const galaxyPosition = new THREE.Vector3(
      (this.galaxyGroup.children.length % 5) * 80 - 160,
      0,
      Math.floor(this.galaxyGroup.children.length / 5) * 80 - 80,
    );
    galaxyContainer.position.copy(galaxyPosition);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.textContent = galaxyData.name;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, GALAXY_THICKNESS + 2, 0);
    galaxyContainer.add(label);

    labelDiv.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      // FIX: Cast `this` to `any` to resolve TypeScript error about missing 'dispatchEvent' property.
      (this as any).dispatchEvent(
        new CustomEvent('focus-changed', {
          detail: {type: 'galaxy', id: galaxyData.id},
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.galaxyGroup.add(galaxyContainer);
    this.objectMap.set(galaxyData.id, galaxyContainer);
  }

  private createPlanetVisual(
    planetData: PlanetData,
    detail: 'high' | 'medium' | 'low',
  ): THREE.Group {
    const planetGroup = new THREE.Group();
    const planetId = planetData.celestial_body_id;

    const planetSize =
      planetData.visualization.surfaceTexture === 'GAS_GIANT' ? 2.5 : 1.0;
    const isHabitable = planetData.potentialForLife.assessment
      .toLowerCase()
      .includes('habitable');
    const segments = detail === 'high' ? 64 : detail === 'medium' ? 24 : 10;

    const geometry = new THREE.SphereGeometry(
      planetSize,
      segments,
      segments / 2,
    );

    // Reuse or create planet surface material
    const planetMaterialKey = `planet-${planetId}`;
    let planetMaterial = this.materialsMap.get(
      planetMaterialKey,
    ) as THREE.ShaderMaterial;
    if (!planetMaterial) {
      const textureTypeMap: {[key:string]: number} = {
        TERRESTRIAL: 1,
        GAS_GIANT: 2,
        VOLCANIC: 3,
        ICY: 1,
      };
      planetMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: {value: 0},
          uColor1: {
            value: new THREE.Color(planetData.visualization.color1),
          },
          uColor2: {
            value: new THREE.Color(planetData.visualization.color2),
          },
          uOceanColor: {
            value: new THREE.Color(planetData.visualization.oceanColor),
          },
          uCloudiness: {value: planetData.visualization.cloudiness},
          uIceCoverage: {value: planetData.visualization.iceCoverage},
          uTextureType: {
            value:
              textureTypeMap[planetData.visualization.surfaceTexture] || 1,
          },
          uHabitable: {value: isHabitable ? 1.0 : 0.0},
        },
        vertexShader: planetVs,
        fragmentShader: planetFs,
      });
      this.materialsMap.set(planetMaterialKey, planetMaterial);
    }
    const planetMesh = new THREE.Mesh(geometry, planetMaterial);
    planetMesh.userData = {type: 'planet_mesh'};
    planetGroup.add(planetMesh);

    // Atmosphere and Glow for high/medium detail
    if (detail === 'high' || detail === 'medium') {
      if (planetData.visualization.surfaceTexture !== 'GAS_GIANT') {
        const atmosphereGeo = new THREE.SphereGeometry(
          planetSize * 1.05,
          segments,
          segments / 2,
        );
        const atmosphereMaterialKey = `atmosphere-${planetId}`;
        let atmosphereMat = this.materialsMap.get(
          atmosphereMaterialKey,
        ) as THREE.ShaderMaterial;
        if (!atmosphereMat) {
          atmosphereMat = new THREE.ShaderMaterial({
            uniforms: {
              uAtmosphereColor: {
                value: new THREE.Color(
                  planetData.visualization.atmosphereColor,
                ),
              },
              uTime: {value: 0},
            },
            vertexShader: atmosphereVs,
            fragmentShader: atmosphereFs,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
          });
          this.materialsMap.set(atmosphereMaterialKey, atmosphereMat);
        }
        const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        atmosphereMesh.userData = {type: 'atmosphere_mesh'};
        planetGroup.add(atmosphereMesh);
      }

      if (detail === 'high' && isHabitable) {
        const glowGeo = new THREE.SphereGeometry(planetSize * 1.15, 32, 16);
        const glowMat = new THREE.ShaderMaterial({
          uniforms: {
            uGlowColor: {value: new THREE.Color(0x99ff99)},
          },
          vertexShader: atmosphereVs,
          fragmentShader: `
              varying vec3 vNormal;
              varying vec3 vViewDirection;
              uniform vec3 uGlowColor;
              void main() {
                float fresnel = 1.0 - dot(vNormal, vViewDirection);
                fresnel = pow(fresnel, 3.0);
                gl_FragColor = vec4(uGlowColor, fresnel * 0.6);
              }
            `,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.userData = {type: 'habitable_glow'};
        planetGroup.add(glowMesh);
      }
    }

    if (detail === 'high') {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'label';
      labelDiv.textContent = planetData.planetName;
      const label = new CSS2DObject(labelDiv);
      label.position.set(0, planetSize + 0.5, 0);
      planetGroup.add(label);

      labelDiv.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (this.isComparisonModeActive) {
          // FIX: Cast `this` to `any` to resolve TypeScript error about missing 'dispatchEvent' property.
          (this as any).dispatchEvent(
            new CustomEvent('toggle-comparison-planet', {
              detail: {planetId: planetId},
              bubbles: true,
              composed: true,
            }),
          );
        } else {
          // FIX: Cast `this` to `any` to resolve TypeScript error about missing 'dispatchEvent' property.
          (this as any).dispatchEvent(
            new CustomEvent('focus-changed', {
              detail: {type: 'planet', id: planetId},
              bubbles: true,
              composed: true,
            }),
          );
        }
      });
    }
    return planetGroup;
  }

  private updatePlanetVisuals(galaxyData: GalaxyData) {
    const galaxyContainer = this.objectMap.get(galaxyData.id);
    if (!galaxyContainer) return;

    const currentPlanetIds = new Set(galaxyData.planets.keys());
    // FIX: Explicitly typed `scenePlanetIds` as `Set<string>` to prevent it from being inferred as `Set<never>`.
    const scenePlanetIds = new Set<string>();

    for (const child of galaxyContainer.children) {
      if (
        child.userData.type === 'planet' &&
        child.userData.id &&
        typeof child.userData.id === 'string'
      ) {
        scenePlanetIds.add(child.userData.id);
      }
    }

    for (const sceneId of scenePlanetIds) {
      if (!currentPlanetIds.has(sceneId)) {
        const planetObj = this.objectMap.get(sceneId);
        if (planetObj) {
          planetObj.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).geometry.dispose();
            } else if (child instanceof CSS2DObject) {
              child.element.remove();
            }
          });
          galaxyContainer.remove(planetObj);
          this.removePlanetTrail(sceneId);
          this.objectMap.delete(sceneId);

          const planetMat = this.materialsMap.get(`planet-${sceneId}`);
          if (planetMat && !Array.isArray(planetMat)) planetMat.dispose();
          this.materialsMap.delete(`planet-${sceneId}`);

          const atmosphereMat = this.materialsMap.get(`atmosphere-${sceneId}`);
          if (atmosphereMat && !Array.isArray(atmosphereMat))
            atmosphereMat.dispose();
          this.materialsMap.delete(`atmosphere-${sceneId}`);
        }
      }
    }

    for (const [planetId, planetData] of galaxyData.planets) {
      let planetLOD = this.objectMap.get(planetId) as THREE.LOD;

      if (!planetLOD) {
        planetLOD = new THREE.LOD();
        planetLOD.userData = {
          id: planetId,
          type: 'planet',
          galaxyId: galaxyData.id,
        };

        const highDetailGroup = this.createPlanetVisual(planetData, 'high');
        planetLOD.addLevel(highDetailGroup, 0);

        const mediumDetailGroup = this.createPlanetVisual(planetData, 'medium');
        planetLOD.addLevel(mediumDetailGroup, 40);

        const lowDetailGroup = this.createPlanetVisual(planetData, 'low');
        planetLOD.addLevel(lowDetailGroup, 90);

        galaxyContainer.add(planetLOD);
        this.objectMap.set(planetId, planetLOD);
        this.createPlanetTrail(planetData);
      }

      const time = this.clock.getElapsedTime();
      const orbitRadius =
        Array.from(galaxyData.planets.keys()).indexOf(planetId) * 5 + 10;
      planetLOD.position.x =
        Math.cos((time * 0.1) / (orbitRadius / 10)) * orbitRadius;
      planetLOD.position.z =
        Math.sin((time * 0.1) / (orbitRadius / 10)) * orbitRadius;
    }
  }

  private createPlanetTrail(planetData: PlanetData) {
    const TRAIL_LENGTH = 300;
    const positions = new Float32Array(TRAIL_LENGTH * 3);
    const alphas = new Float32Array(TRAIL_LENGTH);
    const sizes = new Float32Array(TRAIL_LENGTH);
    const lifetimes = new Float32Array(TRAIL_LENGTH);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      alphas[i] = 0;
      sizes[i] = Math.random() * 1.5 + 0.5;
      lifetimes[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    const alphaAttribute = new THREE.BufferAttribute(alphas, 1);
    const sizeAttribute = new THREE.BufferAttribute(sizes, 1);

    geometry.setAttribute('position', positionAttribute);
    geometry.setAttribute('alpha', alphaAttribute);
    geometry.setAttribute('size', sizeAttribute);

    const isHabitable = planetData.potentialForLife.assessment
      .toLowerCase()
      .includes('habitable');
    const trailColor = isHabitable
      ? new THREE.Color(0x99ffbb)
      : new THREE.Color(planetData.visualization.color1);

    const pulseIntensity = isHabitable ? 1.0 : 0.4;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: {value: trailColor},
        uTime: {value: 0},
        uPulseIntensity: {value: pulseIntensity},
      },
      vertexShader: trailVs,
      fragmentShader: trailFs,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.materialsMap.set(`trail-${planetData.celestial_body_id}`, material);

    const points = new THREE.Points(geometry, material);
    points.userData = {type: 'trail'};
    this.scene.add(points);

    this.trailSystems.set(planetData.celestial_body_id, {
      points,
      attributes: {
        positions: positionAttribute,
        alphas: alphaAttribute,
        sizes: sizeAttribute,
        lifetimes,
      },
      currentIndex: 0,
    });
  }

  private removePlanetTrail(planetId: string) {
    const trailSystem = this.trailSystems.get(planetId);
    if (trailSystem) {
      this.scene.remove(trailSystem.points);
      trailSystem.points.geometry.dispose();
      (trailSystem.points.material as THREE.Material).dispose();
      this.trailSystems.delete(planetId);
      this.materialsMap.delete(`trail-${planetId}`);
    }
  }

  private updatePlanetTrails(delta: number) {
    const TRAIL_LIFETIME = 2.5;

    this.trailSystems.forEach((system, planetId) => {
      const planetObject = this.objectMap.get(planetId);

      if (
        !planetObject ||
        !planetObject.parent ||
        (this.currentFocus.type !== 'galaxy' &&
          this.currentFocus.type !== 'planet')
      ) {
        system.points.visible = false;
        return;
      }
      system.points.visible = true;

      const planetWorldPosition = new THREE.Vector3();
      planetObject.getWorldPosition(planetWorldPosition);

      const alphas = system.attributes.alphas.array as Float32Array;
      for (let i = 0; i < system.attributes.lifetimes.length; i++) {
        if (system.attributes.lifetimes[i] > 0) {
          system.attributes.lifetimes[i] -= delta;
          alphas[i] = Math.max(
            0,
            system.attributes.lifetimes[i] / TRAIL_LIFETIME,
          );
        }
      }

      const index = system.currentIndex;

      system.attributes.positions.setXYZ(
        index,
        planetWorldPosition.x,
        planetWorldPosition.y,
        planetWorldPosition.z,
      );
      system.attributes.lifetimes[index] = TRAIL_LIFETIME;

      system.currentIndex =
        (system.currentIndex + 1) % system.attributes.lifetimes.length;

      system.attributes.positions.needsUpdate = true;
      system.attributes.alphas.needsUpdate = true;
    });
  }

  private transitionView(oldFocus: FocusChangeEvent | undefined) {
    if (this.cameraTween) {
      this.cameraTween.stop();
    }
    if (this.targetTween) {
      this.targetTween.stop();
    }

    let targetPos: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    switch (this.currentFocus.type) {
      case 'galaxy': {
        if (!this.currentFocus.id) return;
        const galaxyObj = this.objectMap.get(this.currentFocus.id);
        if (!galaxyObj) return;
        targetPos = galaxyObj.position.clone().add(GALAXY_CAMERA_POS);
        targetLookAt = galaxyObj.position.clone();
        break;
      }
      case 'planet': {
        if (!this.currentFocus.id) return;
        const planetObj = this.objectMap.get(this.currentFocus.id);
        if (!planetObj || !planetObj.parent) return;
        const planetWorldPos = new THREE.Vector3();
        planetObj.getWorldPosition(planetWorldPos);
        targetPos = planetWorldPos.clone().add(PLANET_CAMERA_POS);
        targetLookAt = planetWorldPos.clone();
        break;
      }
      case 'intergalactic':
      default:
        targetPos = INTERGALACTIC_CAMERA_POS.clone();
        targetLookAt = new THREE.Vector3(0, 0, 0);
        break;
    }

    const distance = this.camera.position.distanceTo(targetPos);
    const duration = THREE.MathUtils.clamp(distance * 10, 1500, 3500);

    this.controls.enabled = false;

    this.cameraTween = new TWEEN.Tween(this.camera.position)
      .to(targetPos, duration)
      .easing(TWEEN.Easing.Quintic.InOut)
      .onComplete(() => {
        this.controls.enabled = true;
        this.cameraTween = null;
      })
      .start();

    this.targetTween = new TWEEN.Tween(this.controls.target)
      .to(targetLookAt, duration)
      .easing(TWEEN.Easing.Quintic.InOut)
      .onComplete(() => {
        this.targetTween = null;
      })
      .start();
  }

  private onCanvasClick = (event: MouseEvent) => {};

  private onMouseMove = (event: MouseEvent) => {
    // Normalize mouse position from -1 to 1 for x, 1 to -1 for y
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };

  private onWindowResize = () => {
    if (!this.renderer || !this.camera) return;
    // FIX: Use `this.canvasEl` for dimensions to resolve TypeScript errors.
    this.camera.aspect = this.canvasEl.clientWidth / this.canvasEl.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasEl.clientWidth, this.canvasEl.clientHeight);
    this.composer.setSize(this.canvasEl.clientWidth, this.canvasEl.clientHeight);
    this.labelRenderer.setSize(this.canvasEl.clientWidth, this.canvasEl.clientHeight);
  };

  private triggerCameraShake(intensity: number, duration: number) {
    this.isShaking = true;
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeStartTime = performance.now();
    this.initialCameraPos.copy(this.camera.position);
  }

  private _renderLoop = () => {
    this.animationFrameId = requestAnimationFrame(this._renderLoop);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    TWEEN.update();

    this.controls.update();

    // Update starfield parallax with smoothing
    const starfieldMaterial = this.materialsMap.get('starfield') as
      | THREE.ShaderMaterial
      | undefined;
    if (starfieldMaterial?.uniforms.uMousePos) {
      starfieldMaterial.uniforms.uMousePos.value.lerp(this.mousePosition, 0.05);
    }

    this.materialsMap.forEach((material) => {
      if (Array.isArray(material)) {
        material.forEach((m) => {
          if (m.uniforms.uTime) m.uniforms.uTime.value = elapsedTime;
        });
      } else {
        if (material.uniforms.uTime) {
          material.uniforms.uTime.value = elapsedTime;
        }

        // Handle gravity uniform for galaxy shaders
        if (material.uniforms.uGravityAmount) {
          let gravityTarget = 0.0;
          if (this.currentFocus.type === 'galaxy' || this.currentFocus.type === 'planet') {
            gravityTarget = 0.8;
          }
          material.uniforms.uGravityAmount.value = THREE.MathUtils.lerp(
            material.uniforms.uGravityAmount.value,
            gravityTarget,
            0.05, // Smooth transition
          );
        }
      }
    });

    if (
      this.currentFocus.type === 'galaxy' ||
      this.currentFocus.type === 'planet'
    ) {
      const galaxyData = this.galaxiesData.find(
        (g) =>
          g.id ===
          (this.currentFocus.type === 'galaxy'
            ? this.currentFocus.id
            : (this.objectMap.get(this.currentFocus.id!) as THREE.LOD)?.userData
                .galaxyId),
      );
      if (galaxyData) {
        this.updatePlanetVisuals(galaxyData);
      }
    }

    if (this.currentFocus.type === 'planet' && this.currentFocus.id) {
      const planetLOD = this.objectMap.get(this.currentFocus.id) as THREE.LOD;
      if (planetLOD) {
        // Find the currently active detail level to rotate it
        const currentLevel = planetLOD.getObjectForDistance(
          this.camera.position.distanceTo(planetLOD.position),
        );
        if (currentLevel) {
          currentLevel.traverse((child) => {
            if (child.userData.type === 'planet_mesh') {
              child.rotation.y += delta * 0.1;
            }
            if (child.userData.type === 'atmosphere_mesh') {
              child.rotation.y += delta * 0.08;
            }
          });
        }
      }
    }

    this.updatePlanetTrails(delta);

    if (this.isShaking) {
      const elapsed = performance.now() - this.shakeStartTime;
      if (elapsed < this.shakeDuration) {
        const progress = elapsed / this.shakeDuration;
        const shakeAmount = this.shakeIntensity * (1 - progress);
        this.camera.position.x =
          this.initialCameraPos.x + (Math.random() - 0.5) * shakeAmount;
        this.camera.position.y =
          this.initialCameraPos.y + (Math.random() - 0.5) * shakeAmount;
      } else {
        this.isShaking = false;
        this.camera.position.copy(this.initialCameraPos);
      }
    }

    this.scene.traverse((object) => {
      if ((object as THREE.LOD).isLOD) {
        (object as THREE.LOD).update(this.camera);
      }
    });

    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  };
}