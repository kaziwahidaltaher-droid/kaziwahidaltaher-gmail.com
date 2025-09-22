/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import { LightCurvePoint } from './index';

export interface LightCurveAnalysis {
    summary: string;
    points: LightCurvePoint[];
}

@customElement('light-curve-visualizer')
export class LightCurveVisualizer extends LitElement {
  @property({type: Object}) analysisData: LightCurveAnalysis | null = null;
  @query('canvas') private canvas!: HTMLCanvasElement;

  private ctx!: CanvasRenderingContext2D;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      color: #a0d0ff;
      font-family: 'Exo 2', sans-serif;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
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
  `;

  firstUpdated() {
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    this.drawChart();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.resizeCanvas);
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('analysisData')) {
      this.drawChart();
    }
  }

  resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.drawChart();
  };

  drawChart = () => {
    if (!this.ctx || !this.analysisData || this.analysisData.points.length === 0) {
      this.ctx?.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
      return;
    };

    const { points } = this.analysisData;
    const { clientWidth: width, clientHeight: height } = this.canvas;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#a0d0ff';
    this.ctx.strokeStyle = '#a0d0ff';
    this.ctx.font = '10px Exo 2';

    // Find data range
    const xMin = points[0].time;
    const xMax = points[points.length - 1].time;
    const yMin = Math.min(...points.map(p => p.flux));
    const yMax = Math.max(...points.map(p => p.flux));
    const yRange = yMax - yMin;
    const yBuffer = yRange * 0.2;

    const scaleX = (val: number) => padding.left + ((val - xMin) / (xMax - xMin)) * (width - padding.left - padding.right);
    const scaleY = (val: number) => (height - padding.bottom) - ((val - (yMin - yBuffer)) / (yRange + yBuffer * 2)) * (height - padding.top - padding.bottom);

    // Draw grid
    this.ctx.globalAlpha = 0.2;
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) { // Y-axis grid
        const y = padding.top + i * ((height - padding.top - padding.bottom) / 5);
        this.ctx.beginPath();
        this.ctx.moveTo(padding.left, y);
        this.ctx.lineTo(width - padding.right, y);
        this.ctx.stroke();
    }
    for (let i = 0; i <= 10; i++) { // X-axis grid
        const x = padding.left + i * ((width - padding.left - padding.right) / 10);
        this.ctx.beginPath();
        this.ctx.moveTo(x, padding.top);
        this.ctx.lineTo(x, height - padding.bottom);
        this.ctx.stroke();
    }

    // Draw axes labels
    this.ctx.globalAlpha = 0.7;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Time (HJD)', width / 2, height - 5);
    this.ctx.save();
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillText('Relative Flux', -height / 2, 15);
    this.ctx.restore();

    // Draw data points and line
    this.ctx.globalAlpha = 1;
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowColor = '#a0d0ff';
    this.ctx.shadowBlur = 5;

    this.ctx.beginPath();
    this.ctx.moveTo(scaleX(points[0].time), scaleY(points[0].flux));
    points.forEach(p => {
        this.ctx.lineTo(scaleX(p.time), scaleY(p.flux));
    });
    this.ctx.stroke();

    // Reset shadow
    this.ctx.shadowBlur = 0;
  };

  render() {
    return html`
      <div class="title">Photometric Light Curve</div>
      <canvas></canvas>
    `;
  }
}
