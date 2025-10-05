/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import { RadialVelocityPoint, RadialVelocityAnalysis } from './index';

@customElement('radial-velocity-visualizer')
export class RadialVelocityVisualizer extends LitElement {
  @property({type: Object}) analysisData: RadialVelocityAnalysis | null = null;
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
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
      }
      return;
    };

    const { points } = this.analysisData;
    const { clientWidth: width, clientHeight: height } = this.canvas;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = 'rgba(192, 240, 255, 0.7)';
    this.ctx.strokeStyle = 'rgba(192, 240, 255, 0.7)';
    this.ctx.font = '10px Exo 2';

    // Find data range
    const xMin = Math.min(...points.map(p => p.time));
    const xMax = Math.max(...points.map(p => p.time));
    let yMin = Math.min(...points.map(p => p.velocity));
    let yMax = Math.max(...points.map(p => p.velocity));
    
    const absMax = Math.max(Math.abs(yMin), Math.abs(yMax));
    yMin = -absMax;
    yMax = absMax;
    
    const yBuffer = Math.abs(yMax) * 0.1;
    yMin -= yBuffer;
    yMax += yBuffer;

    const scaleX = (val: number) => padding.left + ((val - xMin) / (xMax - xMin)) * (width - padding.left - padding.right);
    const scaleY = (val: number) => (height - padding.bottom) - ((val - yMin) / (yMax - yMin)) * (height - padding.top - padding.bottom);

    // Draw grid and zero line
    this.ctx.strokeStyle = 'rgba(97, 250, 255, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    const zeroY = scaleY(0);
    if (zeroY > padding.top && zeroY < height - padding.bottom) {
        this.ctx.moveTo(padding.left, zeroY);
        this.ctx.lineTo(width - padding.right, zeroY);
    }
    for (let i = 0; i <= 4; i++) { // Y-axis grid
        const y = padding.top + i * ((height - padding.top - padding.bottom) / 4);
        this.ctx.moveTo(padding.left, y);
        this.ctx.lineTo(width - padding.right, y);
    }
    for (let i = 0; i <= 5; i++) { // X-axis grid
        const x = padding.left + i * ((width - padding.left - padding.right) / 5);
        this.ctx.moveTo(x, padding.top);
        this.ctx.lineTo(x, height - padding.bottom);
    }
    this.ctx.stroke();

    // Draw axes labels and ticks
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Phase', width / 2, height - 10);
    this.ctx.save();
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillText('Velocity (m/s)', -height / 2, 15);
    this.ctx.restore();
    
    // Y-axis ticks
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
        const yVal = yMin + (yMax - yMin) * (i / 4);
        const y = scaleY(yVal);
        this.ctx.fillText(yVal.toFixed(1), padding.left - 8, y);
    }

    // Draw data line
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = '#ffc261'; 
    this.ctx.shadowColor = 'rgba(255, 194, 97, 0.7)';
    this.ctx.shadowBlur = 8;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    const sortedPoints = [...points].sort((a,b) => a.time - b.time);
    this.ctx.moveTo(scaleX(sortedPoints[0].time), scaleY(sortedPoints[0].velocity));
    sortedPoints.forEach(p => {
        this.ctx.lineTo(scaleX(p.time), scaleY(p.velocity));
    });
    this.ctx.stroke();

    // Draw data points with error bars
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = 'rgba(255, 194, 97, 0.5)';
    this.ctx.fillStyle = '#010206';
    this.ctx.lineWidth = 1;
    points.forEach(p => {
        const x = scaleX(p.time);
        const y = scaleY(p.velocity);
        const yErr = scaleY(p.velocity - p.error) - y;

        // error bar
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - yErr);
        this.ctx.lineTo(x, y + yErr);
        this.ctx.stroke();

        // point
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    });
  };

  render() {
    return html`
      <div class="title">Radial Velocity Curve</div>
      <canvas></canvas>
    `;
  }
}