/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, html, css, PropertyValueMap} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { vs, fs } from './live-motion-shader.tsx';

export type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

@customElement('conversation-visualizer')
export class ConversationVisualizer extends LitElement {
  @property({ type: String }) state: ConversationState = 'idle';
  @property({ type: Number }) volume = 0;

  @query('canvas') private canvas!: HTMLCanvasElement;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private clock = new THREE.Clock();
  private animationFrameId = 0;
  private sphereMaterial!: THREE.ShaderMaterial;
  private audioDataTexture!: THREE.DataTexture;

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

  private resizeObserver = new ResizeObserver(() => this.handleResize());

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (this.sphereMaterial) {
      if (changedProperties.has('state')) {
        let stateValue = 0;
        if (this.state === 'listening') stateValue = 1;
        if (this.state === 'speaking') stateValue = 2;
        if (this.state === 'thinking') stateValue = 3;
        this.sphereMaterial.uniforms.uState.value = stateValue;
      }
    }
  }
  
  private initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
    this.camera.position.z = 2.5;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x010206);

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight), 0.5, 0.5, 0.1);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.createAudioTexture();
    this.createSphere();

    this.handleResize();
    this.runAnimationLoop();
  }

  private createAudioTexture() {
    const size = 16;
    const data = new Uint8Array(size);
    this.audioDataTexture = new THREE.DataTexture(data, size, 1, THREE.RedFormat, THREE.UnsignedByteType);
    this.audioDataTexture.needsUpdate = true;
  }

  private createSphere() {
    const geometry = new THREE.IcosahedronGeometry(1, 128);
    this.sphereMaterial = new THREE.ShaderMaterial({
      vertexShader: vs,
      fragmentShader: fs,
      uniforms: {
        uTime: { value: 0 },
        uAudioData: { value: this.audioDataTexture },
        uState: { value: 0 },
        uHover: { value: 0 },
        uClickPulse: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sphere = new THREE.Mesh(geometry, this.sphereMaterial);
    this.scene.add(sphere);
  }

  private handleResize() {
    if (!this.renderer || !this.camera) return;
    if (!this.canvas) return; // Add check for canvas
    const { clientWidth, clientHeight } = this.canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
    this.composer.setSize(clientWidth, clientHeight);
  }

  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();

    if (this.sphereMaterial) {
      this.sphereMaterial.uniforms.uTime.value = elapsedTime;
      
      const audioData = this.audioDataTexture.image.data;
      const baseLevel = this.volume * 255;
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = baseLevel * (1 + Math.sin(i * 0.5 + elapsedTime * 2) * 0.1);
      }
      this.audioDataTexture.needsUpdate = true;
    }
    
    this.composer.render();
  };

  render() {
    return html`<canvas></canvas>`;
  }
}
