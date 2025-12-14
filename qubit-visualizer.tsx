
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
import type {QubitStateAnalysis} from './index';

// Helper to create text sprites
function makeTextSprite(message: string, parameters?: { fontsize?: number, fontface?: string, borderColor?: { r: number, g: number, b: number, a: number }, backgroundColor?: { r: number, g: number, b: number, a: number }, textColor?: string }) {
    if (parameters === undefined) parameters = {};
    const fontface = parameters.fontface ? parameters.fontface : 'Arial';
    const fontsize = parameters.fontsize ? parameters.fontsize : 18;
    const textColor = parameters.textColor ? parameters.textColor : '#FFFFFF';
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = `Bold ${fontsize}px ${fontface}`;
    
    const metrics = context.measureText(message);
    const textWidth = metrics.width;

    canvas.width = textWidth + 8;
    canvas.height = fontsize + 8;

    context.font = `Bold ${fontsize}px ${fontface}`;
    context.fillStyle = textColor;
    context.fillText(message, 4, fontsize);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
    return sprite;
}

@customElement('qubit-visualizer')
export class QubitVisualizer extends LitElement {
  @property({type: Object}) analysisData: QubitStateAnalysis | null = null;
  @query('canvas') private canvas!: HTMLCanvasElement;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private composer!: EffectComposer;
  private clock = new THREE.Clock();
  private animationFrameId = 0;
  private qubitGroup: THREE.Group | null = null;
  private stateVectorArrow: THREE.ArrowHelper | null = null;
  private stateSphere: THREE.Mesh | null = null;
  private measureRing: THREE.Mesh | null = null;
  
  private resizeObserver: ResizeObserver;

  constructor() {
    super();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
  }

  firstUpdated() {
    this.initThree();
    this.resizeObserver.observe(this as unknown as Element);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver.unobserve(this as unknown as Element);
    cancelAnimationFrame(this.animationFrameId);
    this.renderer?.dispose();
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (changedProperties.has('analysisData') && this.analysisData) {
      this.updateVisualization();
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 100);
    this.camera.position.set(2.5, 1.5, 2.5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.8;
    this.controls.enablePan = false;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight), 0.6, 0.5, 0.1);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.createBlochSphere();

    this.handleResize();
    this.runAnimationLoop();
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

  private createBlochSphere() {
    this.qubitGroup = new THREE.Group();
    const radius = 1;
    
    // Sphere
    const sphereGeom = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
        color: 0x61faff,
        transparent: true,
        opacity: 0.15,
        wireframe: false,
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    this.qubitGroup.add(sphere);

    // Axes
    const axisLength = radius * 1.3;
    const axesHelper = new THREE.AxesHelper(axisLength);
    (axesHelper.material as THREE.LineBasicMaterial).transparent = true;
    (axesHelper.material as THREE.LineBasicMaterial).opacity = 0.5;
    this.qubitGroup.add(axesHelper);

    // Circles
    const circleGeom = new THREE.BufferGeometry().setFromPoints(new THREE.Path().absarc(0, 0, radius, 0, Math.PI * 2, false).getSpacedPoints(128));
    const circleMat = new THREE.LineBasicMaterial({ color: 0x61faff, transparent: true, opacity: 0.3 });
    const xyCircle = new THREE.Line(circleGeom, circleMat);
    const xzCircle = new THREE.Line(circleGeom, circleMat);
    xzCircle.rotation.x = Math.PI / 2;
    const yzCircle = new THREE.Line(circleGeom, circleMat);
    yzCircle.rotation.y = Math.PI / 2;
    this.qubitGroup.add(xyCircle, xzCircle, yzCircle);

    // Labels
    const zUpLabel = makeTextSprite("|0⟩", { fontsize: 32, textColor: '#c0f0ff' });
    zUpLabel.position.set(0, radius + 0.3, 0);
    this.qubitGroup.add(zUpLabel);
    
    const zDownLabel = makeTextSprite("|1⟩", { fontsize: 32, textColor: '#c0f0ff' });
    zDownLabel.position.set(0, -radius - 0.3, 0);
    this.qubitGroup.add(zDownLabel);

    const xLabel = makeTextSprite("X", { fontsize: 24, textColor: '#c0f0ff' });
    xLabel.position.set(axisLength + 0.2, 0, 0);
    this.qubitGroup.add(xLabel);

    const yLabel = makeTextSprite("Y", { fontsize: 24, textColor: '#c0f0ff' });
    yLabel.position.set(0, axisLength + 0.2, 0);
    this.qubitGroup.add(yLabel);
    
    const zLabel = makeTextSprite("Z", { fontsize: 24, textColor: '#c0f0ff' });
    zLabel.position.set(0, 0, axisLength + 0.2);
    this.qubitGroup.add(zLabel);
    
    this.scene.add(this.qubitGroup);
  }

  private updateVisualization() {
    if (!this.analysisData || !this.qubitGroup) return;

    if (this.stateVectorArrow) {
      this.qubitGroup.remove(this.stateVectorArrow);
    }
    if (this.stateSphere) {
        this.qubitGroup.remove(this.stateSphere);
    }
    if (this.measureRing) {
        this.qubitGroup.remove(this.measureRing);
    }
    
    const { theta, phi } = this.analysisData.stateVector;
    const radius = 1;

    // Convert spherical (physics convention) to Cartesian (Y-up for this visualizer's |0>/|1> axis)
    // Here, theta is angle from Y axis (up).
    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(theta) * Math.sin(phi);

    const direction = new THREE.Vector3(x, y, z);
    
    this.stateVectorArrow = new THREE.ArrowHelper(
        direction.normalize(),
        new THREE.Vector3(0, 0, 0),
        radius,
        0xffc261, // a bright yellow/gold color
        0.1,
        0.08
    );
    this.qubitGroup.add(this.stateVectorArrow);

    // Create a sphere at the tip to highlight the state
    const tipGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const tipMaterial = new THREE.MeshBasicMaterial({ color: 0xffe082 });
    this.stateSphere = new THREE.Mesh(tipGeometry, tipMaterial);
    this.stateSphere.position.copy(direction);
    this.qubitGroup.add(this.stateSphere);

    // Create a measurement ring effect active around the state vector
    const ringGeometry = new THREE.RingGeometry(0.12, 0.15, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x61faff, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    this.measureRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.measureRing.position.copy(direction);
    this.measureRing.lookAt(new THREE.Vector3(0, 0, 0));
    this.qubitGroup.add(this.measureRing);
  }
  
  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    this.controls.update();
    const time = this.clock.getElapsedTime();

    if (this.stateSphere) {
        // Pulse the tip sphere
        const scale = 1.0 + Math.sin(time * 4.0) * 0.3;
        this.stateSphere.scale.set(scale, scale, scale);
        
        // Pulse color
        const material = this.stateSphere.material as THREE.MeshBasicMaterial;
        material.color.setHSL(0.1, 0.8, 0.5 + Math.sin(time * 3.0) * 0.2);
    }

    if (this.measureRing) {
        // Rotate and pulse the measurement ring
        this.measureRing.rotation.z -= 0.05;
        const scale = 1.0 + Math.cos(time * 5.0) * 0.2;
        this.measureRing.scale.set(scale, scale, 1);
        (this.measureRing.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(time * 8.0) * 0.3;
    }

    this.composer.render();
  };

  render() {
    return html`<canvas></canvas>`;
  }
}
