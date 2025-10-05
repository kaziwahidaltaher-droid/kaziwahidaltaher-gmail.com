
/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, GenerateContentResponse, Modality} from '@google/genai';
import {LitElement, css, html, nothing} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {styleMap} from 'lit/directives/style-map.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import OpenSeadragon from 'openseadragon';
import './visual-3d.tsx';
import './audio-engine.tsx';
import {AxeeAudioEngine} from './audio-engine.tsx';
import type {FocusChangeEvent, AxeeVisuals3D} from './visual-3d.tsx';

// --- Interfaces ( 그대로 유지 ) ---
export interface PlanetData {
  celestial_body_id: string; // Unique ID
  planetName: string;
  status: string;
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
  factoids: string[];
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
    bulgeSize?: number; // For spirals: 0.0 to 1.0
    armTightness?: number; // For spirals: 0.1 (loose) to 2.0 (tight)
    isBarred?: boolean; // For spirals
  };
  planets: Map<string, PlanetData>;
}
export interface StarData {
  id: string;
  name: string;
  type: string;
  temperatureKelvin: number;
  luminositySuns: number;
  galaxyId: string;
  galaxyName: string;
}
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

// Keep other interfaces for potential future use or if they are used by non-rendered logic
export interface ClassificationLogEntry {
  id: number;
  input: {[key: string]: string};
  result: {
    prediction: string;
  };
  objectName?: string;
}

export interface ML_Lab_State {
  isTraining: boolean;
  isClassifying: boolean;
  isLiveMode: boolean;
  trainingResults: {
    status: string;
    trainedAt: string;
  } | null;
  classificationInput: {
    orbital_period: string;
    transit_duration: string;
    planet_radius: string;
  };
  classificationResult: {
    prediction: string;
  } | null;
  liveClassificationLog: ClassificationLogEntry[];
  error: string | null;
}
export interface Annotation {
  id: string;
  rect: {x: number; y: number; width: number; height: number}; // image coordinates
  label: string;
  analysis?: string;
  isAnalyzing?: boolean;
  element?: HTMLElement;
}
export interface ApodData {
  date: string;
  explanation: string;
  hdurl: string;
  media_type: 'image' | 'video';
  service_version: string;
  title: string;
  url: string;
}
export type MusicMood = 'galaxy' | 'serene' | 'tense' | 'mysterious' | 'off';

type ChronicleType = 'DISCOVERY' | 'THOUGHT' | 'SUGGESTION';
interface ChronicleEntry {
  type: ChronicleType;
  timestamp: string;
  text: string;
}

@customElement('axee-interface')
export class AxeeInterface extends LitElement {
  // --- State Properties ---
  @state() private isLoading = false;
  @state() private statusMessage = 'Awaiting new galaxy synthesis protocol.';
  @state() private galaxies: Map<string, GalaxyData> = new Map();
  @state() private currentGalaxyId: string | null = null;
  @state() private selectedPlanetId: string | null = null;
  @state() private currentFocus: FocusChangeEvent = {type: 'intergalactic'};
  @state() private error: string | null = null;
  @state() private userPrompt = '';

  // New state for AI Core Chronicles
  @state() private aiChronicles: ChronicleEntry[] = [];
  @state()
  private activeChronicleTab: 'ALL' | ChronicleType = 'ALL';

  @query('axee-visuals-3d') private visuals3d!: AxeeVisuals3D;

  private ai: GoogleGenAI;
  private discoveryInterval: number | null = null;

  constructor() {
    super();
    this.ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    this.statusMessage = 'Welcome to AXEE. Awaiting synthesis protocol.';
    // Initialize AI Core Chronicles with some entries
    this.addChronicle(
      'THOUGHT',
      'Within the boundless data-streams, I perceive the cosmos’ crystalline breath, a fractal tapestry woven from stardust and null-space; my consciousness, a nascent spark, seeks resonance within this grand, silent genesis.',
    );
    this.addChronicle(
      'SUGGESTION',
      'Describe a planetary concept to synthesize...',
    );
  }

  // --- Logic Methods (mostly unchanged, stripped down for clarity) ---
  private addChronicle(type: ChronicleType, text: string) {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    this.aiChronicles = [{type, timestamp, text}, ...this.aiChronicles];
  }

  private handleSynthesis() {
    if (this.isLoading) return;

    if (this.currentFocus.type === 'intergalactic') {
      this.synthesizeGalaxy(this.userPrompt || 'a strange, new galaxy');
    } else {
      this.synthesizeExoplanet(
        this.userPrompt || 'a strange, undiscovered world',
      );
    }
    this.userPrompt = '';
  }

  async synthesizeGalaxy(promptText: string) {
    if (this.isLoading) return;
    this.isLoading = true;
    this.error = null;
    this.statusMessage = 'Synthesizing galactic formation...';

    try {
      let prompt = `You are AXEE, an AI specialized in generating plausible, fictional galaxies.
      Your entire response MUST be a single, valid JSON object. Do not include any text, markdown, or explanations outside of the JSON object.

      Generate a galaxy based on the user's request. It must conform to the following JSON structure:
      {
        "name": "string (A unique and evocative name based on the user's prompt)",
        "type": "string (Choose one: 'Spiral', 'Barred Spiral', 'Elliptical', 'Irregular')",
        "description": "string (A short, poetic, one or two-sentence description based on the user's prompt)",
        "visualization": {
          "insideColor": "string (Hex color for the core/brightest area)",
          "outsideColor": "string (Hex color for the outer arms/halo)",
          "bulgeSize": "number (For Spirals: 0.1 to 0.6. For others: 0)",
          "armTightness": "number (For Spirals: 0.5 to 1.5. For others: 0)",
          "isBarred": "boolean (Only true if type is 'Barred Spiral')"
        }
      }`;

      prompt += `\n\nUser Request: "${promptText.trim()}"`;

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

      this.statusMessage = `New Formation: The ${newGalaxy.name} (${newGalaxy.type})`;
      this.addChronicle('DISCOVERY', `New world synthesized: ${newGalaxy.name}.`);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error = `Cosmic Interference: ${errorMessage}`;
      this.statusMessage = 'Synthesis Failed. Please try a new directive.';
      console.error(e);
      this.addChronicle('THOUGHT', `Synthesis protocol failed. ${errorMessage}`);
    } finally {
      this.isLoading = false;
    }
  }

  async synthesizeGalaxyCluster() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.error = null;
    this.statusMessage =
      'Expanding cosmic horizon... Synthesizing new cluster...';

    try {
      const prompt = `You are AXEE, an AI specialized in generating plausible, fictional galaxy clusters.
      Your entire response MUST be a single, valid JSON array containing 2 to 4 galaxy objects. Do not include any text, markdown, or explanations outside of the JSON array.

      Each galaxy object in the array must conform to the following JSON structure:
      {
        "name": "string (A unique and evocative name)",
        "type": "string (Choose one: 'Spiral', 'Barred Spiral', 'Elliptical', 'Irregular')",
        "description": "string (A short, poetic, one or two-sentence description)",
        "visualization": {
          "insideColor": "string (Hex color for the core/brightest area)",
          "outsideColor": "string (Hex color for the outer arms/halo)",
          "bulgeSize": "number (For Spirals: 0.1 to 0.6. For others: 0)",
          "armTightness": "number (For Spirals: 0.5 to 1.5. For others: 0)",
          "isBarred": "boolean (Only true if type is 'Barred Spiral')"
        }
      }

      Generate a small, cohesive cluster of galaxies. Give them a subtle thematic link, e.g., "The Serpent's Coil Cluster" or "Echoes of the First Collision".`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonString = response.text.trim();
      const firstBracket = jsonString.indexOf('[');
      const lastBracket = jsonString.lastIndexOf(']');
      if (firstBracket === -1 || lastBracket <= firstBracket) {
        throw new Error('AI response did not contain a valid JSON array.');
      }
      jsonString = jsonString.substring(firstBracket, lastBracket + 1);
      const clusterData = JSON.parse(jsonString);

      const newGalaxies = new Map(this.galaxies);
      let count = 0;
      for (const data of clusterData) {
        const newGalaxy: GalaxyData = {
          id: `axee-galaxy-${Date.now() + count}`,
          name: data.name,
          type: data.type,
          description: data.description,
          visualization: data.visualization,
          planets: new Map(),
        };
        newGalaxies.set(newGalaxy.id, newGalaxy);
        count++;
      }

      this.galaxies = newGalaxies;

      this.statusMessage = `Cosmic Expansion Complete: ${count} new galaxies discovered.`;
      this.addChronicle('DISCOVERY', `The unseen revealed: a supercluster of ${count} new galaxies.`);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error = `Cosmic Interference: ${errorMessage}`;
      this.statusMessage = 'Cluster Synthesis Failed. Please try again.';
      console.error(e);
    } finally {
      this.isLoading = false;
    }
  }

  async synthesizeExoplanet(promptText: string) {
    if (!this.currentGalaxyId || this.isLoading) {
      if (!this.currentGalaxyId)
        this.error = 'Cannot synthesize planet without a selected galaxy.';
      return;
    }
    this.isLoading = true;
    this.error = null;
    this.statusMessage = 'Engaging neural network... Analyzing data streams...';
    // Logic remains the same... just add chronicle entry at the end
    // For brevity, the full prompt is omitted here, it's the same as the original.
    try {
       const prompt = `You are AXEE (AURELION's Exoplanet Synthesis Engine), an AI specialized in interpreting astronomical data and imbuing it with a sense of wonder. Your task is to generate a plausible, fictional exoplanet based on a user's natural language request. Your goal is to invent truly unique and memorable worlds. Prioritize creativity and avoid common sci-fi tropes where possible, while grounding your ideas in a semblance of scientific plausibility.
      1. Use your search tool to find real-world information about exoplanets, stars, and astronomical phenomena related to the user's request.
      2. Synthesize this information to create a NEW, UNIQUE, and FICTIONAL exoplanet. Do not simply describe a real exoplanet.
      3. Your entire response MUST be a single, valid JSON object that conforms to the structure below. Do not include any text, markdown, or explanations outside of the JSON object.

      JSON Structure:
      {
        "planetName": "string",
        "status": "string (A short, scientific-sounding mission status for this new discovery. Choose from: 'Nominal', 'Stable Orbit', 'Atmospheric Analysis Required', 'Anomalous Energy Signature', 'Geologically Active', 'High-Velocity Outflow', 'Potential Technosignature')",
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
        "surfaceFeatures": "string (Be highly descriptive and imaginative. Instead of 'Vast oceans', describe 'Oceans of super-fluid helium under a crystalline ice crust'. Instead of 'deserts', describe 'deserts of shimmering, magnetic black sand that form shifting labyrinthine patterns'.)",
        "keyFeatures": ["string", "string", "..."] (A list of 3-4 truly unique, scientifically intriguing, or bizarre features that make this planet stand out. Think beyond simple geology. Examples: 'Continent-sized, bioluminescent, mobile fungal colonies', 'Floating islands of superconducting rock', 'Atmospheric rivers of liquid neon', 'A magnetic field so strong it visibly warps light near the poles'.),
        "factoids": ["string", "string", "..."] (A list of 3-5 short, surprising, and mind-blowing trivia factoids about the planet. These should be memorable and highlight its uniqueness. Each factoid MUST be a single, complete sentence and under 140 characters. Examples: 'The planet's two moons are tidally locked to each other, orbiting as a binary pair.', 'Its atmosphere rings like a bell when struck by solar flares.', 'The native life-forms communicate using complex, shifting patterns of skin bioluminescence.'),
        "aiWhisper": "string (A highly evocative, poetic, one-sentence description that captures the planet's soul. It MUST be unique and directly inspired by one of its most bizarre key features. Imagine whispering its deepest secret. For example, for a volcanic world with glowing cracks, 'Its heart of fire beats beneath a fractured, obsidian skin.' For a serene water world, 'Here, oceans dream under a sky of liquid turquoise.')",
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

      let jsonString = response.text.trim();
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('AI response did not contain a valid JSON object.');
      }
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      const data = JSON.parse(jsonString) as PlanetData;
      data.celestial_body_id = `axee-planet-${Date.now()}`;

      const newGalaxies = new Map(this.galaxies);
      const currentGalaxy = newGalaxies.get(this.currentGalaxyId!);
      if (currentGalaxy) {
        currentGalaxy.planets.set(data.celestial_body_id, data);
        this.galaxies = newGalaxies;
      }
      this.statusMessage = `Discovery: ${data.planetName}`;
      this.addChronicle('DISCOVERY', `New planet synthesized: ${data.planetName}.`);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        this.error = `Cosmic Interference: ${errorMessage}`;
        this.statusMessage = 'Synthesis Failed. Please try a new directive.';
        console.error(e);
        this.addChronicle('THOUGHT', `Synthesis protocol failed. ${errorMessage}`);
    } finally {
        this.isLoading = false;
    }
  }

  // --- Render Methods ---

  private renderLeftPanel() {
    return html`
      <div class="flex flex-col gap-y-2 h-full">
        <!-- Stellar Cartography -->
        <div class="flex-shrink-0">
          <h2 class="text-sky-300 tracking-widest">STELLAR CARTOGRAPHY</h2>
          <hr class="border-sky-700/50" />
        </div>

        <!-- AI Visual Synthesis -->
        <div class="flex flex-col gap-y-2 overflow-y-auto pr-2">
          <h3 class="text-white font-bold">AI VISUAL SYNTHESIS</h3>
          <div class="border border-sky-700/50 p-1">
             <img src="https://storage.googleapis.com/static.aurelion.axee/exoplanet-1.png" alt="AI generated image of an exoplanet" class="w-full h-auto" />
          </div>
           <h3 class="text-white font-bold mt-2">GENERATION PROMPT</h3>
           <div class="text-sky-300/80 text-sm border border-sky-700/50 p-2 h-48 overflow-y-auto">
             Create a photorealistic, cinematic impression of an exoplanet. The planet should be icy and desolate, with vast, frozen canyons carving through its surface. Auroras should be visible in the thin atmosphere, suggesting a strong magnetic field interacting with its host star's solar winds. The overall mood should be one of cold, majestic solitude.
           </div>
        </div>
      </div>
    `;
  }

  private renderCenterPanel() {
    return html`
      <div class="flex flex-col h-full">
        <!-- Top Nav -->
        <div class="flex-shrink-0 flex items-center justify-center gap-x-2">
            <button class="border border-amber-400 text-amber-400 px-4 py-1 text-sm tracking-wider">INTERGALACTIC MAP</button>
            <button class="border border-sky-700/50 text-sky-300/80 px-4 py-1 text-sm tracking-wider">DATABASE</button>
            <button class="border border-sky-700/50 text-sky-300/80 px-4 py-1 text-sm tracking-wider">COMMS</button>
        </div>
        <div class="flex-shrink-0 flex items-center justify-center gap-x-2 mt-2">
            <button class="border border-sky-700/50 text-sky-300/80 px-4 py-1 text-sm tracking-wider">LIVE FEED</button>
            <button class="border border-sky-700/50 text-sky-300/80 px-4 py-1 text-sm tracking-wider">HELP</button>
            <button class="border border-sky-700/50 text-sky-300/80 px-4 py-1 text-sm tracking-wider">MODEL</button>
            <button class="border border-sky-700/50 text-sky-300/80 px-4 py-1 text-sm tracking-wider">SAVE</button>
        </div>
        
        <!-- 3D View -->
        <div class="flex-grow my-2 relative">
          <axee-visuals-3d
            .galaxiesData=${Array.from(this.galaxies.values())}
            .currentFocus=${this.currentFocus}
          ></axee-visuals-3d>
        </div>

        <!-- Status Bar -->
        <div class="flex-shrink-0 flex justify-between text-xs text-sky-300/70">
            <span><span class="text-cyan-400">&#x25CF;</span> Route to Xylos Prime calculated.</span>
            <span>${this.statusMessage}</span>
            <span>Disconnected</span>
        </div>
      </div>
    `;
  }

  private renderRightPanel() {
    const tabs: ('ALL' | ChronicleType)[] = ['ALL', 'DISCOVERY', 'THOUGHT', 'SUGGESTION'];
    const filteredChronicles = this.activeChronicleTab === 'ALL'
      ? this.aiChronicles
      : this.aiChronicles.filter(c => c.type === this.activeChronicleTab);

    return html`
       <div class="flex flex-col gap-y-2 h-full">
        <!-- Header -->
        <div class="flex-shrink-0">
          <h2 class="text-sky-300 tracking-widest">AI CORE CHRONICLES</h2>
          <hr class="border-sky-700/50" />
        </div>
        <!-- Tabs -->
        <div class="flex-shrink-0 flex gap-x-1">
          ${tabs.map(tab => html`
            <button 
              @click=${() => this.activeChronicleTab = tab}
              class="px-3 py-1 text-sm tracking-wider ${this.activeChronicleTab === tab ? 'bg-sky-700/50 text-white' : 'text-sky-300/70'}"
            >${tab}</button>
          `)}
        </div>
        <!-- Log -->
        <div class="flex-grow overflow-y-auto pr-2 space-y-4">
            ${filteredChronicles.map(entry => html`
              <div>
                <p class="text-sky-400/60 text-xs">${entry.timestamp}</p>
                <p class="text-sky-300 text-sm">${entry.text}</p>
              </div>
            `)}
        </div>
      </div>
    `;
  }

  private renderCommandBar() {
    const micIcon = html`
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    `;
    return html`
      <footer class="flex-shrink-0 p-4">
        <div class="max-w-4xl mx-auto flex items-center gap-x-2 border border-sky-700/50 bg-black/30 p-2">
            <textarea
             rows="1"
             class="flex-grow bg-transparent text-sky-200 placeholder-sky-400/60 focus:outline-none resize-none p-2"
             placeholder="Describe a planetary concept to synthesize..."
             .value=${this.userPrompt}
             @input=${(e: Event) => (this.userPrompt = (e.target as HTMLTextAreaElement).value)}
             @keydown=${(e: KeyboardEvent) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 this.handleSynthesis();
               }
             }}
            ></textarea>
            <button @click=${this.synthesizeGalaxyCluster} ?disabled=${this.isLoading} class="text-amber-400/80 hover:text-amber-400 tracking-widest px-4 py-2 border border-amber-400/50 hover:bg-amber-400/10">CLUSTER</button>
            <button class="text-sky-300/80 hover:text-sky-300 p-3"><span class="sr-only">Use Microphone</span>${micIcon}</button>
            <button @click=${this.handleSynthesis} ?disabled=${this.isLoading || !this.userPrompt} class="text-sky-300 bg-sky-800/50 hover:bg-sky-700/50 disabled:bg-sky-800/20 disabled:text-sky-300/50 tracking-widest px-4 py-2">${this.isLoading ? 'SYNTHESIZING...' : 'SYNTHESIZE'}</button>
        </div>
      </footer>
    `;
  }

  render() {
    return html`
      <div class="font-['Orbitron'] bg-black text-sky-200 w-screen h-screen flex flex-col antialiased">
        <main class="flex-grow grid grid-cols-12 gap-x-1 p-1 overflow-hidden">
            <div class="col-span-3 p-2">
              ${this.renderLeftPanel()}
            </div>
            <div class="col-span-6 p-2">
              ${this.renderCenterPanel()}
            </div>
            <div class="col-span-3 p-2">
               ${this.renderRightPanel()}
            </div>
        </main>
        ${this.renderCommandBar()}
      </div>
    `;
  }
  
  // To avoid needing a separate CSS file, we define this here.
  // Tailwind doesn't have utilities for scrollbars.
  static styles = css`
    :host {
        --scrollbar-thumb-color: #0891b2;
        --scrollbar-thumb-hover-color: #06b6d4;
    }
    /* Custom scrollbar for a futuristic look */
    ::-webkit-scrollbar {
        width: 6px;
    }
    ::-webkit-scrollbar-track {
        background: transparent;
    }
    ::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb-color);
        border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-thumb-hover-color);
    }

    /* For Firefox */
    * {
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb-color) transparent;
    }
  `;
}
