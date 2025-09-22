/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, html, css, PropertyValueMap, nothing} from 'lit';
import {customElement, property, state, query} from 'lit/decorators.js';
import * as THREE from 'three';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
// FIX: Removed unused and not exported member `GroundingChunk`
import type {PlanetData} from './index.tsx';
import {
  vs as atmosphereVs,
  fs as atmosphereFs,
} from './atmosphere-shader.tsx';
import {vs as planetVs, fs as planetFs} from './planet-shader.tsx';
import {vs as starfieldVs, fs as starfieldFs} from './starfield-shaders.tsx';

@customElement('axee-visuals-3d')
export class AxeeVisuals3D extends LitElement {
  @property({type: Array}) planetsData: PlanetData[] = [];
  @property({type: String}) selectedPlanetId: string | null = null;
  @property({type: Boolean}) isScanning = false;
  @property({type: String}) viewMode: 'single' | 'quad' = 'quad';

  @query('#three-canvas') private canvas!: HTMLCanvasElement;
  @state() private selectedPlanetData: PlanetData | null = null;
  @state() private isHoveringObject = false;
  @state() private starfieldStats = {count: 0, range: 0};

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private clock = new THREE.Clock();
  private planetGroups = new Map<string, THREE.Group>();
  private orbits = new Map<string, THREE.Mesh>();
  private galaxyGroup = new THREE.Group();
  private animationFrameId = 0;
  private targetPosition = new THREE.Vector3(0, 0, 40);
  private targetLookAt = new THREE.Vector3(0, 0, 0);
  private isManualControl = false;

  // New properties for the dynamic starfield
  private starfield!: THREE.Points;
  private starfieldMaterial!: THREE.ShaderMaterial;

  static styles = css`
    :host {
      --accent-color: #a0d0ff;
      --accent-color-light: #c0e0ff;
      --border-color: rgba(160, 208, 255, 0.2);

      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      font-family: 'Exo 2', sans-serif;
    }

    #three-canvas {
      width: 100%;
      height: 100%;
      display: block;
      cursor: grab;
    }
    #three-canvas:active {
      cursor: grabbing;
    }

    .quad-view-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    }

    .quad-view-overlay::before,
    .quad-view-overlay::after {
      content: '';
      position: absolute;
      background-color: var(--border-color);
      box-shadow: 0 0 10px var(--border-color);
    }

    /* Vertical line */
    .quad-view-overlay::before {
      left: 50%;
      top: 0;
      width: 1px;
      height: 100%;
      transform: translateX(-50%);
    }

    /* Horizontal line */
    .quad-view-overlay::after {
      top: 50%;
      left: 0;
      height: 1px;
      width: 100%;
      transform: translateY(-50%);
    }

    .right-hud {
      position: absolute;
      top: 9rem;
      right: 2rem;
      width: clamp(240px, 22vw, 320px);
      color: var(--accent-color);
      transition: opacity 0.5s ease, transform 0.5s ease;
      opacity: 0;
      pointer-events: none;
      transform: translateX(20px);
      font-weight: 300;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .right-hud.visible {
      opacity: 1;
      pointer-events: all;
      transform: translateX(0);
    }

    .hud-panel {
      position: relative;
    }

    .hud-panel::before {
      content: '';
      position: absolute;
      bottom: -1rem;
      left: 0;
      width: 100%;
      height: 1px;
      background: var(--border-color);
    }

    .hud-panel:last-child::before {
      display: none;
    }

    .hud-panel h3 {
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-weight: 400;
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: var(--accent-color-light);
      opacity: 0.8;
    }

    .hud-panel p {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 400;
      color: var(--accent-color-light);
      text-shadow: 0 0 8px rgba(160, 208, 255, 0.5);
    }

    .hud-stats {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .hud-stats div {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 1.1rem;
    }
    .hud-stats span:first-child {
      font-size: 0.8rem;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .evolution-box {
      width: 100%;
      height: 150px;
      border: 1px solid var(--border-color);
      background: linear-gradient(
          45deg,
          rgba(6, 9, 20, 0.9) 0%,
          rgba(10, 25, 40, 0.5) 50%,
          rgba(6, 9, 20, 0.9) 100%
        ),
        radial-gradient(
          ellipse at 70% 30%,
          rgba(255, 180, 120, 0.3) 0%,
          rgba(160, 208, 255, 0.1) 40%,
          transparent 80%
        ),
        radial-gradient(
          circle at 20% 80%,
          rgba(100, 150, 255, 0.4) 0%,
          transparent 50%
        ),
        #060914;
    }

    .scanning-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        rgba(160, 208, 255, 0),
        rgba(160, 208, 255, 0.05) 2px,
        rgba(160, 208, 255, 0) 4px
      );
      animation: scan 2s linear infinite;
      pointer-events: none;
    }
    @keyframes scan {
      0% {
        transform: translateY(-10%);
      }
      100% {
        transform: translateY(10%);
      }
    }

    @media (max-width: 1200px) {
      .right-hud {
        right: 1rem;
      }
    }

    @media (max-width: 768px) {
      .right-hud {
        display: none; /* Hide on mobile to avoid clutter */
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this.handleResize);
  }

  protected firstUpdated() {
    this.initThree();
    this.canvas.addEventListener('click', this.onCanvasClick);
    this.canvas.addEventListener('pointermove', this.onCanvasPointerMove);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleResize);
    this.canvas?.removeEventListener('click', this.onCanvasClick);
    this.canvas?.removeEventListener('pointermove', this.onCanvasPointerMove);
    cancelAnimationFrame(this.animationFrameId);
    this.renderer?.dispose();
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (changedProperties.has('planetsData')) {
      this.updatePlanets();
    }
    if (changedProperties.has('selectedPlanetId')) {
      this.updateTarget();
      this.selectedPlanetData =
        this.planetsData.find(
          (p) => p.celestial_body_id === this.selectedPlanetId,
        ) || null;

      // Update shader uniforms for selection highlighting
      this.planetGroups.forEach((group, id) => {
        const planetMesh = group.children[0] as THREE.Mesh;
        if (planetMesh && planetMesh.material instanceof THREE.ShaderMaterial) {
          planetMesh.material.uniforms.uIsSelected.value =
            id === this.selectedPlanetId;
        }
      });
    }
  }

  private createGalaxy = () => {
    const galaxyParameters = {
      count: 150000,
      size: 0.015,
      radius: 20,
      branches: 5,
      spin: 1.2,
      randomness: 0.5,
      randomnessPower: 3.5,
      insideColor: '#ffcc77',
      outsideColor: '#3d56b2',
    };

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(galaxyParameters.count * 3);
    const colors = new Float32Array(galaxyParameters.count * 3);

    const colorInside = new THREE.Color(galaxyParameters.insideColor);
    const colorOutside = new THREE.Color(galaxyParameters.outsideColor);

    for (let i = 0; i < galaxyParameters.count; i++) {
      const i3 = i * 3;

      // Position
      const radius =
        Math.pow(Math.random(), 2) * galaxyParameters.radius;
      const spinAngle = radius * galaxyParameters.spin;
      const branchAngle =
        ((i % galaxyParameters.branches) / galaxyParameters.branches) *
        Math.PI *
        2;

      const randomX =
        Math.pow(Math.random(), galaxyParameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        galaxyParameters.randomness *
        radius *
        0.5;
      const randomY =
        Math.pow(Math.random(), galaxyParameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        galaxyParameters.randomness *
        0.2;
      const randomZ =
        Math.pow(Math.random(), galaxyParameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        galaxyParameters.randomness *
        radius *
        0.5;

      positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

      // Color
      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, radius / galaxyParameters.radius);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: galaxyParameters.size,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const points = new THREE.Points(geometry, material);
    this.galaxyGroup.add(points);
  };

  private createStarfield = () => {
    const starCount = 150000; // Reduced density for a subtler starfield
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const scales = new Float32Array(starCount);

    const color = new THREE.Color();
    const range = 1000; // Half the side length of the cube

    this.starfieldStats = {count: starCount, range: range * 2};

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // Position within a large cube
      positions[i3] = (Math.random() - 0.5) * range * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * range * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * range * 2;

      // Color with some variation
      const randomHue = 0.55 + Math.random() * 0.15; // Bluish to whitish
      const randomSaturation = 0.2 + Math.random() * 0.4; // Less saturated
      const randomLightness = 0.6 + Math.random() * 0.4;
      color.setHSL(randomHue, randomSaturation, randomLightness);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // More varied scale: more small stars, fewer large ones
      scales[i] = Math.pow(Math.random(), 3.0) * 5.0 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    this.starfieldMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {value: 0.0},
      },
      vertexShader: starfieldVs,
      fragmentShader: starfieldFs,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });

    this.starfield = new THREE.Points(geometry, this.starfieldMaterial);
    this.scene.add(this.starfield);
  };

  private initThree = () => {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      2000,
    );
    this.camera.position.z = 40;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Camera Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 150;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener('start', () => {
      this.isManualControl = true;
    });

    // Post-processing
    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      0.15, // Further reduced bloom to soften the central "sun"
      0.5,
      0.1,
    );
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    // Dynamic twinkling starfield
    this.createStarfield();

    // Group for galaxy motion
    this.scene.add(this.galaxyGroup);
    this.createGalaxy();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    this.runAnimationLoop();
  };

  private handleResize = () => {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.composer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  };

  private renderQuadrant = (
    left: number,
    bottom: number,
    width: number,
    height: number,
  ) => {
    const dpr = this.renderer.getPixelRatio();
    const dprLeft = left * dpr;
    const dprBottom = bottom * dpr;
    const dprWidth = width * dpr;
    const dprHeight = height * dpr;

    this.renderer.setViewport(dprLeft, dprBottom, dprWidth, dprHeight);
    this.renderer.setScissor(dprLeft, dprBottom, dprWidth, dprHeight);

    this.composer.render();
  };

  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();

    // --- UPDATE LOGIC (RUNS ONCE PER FRAME) ---

    // Smooth camera movement, respectful of manual control
    if (!this.isManualControl) {
      this.camera.position.lerp(this.targetPosition, 0.05);
      this.controls.target.lerp(this.targetLookAt, 0.05);
    }
    this.controls.update();

    // Add continuous galaxy motion
    this.galaxyGroup.rotation.y += 0.0003;

    // Add slow rotation to the dynamic starfield
    if (this.starfield) {
      this.starfield.rotation.y += 0.00004;
      this.starfield.rotation.x += 0.00002;
    }

    // Update shader uniforms for dynamic effects
    if (this.starfieldMaterial) {
      this.starfieldMaterial.uniforms.uTime.value = elapsedTime;
    }
    this.planetGroups.forEach((group, id) => {
      const planetMesh = group.children[0] as THREE.Mesh;
      const atmosphereMesh = group.children[1] as THREE.Mesh;

      if (planetMesh && planetMesh.material instanceof THREE.ShaderMaterial) {
        planetMesh.material.uniforms.uTime.value = elapsedTime;
      }
      if (
        atmosphereMesh &&
        atmosphereMesh.material instanceof THREE.ShaderMaterial
      ) {
        atmosphereMesh.material.uniforms.uTime.value = elapsedTime;
      }

      // Ring pulse effect for selected planet
      const ringMesh = group.children.find(
        (child) => child.userData.isRing,
      ) as THREE.Mesh;
      if (ringMesh) {
        const material = ringMesh.material as THREE.MeshBasicMaterial;
        if (id === this.selectedPlanetId) {
          material.opacity = 0.7 + Math.sin(elapsedTime * 4.0) * 0.2;
        } else {
          // Reset to default if it was changed
          if (material.opacity !== 0.8) {
            material.opacity = 0.8;
          }
        }
      }
    });

    // Animate orbit lines for selection
    this.orbits.forEach((orbit, id) => {
      const material = orbit.material as THREE.MeshBasicMaterial;
      if (id === this.selectedPlanetId) {
        // Pulse the selected orbit to make it prominent
        material.opacity = 0.35 + Math.sin(elapsedTime * 3.0) * 0.2;
        material.color.set(0xa0d0ff);
      } else {
        // Ensure non-selected orbits are faint
        if (material.opacity !== 0.15) {
          material.opacity = 0.15;
        }
        material.color.set(0x4d7aa5);
      }
    });

    // --- RENDER LOGIC (HANDLES SINGLE AND QUAD VIEWS) ---
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    const fullWidth = this.canvas.clientWidth;
    const fullHeight = this.canvas.clientHeight;

    if (this.viewMode === 'quad') {
      const w = fullWidth / 2;
      const h = fullHeight / 2;

      // Top-left
      this.camera.setViewOffset(fullWidth, fullHeight, 0, 0, w, h);
      this.renderQuadrant(0, h, w, h);

      // Top-right
      this.camera.setViewOffset(fullWidth, fullHeight, w, 0, w, h);
      this.renderQuadrant(w, h, w, h);

      // Bottom-left
      this.camera.setViewOffset(fullWidth, fullHeight, 0, h, w, h);
      this.renderQuadrant(0, 0, w, h);

      // Bottom-right
      this.camera.setViewOffset(fullWidth, fullHeight, w, h, w, h);
      this.renderQuadrant(w, 0, w, h);

      // Clear the view offset after rendering all quadrants
      this.camera.clearViewOffset();
    } else {
      // Single view
      if (this.camera.view) this.camera.clearViewOffset();
      this.renderQuadrant(0, 0, fullWidth, fullHeight);
    }
  };

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

  private updatePlanets() {
    const currentPlanetIds = new Set(
      this.planetsData.map((p) => p.celestial_body_id),
    );

    // Step 1: Remove planets that are no longer in the data (filtered out)
    for (const [id, group] of this.planetGroups.entries()) {
      if (!currentPlanetIds.has(id)) {
        // Find and remove associated orbit
        const orbitToRemove = this.orbits.get(id);
        if (orbitToRemove) {
          this.galaxyGroup.remove(orbitToRemove);
          orbitToRemove.geometry.dispose();
          (orbitToRemove.material as THREE.Material).dispose();
          this.orbits.delete(id);
        }

        // Remove planet group and clean up its resources
        this.galaxyGroup.remove(group);
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const material = child.material as THREE.Material | THREE.Material[];
            if (Array.isArray(material)) {
              material.forEach((m) => m.dispose());
            } else {
              material.dispose();
            }
          }
        });
        this.planetGroups.delete(id);
      }
    }

    // Step 2: Add new planets and update positions of existing ones
    this.planetsData.forEach((planet, index) => {
      let planetGroup = this.planetGroups.get(planet.celestial_body_id);

      // Calculate position based on current index in the (potentially sorted) array
      const angle = (index / 8) * Math.PI * 2;
      const radius = 25 + index * 8;

      if (!planetGroup) {
        // Planet doesn't exist, create it fully
        planetGroup = new THREE.Group();

        // Generate a stable, pseudo-random axial tilt for this planet
        let seed = 0;
        for (let i = 0; i < planet.celestial_body_id.length; i++) {
          seed += planet.celestial_body_id.charCodeAt(i);
        }
        const seededRandom = (s: number) => {
          const x = Math.sin(s) * 10000;
          return x - Math.floor(x);
        };
        // Tilt between 0 and 30 degrees (Math.PI / 6)
        const axialTilt = seededRandom(seed) * (Math.PI / 6);

        // Planet Sphere with procedural shader
        const geometry = new THREE.SphereGeometry(2, 64, 64);
        const textureTypeMap: {[key: string]: number} = {
          TERRESTRIAL: 1,
          GAS_GIANT: 2,
          VOLCANIC: 3,
          ICY: 4, // Added new texture type for Icy planets
        };
        const material = new THREE.ShaderMaterial({
          vertexShader: planetVs,
          fragmentShader: planetFs,
          uniforms: {
            uTime: {value: 0.0},
            uColor1: {
              value: new THREE.Color(planet.visualization.color1),
            },
            uColor2: {
              value: new THREE.Color(planet.visualization.color2),
            },
            uOceanColor: {
              value: new THREE.Color(planet.visualization.oceanColor || '#000033'),
            },
            uCloudiness: {
              value: planet.visualization.cloudiness || 0.0,
            },
            uIceCoverage: {
              value: planet.visualization.iceCoverage || 0.0,
            },
            uTextureType: {
              value: textureTypeMap[planet.visualization.surfaceTexture] || 1,
            },
            uIsSelected: {value: false},
            // New uniforms for tilt and scattering
            uAxialTilt: {value: axialTilt},
            uAtmosphereColor: {
              value: new THREE.Color(planet.visualization.atmosphereColor),
            },
            uLightDirection: {value: new THREE.Vector3(1, 1, 1).normalize()},
          },
        });
        const sphereMesh = new THREE.Mesh(geometry, material);
        sphereMesh.userData = {id: planet.celestial_body_id, isPlanet: true};
        planetGroup.add(sphereMesh);

        // Atmosphere
        const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
          vertexShader: atmosphereVs,
          fragmentShader: atmosphereFs,
          uniforms: {
            uAtmosphereColor: {
              value: new THREE.Color(planet.visualization.atmosphereColor),
            },
            uTime: {value: 0.0},
            uHasAuroras: {
              value:
                planet.visualization.surfaceTexture === 'ICY' ||
                (planet.visualization.surfaceTexture === 'TERRESTRIAL' &&
                  planet.visualization.iceCoverage > 0.5),
            },
          },
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true,
        });
        const atmosphereMesh = new THREE.Mesh(
          atmosphereGeometry,
          atmosphereMaterial,
        );
        atmosphereMesh.userData = {id: planet.celestial_body_id};
        planetGroup.add(atmosphereMesh);

        // Planet Rings
        if (planet.visualization.hasRings) {
          const ringGeometry = new THREE.RingGeometry(2.8, 4.5, 64);
          const ringMaterial = new THREE.MeshBasicMaterial({
            map: this.createRingTexture(),
            color: planet.visualization.atmosphereColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          });
          const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
          ringMesh.userData = {id: planet.celestial_body_id, isRing: true};
          ringMesh.rotation.x = Math.PI / 2 - 0.2;
          planetGroup.add(ringMesh);
        }

        // Create its orbit
        const orbitGeometry = new THREE.RingGeometry(radius, radius + 0.05, 128);
        const orbitMaterial = new THREE.MeshBasicMaterial({
          color: 0x4d7aa5,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.15,
          blending: THREE.AdditiveBlending,
        });
        const orbitMesh = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbitMesh.rotation.x = Math.PI / 2;
        this.galaxyGroup.add(orbitMesh);
        this.orbits.set(planet.celestial_body_id, orbitMesh);

        this.planetGroups.set(planet.celestial_body_id, planetGroup);
        this.galaxyGroup.add(planetGroup);
      } else {
        // Planet already exists, update its orbit's radius if changed
        const orbitMesh = this.orbits.get(planet.celestial_body_id);
        if (orbitMesh) {
          const existingRadius = (orbitMesh.geometry as THREE.RingGeometry)
            .parameters.innerRadius;
          if (existingRadius !== radius) {
            orbitMesh.geometry.dispose();
            orbitMesh.geometry = new THREE.RingGeometry(
              radius,
              radius + 0.05,
              128,
            );
          }
        }
      }

      // Set/update the planet's position
      planetGroup.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      );
    });
  }

  private updateTarget() {
    this.isManualControl = false;
    if (this.selectedPlanetId) {
      const group = this.planetGroups.get(this.selectedPlanetId);
      if (group) {
        const worldPosition = new THREE.Vector3();
        group.getWorldPosition(worldPosition);
        const offset = new THREE.Vector3(0, 2, 8);
        this.targetPosition.copy(worldPosition).add(offset);
        this.targetLookAt.copy(worldPosition);
      }
    } else {
      this.targetPosition.set(0, 0, 40);
      this.targetLookAt.set(0, 0, 0);
    }
  }

  private onCanvasPointerMove = (event: PointerEvent) => {
    this.pointer.x = (event.clientX / this.canvas.clientWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / this.canvas.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    let hovering = false;
    const planetObjects = Array.from(this.planetGroups.values()).map(
      (group) => group.children[0],
    );
    const planetIntersects = this.raycaster.intersectObjects(planetObjects);
    if (planetIntersects.length > 0) {
      hovering = true;
    }

    this.isHoveringObject = hovering;
    this.canvas.style.cursor = hovering ? 'pointer' : 'grab';
  };

  private onCanvasClick = (event: MouseEvent) => {
    this.pointer.x = (event.clientX / this.canvas.clientWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / this.canvas.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersects = this.raycaster.intersectObjects(
      Array.from(this.planetGroups.values()),
      true,
    );

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      if (clickedObject.userData.isPlanet) {
        (this as EventTarget).dispatchEvent(
          new CustomEvent('planet-selected', {
            detail: {planetId: clickedObject.userData.id},
          }),
        );
      }
    }
  };

  render() {
    return html`
      <canvas id="three-canvas"></canvas>
      ${this.viewMode === 'quad'
        ? html`<div class="quad-view-overlay"></div>`
        : nothing}
      ${this.isScanning ? html`<div class="scanning-overlay"></div>` : nothing}
      <div class="right-hud visible">
        ${
          this.selectedPlanetData
            ? html`
                <div class="hud-panel">
                  <h3>Emotional Resonance</h3>
                  <p>${this.selectedPlanetData.potentialForLife.assessment}</p>
                </div>
                <div class="hud-panel">
                  <h3>Species Classifier</h3>
                  <p>${this.selectedPlanetData.planetType}</p>
                </div>
                <div class="hud-panel">
                  <h3>Evolution Visualization</h3>
                  <div class="evolution-box"></div>
                </div>
              `
            : html`
                <div class="hud-panel">
                  <h3>Stellar Field Data</h3>
                  <p>
                    ${this.starfieldStats.count.toLocaleString()} Rendered Stars
                  </p>
                </div>
                <div class="hud-panel">
                  <h3>Active Surveys</h3>
                  <div class="hud-stats">
                    <div>
                      <span>Kepler Mission</span>
                      <span style="color: #ff9999;">ARCHIVED</span>
                    </div>
                    <div>
                      <span>K2 Mission</span>
                      <span style="color: #ff9999;">ARCHIVED</span>
                    </div>
                    <div>
                      <span>TESS Mission</span>
                      <span style="color: #99ff99;">ONLINE</span>
                    </div>
                  </div>
                </div>
                <div class="hud-panel">
                  <h3>Field Parameters</h3>
                  <div class="hud-stats">
                    <div>
                      <span>Side Length</span>
                      <span
                        >${this.starfieldStats.range.toLocaleString()} ly</span
                      >
                    </div>
                    <div>
                      <span>Density</span>
                      <span
                        >${(
                          this.starfieldStats.count /
                          Math.pow(this.starfieldStats.range, 3)
                        ).toExponential(2)}/ly³</span
                      >
                    </div>
                  </div>
                </div>
              `
        }
      </div>
    `;
  }
}
