
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, html, css} from 'lit-element';
import {customElement, state, property} from 'lit-element/decorators.js';

@customElement('planet-predictor')
export class PlanetPredictor extends LitElement {
  @state() starType = 'G-type main-sequence';
  @state() distance = 1;
  @state() mass = 1;
  @property({type: Boolean}) isPredicting = false;
  @property({type: Object}) predictionResult: any = null;

  static styles = css`
    :host {
      display: block;
      padding: 0.5rem;
      color: var(--text-color);
      font-family: 'Exo 2', sans-serif;
    }
    .form-group {
      margin-bottom: 1.2rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent-color);
      opacity: 0.9;
    }
    select, input[type="range"] {
      width: 100%;
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--border-color);
      color: var(--text-color);
      padding: 0.5rem;
      font-family: inherit;
      border-radius: 4px;
      outline: none;
    }
    select:focus {
        border-color: var(--accent-color);
    }
    button {
      width: 100%;
      background: rgba(97, 250, 255, 0.1);
      color: var(--accent-color);
      border: 1px solid var(--accent-color);
      padding: 0.8rem;
      text-transform: uppercase;
      font-weight: bold;
      letter-spacing: 0.1em;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 1rem;
      font-size: 0.9rem;
    }
    button:hover {
      background: var(--accent-color);
      color: var(--bg-color);
      box-shadow: 0 0 10px var(--glow-color);
    }
    button:disabled {
      opacity: 0.5;
      cursor: wait;
      border-color: var(--border-color);
      color: var(--text-color);
    }
    .result {
      margin-top: 1.5rem;
      border: 1px solid var(--border-color);
      background: rgba(0, 0, 0, 0.4);
      padding: 1rem;
      border-radius: 4px;
      animation: fadeIn 0.5s ease;
    }
    .result h4 {
        margin: 0 0 0.8rem 0;
        color: var(--accent-color);
        font-size: 1rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
    }
    .result-row {
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
    }
    .result-row strong {
        color: var(--accent-color);
        opacity: 0.8;
    }
    .description {
        margin-top: 1rem;
        font-style: italic;
        opacity: 0.8;
        line-height: 1.4;
        font-size: 0.9rem;
        border-left: 2px solid var(--accent-color);
        padding-left: 0.8rem;
    }
    input[type=range] {
        -webkit-appearance: none; 
        background: transparent; 
    }
    input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 16px;
        width: 16px;
        border-radius: 50%;
        background: var(--accent-color);
        cursor: pointer;
        margin-top: -6px; 
        box-shadow: 0 0 5px var(--glow-color);
    }
    input[type=range]::-webkit-slider-runnable-track {
        width: 100%;
        height: 4px;
        cursor: pointer;
        background: var(--border-color);
        border-radius: 2px;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
  `;

  render() {
    return html`
      <div class="form-group">
        <label>Host Star Class</label>
        <select @change=${(e: any) => this.starType = e.target.value}>
          <option value="M-type red dwarf">M-type Red Dwarf</option>
          <option value="K-type orange dwarf">K-type Orange Dwarf</option>
          <option value="G-type main-sequence" selected>G-type Yellow Dwarf (Sol)</option>
          <option value="F-type main-sequence">F-type White</option>
          <option value="A-type main-sequence">A-type Blue-White</option>
          <option value="Neutron Star">Neutron Star</option>
        </select>
      </div>

      <div class="form-group">
        <label>Orbital Distance: <strong>${this.distance} AU</strong></label>
        <input type="range" min="0.1" max="50" step="0.1" value=${this.distance} 
          @input=${(e: any) => this.distance = e.target.value}>
      </div>

      <div class="form-group">
        <label>Planetary Mass: <strong>${this.mass} M⊕</strong></label>
        <input type="range" min="0.1" max="20" step="0.1" value=${this.mass} 
          @input=${(e: any) => this.mass = e.target.value}>
      </div>

      <button @click=${this.handlePredict} ?disabled=${this.isPredicting}>
        ${this.isPredicting ? 'Running Simulation...' : 'Synthesize Probability'}
      </button>

      ${this.predictionResult ? html`
        <div class="result">
          <h4>Synthesis Result</h4>
          <div class="result-row"><strong>Classification:</strong> ${this.predictionResult.planetType}</div>
          <div class="result-row"><strong>Atmosphere:</strong> ${this.predictionResult.atmosphere}</div>
          <div class="result-row"><strong>Habitability:</strong> ${this.predictionResult.habitability}</div>
          <div class="description">${this.predictionResult.description}</div>
        </div>
      ` : ''}
    `;
  }

  handlePredict = () => {
    (this as unknown as HTMLElement).dispatchEvent(new CustomEvent('predict-request', {
      detail: {
        starType: this.starType,
        distance: this.distance,
        mass: this.mass
      },
      bubbles: true,
      composed: true
    }));
  }
}
