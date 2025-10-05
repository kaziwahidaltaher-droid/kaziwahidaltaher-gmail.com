/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {styleMap} from 'lit/directives/style-map.js';
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
      gap: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color, rgba(97, 250, 255, 0.2));
    }
    .summary {
      font-size: 0.9rem;
      opacity: 0.8;
      line-height: 1.5;
      margin-bottom: 0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1.5rem;
      align-items: center;
      text-align: center;
    }
    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .stat-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.7;
      margin-top: 0.5rem;
    }
    .stat-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--accent-color, #61faff);
      line-height: 1;
      display: flex;
      align-items: baseline;
    }
    .stat-value small {
      font-size: 0.9rem;
      font-weight: 300;
      opacity: 0.8;
      margin-left: 0.25rem;
    }
    .icon {
      width: 48px;
      height: 48px;
      fill: var(--accent-color, #61faff);
      filter: drop-shadow(0 0 5px var(--glow-color, rgba(97, 250, 255, 0.5)));
    }
    .wind-compass {
      position: relative;
      width: 60px;
      height: 60px;
      border: 1px solid var(--border-color, rgba(97, 250, 255, 0.2));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .wind-arrow {
      width: 0; 
      height: 0; 
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 25px solid var(--accent-color, #61faff);
      transform-origin: 50% 50%;
    }
    .storms-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .storm-item {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      background: rgba(97, 250, 255, 0.05);
      border-left: 2px solid var(--accent-color, #61faff);
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    .storm-item svg {
        width: 20px;
        height: 20px;
        margin-right: 0.8rem;
        fill: var(--text-color, #c0f0ff);
        opacity: 0.8;
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
  
  private getWindDirectionAngle(direction: string): number {
    const directions: {[key: string]: number} = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    };
    const upperDir = (direction || '').toUpperCase();
    for (const key in directions) {
      if (upperDir.includes(key)) {
        return directions[key];
      }
    }
    return 0; // Default to North
  }

  render() {
    if (!this.analysisData) {
      return html``;
    }

    const { summary, temperature, wind, storms } = this.analysisData;
    const windAngle = this.getWindDirectionAngle(wind.direction);

    return html`
      <div class="container">
        <p class="summary">${summary}</p>
        <div class="stats-grid">
          
          <div class="stat">
             <svg class="icon" viewBox="0 0 24 24"><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM12 4c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-1 14.5V20h2v-1.5c1.21-.25 2.25-1.03 2.87-2.03l-1.74-.98C13.75 16.27 12.96 16.5 12 16.5s-1.75-.23-2.13-.71l-1.74.98C8.75 17.47 9.79 18.25 11 18.5z"/></svg>
            <span class="stat-value">${temperature.day}&deg; / ${temperature.night}&deg;<small>${temperature.units}</small></span>
            <span class="stat-label">Day / Night Temp</span>
          </div>

          <div class="stat">
            <div class="wind-compass">
                <div class="wind-arrow" style=${styleMap({transform: `rotate(${windAngle}deg)`})}></div>
            </div>
            <span class="stat-value">${wind.speed}<small>${wind.units}</small></span>
            <span class="stat-label">Wind (${wind.direction})</span>
          </div>
          
        </div>
        ${storms && storms.length > 0 ? html`
          <div>
            <h5>Significant Storms</h5>
            <ul class="storms-list">
              ${storms.map(storm => html`
                <li class="storm-item">
                    <svg viewBox="0 0 24 24"><path d="M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .9.32.98.78.09.5-.22 1-.69 1.28-2.6.98-4.32 3.1-5.79 5.94H11v.01z"/></svg>
                    ${storm}
                </li>`
              )}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }
}