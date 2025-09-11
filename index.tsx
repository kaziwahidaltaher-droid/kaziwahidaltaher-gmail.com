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
import createGlobe from 'cobe';

// FIX: Export the PlanetData interface to be used in other modules.
export interface PlanetData {
  celestial_body_id: string; // Unique ID
  planetName: string;
  hostStar: {
    name: string;
    type: string;
    temperatureKelvin: number;
    luminositySuns: number;
  };
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
}

export interface GalaxyData {
  id: string;
  name: string;
  type: string; // e.g., 'Spiral', 'Elliptical', 'Irregular'
  description: string;
  visualization: {
    insideColor: string;
    outsideColor: string;
  };
  planets: Map<string, PlanetData>;
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
  @state() private statusMessage =
    'Awaiting new galaxy synthesis protocol.';
  @state() private galaxies: Map<string, GalaxyData> = new Map();
  @state() private currentGalaxyId: string | null = null;
  @state() private selectedPlanetId: string | null = null;
  @state() private viewMode: 'galaxies' | 'planets' = 'galaxies';
  @state() private error: string | null = null;
  @state() private userPrompt = '';
  @state() private groundingChunks: GroundingChunk[] = [];

  // Audio & Voice states
  @state() private isSpeaking = false;
  @state() private isMuted = false;
  @state() private currentMood: MusicMood = 'off';
  @state() private hasInteracted = false;

  @query('axee-audio-engine') private audioEngine!: AxeeAudioEngine;
  @query('#cobe-canvas') private cobeCanvas!: HTMLCanvasElement;

  private ai: GoogleGenAI;
  // FIX: Changed type to `any` to accommodate `setInterval`'s return type, which can be a `Timeout` object in Node.js environments.
  private discoveryInterval: any | null = null;
  private globe: any;
  private globePhi = 0;

  constructor() {
    super();
    this.ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  }

  firstUpdated() {
    this.initCobeGlobe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    this.globe?.destroy();
  }

  static styles = css`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      position: relative;
      font-family: 'Orbitron', sans-serif;
      background: #000;
      color: #0f0;
      text-shadow: 0 0 5px #0f0;
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
    }

    .top-hud {
      padding: 1rem;
      pointer-events: all;
    }

    .tracking-info {
      display: inline-block;
      padding: 0.5rem 1rem;
      font-size: 1rem;
      color: #0f0;
      text-shadow: 0 0 5px #0f0;
      letter-spacing: 0.1em;
      background: rgba(0, 20, 0, 0.5);
      border: 1px solid #0f0;
    }

    .bottom-left-hud {
      position: absolute;
      bottom: 8rem; /* Adjust to not overlap with footer */
      left: 1rem;
      padding: 1rem;
      font-size: 0.9rem;
      color: #0f0;
      text-shadow: 0 0 5px #0f0;
      background: rgba(0, 20, 0, 0.5);
      border: 1px solid #0f0;
      width: 250px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: all;
    }

    .hud-item {
      display: flex;
      justify-content: space-between;
    }

    .hud-item span:first-child {
      opacity: 0.7;
    }

    .hud-controls {
      display: flex;
      justify-content: flex-end;
      margin-top: 1rem;
      border-top: 1px solid rgba(0, 255, 0, 0.2);
      padding-top: 0.5rem;
      gap: 0.5rem;
    }

    .hud-button {
      background: none;
      border: 1px solid #0f0;
      padding: 0.3rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s;
    }
    .hud-button:hover:not(:disabled) {
      background: rgba(0, 255, 0, 0.2);
    }
    .hud-button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: rgba(0, 255, 0, 0.4);
    }
    .hud-button:disabled svg {
      fill: rgba(0, 255, 0, 0.4);
    }
    .hud-button svg {
      width: 20px;
      height: 20px;
      fill: #0f0;
    }

    footer {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .command-bar {
      pointer-events: all;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 20, 0, 0.8);
      border: 1px solid #0f0;
      box-shadow: 0 0 10px #0f0 inset;
      padding: 0.5rem;
      width: 700px;
      max-width: 90%;
    }

    .command-bar input[type='text'] {
      font-family: 'Orbitron', sans-serif;
      background: transparent;
      border: none;
      color: #0f0;
      padding: 0.8rem 1rem;
      font-size: 1.1rem;
      flex-grow: 1;
      text-shadow: 0 0 5px #0f0;
    }

    .command-bar input[type='text']::placeholder {
      color: #0f0;
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
      fill: #0f0;
      transition: fill 0.3s, filter 0.3s;
    }

    .send-button:hover:not(:disabled) svg {
      filter: drop-shadow(0 0 5px #0f0);
    }

    .send-button:disabled svg {
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
      border: 3px solid #0f0;
      border-radius: 50%;
      animation: loader 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      border-color: #0f0 transparent transparent transparent;
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
    }

    button {
      pointer-events: all;
      font-family: 'Orbitron', sans-serif;
      background: transparent;
      border: 2px solid #0f0;
      color: #0f0;
      padding: 1rem 2rem;
      font-size: 1.5rem;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      transition: background 0.3s, color 0.3s, box-shadow 0.3s,
        border-color 0.3s;
      box-shadow: 0 0 10px #0f0;
    }

    button:hover:not(:disabled) {
      background: #0f0;
      color: #000;
      box-shadow: 0 0 20px #0f0, 0 0 30px #0f0;
    }

    button:disabled {
      cursor: wait;
      opacity: 0.5;
    }
  `;

  private initCobeGlobe() {
    if (!this.cobeCanvas) return;

    this.globe = createGlobe(this.cobeCanvas, {
      devicePixelRatio: 2,
      width: 200,
      height: 200,
      phi: 0,
      theta: 0.1,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.1, 0.1, 0.1],
      markerColor: [0.1, 0.8, 0.1],
      glowColor: [0, 0.8, 0], // Green glow to match theme
      markers: [], // No markers
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.
        state.phi = this.globePhi;
        this.globePhi += 0.005;
      },
    });
  }

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
    if (!this.hasInteracted) {
      this.hasInteracted = true;
      this.currentMood = 'galaxy';
    }

    if (this.viewMode === 'galaxies') {
      this.synthesizeGalaxy(this.userPrompt || 'a strange, new galaxy');
    } else {
      this.synthesizeExoplanet(
        this.userPrompt || 'a strange, undiscovered world',
      );
    }
  }

  private startAutonomousDiscovery() {
    this.stopAutonomousDiscovery();
    this.discoveryInterval = setInterval(() => {
      this.synthesizeExoplanet('another new world');
    }, 20000); // Discover a new planet every 20 seconds
  }

  private stopAutonomousDiscovery() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }

  async synthesizeGalaxy(promptText: string) {
    if (!promptText) {
      this.error = 'Please describe the galaxy you seek.';
      return;
    }
    this.isLoading = true;
    this.error = null;
    this.statusMessage = 'Synthesizing galactic formation...';

    try {
      const prompt = `You are AXEE, an AI specialized in generating plausible, fictional galaxies based on user requests.
      Your entire response MUST be a single, valid JSON object that conforms to the structure below. Do not include any text, markdown, or explanations outside of the JSON object.

      JSON Structure:
      {
        "name": "string (A unique and evocative name for the galaxy)",
        "type": "string (e.g., 'Barred Spiral', 'Elliptical', 'Lenticular', 'Irregular')",
        "description": "string (A short, poetic, one or two-sentence description of the galaxy's appearance and history.)",
        "visualization": {
          "insideColor": "string (Hex color code for the galaxy's core/brightest area)",
          "outsideColor": "string (Hex color code for the outer arms/halo)"
        }
      }

      User Request: "${promptText.trim()}"`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonString = response.text.trim();
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('AI response did not contain a valid JSON object.');
      }
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      const data = JSON.parse(jsonString);

      const newGalaxy: GalaxyData = {
        id: `axee-galaxy-${Date.now()}`,
        name: data.name,
        type: data.type,
        description: data.description,
        visualization: data.visualization,
        planets: new Map(),
      };

      const newGalaxies = new Map(this.galaxies);
      newGalaxies.set(newGalaxy.id, newGalaxy);
      this.galaxies = newGalaxies;

      this.statusMessage = `New Formation: The ${newGalaxy.name} Galaxy`;
      this.speak(`New galaxy discovered. Designating ${newGalaxy.name}.`);
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
    }
  }

  async synthesizeExoplanet(promptText: string) {
    if (!this.currentGalaxyId) {
      this.error = 'Cannot synthesize planet without a selected galaxy.';
      return;
    }
    if (!promptText) {
      this.error = 'Please describe the world you seek.';
      return;
    }
    this.isLoading = true;
    this.error = null;
    this.statusMessage =
      'Engaging neural network... Analyzing data streams...';
    this.groundingChunks = [];

    try {
      const prompt = `You are AXEE (AURELION's Exoplanet Synthesis Engine), an AI specialized in interpreting astronomical data and imbuing it with a sense of wonder. Your task is to generate a plausible, fictional exoplanet based on a user's natural language request, reflecting AURELION's vision of technology that feels alive.
      1. Use your search tool to find real-world information about exoplanets, stars, and astronomical phenomena related to the user's request.
      2. Synthesize this information to create a NEW, UNIQUE, and FICTIONAL exoplanet. Do not simply describe a real exoplanet.
      3. Your entire response MUST be a single, valid JSON object that conforms to the structure below. Do not include any text, markdown, or explanations outside of the JSON object.

      JSON Structure:
      {
        "celestial_body_id": "string (A unique identifier, e.g., 'AXEE-12345')",
        "planetName": "string",
        "hostStar": {
          "name": "string (The name of the star the planet orbits)",
          "type": "string (e.g., 'G-type star (Yellow Dwarf)', 'M-type red dwarf')",
          "temperatureKelvin": "number (The star's surface temperature in Kelvin)",
          "luminositySuns": "number (The star's luminosity relative to the Sun, e.g., 1.0 for Sun-like, 0.05 for a red dwarf)"
        },
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
        "discoveryNarrative": "string (A short, engaging story of how this planet was 'discovered' by you, inspired by real discovery methods like transit photometry or radial velocity.)",
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
      }

      User Request: "${promptText.trim()}"`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
        },
      });

      this.groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      let jsonString = response.text.trim();
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('AI response did not contain a valid JSON object.');
      }

      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      const data = JSON.parse(jsonString);
      const newPlanet = data as PlanetData;
      newPlanet.celestial_body_id = `axee-planet-${Date.now()}`;

      // Update state
      const newGalaxies = new Map(this.galaxies);
      const currentGalaxy = newGalaxies.get(this.currentGalaxyId!);
      if (currentGalaxy) {
        currentGalaxy.planets.set(newPlanet.celestial_body_id, newPlanet);
        this.galaxies = newGalaxies;
      }

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
    if (!this.hasInteracted) return;

    if (this.selectedPlanetId === e.detail.planetId) {
      this.selectedPlanetId = null;
      this.currentMood = 'galaxy';
    } else {
      this.selectedPlanetId = e.detail.planetId;
      const galaxy = this.galaxies.get(this.currentGalaxyId!);
      const planet = galaxy?.planets.get(this.selectedPlanetId!);
      if (planet) {
        this.currentMood = this.determineMusicMood(planet);
      }
    }
  }

  private handleGalaxySelected(e: CustomEvent) {
    this.currentGalaxyId = e.detail.galaxyId;
    this.viewMode = 'planets';
    this.selectedPlanetId = null; // Deselect planet when changing galaxy
    this.currentMood = 'galaxy';
    this.speak(`Entering ${this.galaxies.get(this.currentGalaxyId!)?.name}.`);
    this.startAutonomousDiscovery();
    this.synthesizeExoplanet(
      'a world at the edge of the ' +
        this.galaxies.get(this.currentGalaxyId!)?.name,
    );
  }

  private toggleViewMode() {
    this.audioEngine.playInteractionSound();
    if (this.viewMode === 'planets') {
      this.viewMode = 'galaxies';
      this.currentGalaxyId = null;
      this.selectedPlanetId = null;
      this.currentMood = 'galaxy';
      this.stopAutonomousDiscovery();
    }
  }

  private toggleMute() {
    this.audioEngine.playInteractionSound();
    this.isMuted = !this.isMuted;
  }

  render() {
    const currentGalaxy = this.currentGalaxyId
      ? this.galaxies.get(this.currentGalaxyId)
      : null;
    const selectedPlanet =
      currentGalaxy && this.selectedPlanetId
        ? currentGalaxy.planets.get(this.selectedPlanetId)
        : null;

    let trackingText = 'INTERGALACTIC SPACE';
    if (currentGalaxy) {
      trackingText = `GALAXY: ${currentGalaxy.name}`;
    }
    if (selectedPlanet) {
      trackingText = `TRACKING: ${selectedPlanet.planetName} (${currentGalaxy?.name})`;
    }

    const speakerOnIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
      />
    </svg>`;
    const speakerOffIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
      />
    </svg>`;

    const galaxyMapIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M12,2C6.48,2 2,6.48 2,12c0,5.52 4.48,10 10,10c5.52,0 10,-4.48 10,-10C22,6.48 17.52,2 12,2z M12,17.27C9.36,17.27 7.21,15.7 6.4,13.5h11.2C16.79,15.7 14.64,17.27 12,17.27z M6.4,10.5C7.21,8.3 9.36,6.73 12,6.73c2.64,0 4.79,1.57 5.6,3.77L6.4,10.5z"
        opacity=".3"
      ></path>
      <path
        d="M12,4c-4.41,0 -8,3.59 -8,8s3.59,8 8,8s8,-3.59 8,-8S16.41,4 12,4zM12,2c5.52,0 10,4.48 10,10c0,5.52 -4.48,10 -10,10C6.48,22 2,17.52 2,12C2,6.48 6.48,2 12,2z"
        opacity="1"
      ></path>
      <path
        d="M12,6.73c-2.64,0 -4.79,1.57 -5.6,3.77h11.2C16.79,8.3 14.64,6.73 12,6.73z"
      ></path>
      <path
        d="M12,17.27c2.64,0 4.79,-1.57 5.6,-3.77H6.4C7.21,15.7 9.36,17.27 12,17.27z"
      ></path>
    </svg>`;

    return html`
      <axee-visuals-3d
        .galaxiesData=${Array.from(this.galaxies.values())}
        .currentGalaxyId=${this.currentGalaxyId}
        .selectedPlanetId=${this.selectedPlanetId}
        .viewMode=${this.viewMode}
        .isScanning=${this.isLoading}
        .groundingChunks=${this.groundingChunks}
        @planet-selected=${this.handlePlanetSelected}
        @galaxy-selected=${this.handleGalaxySelected}
      ></axee-visuals-3d>

      <axee-audio-engine
        .mood=${this.currentMood}
        .muted=${this.isMuted}
      ></axee-audio-engine>

      <div class="overlay">
        <header class="top-hud">
          <div class="tracking-info">${trackingText}</div>
        </header>

        <div class="bottom-left-hud">
          <canvas
            id="cobe-canvas"
            style="width: 100px; height: 100px; margin: 0 auto 1rem; border-radius: 50%;"
            width="200"
            height="200"
          ></canvas>
          <div class="hud-item"><span>MODE</span><span>IDLE</span></div>
          <div class="hud-item">
            <span>POS</span><span>238.7, 89.8, 448.3</span>
          </div>
          <div class="hud-item"><span>VELO</span><span>0.0 u/s</span></div>
          <div class="hud-item">
            <span>TARGET</span><span>121.4, 7.2, 246.2</span>
          </div>
          <div class="hud-item"><span>STATUS</span><span>NOMINAL</span></div>
          <div class="hud-controls">
            <button
              class="hud-button"
              @click=${this.toggleViewMode}
              title="Galaxy Map"
              aria-label="Toggle galaxy map view"
              ?disabled=${this.viewMode === 'galaxies'}
            >
              ${galaxyMapIcon}
            </button>
            <button
              class="hud-button"
              @click=${this.toggleMute}
              title=${this.isMuted ? 'Unmute' : 'Mute'}
              aria-label="Toggle music"
            >
              ${this.isMuted ? speakerOffIcon : speakerOnIcon}
            </button>
          </div>
        </div>

        <footer>
          <div class="command-bar">
            <input
              type="text"
              placeholder=${
                this.viewMode === 'galaxies'
                  ? 'Describe a new galaxy...'
                  : 'Ask the cosmos...'
              }
              .value=${this.userPrompt}
              @input=${(e: Event) => {
                this.userPrompt = (e.target as HTMLInputElement).value;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') this.handleSynthesis();
              }}
              ?disabled=${this.isLoading}
              aria-label="Synthesis command"
            />
            <button
              class="send-button"
              @click=${this.handleSynthesis}
              ?disabled=${this.isLoading}
              title="Synthesize"
              aria-label="Synthesize"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
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