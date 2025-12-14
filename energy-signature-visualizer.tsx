/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import type { EnergySignatureAnalysis } from './index';

@customElement('energy-signature-visualizer')
export class EnergySignatureVisualizer extends LitElement {
  @property({type: Object}) analysisData: EnergySignatureAnalysis | null = null;
  @query('canvas') private canvas!: HTMLCanvasElement;

  private ctx!: CanvasRenderingContext2D;
  private animationFrameId = 0;
  private rotation = 0;

  @state() private colorMap: {[key: string]: string} = {};
  private colors = ['#ff61c3', '#61ffca', '#ffc261', '#61faff', '#d861ff'];
  private colorIndex = 0;

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
    .legend {
      position: absolute;
      bottom: 5px;
      left: 10px;
      font-size: 0.7rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
      opacity: 0.8;
      pointer-events: none;
    }
    .legend-item {
      display: flex;
      align-items: center;
    }
    .legend-color {
      width: 10px;
      height: 10px;
      margin-right: 5px;
    }
  `;

  firstUpdated() {
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    this.runAnimationLoop();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.resizeCanvas);
    cancelAnimationFrame(this.animationFrameId);
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('analysisData')) {
      this.assignColors();
    }
  }

  assignColors() {
    if (!this.analysisData) return;
    const newColorMap: {[key: string]: string} = {};
    this.colorIndex = 0;
    this.analysisData.points.forEach(p => {
      if (!newColorMap[p.type]) {
        newColorMap[p.type] = this.colors[this.colorIndex % this.colors.length];
        this.colorIndex++;
      }
    });
    this.colorMap = newColorMap;
  }

  resizeCanvas = () => {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
  };

  runAnimationLoop = () => {
    this.drawChart();
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
  }

  drawChart = () => {
    if (!this.ctx || !this.analysisData || this.analysisData.points.length === 0) {
      if (this.canvas) {
        this.ctx?.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
      }
      return;
    };

    if (!this.canvas) return;

    const { points } = this.analysisData;
    const { clientWidth: width, clientHeight: height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    
    this.ctx.clearRect(0, 0, width, height);

    // Draw grid
    this.ctx.strokeStyle = 'rgba(97, 250, 255, 0.2)';
    this.ctx.lineWidth = 0.5;
    this.ctx.font = '8px Exo 2';
    this.ctx.fillStyle = 'rgba(97, 250, 255, 0.5)';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let i = 1; i <= 4; i++) {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius * (i / 4), 0, Math.PI * 2);
      this.ctx.stroke();
    }

    const maxFreq = 1000; // Define a max frequency for the chart scale
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      this.ctx.stroke();
      const freqLabel = ((i / 8) * maxFreq).toFixed(0);
      this.ctx.fillText(freqLabel, centerX + Math.cos(angle) * (radius + 15), centerY + Math.sin(angle) * (radius + 15));
    }
    this.ctx.fillText("THz", centerX, centerY - radius - 15);


    // Draw data
    const sortedPoints = [...points].sort((a, b) => a.frequency - b.frequency);
    this.ctx.lineWidth = 2;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    
    this.rotation += 0.001;

    this.ctx.beginPath();
    for (let i = 0; i < sortedPoints.length; i++) {
      const p = sortedPoints[i];
      const angle = (p.frequency / maxFreq) * Math.PI * 2 + this.rotation;
      const pointRadius = p.intensity * radius;
      const x = centerX + Math.cos(angle) * pointRadius;
      const y = centerY + Math.sin(angle) * pointRadius;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    // Close the shape
    const firstP = sortedPoints[0];
    const firstAngle = (firstP.frequency / maxFreq) * Math.PI * 2 + this.rotation;
    const firstRadius = firstP.intensity * radius;
    this.ctx.lineTo(centerX + Math.cos(firstAngle) * firstRadius, centerY + Math.sin(firstAngle) * firstRadius);
    
    // Create a gradient fill based on colors
    const gradient = this.ctx.createConicGradient(this.rotation, centerX, centerY);
    sortedPoints.forEach(p => {
        const angle = (p.frequency / maxFreq);
        gradient.addColorStop(angle, this.colorMap[p.type] || '#ffffff');
    });
    gradient.addColorStop(1, this.colorMap[sortedPoints[0].type] || '#ffffff');
    
    this.ctx.fillStyle = gradient;
    this.ctx.globalAlpha = 0.3;
    this.ctx.fill();
    this.ctx.globalAlpha = 1.0;

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  };

  render() {
    const legendItems = Object.entries(this.colorMap);
    return html`
      <div class="title">Energy Signature</div>
      <canvas></canvas>
      <div class="legend">
        ${legendItems.map(([type, color]) => html`
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${color};"></div>
                <span>${type}</span>
            </div>
        `)}
      </div>
    `;
  }
}
