/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

@customElement('light-curve-visualizer')
export class LightCurveVisualizer extends LitElement {
  @property({type: Boolean, reflect: true}) isActive = false;
  @query('canvas') private canvas!: HTMLCanvasElement;

  private ctx!: CanvasRenderingContext2D;
  private animationFrameId = 0;
  private dipProgress = -0.2; // Start off-screen

  static styles = css`
    :host {
      display: block;
      position: absolute;
      bottom: 8rem;
      right: 2rem;
      width: 300px;
      height: 150px;
      background: rgba(10, 25, 40, 0.7);
      border: 1px solid rgba(160, 208, 255, 0.2);
      backdrop-filter: blur(5px);
      pointer-events: none;
      transition: opacity 0.5s ease, transform 0.5s ease;
      opacity: 0;
      transform: translateY(20px);
      color: #a0d0ff;
    }
    :host([isActive]) {
      opacity: 1;
      transform: translateY(0);
    }
    canvas {
      width: 100%;
      height: 100%;
    }
    .title {
      position: absolute;
      top: 5px;
      left: 10px;
      font-size: 0.8rem;
      font-weight: 300;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.7;
    }

    @media (max-width: 1200px) {
      :host {
        width: 240px;
        height: 120px;
        right: 1rem;
      }
    }

    @media (max-width: 768px) {
      :host {
        /* Hide on mobile where it would conflict with command bar */
        display: none;
      }
    }
  `;

  firstUpdated() {
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.resizeCanvas);
    cancelAnimationFrame(this.animationFrameId);
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('isActive')) {
      if (this.isActive) {
        this.dipProgress = -0.2;
        this.startAnimation();
      } else {
        this.stopAnimation();
      }
    }
  }

  resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
  };

  startAnimation() {
    this.stopAnimation();
    this.draw();
  }

  stopAnimation() {
    cancelAnimationFrame(this.animationFrameId);
  }

  draw = () => {
    this.animationFrameId = requestAnimationFrame(this.draw);

    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    this.ctx.strokeStyle = '#a0d0ff';
    this.ctx.fillStyle = '#a0d0ff';
    this.ctx.shadowColor = '#a0d0ff';
    this.ctx.shadowBlur = 5;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const centerY = height / 2;
    const noiseAmplitude = 2;

    // Draw grid
    this.ctx.globalAlpha = 0.2;
    this.ctx.lineWidth = 0.5;
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
    for (let i = 1; i < 10; i++) {
      const x = (width / 10) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    // Animate dip
    this.dipProgress += 0.005;
    if (this.dipProgress > 1.2) {
      this.dipProgress = -0.2; // Loop
    }
    const dipWidth = 0.15;
    const dipDepth = 30;

    // Draw light curve
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, centerY + (Math.random() - 0.5) * noiseAmplitude);

    for (let x = 0; x < width; x++) {
      let y = centerY + (Math.random() - 0.5) * noiseAmplitude;
      const progressX = x / width;

      // Calculate dip
      if (
        progressX > this.dipProgress &&
        progressX < this.dipProgress + dipWidth
      ) {
        const dipPhase = (progressX - this.dipProgress) / dipWidth;
        const dip = Math.sin(dipPhase * Math.PI) * dipDepth;
        y += dip;
      }

      this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
  };

  render() {
    return html`
      <div class="title">TESS Light Curve Analysis</div>
      <canvas></canvas>
    `;
  }
}