/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AURELION - Galaxy Map Visualizer
 */

import {LitElement, html, css, PropertyValueMap} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {PlanetData} from './index.tsx';
import {vs as nebulaVs, fs as nebulaFs} from './nebula-shader';

export interface Waypoint {
  name: string;
  description: string;
  coords: [number, number, number];
}

@customElement('galaxy-map-visualizer')
export class GalaxyMapVisualizer extends LitElement {
  @property({type: Array}) planets: PlanetData[] = [];
  @property({type: Object}) planetCoords = new Map<
    string,
    [number, number, number]
  >();
  @property({type: String}) selectedPlanetId: string | null = null;
  @property({type: Array}) navigationRoute: Waypoint[] | null = null;

  @query('#canvas') private canvas!: HTMLCanvasElement;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();
  private animationFrameId = 0;

  private starfield!: THREE.Points;
  private galaxy!: THREE.Points;
  private nebulae: THREE.Mesh[] = [];
  private planetMarkers = new Map<string, THREE.Sprite>();
  private routeLine: THREE.Mesh | null = null;

  private targetPosition = new THREE.Vector3(0, 80, 250);
  private targetLookAt = new THREE.Vector3(0, 0, 0);
  private isManualControl = false;

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

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (changedProperties.has('planets')) {
      this.updatePlanetMarkers();
    }
    if (changedProperties.has('selectedPlanetId')) {
      this.updateTarget();
      this.updatePlanetMarkers(); // To update selection highlight
    }
    if (changedProperties.has('navigationRoute')) {
      this.updateNavigationRoute();
    }
  }

  private handleResize = () => {
    if (!this.renderer || !this.camera) return;
    if (!this.canvas) return; // FIX: Add check for canvas
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
    if (!this.canvas) return; // FIX: Add check for canvas
    const pointer = new THREE.Vector2(
      (event.clientX / this.canvas.clientWidth) * 2 - 1,
      -(event.clientY / this.canvas.clientHeight) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);

    const markerObjects = Array.from(this.planetMarkers.values());
    const intersects = raycaster.intersectObjects(markerObjects);

    if (intersects.length > 0) {
      const id = intersects[0].object.userData.id;
      if (id) {
        (this as unknown as EventTarget).dispatchEvent(
          new CustomEvent('planet-selected', {
            detail: {planetId: id},
            bubbles: true,
            composed: true,
          }),
        );
      }
    }
  };

  private updateTarget() {
    this.isManualControl = false;
    if (this.selectedPlanetId) {
      const coords = this.planetCoords.get(this.selectedPlanetId);
      if (coords) {
        const planetPos = new THREE.Vector3(...coords);
        this.targetPosition.copy(planetPos).add(new THREE.Vector3(0, 5, 15));
        this.targetLookAt.copy(planetPos);
      }
    } else {
      this.targetPosition.set(0, 80, 250);
      this.targetLookAt.set(0, 0, 0);
    }
  }

  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();

    if (!this.isManualControl) {
      this.camera.position.lerp(this.targetPosition, 0.03);
      this.controls.target.lerp(this.targetLookAt, 0.03);
    }
    this.controls.update();

    this.nebulae.forEach((nebula) => {
      (nebula.material as THREE.ShaderMaterial).uniforms.uTime.value =
        elapsedTime;
    });

    // Animate selection pulse
    if (this.selectedPlanetId) {
        const marker = this.planetMarkers.get(this.selectedPlanetId);
        if (marker) {
            const scale = 0.04 + Math.sin(elapsedTime * 5) * 0.005;
            marker.scale.set(scale, scale, 1);
        }
    }

    this.composer.render();
  };

  private initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      4000,
    );
    this.camera.position.copy(this.targetPosition);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 500;
    this.controls.target.set(0, 0, 0);

    // Post-processing
    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      0.4, // intensity
      0.2, // radius
      0.8, // threshold
    );
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    // Scene elements
    this.createStarfield();
    this.createGalaxy();
    this.createNebulae();
    this.updatePlanetMarkers();

    // Event Listeners
    this.canvas.addEventListener('click', this.onCanvasClick);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);

    this.runAnimationLoop();
  }

  private createStarfield() {
    const starCount = 200000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const range = 2000;

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * range;
      positions[i3 + 1] = (Math.random() - 0.5) * range;
      positions[i3 + 2] = (Math.random() - 0.5) * range;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  private createGalaxy() {
    const params = {
      count: 200000,
      size: 0.5,
      radius: 150,
      branches: 5,
      spin: 1.5,
      randomness: 0.6,
      randomnessPower: 3.0,
      insideColor: '#ffc261',
      outsideColor: '#61faff',
    };

    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);
    const colorInside = new THREE.Color(params.insideColor);
    const colorOutside = new THREE.Color(params.outsideColor);

    for (let i = 0; i < params.count; i++) {
      const i3 = i * 3;
      const r = Math.random() * params.radius;
      const spinAngle = r * params.spin;
      const branchAngle = ((i % params.branches) / params.branches) * Math.PI * 2;

      const randomX =
        Math.pow(Math.random(), params.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        params.randomness *
        r;
      const randomY =
        Math.pow(Math.random(), params.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        params.randomness *
        0.2;
      const randomZ =
        Math.pow(Math.random(), params.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        params.randomness *
        r;

      positions[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, r / params.radius);
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: params.size,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.galaxy = new THREE.Points(geometry, material);
    this.scene.add(this.galaxy);
  }

  private createNebulae() {
    const nebulaColors = [0x61faff, 0xff61c3, 0xffc261];
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.PlaneGeometry(300, 300);
      const material = new THREE.ShaderMaterial({
        vertexShader: nebulaVs,
        fragmentShader: nebulaFs,
        uniforms: {
          uTime: {value: 0.0},
          uColor: {value: new THREE.Color(nebulaColors[i % 3])},
          uSeed: {value: Math.random() * 100},
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const nebula = new THREE.Mesh(geometry, material);
      nebula.position.set(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 200,
      );
      nebula.rotation.x = -Math.PI / 2;
      nebula.rotation.z = Math.random() * Math.PI;
      this.nebulae.push(nebula);
      this.scene.add(nebula);
    }
  }

  private updatePlanetMarkers() {
    const currentPlanetIds = new Set(this.planets.map((p) => p.celestial_body_id));
    // Remove old markers
    this.planetMarkers.forEach((marker, id) => {
      if (!currentPlanetIds.has(id)) {
        this.scene.remove(marker);
        marker.material.dispose();
        this.planetMarkers.delete(id);
      }
    });

    // Add/update markers
    this.planets.forEach((planet) => {
      const coords = this.planetCoords.get(planet.celestial_body_id);
      if (!coords) return;

      let marker = this.planetMarkers.get(planet.celestial_body_id);
      if (!marker) {
        const map = new THREE.TextureLoader().load(
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==',
        );
        const material = new THREE.SpriteMaterial({
          map: map,
          color: planet.visualization.atmosphereColor,
          sizeAttenuation: false,
          blending: THREE.AdditiveBlending,
          depthTest: false,
        });
        marker = new THREE.Sprite(material);
        marker.userData = {id: planet.celestial_body_id};
        this.planetMarkers.set(planet.celestial_body_id, marker);
        this.scene.add(marker);
      }
      marker.position.set(...coords);

      // Update appearance based on selection
      if (planet.celestial_body_id === this.selectedPlanetId) {
        marker.scale.set(0.04, 0.04, 1);
        (marker.material as THREE.SpriteMaterial).opacity = 1.0;
      } else {
        marker.scale.set(0.02, 0.02, 1);
        (marker.material as THREE.SpriteMaterial).opacity = 0.6;
      }
    });
  }

  private updateNavigationRoute() {
    // Clean up old route
    if (this.routeLine) {
      this.scene.remove(this.routeLine);
      this.routeLine.geometry.dispose();
      (this.routeLine.material as THREE.Material).dispose();
      this.routeLine = null;
    }

    if (!this.navigationRoute || this.navigationRoute.length < 2) return;

    const points = this.navigationRoute.map(
      (wp) => new THREE.Vector3(...wp.coords),
    );
    const curve = new THREE.CatmullRomCurve3(points);
    // FIX: Completed truncated line and function.
    const geometry = new THREE.TubeGeometry(curve, 64, 0.5, 8, false);
    const material = new THREE.MeshBasicMaterial({
      color: 0x61faff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    this.routeLine = new THREE.Mesh(geometry, material);
    this.scene.add(this.routeLine);
  }

  render() {
    return html`<canvas id="canvas"></canvas>`;
  }
}
