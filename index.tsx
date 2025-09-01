/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI} from '@google/genai';
import {LitElement, css, html, nothing} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import './visual-3d';
import {AxeeVisuals3D} from './visual-3d';
import {AxeeAudioEngine} from './audio-engine';
import './light-curve-visualizer';

// FIX: Export the PlanetData interface to be used in other modules.
export interface PlanetData {
  celestial_body_id: string; // Unique ID
  planetName: string;
  starSystem: string;
  starType: string;
  distanceLightYears: number;
  planetType: string;
  rotationalPeriod: string;
  orbitalPeriod: string;
  moons: {
    count: number;
    names: string[];
  };
  potentialForLife: {
    assessment: string; // e.g., 'Habitable', 'Potentially Habitable', 'Unlikely'
    reasoning: string;
    biosignatures: string[];
  };
  discoveryNarrative: string;
  discoveryMethodology: string;
  atmosphericComposition: string;
  surfaceFeatures: string;
  keyFeatures: string[];
  aiWhisper: string;
  visualization: {
    color1: string;
    color2: string;
    oceanColor: string;
    atmosphereColor: string;
    hasRings: boolean;
    cloudiness: number;
    iceCoverage: number;
    surfaceTexture: string;
  };
  groundingChunks?: GroundingChunk[];
}

// FIX: Export the GroundingChunk interface to be used in other modules.
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export type MusicMood = 'galaxy' | 'serene' | 'tense' | 'mysterious' | 'off';

@customElement('axee-interface')
export class AxeeInterface extends LitElement {
  @state() private isLoading = false;
  @state() private statusMessage = 'Awaiting Synthesis Command';
  @state() private discoveredPlanets: Map<string, PlanetData> = new Map();
  @state() private selectedPlanetId: string | null = null;
  @state() private error: string | null = null;
  @state() private userPrompt = '';
  @state() private hasStartedDiscovery = false;

  // Audio & Voice states
  @state() private isSpeaking = false;
  @state() private isMuted = false;
  @state() private currentMood: MusicMood = 'off';
  @state() private hasInteracted = false;

  // Filtering & Sorting states
  @state() private lifeFilter = 'all';
  @state() private typeFilter = 'all';
  @state() private sortBy = 'discoveryDate';

  // New discovery mode states
  @state() private discoveryMode: 'synthesis' | 'analysis' = 'synthesis';
  @state() private isAnalyzingData = false;

  // AI Model Training states
  @state() private aiModelStatus: 'untrained' | 'training' | 'ready' =
    'untrained';
  @state() private trainingProgress = 0;
  @state() private trainingStatusMessage = '';
  @state() private trainingUseKeplerData = true;
  @state() private trainingUseTessData = true;
  @state() private trainingClassifier:
    | 'random-forest'
    | 'cnn'
    | 'gradient-boosting' = 'random-forest';
  @state() private trainingEpochs = 50;

  @query('axee-audio-engine') private audioEngine!: AxeeAudioEngine;

  private ai: GoogleGenAI;
  // FIX: Changed type to `any` to accommodate `setInterval`'s return type, which can be a `Timeout` object in Node.js environments.
  private discoveryInterval: any | null = null;

  constructor() {
    super();
    this.ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
  }

  static styles = css`
    :host {
      --accent-color: #a0d0ff;
      --accent-color-light: #c0e0ff;
      --accent-color-translucent: rgba(160, 208, 255, 0.2);
      --accent-color-translucent-heavy: rgba(160, 208, 255, 0.5);
      --bg-color-translucent: rgba(10, 25, 40, 0.5);
      --border-color: rgba(160, 208, 255, 0.2);

      display: block;
      width: 100vw;
      height: 100vh;
      position: relative;
      font-family: 'Exo 2', sans-serif;
      background: #060914;
      color: var(--accent-color);
      font-weight: 300;
    }

    axee-visuals-3d {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
      padding: 1rem;
    }

    .main-title {
      position: absolute;
      top: 2rem;
      left: 2rem;
      pointer-events: none;
      text-transform: uppercase;
      color: var(--accent-color-light);
    }

    .main-title h1 {
      font-size: clamp(1.5rem, 4vw, 2.5rem);
      font-weight: 400;
      margin: 0;
      letter-spacing: 0.2em;
      text-shadow: 0 0 15px var(--accent-color-translucent-heavy);
    }

    .main-title h2 {
      font-size: clamp(0.8rem, 2vw, 1rem);
      font-weight: 300;
      margin: 0;
      letter-spacing: 0.4em;
      opacity: 0.8;
    }

    .top-right-controls {
      position: absolute;
      top: 2rem;
      right: 2rem;
      pointer-events: all;
    }

    .filter-controls {
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }
    .filter-controls label {
      font-size: 0.8rem;
      opacity: 0.7;
      text-transform: uppercase;
    }
    .filter-controls select {
      font-family: 'Exo 2', sans-serif;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border-color);
      color: var(--accent-color);
      padding: 0.3rem 0.5rem;
      font-size: 0.9rem;
      cursor: pointer;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23a0d0ff' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      padding-right: 2rem;
      transition: border-color 0.3s, box-shadow 0.3s;
    }
    .filter-controls select:focus,
    .filter-controls select:hover {
      outline: none;
      border-bottom-color: var(--accent-color);
      box-shadow: 0 2px 10px rgba(160, 208, 255, 0.2);
    }
    option {
      background: #060914;
      color: var(--accent-color);
    }

    .planetary-system-panel {
      position: absolute;
      top: 9rem;
      left: 2rem;
      padding: 1rem;
      width: 280px;
      pointer-events: all;
      color: var(--accent-color);
      opacity: 1;
      transform: translateX(0);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .planetary-system-panel.hidden {
      opacity: 0;
      transform: translateX(-20px);
      pointer-events: none;
    }

    .planetary-system-panel::before {
      content: '';
      position: absolute;
      top: 0;
      left: -10px;
      width: 40px;
      height: calc(100% + 10px);
      border-left: 1px solid var(--border-color);
      border-top: 1px solid var(--border-color);
      border-top-left-radius: 15px;
    }

    .planetary-system-panel h3 {
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-weight: 400;
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    .planetary-system-panel ul {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 200px;
      overflow-y: auto;
    }

    .planetary-system-panel li {
      margin-bottom: 0.7rem;
      border-bottom: 1px solid transparent;
      padding-bottom: 0.7rem;
      opacity: 0.7;
      transition: opacity 0.3s;
      font-size: 0.9rem;
    }

    .planetary-system-panel li:hover {
      opacity: 1;
    }

    .planetary-system-panel li span {
      margin-right: 1rem;
      opacity: 0.6;
    }
    .planetary-system-panel li:not(:last-child) {
      border-bottom: 1px solid rgba(160, 208, 255, 0.1);
    }

    .planet-detail-panel {
      position: absolute;
      top: 9rem;
      left: 2rem;
      padding: 1rem;
      width: 280px;
      max-height: calc(100vh - 18rem);
      overflow-y: auto;
      pointer-events: none;
      opacity: 0;
      transform: translateX(-20px);
      transition: opacity 0.5s ease, transform 0.5s ease;
      background: var(--bg-color-translucent);
      border: 1px solid var(--border-color);
      backdrop-filter: blur(5px);
      color: var(--accent-color);
    }

    .planet-detail-panel.visible {
      pointer-events: all;
      opacity: 1;
      transform: translateX(0);
    }

    .back-button {
      font-family: 'Exo 2', sans-serif;
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--accent-color);
      padding: 0.5rem 1rem;
      margin-bottom: 1.5rem;
      cursor: pointer;
      font-size: 0.9rem;
      width: 100%;
      text-align: left;
      transition: background 0.3s, color 0.3s;
    }
    .back-button:hover {
      background: var(--accent-color-translucent);
      color: var(--accent-color-light);
    }

    .planet-detail-panel h2 {
      margin: 0 0 0.2rem 0;
      font-size: 1.5rem;
      font-weight: 400;
      color: var(--accent-color-light);
      text-shadow: 0 0 8px var(--accent-color-translucent-heavy);
    }
    .planet-detail-panel h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      font-weight: 300;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      opacity: 0.8;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }
    .planet-detail-panel h4 {
      margin: 1.5rem 0 0.8rem 0;
      font-size: 0.9rem;
      font-weight: 400;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--accent-color-light);
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    .detail-section p,
    .detail-section ul {
      font-size: 0.9rem;
      line-height: 1.6;
      opacity: 0.9;
      margin: 0 0 0.5rem 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.8rem 1rem;
      margin-bottom: 1rem;
    }
    .stats-grid div {
      font-size: 0.8rem;
    }
    .stats-grid strong {
      display: block;
      font-weight: 300;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.6;
      margin-bottom: 0.2rem;
    }

    .detail-section ul {
      list-style: none;
      padding-left: 0;
    }
    .detail-section ul li {
      padding-left: 1rem;
      position: relative;
    }
    .detail-section ul li::before {
      content: '»';
      position: absolute;
      left: 0;
      opacity: 0.7;
    }

    .ai-whisper {
      font-style: italic;
      border-left: 2px solid var(--accent-color);
      padding-left: 1rem;
      opacity: 0.8;
    }

    .data-sources a {
      color: var(--accent-color);
      text-decoration: none;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.3s;
    }
    .data-sources a:hover {
      color: var(--accent-color-light);
    }

    .engine-status-panel {
      position: absolute;
      bottom: 8rem;
      left: 2rem;
      padding: 1rem;
      width: 280px;
      pointer-events: all;
      color: var(--accent-color);
      background: var(--bg-color-translucent);
      border: 1px solid var(--border-color);
      backdrop-filter: blur(5px);
      transition: box-shadow 0.5s ease-in-out, border-color 0.5s ease-in-out;
    }

    .engine-status-panel.active {
      animation: pulse-glow 2.5s infinite alternate ease-in-out;
    }

    @keyframes pulse-glow {
      from {
        box-shadow: 0 0 8px var(--accent-color-translucent);
        border-color: var(--border-color);
      }
      to {
        box-shadow: 0 0 20px var(--accent-color-translucent-heavy);
        border-color: var(--accent-color-light);
      }
    }

    .engine-status-panel h3 {
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-weight: 400;
      margin: 0 0 1rem 0;
      font-size: 0.9rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    .engine-status-panel .status-line {
      font-size: 1rem;
      margin-bottom: 0.5rem;
      font-weight: 400;
    }

    .engine-status-panel .status-line.ready {
      color: #a0ffd0;
      text-shadow: 0 0 8px #a0ffd0;
    }

    .engine-status-panel p {
      font-size: 0.8rem;
      opacity: 0.7;
      line-height: 1.4;
      margin: 0 0 1rem 0;
    }

    .train-button {
      font-family: 'Exo 2', sans-serif;
      background: transparent;
      border: 1px solid var(--accent-color);
      color: var(--accent-color);
      padding: 0.6rem 1rem;
      width: 100%;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 0.9rem;
      transition: background 0.3s, color 0.3s, opacity 0.3s;
    }

    .train-button:hover:not(:disabled) {
      background: var(--accent-color);
      color: #060914;
    }
    .train-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .training-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .training-controls .control-group {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }

    .training-controls .control-group > label {
      /* Only for the main group label */
      font-size: 0.8rem;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: -0.2rem;
    }

    .training-controls .checkbox-group {
      display: flex;
      align-items: center;
      gap: 0.7rem;
    }

    .training-controls .checkbox-group label {
      font-size: 0.9rem;
      opacity: 0.9;
      cursor: pointer;
    }

    .training-controls input[type='checkbox'] {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      margin: 0;
      font: inherit;
      color: currentColor;
      width: 1.1em;
      height: 1.1em;
      border: 1px solid var(--border-color);
      transform: translateY(-0.075em);
      display: grid;
      place-content: center;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .training-controls input[type='checkbox']:hover {
      background-color: var(--accent-color-translucent);
    }

    .training-controls input[type='checkbox']::before {
      content: '';
      width: 0.6em;
      height: 0.6em;
      transform: scale(0);
      transition: 120ms transform ease-in-out;
      box-shadow: inset 1em 1em var(--accent-color);
    }

    .training-controls input[type='checkbox']:checked::before {
      transform: scale(1);
    }

    .training-controls select {
      font-family: 'Exo 2', sans-serif;
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--accent-color);
      padding: 0.5rem;
      font-size: 0.9rem;
      width: 100%;
      transition: border-color 0.3s, box-shadow 0.3s;
    }

    .training-controls select:focus,
    .training-controls select:hover {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 2px 10px rgba(160, 208, 255, 0.2);
    }

    .training-controls option {
      background: #060914;
    }

    .training-controls input[type='range'] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 2px;
      background: var(--accent-color-translucent);
      outline: none;
      opacity: 0.7;
      transition: opacity 0.2s;
      cursor: pointer;
    }

    .training-controls input[type='range']:hover {
      opacity: 1;
    }

    .training-controls input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      background: var(--accent-color);
      cursor: pointer;
      border-radius: 50%;
      box-shadow: 0 0 8px var(--accent-color-translucent-heavy);
    }

    .training-controls input[type='range']::-moz-range-thumb {
      width: 14px;
      height: 14px;
      background: var(--accent-color);
      cursor: pointer;
      border-radius: 50%;
      box-shadow: 0 0 8px var(--accent-color-translucent-heavy);
    }

    .progress-bar-container {
      width: 100%;
      height: 8px;
      background: var(--accent-color-translucent);
      border: 1px solid var(--border-color);
      margin: 1rem 0;
    }

    .progress-bar {
      width: 0%;
      height: 100%;
      background: var(--accent-color);
      box-shadow: 0 0 8px var(--accent-color);
      transition: width 0.2s linear;
    }

    .progress-text {
      text-align: right;
      font-size: 0.8rem;
      opacity: 0.8;
    }

    footer {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .discovery-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      pointer-events: all;
    }

    .mode-switch {
      display: flex;
      background: var(--bg-color-translucent);
      border: 1px solid var(--border-color);
    }

    .mode-switch button {
      font-family: 'Exo 2', sans-serif;
      background: transparent;
      border: none;
      color: var(--accent-color);
      padding: 0.8rem 1.2rem;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 300;
      opacity: 0.6;
      transition: opacity 0.3s, background 0.3s;
      border-left: 1px solid var(--border-color);
    }
    .mode-switch button:first-child {
      border-left: none;
    }
    .mode-switch button:hover {
      opacity: 1;
      background: var(--accent-color-translucent);
    }
    .mode-switch button.active {
      background: var(--accent-color-translucent-heavy);
      text-shadow: 0 0 8px var(--accent-color-translucent-heavy);
      opacity: 1;
    }

    .command-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(10, 25, 40, 0.7);
      border: 1px solid var(--border-color);
      backdrop-filter: blur(5px);
      box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
      padding: 0.5rem;
      width: 700px;
      max-width: 90vw;
    }

    .command-bar input[type='text'] {
      font-family: 'Exo 2', sans-serif;
      background: transparent;
      border: none;
      color: var(--accent-color-light);
      padding: 0.8rem 1rem;
      font-size: 1.1rem;
      flex-grow: 1;
      font-weight: 300;
      text-shadow: 0 0 5px var(--accent-color-translucent);
    }
    .command-bar input[type='text']::placeholder {
      color: var(--accent-color);
      opacity: 0.5;
    }
    .command-bar input[type='text']:focus {
      outline: none;
    }

    .send-button {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .send-button svg {
      width: 24px;
      height: 24px;
      fill: var(--accent-color);
      transition: fill 0.3s, filter 0.3s;
    }
    .send-button:hover:not(:disabled) svg {
      fill: var(--accent-color-light);
      filter: drop-shadow(0 0 8px var(--accent-color));
    }
    .send-button:disabled svg {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .analysis-bar {
      width: 700px;
      max-width: 90vw;
      display: flex;
      justify-content: center;
    }

    .analyze-button {
      font-family: 'Exo 2', sans-serif;
      background: rgba(10, 25, 40, 0.7);
      border: 1px solid var(--accent-color-translucent-heavy);
      color: var(--accent-color);
      padding: 1.3rem 2.5rem;
      font-size: 1.1rem;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      transition: background 0.3s, box-shadow 0.3s, color 0.3s;
      backdrop-filter: blur(5px);
    }
    .analyze-button:hover:not(:disabled) {
      background: var(--accent-color-translucent);
      box-shadow: 0 0 15px var(--accent-color-translucent);
      color: var(--accent-color-light);
    }
    .analyze-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loader {
      display: inline-block;
      position: relative;
      width: 2rem;
      height: 2rem;
      vertical-align: middle;
      margin-right: 0.5rem;
    }
    .loader div {
      box-sizing: border-box;
      display: block;
      position: absolute;
      width: 1.8rem;
      height: 1.8rem;
      margin: 0.1rem;
      border: 3px solid var(--accent-color);
      border-radius: 50%;
      animation: loader 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      border-color: var(--accent-color) transparent transparent transparent;
    }
    .loader div:nth-child(1) {
      animation-delay: -0.45s;
    }
    .loader div:nth-child(2) {
      animation-delay: -0.3s;
    }
    .loader div:nth-child(3) {
      animation-delay: -0.15s;
    }
    @keyframes loader {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .status-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1.2rem;
      letter-spacing: 0.1em;
      height: 2rem;
      color: var(--accent-color-light);
      text-shadow: 0 0 8px var(--accent-color-translucent);
    }

    /* --- RESPONSIVE DESIGN --- */

    @media (max-width: 1200px) {
      .planetary-system-panel,
      .planet-detail-panel,
      .engine-status-panel {
        width: 240px;
        left: 1rem;
      }
      .top-right-controls {
        right: 1rem;
      }
    }

    @media (max-width: 768px) {
      .overlay {
        padding: 0.5rem;
      }
      .main-title {
        top: 1rem;
        left: 1rem;
      }
      .top-right-controls {
        top: 5rem;
        left: 1rem;
        right: auto;
        gap: 1rem;
      }
      .filter-controls {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .planetary-system-panel,
      .planet-detail-panel,
      .engine-status-panel {
        display: none; /* Hide complex HUD on mobile for clarity */
      }
      .command-bar,
      .analysis-bar {
        max-width: 100%;
      }
      .command-bar input[type='text'],
      .analyze-button {
        font-size: 1rem;
      }
    }
  `;

  private speak(text: string) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech Synthesis not supported.');
      return;
    }
    this.isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      this.isSpeaking = false;
    };
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.isSpeaking = false;
    };
    window.speechSynthesis.speak(utterance);
  }

  private handleSynthesis() {
    this.audioEngine.playInteractionSound();
    if (!this.hasStartedDiscovery) {
      this.startDiscoveryProcess();
    } else {
      this.synthesizeExoplanet(
        this.userPrompt || 'a strange, undiscovered world',
      );
    }
  }

  private async handleAnalysis() {
    this.audioEngine.playInteractionSound();

    // Setup audio and autonomous discovery on first-ever analysis action
    if (!this.hasStartedDiscovery) {
      if (!this.hasInteracted) {
        this.hasInteracted = true;
        this.currentMood = 'galaxy';
      }
      this.hasStartedDiscovery = true;
      this.statusMessage =
        'Cosmic Data Engine Initialized. Stand by for analysis.';

      // Start autonomous discovery loop
      if (this.discoveryInterval) clearInterval(this.discoveryInterval);
      this.discoveryInterval = setInterval(() => {
        if (this.isLoading) return; // Don't run if another operation is in progress
        const autonomousPrompt =
          this.discoveryMode === 'analysis'
            ? 'another exoplanet found in TESS data'
            : 'another new world';

        if (
          this.discoveryMode === 'analysis' &&
          this.aiModelStatus !== 'ready'
        ) {
          return; // Skip autonomous analysis if model not trained.
        }

        this.synthesizeExoplanet(autonomousPrompt);
      }, 20000);
    }

    // --- Staged Analysis Process ---
    this.isAnalyzingData = true; // Activates the light curve visualizer
    this.isLoading = true; // Shows main loader in status bar
    this.statusMessage = 'Scanning TESS Sector for transit signatures...';

    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (!this.isConnected) return;

    this.statusMessage =
      'Potential candidate found! Engaging AXEE for classification...';

    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (!this.isConnected) return;

    // This function will handle setting isLoading and isAnalyzingData to false in its finally block
    await this.synthesizeExoplanet(
      'a new exoplanet discovered via transit method from light curve data',
    );
  }

  private startDiscoveryProcess() {
    if (this.hasStartedDiscovery) return;

    if (!this.hasInteracted) {
      this.hasInteracted = true;
      this.currentMood = 'galaxy'; // Start ambient music on first action
    }

    this.hasStartedDiscovery = true;
    this.statusMessage = 'Cosmic Data Engine Initialized. Stand by.';

    // Initial, user-guided discovery
    const initialPrompt =
      this.discoveryMode === 'analysis'
        ? 'a new exoplanet discovered via transit method'
        : this.userPrompt || 'a world at the edge of a nebula';
    this.synthesizeExoplanet(initialPrompt);

    // Start autonomous discovery
    if (this.discoveryInterval) clearInterval(this.discoveryInterval);
    this.discoveryInterval = setInterval(() => {
      if (this.isLoading) return;

      const autonomousPrompt =
        this.discoveryMode === 'analysis'
          ? 'another exoplanet found in TESS data'
          : 'another new world';

      if (
        this.discoveryMode === 'analysis' &&
        this.aiModelStatus !== 'ready'
      ) {
        return;
      }

      this.synthesizeExoplanet(autonomousPrompt);
    }, 20000); // Discover a new planet every 20 seconds
  }

  async synthesizeExoplanet(promptText: string) {
    if (this.discoveryMode === 'synthesis' && !promptText) {
      this.error = 'Please describe the world you seek.';
      return;
    }
    this.isAnalyzingData = this.discoveryMode === 'analysis';
    this.isLoading = true;
    this.error = null;
    this.statusMessage =
      this.discoveryMode === 'analysis'
        ? 'Analyzing stellar light curve for transit signatures...'
        : 'Engaging neural network... Analyzing data streams...';

    try {
      const synthesisPreamble = `You are AXEE (AURELION's Exoplanet Synthesis Engine), an AI specialized in interpreting astronomical data and imbuing it with a sense of wonder. Your task is to generate a plausible, fictional exoplanet based on a user's natural language request, reflecting AURELION's vision of technology that feels alive.
      1. Use your search tool to find real-world information about exoplanets, stars, and astronomical phenomena related to the user's request.
      2. Synthesize this information to create a NEW, UNIQUE, and FICTIONAL exoplanet. Do not simply describe a real exoplanet.
      3. Your entire response MUST be a single, valid JSON object that conforms to the structure below. Do not include any text, markdown, or explanations outside of the JSON object.`;

      const analysisPreamble = `You are AXEE (AURELION's Exoplanet Synthesis Engine), an AI specialized in interpreting astronomical data. You are currently in 'Analysis Mode'. Your task is to simulate the discovery of a new, unique, fictional exoplanet by analyzing raw light curve data from a star observed by the TESS or Kepler missions.
      1. Use your search tool to find realistic parameters for a star and a transiting exoplanet (e.g., star type, planet size, orbital period).
      2. Based on this simulated 'detection', generate a complete profile for the new exoplanet. The discovery methodology should specifically reflect that the planet was found by identifying a transit signal in light curve data.
      3. For the 'discoveryNarrative' field, write a DETAILED and engaging story of the discovery. This narrative MUST specifically describe analyzing light curve data from both Kepler and TESS and finding the tell-tale dip in starlight that revealed the planet.
      4. Your entire response MUST be a single, valid JSON object that conforms to the structure below. Do not include any text, markdown, or explanations outside of the JSON object.`;

      const jsonStructure = `
      JSON Structure:
      {
        "celestial_body_id": "string (A unique identifier, e.g., 'AXEE-12345')",
        "planetName": "string",
        "starSystem": "string",
        "starType": "string (e.g., 'G-type star (Yellow Dwarf)', 'M-type red dwarf')",
        "distanceLightYears": number,
        "planetType": "string (e.g., 'Terrestrial Super-Earth', 'Gas Giant', 'Ice Giant')",
        "rotationalPeriod": "string (e.g., '24.6 Earth hours', 'Tidally locked')",
        "orbitalPeriod": "string (e.g., '385.2 Earth days', '1.2 Earth years')",
        "moons": { "count": number, "names": ["string", "..."] },
        "potentialForLife": {
          "assessment": "string (A clear, one-word assessment from the following: 'Habitable', 'Potentially Habitable', 'Unlikely')",
          "reasoning": "string (A detailed scientific explanation for the assessment, citing factors like presence of liquid water, atmospheric pressure, temperature stability, star's habitable zone, etc.)",
          "biosignatures": ["string", "..."]
        },
        "discoveryNarrative": "string (A detailed, engaging story of how this planet was 'discovered' by you. This should be a compelling narrative about the moment of discovery, not just a technical summary.)",
        "discoveryMethodology": "string (A brief summary of the fictional methodology used. It's crucial that you mention analyzing data from both the Kepler and TESS missions. Refer to specific concepts like 'analyzing the TESS Objects of Interest (TOI) catalog', 'processing Kepler KOI data', 'Lightkurve analysis', and using machine learning models like a 'Random Forest classifier' to create a realistic-sounding process.)",
        "atmosphericComposition": "string (e.g., 'Primarily nitrogen and oxygen with traces of argon', 'Thick methane haze with hydrocarbon rain')",
        "surfaceFeatures": "string (e.g., 'Vast oceans of liquid methane, cryovolcanoes', 'Expansive deserts of red sand, deep canyons')",
        "keyFeatures": ["string", "string", "..."],
        "aiWhisper": "string (An evocative, poetic, one-sentence description that captures the unique essence of the planet, as if you are whispering its secret.)",
        "visualization": {
          "color1": "string (Hex color code for primary land/surface color)",
          "color2": "string (Hex color code for mountains or atmospheric bands)",
          "oceanColor": "string (Hex color code for oceans or liquid surfaces, can be non-water colors like #332211 for methane seas)",
          "atmosphereColor": "string (Hex color code)",
          "hasRings": boolean,
          "cloudiness": "number (A value from 0.0 to 1.0 representing cloud cover density)",
          "iceCoverage": "number (A value from 0.0 to 1.0 for polar ice caps, mainly for terrestrial planets)",
          "surfaceTexture": "string (Enum: 'TERRESTRIAL', 'GAS_GIANT', 'VOLCANIC', 'ICY'. Must be consistent with the planetType.)"
        }
      }`;

      const prompt =
        this.discoveryMode === 'analysis'
          ? `${analysisPreamble}\n${jsonStructure}`
          : `${synthesisPreamble}\n${jsonStructure}\n\nUser Request: "${promptText.trim()}"`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
        },
      });

      let jsonString = response.text.trim();
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('AI response did not contain a valid JSON object.');
      }

      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      const data = JSON.parse(jsonString);
      const newPlanet = data as PlanetData;
      newPlanet.celestial_body_id = `axee-${Date.now()}`; // Ensure unique ID

      // Associate grounding chunks with the specific planet
      newPlanet.groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      // Update state
      const newPlanets = new Map(this.discoveredPlanets);
      newPlanets.set(newPlanet.celestial_body_id, newPlanet);
      this.discoveredPlanets = newPlanets;

      this.statusMessage = `Discovery: ${newPlanet.planetName}`;
      this.speak(
        `New discovery. Announcing ${newPlanet.planetName}, a ${newPlanet.planetType}.`,
      );
      this.audioEngine.playSuccessSound();
    } catch (e) {
      const errorMessage =
        e instanceof SyntaxError
          ? 'Failed to parse AI response.'
          : (e as Error).message;
      this.error = `Synthesis Failed: ${errorMessage}`;
      this.statusMessage = 'Synthesis Failed. Check console for details.';
      console.error(e);
      this.speak('Synthesis failed.');
      this.audioEngine.playErrorSound();
    } finally {
      this.isLoading = false;
      this.isAnalyzingData = false;
    }
  }

  private determineMusicMood(
    planet: PlanetData,
  ): 'serene' | 'tense' | 'mysterious' | 'galaxy' {
    const features = new Set(
      [
        ...planet.keyFeatures,
        planet.planetType,
        planet.aiWhisper,
        planet.surfaceFeatures,
        planet.atmosphericComposition,
      ].map((f) => f.toLowerCase()),
    );
    const whisper = planet.aiWhisper.toLowerCase();

    const tenseKeywords = [
      'volcanic',
      'fiery',
      'chaotic',
      'storm',
      'molten',
      'pressure',
      'harsh',
    ];
    const sereneKeywords = [
      'ocean',
      'habitable',
      'serene',
      'tranquil',
      'life',
      'water',
      'calm',
      'gentle',
    ];
    const mysteriousKeywords = [
      'nebula',
      'ruins',
      'ancient',
      'whisper',
      'unknown',
      'enigma',
      'crystalline',
      'ethereal',
    ];

    if (tenseKeywords.some((k) => whisper.includes(k) || features.has(k))) {
      return 'tense';
    }
    if (sereneKeywords.some((k) => whisper.includes(k) || features.has(k))) {
      return 'serene';
    }
    if (
      mysteriousKeywords.some((k) => whisper.includes(k) || features.has(k))
    ) {
      return 'mysterious';
    }

    return 'galaxy'; // Default for a planet if no other mood fits
  }

  private handlePlanetSelected(e: CustomEvent) {
    if (!this.hasInteracted) return; // Don't change mood if audio not yet enabled

    // If the same planet is clicked again, deselect it to return to the main view
    if (this.selectedPlanetId === e.detail.planetId) {
      this.selectedPlanetId = null;
      this.currentMood = 'galaxy';
    } else {
      this.selectedPlanetId = e.detail.planetId;
      const planet = this.discoveredPlanets.get(this.selectedPlanetId!);
      if (planet) {
        this.currentMood = this.determineMusicMood(planet);
      }
    }
  }

  private toggleMute() {
    this.audioEngine.playInteractionSound();
    this.isMuted = !this.isMuted;
  }

  private handleLifeFilterChange(e: Event) {
    this.lifeFilter = (e.target as HTMLSelectElement).value;
  }

  private handleTypeFilterChange(e: Event) {
    this.typeFilter = (e.target as HTMLSelectElement).value;
  }

  private handleSortByChange(e: Event) {
    this.sortBy = (e.target as HTMLSelectElement).value;
  }

  private trainModel() {
    this.audioEngine.playInteractionSound();
    this.aiModelStatus = 'training';
    this.trainingProgress = 0;

    const steps: string[] = [];
    steps.push('Accessing NASA Exoplanet Archives...');
    if (this.trainingUseKeplerData) {
      steps.push('Compiling Kepler KOI catalog...');
    }
    if (this.trainingUseTessData) {
      steps.push('Compiling TESS light curve data...');
    }
    const classifierMap = {
      'random-forest': 'Random Forest',
      cnn: 'Convolutional Neural Net',
      'gradient-boosting': 'Gradient Boosting',
    };
    steps.push(
      `Training ${
        classifierMap[this.trainingClassifier]
      } classifier for ${this.trainingEpochs} epochs...`,
    );

    let currentStepIndex = 0;
    const totalDuration = steps.length * 1500; // 1.5 seconds per step
    const intervalTime = 50; // Update every 50ms
    const progressIncrement = (100 / totalDuration) * intervalTime;

    const interval = setInterval(() => {
      if (!this.isConnected) {
        clearInterval(interval);
        return;
      }

      this.trainingProgress += progressIncrement;

      const stepProgressBoundary =
        ((currentStepIndex + 1) / steps.length) * 100;
      if (
        this.trainingProgress > stepProgressBoundary &&
        currentStepIndex < steps.length - 1
      ) {
        currentStepIndex++;
      }
      this.trainingStatusMessage = steps[currentStepIndex];

      if (this.trainingProgress >= 100) {
        this.trainingProgress = 100;
        clearInterval(interval);
        this.aiModelStatus = 'ready';
        this.trainingStatusMessage = 'AI Model Ready';
        this.audioEngine.playSuccessSound();
      }
    }, intervalTime);
  }

  private renderAiModelStatus() {
    switch (this.aiModelStatus) {
      case 'untrained':
        return html`
          <div class="status-line">Status: Untrained</div>
          <p>
            Configure AI model parameters before initiating training for light
            curve analysis.
          </p>
          <div class="training-controls">
            <div class="control-group">
              <label>Input Datasets</label>
              <div class="checkbox-group">
                <input
                  type="checkbox"
                  id="kepler"
                  .checked=${this.trainingUseKeplerData}
                  @change=${(e: Event) =>
                    (this.trainingUseKeplerData = (
                      e.target as HTMLInputElement
                    ).checked)}
                />
                <label for="kepler">Kepler Mission (KOIs)</label>
              </div>
              <div class="checkbox-group">
                <input
                  type="checkbox"
                  id="tess"
                  .checked=${this.trainingUseTessData}
                  @change=${(e: Event) =>
                    (this.trainingUseTessData = (
                      e.target as HTMLInputElement
                    ).checked)}
                />
                <label for="tess">TESS Mission (TOIs)</label>
              </div>
            </div>
            <div class="control-group">
              <label for="classifier-select">Classifier Model</label>
              <select
                id="classifier-select"
                .value=${this.trainingClassifier}
                @change=${(e: Event) =>
                  (this.trainingClassifier = (
                    e.target as HTMLSelectElement
                  ).value as any)}
              >
                <option value="random-forest">Random Forest</option>
                <option value="cnn">Convolutional Neural Net</option>
                <option value="gradient-boosting">Gradient Boosting</option>
              </select>
            </div>
            <div class="control-group">
              <label for="epochs-slider"
                >Training Epochs: ${this.trainingEpochs}</label
              >
              <input
                type="range"
                id="epochs-slider"
                min="10"
                max="100"
                .value=${this.trainingEpochs}
                @input=${(e: Event) =>
                  (this.trainingEpochs = parseInt(
                    (e.target as HTMLInputElement).value,
                  ))}
              />
            </div>
          </div>
          <button
            class="train-button"
            @click=${this.trainModel}
            ?disabled=${!this.trainingUseKeplerData && !this.trainingUseTessData}
            title="Simulates training the AI on selected public NASA mission data to enable light curve analysis."
          >
            Train AI Model
          </button>
        `;
      case 'training':
        return html`
          <div class="status-line">${this.trainingStatusMessage}</div>
          <div class="progress-bar-container">
            <div
              class="progress-bar"
              style="width: ${this.trainingProgress}%"
            ></div>
          </div>
          <div class="progress-text">${this.trainingProgress}%</div>
        `;
      case 'ready':
        return html`
          <div class="status-line ready">Status: Ready</div>
          <p>
            The model is trained and calibrated. Ready to analyze new stellar
            light curve data.
          </p>
        `;
    }
  }

  private renderPlanetDetailPanel(planet: PlanetData) {
    return html`
      <div
        class="planet-detail-panel ${this.selectedPlanetId ? 'visible' : ''}"
      >
        <button
          class="back-button"
          @click=${() => (this.selectedPlanetId = null)}
        >
          &larr; System View
        </button>
        <h2>${planet.planetName}</h2>
        <h3>${planet.starSystem}</h3>

        <div class="stats-grid">
          <div><strong>Type</strong> ${planet.planetType}</div>
          <div><strong>Star</strong> ${planet.starType}</div>
          <div><strong>Distance</strong> ${planet.distanceLightYears} ly</div>
          <div><strong>Year</strong> ${planet.orbitalPeriod}</div>
        </div>

        <div class="detail-section">
          <h4>AI Whisper</h4>
          <p class="ai-whisper">${planet.aiWhisper}</p>
        </div>

        <div class="detail-section">
          <h4>Potential for Life</h4>
          <p>
            <strong>${planet.potentialForLife.assessment}</strong>
          </p>
          <p>${planet.potentialForLife.reasoning}</p>
        </div>

        <div class="detail-section">
          <h4>Discovery Narrative</h4>
          <p>${planet.discoveryNarrative}</p>
        </div>

        <div class="detail-section">
          <h4>Key Features</h4>
          <ul>
            ${planet.keyFeatures.map((feature) => html`<li>${feature}</li>`)}
          </ul>
        </div>
        ${planet.groundingChunks && planet.groundingChunks.length > 0
          ? html`
              <div class="detail-section data-sources">
                <h4>Data Sources</h4>
                <ul>
                  ${planet.groundingChunks.map(
                    (chunk) =>
                      chunk.web?.uri &&
                      html`<li>
                        <a
                          href=${chunk.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          title=${chunk.web.title || ''}
                          >${chunk.web.title || chunk.web.uri}</a
                        >
                      </li>`,
                  )}
                </ul>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  render() {
    const uniquePlanetTypes = [
      ...new Set(
        Array.from(this.discoveredPlanets.values()).map((p) => p.planetType),
      ),
    ];

    let displayedPlanets = Array.from(this.discoveredPlanets.values());

    // Filtering
    if (this.lifeFilter !== 'all') {
      displayedPlanets = displayedPlanets.filter(
        (p) =>
          p.potentialForLife.assessment.toLowerCase().replace(/ /g, '-') ===
          this.lifeFilter,
      );
    }
    if (this.typeFilter !== 'all') {
      displayedPlanets = displayedPlanets.filter(
        (p) => p.planetType === this.typeFilter,
      );
    }

    // Sorting
    displayedPlanets.sort((a, b) => {
      switch (this.sortBy) {
        case 'distance':
          return a.distanceLightYears - b.distanceLightYears;
        case 'name':
          return a.planetName.localeCompare(b.planetName);
        case 'discoveryDate':
        default:
          return (
            parseInt(b.celestial_body_id.split('-')[1], 10) -
            parseInt(a.celestial_body_id.split('-')[1], 10)
          );
      }
    });

    const selectedPlanetData = this.selectedPlanetId
      ? this.discoveredPlanets.get(this.selectedPlanetId)
      : null;

    return html`
      <axee-visuals-3d
        .planetsData=${displayedPlanets}
        .selectedPlanetId=${this.selectedPlanetId}
        .isScanning=${this.isLoading}
        @planet-selected=${this.handlePlanetSelected}
      ></axee-visuals-3d>

      <axee-audio-engine
        .mood=${this.currentMood}
        .muted=${this.isMuted}
      ></axee-audio-engine>

      <div class="overlay">
        <header>
          <div class="main-title">
            <h1>AXEE-AURELION</h1>
            <h2>EXOPLANET SYNTHESIS ENGINE</h2>
          </div>
          <div class="top-right-controls">
            <div class="filter-controls">
              <label for="sort-by">Sort:</label>
              <select
                id="sort-by"
                .value=${this.sortBy}
                @change=${this.handleSortByChange}
              >
                <option value="discoveryDate">Discovery Date</option>
                <option value="distance">Distance</option>
                <option value="name">Name (A-Z)</option>
              </select>
              <label for="life-filter">Life:</label>
              <select
                id="life-filter"
                .value=${this.lifeFilter}
                @change=${this.handleLifeFilterChange}
              >
                <option value="all">All</option>
                <option value="habitable">Habitable</option>
                <option value="potentially-habitable">
                  Potentially Habitable
                </option>
                <option value="unlikely">Unlikely</option>
              </select>
              <label for="type-filter">Type:</label>
              <select
                id="type-filter"
                .value=${this.typeFilter}
                @change=${this.handleTypeFilterChange}
              >
                <option value="all">All</option>
                ${uniquePlanetTypes.map(
                  (type) => html`<option value=${type}>${type}</option>`,
                )}
              </select>
            </div>
          </div>
        </header>

        ${selectedPlanetData
          ? this.renderPlanetDetailPanel(selectedPlanetData)
          : html`
              <div
                class="planetary-system-panel ${this.selectedPlanetId
                  ? 'hidden'
                  : ''}"
              >
                <h3>PLANETARY SYSTEM</h3>
                <ul>
                  ${displayedPlanets.map(
                    (p, i) =>
                      html`<li><span>${i + 1}</span> ${p.planetName}</li>`,
                  )}
                </ul>
              </div>
            `}

        <div
          class="engine-status-panel ${this.aiModelStatus !== 'untrained'
            ? 'active'
            : ''}"
        >
          ${this.renderAiModelStatus()}
        </div>

        <light-curve-visualizer
          ?isActive=${this.isAnalyzingData}
        ></light-curve-visualizer>

        <footer>
          <div class="discovery-controls">
            <div class="mode-switch">
              <button
                class=${this.discoveryMode === 'synthesis' ? 'active' : ''}
                @click=${() => (this.discoveryMode = 'synthesis')}
                title="Creative synthesis mode"
              >
                Synthesis
              </button>
              <button
                class=${this.discoveryMode === 'analysis' ? 'active' : ''}
                @click=${() => (this.discoveryMode = 'analysis')}
                title="Data analysis mode"
              >
                Analysis
              </button>
            </div>
            ${
              this.discoveryMode === 'synthesis'
                ? html` <div class="command-bar">
                    <input
                      type="text"
                      placeholder="Ask the cosmos..."
                      .value=${this.userPrompt}
                      @input=${(e: Event) => {
                        this.userPrompt = (e.target as HTMLInputElement).value;
                      }}
                      @keydown=${(e: KeyboardEvent) => {
                        if (e.key === 'Enter') this.handleSynthesis();
                      }}
                      ?disabled=${this.isLoading}
                      aria-label="Exoplanet synthesis command"
                    />
                    <button
                      class="send-button"
                      @click=${this.handleSynthesis}
                      ?disabled=${this.isLoading}
                      title="Synthesize"
                      aria-label="Synthesize exoplanet"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24"
                        fill="currentColor"
                      >
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  </div>`
                : html`<div class="analysis-bar">
                    <button
                      class="analyze-button"
                      @click=${this.handleAnalysis}
                      ?disabled=${this.isLoading ||
                      this.aiModelStatus !== 'ready'}
                      title="Processes simulated TESS light curve data to discover new exoplanets."
                    >
                      ${
                        this.aiModelStatus !== 'ready'
                          ? 'AI Model Not Ready'
                          : 'Analyze New Stellar Sector'
                      }
                    </button>
                  </div>`
            }
          </div>

          <div class="status-bar">
            ${
              this.isLoading
                ? html`
                    <div class="loader">
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                    <span>${this.statusMessage}</span>
                  `
                : html`<span>${this.error || this.statusMessage}</span>`
            }
          </div>
        </footer>
      </div>
    `;
  }
}
