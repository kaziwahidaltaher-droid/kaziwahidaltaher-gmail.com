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
import type {PlanetData, GalaxyData, GroundingChunk} from './index.tsx';
import {
  vs as atmosphereVs,
  fs as atmosphereFs,
} from './atmosphere-shader.tsx';
import {vs as planetVs, fs as planetFs} from './planet-shader.tsx';
import {vs as starfieldVs, fs as starfieldFs} from './starfield-shaders.tsx';

@customElement('axee-visuals-3d')
export class AxeeVisuals3D extends LitElement {
  @property({type: Array}) galaxiesData: GalaxyData[] = [];
  @property({type: String}) currentGalaxyId: string | null = null;
  @property({type: String}) selectedPlanetId: string | null = null;
  @property({type: String}) viewMode: 'galaxies' | 'planets' = 'galaxies';
  @property({type: Boolean}) isScanning = false;
  @property({type: Array}) groundingChunks: GroundingChunk[] = [];

  @query('#three-canvas') private canvas!: HTMLCanvasElement;
  @state() private selectedPlanetData: PlanetData | null = null;
  @state() private isHoveringObject = false;
  @state() private hoverLabel = {text: '', x: 0, y: 0, visible: false};

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private clock = new THREE.Clock();

  private galaxyGroup = new THREE.Group();
  private planetGroups = new Map<string, THREE.Group>();
  private galaxyRenderObjects = new Map<string, THREE.Group>();

  private animationFrameId = 0;
  private targetPosition = new THREE.Vector3(0, 50, 150);
  private targetLookAt = new THREE.Vector3(0, 0, 0);
  private isManualControl = false;

  private starfield!: THREE.Points;
  private starfieldMaterial!: THREE.ShaderMaterial;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
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

    .hover-label {
      position: absolute;
      background: rgba(0, 20, 0, 0.85);
      color: #0f0;
      padding: 0.25rem 0.5rem;
      border: 1px solid #0f0;
      border-radius: 4px;
      font-size: 0.9rem;
      pointer-events: none;
      transform: translate(-50%, -150%);
      transition: opacity 0.2s;
      white-space: nowrap;
    }

    .info-panel {
      position: absolute;
      top: 50%;
      left: 2rem;
      transform: translateY(-50%);
      width: 400px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      padding: 1.5rem;
      background: rgba(0, 20, 0, 0.85);
      border: 1px solid #0f0;
      box-shadow: 0 0 20px #0f0 inset;
      color: #0f0;
      text-shadow: 0 0 5px #0f0;
      transition: opacity 0.5s ease, transform 0.5s ease;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-50%) translateX(-20px);
    }

    .info-panel.visible {
      opacity: 1;
      pointer-events: all;
      transform: translateY(-50%) translateX(0);
    }

    .info-panel h2 {
      font-size: 2rem;
      margin: 0 0 1rem 0;
      color: #0f0;
      text-shadow: 0 0 8px #0f0;
    }

    .info-panel .ai-whisper {
      font-style: italic;
      margin-bottom: 1rem;
      opacity: 0.8;
      border-left: 2px solid #0f0;
      padding-left: 1rem;
    }

    .info-panel .detail {
      margin-bottom: 0.8rem;
    }

    .info-panel .detail strong {
      color: #0f0;
      display: block;
      margin-bottom: 0.2rem;
      font-weight: 700;
    }

    .info-panel .detail p {
      margin: 0;
      opacity: 0.9;
      line-height: 1.5;
    }

    .info-panel .assessment-value {
      font-size: 1.2rem;
      font-weight: bold;
      margin: 0.5rem 0;
      padding: 0.2rem 0.5rem;
      display: inline-block;
      border-radius: 4px;
    }
    .assessment-habitable {
      color: #44ff44;
      background: rgba(68, 255, 68, 0.1);
      border: 1px solid #44ff44;
    }
    .assessment-potentially-habitable {
      color: #ffff44;
      background: rgba(255, 255, 68, 0.1);
      border: 1px solid #ffff44;
    }
    .assessment-unlikely {
      color: #ff4444;
      background: rgba(255, 68, 68, 0.1);
      border: 1px solid #ff4444;
    }
    .info-panel .biosignatures {
      margin-top: 0.5rem;
    }
    .info-panel .biosignatures ul {
      list-style-type: none;
      padding-left: 1rem;
      margin: 0.2rem 0 0 0;
    }
    .info-panel .biosignatures li {
      position: relative;
      padding-left: 1.2rem;
    }
    .info-panel .biosignatures li::before {
      content: '»';
      position: absolute;
      left: 0;
      color: #0f0;
      opacity: 0.7;
    }

    .citations {
      margin-top: 1.5rem;
      font-size: 0.8rem;
    }
    .citations strong {
      color: #0f0;
    }
    .citations ul {
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 0 0;
    }
    .citations li {
      margin-bottom: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .citations a {
      color: #0f0;
      text-decoration: none;
    }
    .citations a:hover {
      color: #0f0;
      filter: brightness(1.5);
      text-decoration: underline;
    }

    .scanning-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 255, 0, 0),
        rgba(0, 255, 0, 0.05) 2px,
        rgba(0, 255, 0, 0) 4px
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
    if (
      changedProperties.has('galaxiesData') ||
      changedProperties.has('viewMode') ||
      changedProperties.has('currentGalaxyId')
    ) {
      this.updateScene();
    }
    if (
      changedProperties.has('selectedPlanetId') ||
      changedProperties.has('viewMode')
    ) {
      this.updateTarget();
      if (this.viewMode === 'planets' && this.currentGalaxyId) {
        const currentGalaxy = this.galaxiesData.find(
          (g) => g.id === this.currentGalaxyId,
        );
        this.selectedPlanetData =
          currentGalaxy?.planets.get(this.selectedPlanetId!) || null;
      } else {
        this.selectedPlanetData = null;
      }
    }
  }

  private createGalaxyVisual(
    galaxy: GalaxyData,
    isDetailView: boolean,
  ): THREE.Group {
    const galaxyGroup = new THREE.Group();

    const parameters = {
      count: isDetailView ? 150000 : 20000,
      size: isDetailView ? 0.015 : 0.05,
      radius: isDetailView ? 20 : 5,
      branches: 5,
      spin: 1.2,
      randomness: 0.5,
      randomnessPower: 3.5,
      insideColor: galaxy.visualization.insideColor,
      outsideColor: galaxy.visualization.outsideColor,
      coreConcentration: 0.3, // Percentage of stars in the core
      coreSizeFactor: 0.1, // How small the core is relative to the radius
    };

    switch (galaxy.type.toLowerCase().trim()) {
      case 'spiral':
      case 'barred spiral':
        parameters.branches = galaxy.type.toLowerCase().includes('barred')
          ? 2
          : 5;
        parameters.spin = 1.5;
        parameters.randomness = 0.4;
        parameters.count = Math.floor(parameters.count * 1.2);
        break;
      case 'elliptical':
        parameters.branches = 0;
        parameters.spin = 0;
        parameters.randomness = 0.8;
        parameters.randomnessPower = 2.0;
        parameters.count = Math.floor(parameters.count * 1.5);
        parameters.coreConcentration = 0.6;
        break;
      case 'lenticular':
        parameters.branches = 0;
        parameters.spin = 0.2;
        parameters.randomness = 0.3;
        parameters.randomnessPower = 2.5;
        parameters.coreConcentration = 0.5;
        break;
      case 'irregular':
      default:
        parameters.branches = 0;
        parameters.spin = 0;
        parameters.randomness = 1.5;
        parameters.randomnessPower = 2.0;
        parameters.count = Math.floor(parameters.count * 0.8);
        parameters.coreConcentration = 0.1;
        break;
    }

    const coreCount = Math.floor(parameters.count * parameters.coreConcentration);
    const armsCount = parameters.count - coreCount;
    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    // --- Create Core ---
    if (coreCount > 0) {
      const coreGeometry = new THREE.BufferGeometry();
      const corePositions = new Float32Array(coreCount * 3);
      const coreColors = new Float32Array(coreCount * 3);
      for (let i = 0; i < coreCount; i++) {
        const i3 = i * 3;
        const radius =
          Math.random() * parameters.radius * parameters.coreSizeFactor;
        const spherical = new THREE.Spherical(
          radius,
          Math.acos(1 - 2 * Math.random()),
          Math.random() * 2 * Math.PI,
        );
        const position = new THREE.Vector3().setFromSpherical(spherical);
        corePositions[i3] = position.x;
        corePositions[i3 + 1] = position.y;
        corePositions[i3 + 2] = position.z;
        const mixedColor = colorInside.clone();
        mixedColor.lerp(
          colorOutside,
          radius / (parameters.radius * parameters.coreSizeFactor),
        );
        coreColors[i3] = mixedColor.r;
        coreColors[i3 + 1] = mixedColor.g;
        coreColors[i3 + 2] = mixedColor.b;
      }
      coreGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(corePositions, 3),
      );
      coreGeometry.setAttribute(
        'color',
        new THREE.BufferAttribute(coreColors, 3),
      );
      const coreMaterial = new THREE.PointsMaterial({
        size: parameters.size * 1.2,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      });
      const corePoints = new THREE.Points(coreGeometry, coreMaterial);
      corePoints.name = 'galaxyCore';
      galaxyGroup.add(corePoints);
    }

    // --- Create Arms/Disk ---
    if (armsCount > 0) {
      const armsGeometry = new THREE.BufferGeometry();
      const armsPositions = new Float32Array(armsCount * 3);
      const armsColors = new Float32Array(armsCount * 3);
      for (let i = 0; i < armsCount; i++) {
        const i3 = i * 3;
        const radius =
          Math.pow(Math.random(), 2) * parameters.radius;
        const randomX =
          Math.pow(Math.random(), parameters.randomnessPower) *
          (Math.random() < 0.5 ? 1 : -1) *
          parameters.randomness *
          radius *
          0.5;
        const randomY =
          Math.pow(Math.random(), parameters.randomnessPower) *
          (Math.random() < 0.5 ? 1 : -1) *
          parameters.randomness *
          0.2;
        const randomZ =
          Math.pow(Math.random(), parameters.randomnessPower) *
          (Math.random() < 0.5 ? 1 : -1) *
          parameters.randomness *
          radius *
          0.5;

        if (parameters.branches > 0) {
          const spinAngle = radius * parameters.spin;
          const branchAngle =
            ((i % parameters.branches) / parameters.branches) * Math.PI * 2;
          armsPositions[i3] =
            Math.cos(branchAngle + spinAngle) * radius + randomX;
          armsPositions[i3 + 1] = randomY;
          armsPositions[i3 + 2] =
            Math.sin(branchAngle + spinAngle) * radius + randomZ;
        } else {
          // Elliptical or Irregular distribution
          const spherical = new THREE.Spherical(
            radius,
            Math.acos(1 - 2 * Math.random()),
            Math.random() * 2 * Math.PI,
          );
          const position = new THREE.Vector3().setFromSpherical(spherical);
          armsPositions[i3] = position.x + randomX;
          armsPositions[i3 + 1] = position.y + randomY;
          armsPositions[i3 + 2] = position.z + randomZ;
        }
        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, radius / parameters.radius);
        armsColors[i3] = mixedColor.r;
        armsColors[i3 + 1] = mixedColor.g;
        armsColors[i3 + 2] = mixedColor.b;
      }
      armsGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(armsPositions, 3),
      );
      armsGeometry.setAttribute(
        'color',
        new THREE.BufferAttribute(armsColors, 3),
      );
      const armsMaterial = new THREE.PointsMaterial({
        size: parameters.size,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      });
      const armsPoints = new THREE.Points(armsGeometry, armsMaterial);
      armsPoints.name = 'galaxyArms';
      galaxyGroup.add(armsPoints);
    }

    galaxyGroup.userData.spin =
      parameters.spin > 0 ? 0.0005 + Math.random() * 0.0005 : 0;
    return galaxyGroup;
  }

  private createStarfield = () => {
    const starCount = 50000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const scales = new Float32Array(starCount);

    const color = new THREE.Color();
    const range = 1000;

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * range * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * range * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * range * 2;

      // Create more realistic star colors - mostly white with hints of blue/yellow
      const randomLightness = 0.5 + Math.random() * 0.5; // Wider brightness range
      const hue = Math.random() > 0.5 ? 0.6 : 0.1; // Tend towards blue or yellow
      const saturation = Math.random() * 0.1; // Very low saturation for a white-ish look
      color.setHSL(hue, saturation, randomLightness);

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Use a power-law distribution for sizes for more realism (many small, few large)
      scales[i] = Math.pow(1.0 - Math.random(), 3.0) * 2.0 + 0.8;
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
    this.camera.position.set(0, 50, 150);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener('start', () => {
      this.isManualControl = true;
    });

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      0.7,
      0.4,
      0.1,
    );
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.createStarfield();
    this.scene.add(this.galaxyGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    this.runAnimationLoop();
    this.updateScene();
  };

  private handleResize = () => {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.composer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  };

  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();

    if (!this.isManualControl) {
      this.camera.position.lerp(this.targetPosition, 0.05);
      this.controls.target.lerp(this.targetLookAt, 0.05);
    }
    this.controls.update();

    if (this.galaxyGroup.children.length > 0) {
      const arms = this.galaxyGroup.getObjectByName('galaxyArms');
      const core = this.galaxyGroup.getObjectByName('galaxyCore');
      if (arms) {
        arms.rotation.y += this.galaxyGroup.userData.spin || 0.0003;
      }
      if (core) {
        const pulse = Math.sin(elapsedTime * 0.8) * 0.05 + 0.95;
        core.scale.set(pulse, pulse, pulse);
      }
    }

    this.galaxyRenderObjects.forEach((group) => {
      const galaxyVisual = group.children[0] as THREE.Group | undefined;
      if (galaxyVisual) {
        const arms = galaxyVisual.getObjectByName('galaxyArms');
        if (arms) {
          arms.rotation.y += group.userData.spin || 0.001;
        }
      }
    });

    if (this.starfield) {
      this.starfield.rotation.y += 0.0001;
      this.starfield.rotation.x += 0.00005;
    }
    if (this.starfieldMaterial) {
      this.starfieldMaterial.uniforms.uTime.value = elapsedTime;
    }
    this.planetGroups.forEach((group) => {
      const planetMesh = group.children[0] as THREE.Mesh;
      if (planetMesh && planetMesh.material instanceof THREE.ShaderMaterial) {
        planetMesh.material.uniforms.uTime.value = elapsedTime;
      }
      const atmosphereMesh = group.children[1] as THREE.Mesh;
      if (
        atmosphereMesh &&
        atmosphereMesh.material instanceof THREE.ShaderMaterial
      ) {
        atmosphereMesh.material.uniforms.uTime.value = elapsedTime;
      }
    });

    this.composer.render();
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

  private clearSceneContent(isPlanetView: boolean) {
    if (isPlanetView) {
      this.planetGroups.forEach((group) => {
        this.galaxyGroup.remove(group);
      });
      this.planetGroups.clear();
      const orbits = this.galaxyGroup.children.filter(
        (child) => child.name === 'orbit',
      );
      orbits.forEach((orbit) => this.galaxyGroup.remove(orbit));
    } else {
      this.galaxyRenderObjects.forEach((group) => {
        this.scene.remove(group);
      });
      this.galaxyRenderObjects.clear();
    }
  }

  private updateScene() {
    this.galaxyGroup.visible = this.viewMode === 'planets';

    if (this.viewMode === 'galaxies') {
      this.clearSceneContent(true);
      this.updateGalaxiesView();
    } else {
      this.clearSceneContent(false);
      this.updatePlanetsView();
    }
  }

  private updateGalaxiesView() {
    this.galaxiesData.forEach((galaxy, index) => {
      if (!this.galaxyRenderObjects.has(galaxy.id)) {
        const containerGroup = new THREE.Group();
        const galaxyVisual = this.createGalaxyVisual(galaxy, false);

        // Propagate user data to children for raycasting
        galaxyVisual.children.forEach((child) => {
          child.userData = {id: galaxy.id, name: galaxy.name};
        });
        containerGroup.add(galaxyVisual);
        containerGroup.userData.spin = galaxyVisual.userData.spin;

        const angle = (index / 8) * Math.PI * 2;
        const radius = 40 + (index % 8) * 10;
        containerGroup.position.set(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 10,
          Math.sin(angle) * radius,
        );
        this.galaxyRenderObjects.set(galaxy.id, containerGroup);
        this.scene.add(containerGroup);
      }
    });
  }

  private updatePlanetsView() {
    const currentGalaxy = this.galaxiesData.find(
      (g) => g.id === this.currentGalaxyId,
    );
    if (!currentGalaxy) {
      this.clearSceneContent(true);
      return;
    }

    // Update galaxy backdrop
    if (
      this.galaxyGroup.children.length === 0 ||
      this.galaxyGroup.userData.id !== currentGalaxy.id
    ) {
      this.galaxyGroup.clear();
      const galaxyVisual = this.createGalaxyVisual(currentGalaxy, true);
      this.galaxyGroup.userData = {
        id: currentGalaxy.id,
        spin: galaxyVisual.userData.spin,
      };
      // Move children from temp group to main galaxy group
      while (galaxyVisual.children.length > 0) {
        this.galaxyGroup.add(galaxyVisual.children[0]);
      }
    }

    const planetsData = Array.from(currentGalaxy.planets.values());
    planetsData.forEach((planet, index) => {
      if (!this.planetGroups.has(planet.celestial_body_id)) {
        const planetGroup = new THREE.Group();
        const geometry = new THREE.SphereGeometry(2, 64, 64);
        const textureTypeMap: {[key: string]: number} = {
          TERRESTRIAL: 1,
          GAS_GIANT: 2,
          VOLCANIC: 3,
          ICY: 1,
        };
        const material = new THREE.ShaderMaterial({
          vertexShader: planetVs,
          fragmentShader: planetFs,
          uniforms: {
            uTime: {value: 0.0},
            uColor1: {value: new THREE.Color(planet.visualization.color1)},
            uColor2: {value: new THREE.Color(planet.visualization.color2)},
            uOceanColor: {
              value: new THREE.Color(planet.visualization.oceanColor),
            },
            uCloudiness: {value: planet.visualization.cloudiness},
            uIceCoverage: {value: planet.visualization.iceCoverage},
            uTextureType: {
              value: textureTypeMap[planet.visualization.surfaceTexture] || 1,
            },
          },
        });
        const sphereMesh = new THREE.Mesh(geometry, material);
        sphereMesh.userData = {
          id: planet.celestial_body_id,
          isPlanet: true,
          name: planet.planetName,
        };
        planetGroup.add(sphereMesh);

        const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
          vertexShader: atmosphereVs,
          fragmentShader: atmosphereFs,
          uniforms: {
            uAtmosphereColor: {
              value: new THREE.Color(planet.visualization.atmosphereColor),
            },
            uTime: {value: 0.0},
          },
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true,
        });
        planetGroup.add(
          new THREE.Mesh(atmosphereGeometry, atmosphereMaterial),
        );

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
          ringMesh.rotation.x = Math.PI / 2 - 0.2;
          planetGroup.add(ringMesh);
        }

        const angle = (index / 8) * Math.PI * 2;
        const radius = 25 + index * 8;
        planetGroup.position.set(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        );
        const orbitGeometry = new THREE.RingGeometry(radius, radius + 0.05, 128);
        const orbitMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
        });
        const orbitMesh = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbitMesh.rotation.x = Math.PI / 2;
        orbitMesh.name = 'orbit';
        this.galaxyGroup.add(orbitMesh);
        this.planetGroups.set(planet.celestial_body_id, planetGroup);
        this.galaxyGroup.add(planetGroup);
      }
    });
  }

  private updateTarget() {
    this.isManualControl = false;
    if (this.viewMode === 'galaxies') {
      this.targetPosition.set(0, 50, 150);
      this.targetLookAt.set(0, 0, 0);
    } else {
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
  }

  private onCanvasPointerMove = (event: PointerEvent) => {
    this.pointer.x = (event.clientX / this.canvas.clientWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / this.canvas.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    let hovering = false;
    let labelText = '';

    const objectsToTest =
      this.viewMode === 'galaxies'
        ? Array.from(this.galaxyRenderObjects.values())
        : Array.from(this.planetGroups.values());

    const intersects = this.raycaster.intersectObjects(objectsToTest, true);
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      if (
        intersectedObject.userData.name &&
        (this.viewMode === 'galaxies' || intersectedObject.userData.isPlanet)
      ) {
        hovering = true;
        labelText = intersectedObject.userData.name || '';
        this.hoverLabel = {
          text: labelText,
          x: event.clientX,
          y: event.clientY,
          visible: true,
        };
      }
    } else {
      if (this.hoverLabel.visible) {
        this.hoverLabel = {...this.hoverLabel, visible: false};
      }
    }
    this.isHoveringObject = hovering;
    this.canvas.style.cursor = hovering ? 'pointer' : 'grab';
  };

  private onCanvasClick = (event: MouseEvent) => {
    this.pointer.x = (event.clientX / this.canvas.clientWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / this.canvas.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    let eventToDispatch: CustomEvent | null = null;
    if (this.viewMode === 'galaxies') {
      const intersects = this.raycaster.intersectObjects(
        Array.from(this.galaxyRenderObjects.values()),
        true,
      );
      if (intersects.length > 0) {
        eventToDispatch = new CustomEvent('galaxy-selected', {
          detail: {galaxyId: intersects[0].object.userData.id},
        });
      }
    } else {
      const intersects = this.raycaster.intersectObjects(
        Array.from(this.planetGroups.values()),
        true,
      );
      if (intersects.length > 0 && intersects[0].object.userData.isPlanet) {
        eventToDispatch = new CustomEvent('planet-selected', {
          detail: {planetId: intersects[0].object.userData.id},
        });
      }
    }
    if (eventToDispatch) {
      (this as EventTarget).dispatchEvent(eventToDispatch);
    }
  };

  render() {
    return html`
      <canvas id="three-canvas"></canvas>
      ${
        this.hoverLabel.visible
          ? html`<div
              class="hover-label"
              style="left: ${this.hoverLabel.x}px; top: ${this.hoverLabel
                .y}px; opacity: ${this.hoverLabel.visible ? 1 : 0}"
            >
              ${this.hoverLabel.text}
            </div>`
          : nothing
      }
      ${this.isScanning ? html`<div class="scanning-overlay"></div>` : nothing}
      <div class="info-panel ${this.selectedPlanetData ? 'visible' : ''}">
        ${
          this.selectedPlanetData
            ? html`
                <h2>${this.selectedPlanetData.planetName}</h2>
                <p class="ai-whisper">
                  "${this.selectedPlanetData.aiWhisper}"
                </p>
                <div class="detail">
                  <strong>Star System:</strong>
                  <p>
                    ${this.selectedPlanetData.starSystem}
                    (${this.selectedPlanetData.starType})
                  </p>
                </div>
                <div class="detail">
                  <strong>Planet Type:</strong>
                  <p>
                    ${this.selectedPlanetData.planetType} (~${
                this.selectedPlanetData.distanceLightYears
              }
                    light years away)
                  </p>
                </div>
                <div class="detail">
                  <strong>Atmosphere:</strong>
                  <p>${this.selectedPlanetData.atmosphericComposition}</p>
                </div>
                <div class="detail">
                  <strong>Surface:</strong>
                  <p>${this.selectedPlanetData.surfaceFeatures}</p>
                </div>
                <div class="detail">
                  <strong>Orbital Period:</strong>
                  <p>${this.selectedPlanetData.orbitalPeriod}</p>
                </div>
                <div class="detail">
                  <strong>Rotational Period:</strong>
                  <p>${this.selectedPlanetData.rotationalPeriod}</p>
                </div>
                <div class="detail">
                  <strong>Moons:</strong>
                  <p>
                    ${
                      this.selectedPlanetData.moons.count > 0
                        ? `${this.selectedPlanetData.moons.count}${
                            this.selectedPlanetData.moons.names.length > 0
                              ? ` (${this.selectedPlanetData.moons.names.join(
                                  ', ',
                                )})`
                              : ''
                          }`
                        : 'None'
                    }
                  </p>
                </div>
                <div class="detail">
                  <strong>Potential for Life</strong>
                  <p
                    class="assessment-value assessment-${this.selectedPlanetData.potentialForLife.assessment
                      .toLowerCase()
                      .replace(' ', '-')}"
                  >
                    ${this.selectedPlanetData.potentialForLife.assessment}
                  </p>
                  <p>${this.selectedPlanetData.potentialForLife.reasoning}</p>
                  ${
                    this.selectedPlanetData.potentialForLife.biosignatures &&
                    this.selectedPlanetData.potentialForLife.biosignatures
                      .length > 0
                      ? html` <div class="biosignatures">
                          <strong>Potential Biosignatures:</strong>
                          <ul>
                            ${this.selectedPlanetData.potentialForLife.biosignatures.map(
                              (sig) => html`<li>${sig}</li>`,
                            )}
                          </ul>
                        </div>`
                      : nothing
                  }
                </div>
                <div class="detail">
                  <strong>Discovery Narrative:</strong>
                  <p>${this.selectedPlanetData.discoveryNarrative}</p>
                </div>

                ${
                  this.groundingChunks.length > 0
                    ? html` <div class="citations">
                        <strong>Data Sources:</strong>
                        <ul>
                          ${this.groundingChunks.map((chunk) =>
                            chunk.web?.uri
                              ? html` <li>
                                  <a
                                    href=${chunk.web.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    >${chunk.web.title || chunk.web.uri}</a
                                  >
                                </li>`
                              : nothing,
                          )}
                        </ul>
                      </div>`
                    : nothing
                }
              `
            : nothing
        }
      </div>
    `;
  }
}
