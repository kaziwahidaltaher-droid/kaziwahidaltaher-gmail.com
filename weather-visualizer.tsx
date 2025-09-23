/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import { WeatherAnalysis } from './index';

@customElement('weather-visualizer')
export class WeatherVisualizer extends LitElement {
  @property({type: Object}) analysisData: WeatherAnalysis | null = null;

  static styles = css`
    :host {
      display: block;
      color: var(--text-color, #c0f0ff);
      font-family: var(--font-family, 'Exo 2', sans-serif);
      font-size: 0.9rem;
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color, rgba(97, 250, 255, 0.2));
    }
    .summary {
      font-size: 0.9rem;
      opacity: 0.8;
      line-height: 1.5;
      margin-bottom: 0.5rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .stat {
      display: flex;
      flex-direction: column;
    }
    .stat-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.7;
      margin-bottom: 0.25rem;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent-color, #61faff);
      line-height: 1;
    }
    .stat-value small {
      font-size: 0.9rem;
      font-weight: 300;
      opacity: 0.8;
      margin-left: 0.25rem;
    }
    .storms-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .storm-item {
      padding: 0.5rem;
      background: rgba(97, 250, 255, 0.05);
      border-left: 2px solid var(--accent-color, #61faff);
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    h5 {
      font-weight: 300;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      opacity: 0.8;
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
    }
  `;

  render() {
    if (!this.analysisData) {
      return html``;
    }

    const { summary, temperature, wind, storms } = this.analysisData;

    return html`
      <div class="container">
        <p class="summary">${summary}</p>
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-label">Day Temp</span>
            <span class="stat-value">${temperature.day}<small>${temperature.units}</small></span>
          </div>
          <div class="stat">
            <span class="stat-label">Night Temp</span>
            <span class="stat-value">${temperature.night}<small>${temperature.units}</small></span>
          </div>
          <div class="stat">
            <span class="stat-label">Wind Speed</span>
            <span class="stat-value">${wind.speed}<small>${wind.units}</small></span>
          </div>
           <div class="stat">
            <span class="stat-label">Wind Direction</span>
            <span class="stat-value" style="font-size: 1.2rem;">${wind.direction}</span>
          </div>
        </div>
        ${storms && storms.length > 0 ? html`
          <div>
            <h5>Significant Storms</h5>
            <ul class="storms-list">
              ${storms.map(storm => html`<li class="storm-item">${storm}</li>`)}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }
}
