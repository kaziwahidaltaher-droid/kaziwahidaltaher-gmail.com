/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, html, css, PropertyValueMap} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import * as THREE from 'three';
import {
  vs as atmosphereVs,
  fs as atmosphereFs,
} from './atmosphere-shader.tsx';

@customElement('shader-lab-visualizer')
export class ShaderLabVisualizer extends LitElement {
  @property({type: String}) atmosphereColor = '#a0d0ff';
  @property({type: Number}) fresnelPower = 4.0;

  @query('#shader-canvas') private canvas!: HTMLCanvasElement;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private sphereMaterial!: THREE.ShaderMaterial;
  private animationFrameId = 0;

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
    window.addEventListener('resize', this.handleResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleResize);
    cancelAnimationFrame(this.animationFrameId);
    this.renderer?.dispose();
  }

  firstUpdated() {
    this.initThree();
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (this.sphereMaterial) {
      if (changedProperties.has('atmosphereColor')) {
        this.sphereMaterial.uniforms.uAtmosphereColor.value.set(
          this.atmosphereColor,
        );
      }
      if (changedProperties.has('fresnelPower')) {
        this.sphereMaterial.uniforms.uFresnelPower.value = this.fresnelPower;
      }
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 2;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    this.sphereMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereVs,
      fragmentShader: atmosphereFs,
      uniforms: {
        uAtmosphereColor: {
          value: new THREE.Color(this.atmosphereColor),
        },
        uFresnelPower: {value: this.fresnelPower},
        uTime: {value: 0.0},
        uHasAuroras: { value: true },
        uIsSelected: { value: false },
        uLightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });

    const sphere = new THREE.Mesh(geometry, this.sphereMaterial);
    this.scene.add(sphere);

    this.runAnimationLoop();
  }

  private handleResize = () => {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  };

  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();

    if (this.sphereMaterial) {
      this.sphereMaterial.uniforms.uTime.value = elapsedTime;
    }

    this.renderer.render(this.scene, this.camera);
  };

  render() {
    return html`<canvas id="shader-canvas"></canvas>`;
  }
}