/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, html, css, PropertyValueMap} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type {PlanetData} from './index';
import {vs as planetVs, fs as planetFs} from './planet-shader';
import {vs as atmosphereVs, fs as atmosphereFs} from './atmosphere-shader';

@customElement('planet-visualizer')
export class PlanetVisualizer extends LitElement {
  @property({type: Object}) planet: PlanetData | null = null;
  @query('canvas') private canvas!: HTMLCanvasElement;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private composer!: EffectComposer;
  private clock = new THREE.Clock();
  private animationFrameId = 0;
  
  private planetGroup: THREE.Group | null = null;
  private resizeObserver: ResizeObserver;
  private isHovering = false;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();


  constructor() {
    super();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // FIX: Cast `this` to `unknown as Element` to satisfy TypeScript's strict type checking for ResizeObserver.
    this.resizeObserver.unobserve(this as unknown as Element);
    cancelAnimationFrame(this.animationFrameId);
    this.canvas?.removeEventListener('pointermove', this.onPointerMove);
    this.renderer?.dispose();
    this.planetGroup?.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const material = child.material as THREE.Material | THREE.Material[];
            if (Array.isArray(material)) {
                material.forEach(m => m.dispose());
            } else {
                material.dispose();
            }
        }
    });
  }

  firstUpdated() {
    this.initThree();
    // FIX: Cast `this` to `unknown as Element` to satisfy TypeScript's strict type checking for ResizeObserver.
    this.resizeObserver.observe(this as unknown as Element);
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (changedProperties.has('planet') && this.planet && this.scene) {
      this.createPlanetVisual();
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    // FIX: Use `this.canvas.clientWidth` and `this.canvas.clientHeight` for aspect ratio.
    this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 100);
    this.camera.position.z = 3.5;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.8;
    this.controls.maxDistance = 10;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.3;

    const renderScene = new RenderPass(this.scene, this.camera);
    // FIX: Use `this.canvas.clientWidth` and `this.canvas.clientHeight` for bloom pass dimensions.
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight), 0.5, 0.4, 0.1);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.handleResize();
    this.runAnimationLoop();
  }

  private handleResize = () => {
    if (!this.renderer || !this.camera || !this.composer) return;
    // FIX: Use `this.canvas.clientWidth` and `this.canvas.clientHeight` for sizing.
    const { clientWidth: width, clientHeight: height } = this.canvas;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  };
  
  private onPointerMove = (event: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
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

  private createPlanetVisual() {
    if (!this.planet || !this.scene) return;

    if (this.planetGroup) {
      this.scene.remove(this.planetGroup);
      this.planetGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              (child.material as THREE.Material).dispose();
          }
      });
    }

    this.planetGroup = new THREE.Group();
    const { visualization, celestial_body_id } = this.planet;
    
    let seed = 0;
    for (let i = 0; i < celestial_body_id.length; i++) {
        seed += celestial_body_id.charCodeAt(i);
    }
    const seededRandom = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
    const axialTilt = seededRandom(seed) * (Math.PI / 6);

    const textureTypeMap: {[key: string]: number} = { TERRESTRIAL: 1, GAS_GIANT: 2, VOLCANIC: 3, ICY: 4 };
    
    const planetMaterial = new THREE.ShaderMaterial({
        vertexShader: planetVs,
        fragmentShader: planetFs,
        uniforms: {
            uTime: { value: 0.0 },
            uColor1: { value: new THREE.Color(visualization.color1) },
            uColor2: { value: new THREE.Color(visualization.color2) },
            uOceanColor: { value: new THREE.Color(visualization.oceanColor || '#000033') },
            uCloudiness: { value: visualization.cloudiness || 0.0 },
            uIceCoverage: { value: visualization.iceCoverage || 0.0 },
            uTextureType: { value: textureTypeMap[visualization.surfaceTexture] || 1 },
            uIsSelected: { value: true },
            uIsHovered: { value: false },
            uAxialTilt: { value: axialTilt },
            uAtmosphereColor: { value: new THREE.Color(visualization.atmosphereColor) },
            uLightDirection: { value: new THREE.Vector3(1, 0.5, 1).normalize() },
        }
    });
    const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 128, 128), planetMaterial);
    sphereMesh.userData.isPlanet = true;
    this.planetGroup.add(sphereMesh);

    const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: atmosphereVs,
        fragmentShader: atmosphereFs,
        uniforms: {
            uAtmosphereColor: { value: new THREE.Color(visualization.atmosphereColor) },
            uFresnelPower: { value: 4.0 },
            uTime: { value: 0.0 },
            uIsSelected: { value: true },
            uHasAuroras: { value: visualization.surfaceTexture === 'ICY' || (visualization.surfaceTexture === 'TERRESTRIAL' && visualization.iceCoverage > 0.5) },
            uLightDirection: { value: new THREE.Vector3(1, 0.5, 1).normalize() },
        },
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry(2.1, 128, 128), atmosphereMaterial);
    this.planetGroup.add(atmosphereMesh);
    
    if (visualization.hasRings) {
      const ringGeometry = new THREE.RingGeometry(2.8, 4.5, 128);
      const ringMaterial = new THREE.MeshBasicMaterial({
        map: this.createRingTexture(),
        color: visualization.atmosphereColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
      ringMesh.rotation.x = Math.PI / 2 - axialTilt - 0.1;
      this.planetGroup.add(ringMesh);
    }

    this.scene.add(this.planetGroup);
  }

  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    this.controls.update();
    const elapsedTime = this.clock.getElapsedTime();

    if (this.planetGroup) {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.planetGroup.children);
        this.isHovering = intersects.some(i => i.object.userData.isPlanet);
        
        this.planetGroup.traverse(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                child.material.uniforms.uTime.value = elapsedTime;
                if (child.userData.isPlanet) {
                  child.material.uniforms.uIsHovered.value = this.isHovering;
                }
            }
        });
    }
    this.composer.render();
  }

  render() {
    return html`<canvas></canvas>`;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `;
}