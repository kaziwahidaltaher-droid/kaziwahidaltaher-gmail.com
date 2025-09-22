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
import type {DeepScanAnalysis} from './index';

@customElement('deep-scan-visualizer')
export class DeepScanVisualizer extends LitElement {
  @property({type: Object}) analysisData: DeepScanAnalysis | null = null;
  @query('canvas') private canvas!: HTMLCanvasElement;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private composer!: EffectComposer;
  private clock = new THREE.Clock();
  private animationFrameId = 0;
  private raysGroup: THREE.Group | null = null;
  
  // Define material colors in a way that CSS can also access them
  private materialColors = [
    new THREE.Color(getComputedStyle(this).getPropertyValue('--mat-color-1').trim() || '#9b7653'),
    new THREE.Color(getComputedStyle(this).getPropertyValue('--mat-color-2').trim() || '#e08d51'),
    new THREE.Color(getComputedStyle(this).getPropertyValue('--mat-color-3').trim() || '#ffdd33'),
    new THREE.Color(getComputedStyle(this).getPropertyValue('--mat-color-4').trim() || '#ffffff'),
  ];

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
    this.initThree();
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver.unobserve(this);
    cancelAnimationFrame(this.animationFrameId);
    this.renderer?.dispose();
  }

  private resizeObserver = new ResizeObserver(() => {
    this.handleResize();
  });

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (changedProperties.has('analysisData') && this.analysisData) {
      this.createVisualization();
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.clientWidth / this.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 500, 700);

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
    this.controls.autoRotateSpeed = 0.3;

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.clientWidth, this.clientHeight), 0.5, 0.4, 0.1);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    const centerSphere = new THREE.Mesh(
        new THREE.SphereGeometry(30, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x61faff, transparent: true, opacity: 0.3, wireframe: true })
    );
    this.scene.add(centerSphere);

    this.handleResize();
    this.runAnimationLoop();
  }

  private handleResize = () => {
    if (!this.renderer || !this.camera) return;
    const { clientWidth, clientHeight } = this;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
    this.composer.setSize(clientWidth, clientHeight);
  };

  private createVisualization() {
    if (!this.analysisData || !this.scene) return;
    if (this.raysGroup) {
      this.scene.remove(this.raysGroup);
      this.raysGroup.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    }

    this.raysGroup = new THREE.Group();
    const VISUALIZATION_SCALE = 0.15; // To scale down large thickness values

    this.analysisData.rays.forEach(rayData => {
      const { direction, layers } = rayData;
      const dirVector = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
      let currentOffset = 30; // Start at the surface of the central sphere

      layers.forEach(layer => {
        const length = layer.thickness * VISUALIZATION_SCALE;
        if (length <= 0) return;

        const radius = 2.5;
        const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
        const colorIndex = (parseInt(layer.materialId, 10) - 1) % this.materialColors.length;
        const material = new THREE.MeshBasicMaterial({ color: this.materialColors[colorIndex] });
        const cylinder = new THREE.Mesh(geometry, material);

        const offsetVector = dirVector.clone().multiplyScalar(currentOffset + length / 2);
        cylinder.position.copy(offsetVector);
        cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVector);
        
        this.raysGroup!.add(cylinder);
        currentOffset += length;
      });
    });
    this.scene.add(this.raysGroup);
  }
  
  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    this.controls.update(this.clock.getDelta());
    this.composer.render();
  };

  render() {
    return html`<canvas></canvas>`;
  }
}
