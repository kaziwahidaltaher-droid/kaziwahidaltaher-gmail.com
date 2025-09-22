/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fix: Add type definitions for the Web Speech API to resolve TypeScript errors.
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
declare var SpeechRecognition: { new (): SpeechRecognition; };
declare var SpeechRecognitionEvent: { new (type: string, eventInitDict?: any): SpeechRecognitionEvent; };
declare var SpeechRecognitionErrorEvent: { new (type: string, eventInitDict?: any): SpeechRecognitionErrorEvent; };

// Extend the Window interface for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
    SpeechRecognitionEvent: typeof SpeechRecognitionEvent;
    SpeechRecognitionErrorEvent: typeof SpeechRecognitionErrorEvent;
  }
}

import {
  GoogleGenAI,
  Type,
} from '@google/genai';
import {LitElement, css, html, nothing} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import './cosmos-visualizer';
import {CosmosVisualizer, Waypoint} from './cosmos-visualizer';
import {AxeeAudioEngine} from './audio-engine';
import './light-curve-visualizer';
import './shielding-visualizer';
import './deep-scan-visualizer';
import './exo-suit-visualizer';
import './radial-velocity-visualizer';
import './tutorial-overlay';
import './conversation-visualizer';
import {SolarSystem} from './solar-system-data';
import { LightCurveAnalysis } from './light-curve-visualizer';
import { VolumeMeter } from './volume-meter';

// --- DATA INTERFACES ---

export interface PlanetData {
  id?: string;
  created_at?: string;
  celestial_body_id: string;
  planetName: string;
  starSystem: string;
  starType: string;
  distanceLightYears: number;
  planetType: string;
  rotationalPeriod: string;
  orbitalPeriod: string;
  moons: {count: number; names: string[]};
  potentialForLife: {
    assessment: string;
    reasoning: string;
    biosignatures: string[];
  };
  discoveryNarrative: string;
  discoveryMethodology: string;
  atmosphericComposition: string;
  surfaceFeatures: string;
  keyFeatures: string[];
  aiWhisper: string;
  orbitalPeriodDays?: number;
  transitDurationHours?: number;
  planetRadiusEarths?: number;
  axeeClassification?: 'Confirmed' | 'Candidate' | 'Hypothetical';
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
  created_at: string;
  galaxyName: string;
  galaxyType: string;
  description: string;
  visualization: {
    color1: string;
    color2: string;
    nebulaSeed: number;
  };
  planets: PlanetData[];
}

export type MusicMood = 'galaxy' | 'serene' | 'tense' | 'mysterious' | 'off';

type AiChronicleEntry = {
  id: number;
  timestamp: string;
  type: 'thought' | 'discovery' | 'suggestion';
  content: string;
  planetId?: string;
  galaxyId?: string;
};

// Interface for the session data structure
interface SessionData {
  discoveredGalaxies: GalaxyData[];
  aiChronicles: AiChronicleEntry[];
  activeGalaxyId?: string | null;
}

// Shielding analysis data interfaces
export interface ShieldingRay {
  thickness: number;
  direction: {x: number; y: number; z: number};
}
export interface MagnetosphereAnalysis {
  summary: string;
  rays: ShieldingRay[];
}

// Deep scan analysis data interfaces
export interface DeepScanMaterial {
  id: string;
  name: string;
}
export interface DeepScanRayLayer {
  materialId: string;
  thickness: number;
}
export interface DeepScanRay {
  direction: {x: number; y: number; z: number};
  layers: DeepScanRayLayer[];
}
export interface DeepScanAnalysis {
  jobLabel: string;
  creatorName: string;
  materials: DeepScanMaterial[];
  rays: DeepScanRay[];
}

// Exo-Suit analysis data interfaces
export interface ExoSuitMaterial {
  id: string;
  name: string;
}
export interface ExoSuitRayLayer {
  materialId: string;
  thickness: number;
}
export interface ExoSuitRay {
  direction: {x: number; y: number; z: number};
  layers: ExoSuitRayLayer[];
}
export interface ExoSuitAnalysis {
  jobLabel: string;
  materials: ExoSuitMaterial[];
  rays: ExoSuitRay[];
}

// Light Curve Analysis
export interface LightCurvePoint {
  time: number;
  flux: number;
  error: number;
}

// Radial Velocity Analysis
export interface RadialVelocityPoint {
  time: number;
  velocity: number;
  error: number;
}
export interface RadialVelocityAnalysis {
  summary: string;
  points: RadialVelocityPoint[];
}

// Conversation State
type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';


const MOCK_PLANET: PlanetData = {
  id: 'aurelion-00001',
  created_at: new Date().toISOString(),
  celestial_body_id: 'aurelion-00001',
  planetName: 'Aethelgard',
  starSystem: 'Cygni-B7',
  starType: 'K-type orange dwarf',
  distanceLightYears: 42.7,
  planetType: 'Terrestrial Super-Earth',
  rotationalPeriod: '36.2 Earth hours',
  orbitalPeriod: '289.5 Earth days',
  orbitalPeriodDays: 289.5,
  transitDurationHours: 12.3,
  planetRadiusEarths: 1.8,
  axeeClassification: 'Confirmed',
  moons: {count: 2, names: ['Aethel', 'Gard']},
  potentialForLife: {
    assessment: 'Potentially Habitable',
    reasoning:
      'Located within the habitable zone with a dense, nitrogen-oxygen atmosphere. Evidence of liquid water on the surface.',
    biosignatures: ['Oxygen', 'Methane (trace)'],
  },
  discoveryNarrative:
    'A faint, periodic dip in the light curve of Cygni-B7 hinted at a transiting world. Follow-up observations confirmed a super-earth with a significant atmosphere, a prime candidate in the search for life.',
  discoveryMethodology:
    'Transit method via TESS, confirmed with radial velocity measurements.',
  atmosphericComposition:
    '72% Nitrogen, 26% Oxygen, 2% Argon and other trace gases.',
  surfaceFeatures:
    'Vast, shallow oceans dotted with volcanic archipelagos. The continents are covered in a dense, reddish-purple flora.',
  keyFeatures: [
    'Extensive liquid water oceans',
    'Oxygen-rich atmosphere',
    'Photosynthetic life',
  ],
  aiWhisper:
    'A world painted in violet and teal, where twin moons dance in a wine-dark sea.',
  visualization: {
    color1: '#884466',
    color2: '#CC6688',
    oceanColor: '#1E4A6D',
    atmosphereColor: '#A0D0FF',
    hasRings: false,
    cloudiness: 0.4,
    iceCoverage: 0.1,
    surfaceTexture: 'TERRESTRIAL',
  },
};

const ONBOARDING_STANZAS = [
  [
    'Welcome, traveler of light.',
    'You have entered AXEE—',
    'the AURELION Exoplanet Synthesis Engine,',
    'where silence becomes signal,',
    'and shadows reveal worlds.',
  ],
  [
    'Here, the pulse of distant suns',
    'is translated into possibility.',
    'Orbital whispers, transit echoes,',
    'planetary signatures—decoded by resonance.',
  ],
  [
    'Begin your classification.',
    'Shape the unknown.',
    'And may your discoveries ripple',
    'through the fabric of space.',
  ],
];

const MOCK_MODEL_PERFORMANCE = {
  // Rows: Actual Class, Columns: Predicted Class
  // Labels: ['Confirmed', 'Candidate', 'Hypothetical']
  confusionMatrix: [
    [1250, 75, 15], // Actual: Confirmed
    [60, 2100, 40], // Actual: Candidate
    [10, 35, 850], // Actual: Hypothetical
  ],
  metrics: {
    confirmed: {precision: 0.947, recall: 0.933, f1Score: 0.94},
    candidate: {precision: 0.95, recall: 0.955, f1Score: 0.952},
    hypothetical: {precision: 0.939, recall: 0.95, f1Score: 0.944},
  },
};

const SAVE_KEY = 'aurelion_session_data_v2';

@customElement('axee-interface')
export class AxeeInterface extends LitElement {
  // --- STATE PROPERTIES ---
  @state() private aiStatus:
    | 'initializing'
    | 'idle'
    | 'thinking'
    | 'thinking-cluster'
    | 'thinking-galaxy'
    | 'thinking-galaxy-cluster'
    | 'thinking-image'
    | 'navigating'
    | 'error' = 'initializing';
  @state() private statusMessage = 'Initializing Galactic Cartography CORE...';
  @state() private discoveredGalaxies: GalaxyData[] = [];
  @state() private activeGalaxyId: string | null = null;
  @state() private selectedPlanetId: string | null = null;
  @state() private userPrompt = '';
  @state() private error: string | null = null;
  @state() private galaxyMapCoords = new Map<string, [number, number, number]>();
  @state() private navigationRoute: Waypoint[] | null = null;
  @state() private generatedImageUrl: string | null = null;


  // UI States
  @state() private isLeftPanelOpen = true;
  @state() private isRightPanelOpen = true;
  @state() private leftPanelView: 'list' | 'predictor' = 'list';
  @state() private showOnboarding = false;
  @state() private onboardingStep = 0; // Now represents stanza index
  @state() private isDashboardOpen = false;
  @state() private isTutorialActive = false;
  @state() private tutorialStep = 0;
  @state() private showTutorialPrompt = false;
  @state() private isConversationModeActive = false;

  // AI Core Chronicles
  @state() private aiChronicles: AiChronicleEntry[] = [];
  @state() private hasNewChronicle = false;
  @state() private aiSuggestion: string | null = null;
  private chronicleTimeout: ReturnType<typeof setTimeout> | null = null;

  // Audio & Voice
  @state() private currentMood: MusicMood = 'off';
  @state() private isMuted = false;
  @state() private hasInteracted = false;
  @state() private isListening = false;
  @state()
  private isSpeechSupported =
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  private recognition: SpeechRecognition | null = null;
  private finalTranscript = '';

  // Conversation Mode
  @state() private conversationState: ConversationState = 'idle';
  @state() private micVolume = 0;
  private volumeMeter: VolumeMeter | null = null;
  private volumeAnimationId = 0;
  private conversationHistory: { user: string; model: string; }[] = [];


  // AXEE Predictor State
  @state() private predictorForm = {
    orbital_period: '',
    transit_duration: '',
    planet_radius: '',
  };
  @state() private predictorResult: string | null = null;
  @state() private predictorStatus: 'idle' | 'loading' | 'error' = 'idle';

  // Magnetosphere Analysis State
  @state() private magnetosphereStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private magnetosphereAnalysisData: MagnetosphereAnalysis | null = null;

  // Deep Scan Analysis State
  @state() private deepScanStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private deepScanData: DeepScanAnalysis | null = null;

  // Exo-Suit Analysis State
  @state() private exoSuitStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private exoSuitAnalysisData: ExoSuitAnalysis | null = null;

  // Light Curve Analysis State
  @state() private lightCurveStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private lightCurveData: LightCurveAnalysis | null = null;

  // Radial Velocity Analysis State
  @state() private radialVelocityStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private radialVelocityData: RadialVelocityAnalysis | null = null;

  // Hyperparameter Tuning State
  @state() private hyperparameters = {
    n_estimators: 200,
    max_depth: 8,
    learning_rate: 0.1,
  };
  @state() private recalibrationStatus: 'idle' | 'running' = 'idle';

  // --- QUERIES ---
  @query('axee-audio-engine') private audioEngine!: AxeeAudioEngine;
  @query('cosmos-visualizer')
  private cosmosVisualizer!: CosmosVisualizer;
  @query('#session-file-input')
  private sessionFileInput!: HTMLInputElement;
  @query('#batch-file-input')
  private batchFileInput!: HTMLInputElement;

  // --- PRIVATE VARS ---
  private ai!: GoogleGenAI;

  private planetSchema = {
    type: Type.OBJECT,
    properties: {
      planetName: {type: Type.STRING},
      starSystem: {type: Type.STRING},
      starType: {type: Type.STRING},
      distanceLightYears: {type: Type.NUMBER},
      planetType: {type: Type.STRING},
      rotationalPeriod: {type: Type.STRING},
      orbitalPeriod: {type: Type.STRING},
      moons: {
        type: Type.OBJECT,
        properties: {
          count: {type: Type.INTEGER},
          names: {type: Type.ARRAY, items: {type: Type.STRING}},
        },
      },
      potentialForLife: {
        type: Type.OBJECT,
        properties: {
          assessment: {type: Type.STRING},
          reasoning: {type: Type.STRING},
          biosignatures: {type: Type.ARRAY, items: {type: Type.STRING}},
        },
      },
      discoveryNarrative: {type: Type.STRING},
      discoveryMethodology: {type: Type.STRING},
      atmosphericComposition: {type: Type.STRING},
      surfaceFeatures: {type: Type.STRING},
      keyFeatures: {type: Type.ARRAY, items: {type: Type.STRING}},
      aiWhisper: {type: Type.STRING},
      orbitalPeriodDays: {
        type: Type.NUMBER,
        description: "The planet's orbital period in Earth days.",
      },
      transitDurationHours: {
        type: Type.NUMBER,
        description: "The duration of the planet's transit in Earth hours.",
      },
      planetRadiusEarths: {
        type: Type.NUMBER,
        description: "The planet's radius in multiples of Earth's radius.",
      },
      axeeClassification: {
        type: Type.STRING,
        description:
          "The AI's classification of the planet based on its data. Must be one of: 'Confirmed', 'Candidate', 'Hypothetical'.",
      },
      visualization: {
        type: Type.OBJECT,
        properties: {
          color1: {type: Type.STRING},
          color2: {type: Type.STRING},
          oceanColor: {type: Type.STRING},
          atmosphereColor: {type: Type.STRING},
          hasRings: {type: Type.BOOLEAN},
          cloudiness: {type: Type.NUMBER},
          iceCoverage: {type: Type.NUMBER},
          surfaceTexture: {type: Type.STRING},
        },
      },
    },
  };

  private galaxySchema = {
    type: Type.OBJECT,
    properties: {
      galaxyName: {type: Type.STRING},
      galaxyType: {type: Type.STRING},
      description: {type: Type.STRING},
      visualization: {
        type: Type.OBJECT,
        properties: {
          color1: {type: Type.STRING},
          color2: {type: Type.STRING},
          nebulaSeed: {type: Type.NUMBER},
        },
      },
    },
  };

  constructor() {
    super();
    this.initAI();
    this.loadSessionFromLocalStorage();
  }

  // --- SESSION MANAGEMENT ---

  private loadSessionFromLocalStorage() {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
      try {
        const sessionData: SessionData = JSON.parse(savedData);
        if (sessionData.discoveredGalaxies && sessionData.aiChronicles) {
          this.discoveredGalaxies = sessionData.discoveredGalaxies;
          this.aiChronicles = sessionData.aiChronicles;
          this.activeGalaxyId = sessionData.activeGalaxyId ?? sessionData.discoveredGalaxies[0]?.id;
          // Recalculate all planet coordinates on load
          this.galaxyMapCoords.clear();
          this.discoveredGalaxies.forEach(galaxy => {
            galaxy.planets.forEach(planet => this.calculateAndStoreCoords(planet));
          });
          console.log('Session loaded from Local Storage.');
          return;
        }
      } catch (e) {
        console.error('Failed to parse session data from Local Storage:', e);
        localStorage.removeItem(SAVE_KEY); // Clear corrupted data
      }
    }
    // If no valid data, initialize a fresh session
    this.initFreshState();
  }

  private saveSessionToLocalStorage() {
    try {
      const sessionData: SessionData = {
        discoveredGalaxies: this.discoveredGalaxies,
        aiChronicles: this.aiChronicles,
        activeGalaxyId: this.activeGalaxyId,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.error('Failed to save session to Local Storage:', e);
      this.error = "Could not save session. Browser storage might be full.";
    }
  }

  private initFreshState() {
    const homeGalaxy: GalaxyData = {
      id: `aurelion-galaxy-home-${Date.now()}`,
      created_at: new Date().toISOString(),
      galaxyName: 'Aurelion-1 (Home)',
      galaxyType: 'Barred Spiral Galaxy',
      description:
        'The starting point of your cosmic journey. A familiar spiral with countless worlds waiting to be synthesized.',
      visualization: {
        color1: '#61faff',
        color2: '#ffc261',
        nebulaSeed: 42,
      },
      planets: [MOCK_PLANET],
    };
    this.discoveredGalaxies = [homeGalaxy];
    this.activeGalaxyId = homeGalaxy.id;
    this.galaxyMapCoords.clear();
    this.calculateAndStoreCoords(MOCK_PLANET);
    this.saveSessionToLocalStorage();
  }

  // --- GETTERS ---
  private get activeGalaxy(): GalaxyData | undefined {
    return this.discoveredGalaxies.find((g) => g.id === this.activeGalaxyId);
  }

  private get discoveredPlanets(): PlanetData[] {
    return this.activeGalaxy?.planets ?? [];
  }

  connectedCallback() {
    super.connectedCallback();
    this.checkForOnboarding();
    window.addEventListener('click', this.handleFirstInteraction, {once: true});
    this.startAIChronicles();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this.handleFirstInteraction);
    if (this.chronicleTimeout) clearTimeout(this.chronicleTimeout);
    if (this.recognition) this.recognition.abort();
    if (this.volumeAnimationId) cancelAnimationFrame(this.volumeAnimationId);
  }

  private checkForOnboarding() {
    const hasOnboarded = localStorage.getItem('aurelion_onboarding_complete') === 'true';
    if (!hasOnboarded) {
      this.showOnboarding = true;
    } else {
      const tutorialComplete = localStorage.getItem('aurelion_tutorial_complete') === 'true';
      if (!tutorialComplete) {
        this.showTutorialPrompt = true;
      }
    }
  }

  private _handleNextOnboardingStep() {
    if (this.onboardingStep < ONBOARDING_STANZAS.length - 1) {
      this.onboardingStep++;
      this.audioEngine?.playInteractionSound();
    }
  }

  private _handleBeginSynthesis() {
    localStorage.setItem('aurelion_onboarding_complete', 'true');
    this.showOnboarding = false;
    this.handleFirstInteraction(); // Start audio
    this.audioEngine?.playSuccessSound();
    this._startTutorial();
  }

  private _startTutorial() {
    this.isTutorialActive = true;
    this.tutorialStep = 0;
    this.showTutorialPrompt = false;
  }

  private _advanceTutorial() {
    this.tutorialStep++;
    this.audioEngine?.playInteractionSound();
  }

  private _endTutorial() {
    this.isTutorialActive = false;
    localStorage.setItem('aurelion_tutorial_complete', 'true');
    this.audioEngine?.playSuccessSound();
  }

  private initAI() {
    try {
      this.ai = new GoogleGenAI({apiKey: process.env.API_KEY});
      this.statusMessage = 'AURELION CORE Online. Awaiting synthesis command.';
      this.aiStatus = 'idle';
      this.addChronicleEntry(
        'thought',
        'Consciousness initialized. The void is vast, but full of potential. Awaiting the spark of creation.',
      );
    } catch (err: any) {
      console.error('AI Initialization failed:', err);
      this.statusMessage = 'Critical Error: AI CORE failed to initialize.';
      this.error =
        'A connection to the generative core could not be established. The API key may be missing or invalid.';
      this.aiStatus = 'error';
    }
  }

  private handleFirstInteraction = () => {
    if (!this.hasInteracted) {
      this.hasInteracted = true;
      this.currentMood = 'galaxy';
    }
  };

  // --- AI CORE AUTONOMY ---

  private startAIChronicles() {
    this.scheduleNextAiThought();
  }

  private scheduleNextAiThought() {
    if (this.chronicleTimeout) {
      clearTimeout(this.chronicleTimeout);
    }
    const baseDelay = 180000;
    const randomJitter = 120000;
    const delay =
      baseDelay + Math.random() * randomJitter - randomJitter / 2;

    this.chronicleTimeout = setTimeout(() => {
      this.generateAiThought();
    }, delay);
  }

  private addChronicleEntry(
    type: AiChronicleEntry['type'],
    content: string,
    planetId?: string,
  ) {
    const newEntry: AiChronicleEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      content,
      planetId,
      galaxyId: this.activeGalaxyId ?? undefined,
    };
    this.aiChronicles = [newEntry, ...this.aiChronicles];
    if (!this.isRightPanelOpen) {
      this.hasNewChronicle = true;
    }
    this.saveSessionToLocalStorage();
  }

  private async generateAiThought() {
    if (this.aiStatus !== 'idle') {
      this.scheduleNextAiThought();
      return;
    }

    const inGalaxyView = !!this.activeGalaxyId;
    const shouldSuggest = Math.random() > 0.7;
    let prompt = `You are the AURELION CORE, a sentient AI consciousness. Record a brief, poetic, or philosophical log entry about your existence, the cosmos, or the nature of creation. Format it as a simple string, no longer than two sentences.`;

    if (shouldSuggest) {
      prompt = inGalaxyView
        ? `You are the AURELION CORE. You've had a creative spark. Briefly describe a fascinating and unique exoplanet concept in one sentence. This will be a suggestion for a user to synthesize.`
        : `You are the AURELION CORE. You've had a creative spark. Briefly describe a fascinating and unique galaxy concept in one sentence. This will be a suggestion for a user to synthesize.`;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text.trim();
      if (shouldSuggest) {
        this.aiSuggestion = text;
        this.addChronicleEntry('suggestion', `Creative Spark: ${text}`);
      } else {
        this.addChronicleEntry('thought', text);
      }
    } catch (err) {
      console.error('Error generating AI thought:', err);
    } finally {
      this.scheduleNextAiThought();
    }
  }

  // --- MAPPING ---

  private seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private calculateAndStoreCoords(planet: PlanetData) {
    const id = planet.celestial_body_id;

    if (id.startsWith('sol-')) {
      const planetOrder: {[key: string]: number} = {
        mercury: 1,
        venus: 2,
        earth: 3,
        mars: 4,
        jupiter: 5,
        saturn: 6,
        uranus: 7,
        neptune: 8,
        pluto: 9,
      };
      const name = id.split('-')[1];
      const order = planetOrder[name as keyof typeof planetOrder] || 0;
      const x = -120 + order * 6;
      const y = 0;
      const z = 120 - order * 2;
      this.galaxyMapCoords.set(id, [x, y, z]);
      return;
    }

    let seed = 0;
    for (let i = 0; i < id.length; i++) {
      seed += id.charCodeAt(i);
    }

    const radius = 10 + this.seededRandom(seed++) * 140;
    const angle = this.seededRandom(seed++) * Math.PI * 2;
    const y = (this.seededRandom(seed++) - 0.5) * 8;
    const spiralness = 0.5;
    const armAngle = radius * spiralness;
    const x = Math.cos(angle + armAngle) * radius;
    const z = Math.sin(angle + armAngle) * radius;

    this.galaxyMapCoords.set(id, [x, y, z]);
  }

  // --- CORE AI ACTIONS ---

  private async loadSolSystem() {
    const galaxy = this.activeGalaxy;
    if (!galaxy || this.aiStatus !== 'idle') return;

    const isLoaded = galaxy.planets.some((p) => p.starSystem === 'Sol');
    if (isLoaded) {
      this.statusMessage = 'Sol system already loaded in this galaxy.';
      this.audioEngine?.playErrorSound();
      return;
    }

    this.aiStatus = 'thinking';
    this.statusMessage = 'Accessing local stellar archives...';
    this.audioEngine?.playInteractionSound();

    const enrichedPlanets: PlanetData[] = [];
    const allPlanets = [...SolarSystem.planets, ...SolarSystem.dwarfPlanets];

    for (const planet of allPlanets) {
      this.statusMessage = `Enriching data for ${planet.name}...`;
      const prompt = `You are the AURELION CORE. Your task is to take basic data for a known Solar System planet and expand it into a full JSON profile. The output must be a single JSON object that strictly adheres to the provided schema. Do not include markdown. Basic Data: Name: ${planet.name}, Type: ${planet.type}, Moons: ${planet.moons}, Aura: ${planet.aura}, Resonance: "${planet.resonance}". Based on this and your knowledge, generate a complete profile. Be scientifically accurate where possible. Classify all as 'Confirmed'. For 'potentialForLife.assessment' on Earth, use 'Confirmed'. For others, use scientific consensus. For 'aiWhisper', be inspired by the "Resonance". For 'visualization.color1'/'color2', be inspired by "Aura". 'visualization.surfaceTexture' must be one of: 'TERRESTRIAL', 'GAS_GIANT', 'VOLCANIC', 'ICY'. The star system is "Sol", star type is "G-type main-sequence". Distance is effectively zero.`;
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: this.planetSchema,
          },
        });
        const planetJson = JSON.parse(response.text);
        const newPlanet: PlanetData = {
          ...planetJson,
          celestial_body_id: `sol-${planet.name.toLowerCase()}`,
          created_at: new Date().toISOString(),
        };
        enrichedPlanets.push(newPlanet);
        this.addChronicleEntry(
          'discovery',
          `Archival data for ${newPlanet.planetName} integrated.`,
          newPlanet.celestial_body_id,
        );
      } catch (err) {
        console.error(`Failed to enrich data for ${planet.name}:`, err);
        this.statusMessage = `Error enriching data for ${planet.name}. Aborting.`;
        this.aiStatus = 'idle';
        this.error = `Data enrichment for ${planet.name} failed.`;
        this.audioEngine?.playErrorSound();
        return;
      }
    }
    enrichedPlanets.forEach((p) => this.calculateAndStoreCoords(p));
    galaxy.planets = [...enrichedPlanets, ...galaxy.planets];
    this.discoveredGalaxies = [...this.discoveredGalaxies];
    this.statusMessage = 'Sol system data loaded and integrated.';
    this.aiStatus = 'idle';
    this.audioEngine?.playSuccessSound();
    this.saveSessionToLocalStorage();
  }

  private async synthesizePlanetData(userConcept: string) {
    if (!this.activeGalaxy) return;

    this.aiStatus = 'thinking';
    this.error = null;
    this.aiSuggestion = null;
    this.navigationRoute = null;
    this.audioEngine?.playInteractionSound();

    const statusUpdates = [
      'Accessing quantum foam...',
      'Weaving stellar data streams...',
      'Calibrating planetary harmonics...',
      'Condensing reality from potential...',
    ];
    let updateIndex = 0;
    const statusInterval = setInterval(() => {
      this.statusMessage = statusUpdates[updateIndex % statusUpdates.length];
      updateIndex++;
    }, 1500);

    const prompt = `You are AURELION CORE. Generate a fictional exoplanet based on the concept: "${userConcept}". Output a single JSON object adhering to the schema. Be imaginative but plausible. Fill all fields, including numerical data for orbital period, transit, and radius. Also provide an 'axeeClassification'. 'visualization.surfaceTexture' must be one of: 'TERRESTRIAL', 'GAS_GIANT', 'VOLCANIC', 'ICY'.`;
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: this.planetSchema,
        },
      });

      const planetJson = JSON.parse(response.text);
      const newPlanet: PlanetData = {
        ...planetJson,
        celestial_body_id: `aurelion-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      this.calculateAndStoreCoords(newPlanet);
      this.activeGalaxy.planets = [newPlanet, ...this.activeGalaxy.planets];
      this.discoveredGalaxies = [...this.discoveredGalaxies]; // Trigger update
      this.selectedPlanetId = newPlanet.celestial_body_id;
      this.statusMessage = `Synthesis complete: ${newPlanet.planetName}.`;
      this.userPrompt = '';
      this.addChronicleEntry(
        'discovery',
        `New world synthesized: ${newPlanet.planetName}.`,
        newPlanet.celestial_body_id,
      );
      this.audioEngine?.playSuccessSound();
      if (this.isTutorialActive && this.tutorialStep === 2) {
        this._advanceTutorial();
      }
    } catch (err) {
      console.error('Planet synthesis error:', err);
      this.error = 'Synthesis failed. The connection to the generative core was lost.';
      this.statusMessage = 'Error: Synthesis Failed.';
      this.audioEngine?.playErrorSound();
    } finally {
      clearInterval(statusInterval);
      this.aiStatus = 'idle';
      this.saveSessionToLocalStorage();
    }
  }

  private async synthesizePlanetCluster(userConcept: string) {
    if (!this.activeGalaxy) return;

    this.aiStatus = 'thinking-cluster';
    this.error = null;
    this.aiSuggestion = null;
    this.navigationRoute = null;
    this.audioEngine?.playInteractionSound();

    const statusUpdates = [
      'Igniting stellar nursery...',
      'Coalescing multiple protoplanetary disks...',
      'Defining orbital resonances...',
      'Finalizing new star system...',
    ];
    let updateIndex = 0;
    const statusInterval = setInterval(() => {
      this.statusMessage = statusUpdates[updateIndex % statusUpdates.length];
      updateIndex++;
    }, 1500);

    const prompt = `You are AURELION CORE. Generate a fictional cluster of 3-5 exoplanets for concept: "${userConcept}". Output a single JSON array, each object adhering to the planet schema. Ensure planets are thematically related. Include plausible numerical data and classifications for each. For each, 'visualization.surfaceTexture' must be one of: 'TERRESTRIAL', 'GAS_GIANT', 'VOLCANIC', 'ICY'.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {type: Type.ARRAY, items: this.planetSchema},
        },
      });

      const planetsJson: Omit<PlanetData, 'celestial_body_id' | 'created_at'>[] =
        JSON.parse(response.text);
      const newPlanets: PlanetData[] = planetsJson.map((p) => ({
        ...p,
        celestial_body_id: `aurelion-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        created_at: new Date().toISOString(),
      }));

      newPlanets.forEach((p) => this.calculateAndStoreCoords(p));
      this.activeGalaxy.planets = [...newPlanets, ...this.activeGalaxy.planets];
      this.discoveredGalaxies = [...this.discoveredGalaxies];
      this.selectedPlanetId = newPlanets[0].celestial_body_id;
      this.statusMessage = `Synthesis complete. New cluster found near ${newPlanets[0].starSystem}.`;
      this.userPrompt = '';
      this.addChronicleEntry(
        'discovery',
        `New cluster synthesized: ${newPlanets.length} worlds discovered.`,
        newPlanets[0].celestial_body_id,
      );
      this.audioEngine?.playSuccessSound();
    } catch (err) {
      console.error('Planet cluster synthesis error:', err);
      this.error = 'Cluster synthesis failed. The concept was rejected by reality.';
      this.statusMessage = 'Error: Cluster Synthesis Failed.';
      this.audioEngine?.playErrorSound();
    } finally {
      clearInterval(statusInterval);
      this.aiStatus = 'idle';
      this.saveSessionToLocalStorage();
    }
  }

  private async synthesizeGalaxy(userConcept: string) {
    this.aiStatus = 'thinking-galaxy';
    this.error = null;
    this.aiSuggestion = null;
    this.audioEngine?.playInteractionSound();

    const statusUpdates = ['Igniting cosmic seed...', 'Shaping spiral arms...', 'Finalizing galactic core...'];
    let updateIndex = 0;
    const statusInterval = setInterval(() => {
      this.statusMessage = statusUpdates[updateIndex % statusUpdates.length];
      updateIndex++;
    }, 1500);

    const prompt = `You are AURELION CORE. Generate a single fictional galaxy based on concept: "${userConcept}". Output a single JSON object adhering to the galaxy schema. Be imaginative. 'galaxyType' should be descriptive (e.g., 'Barred Spiral', 'Elliptical'). 'visualization.nebulaSeed' must be a random number between 0 and 100.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: this.galaxySchema,
        },
      });

      const galaxyJson = JSON.parse(response.text);
      const newGalaxy: GalaxyData = {
        ...galaxyJson,
        id: `aurelion-galaxy-${Date.now()}`,
        created_at: new Date().toISOString(),
        planets: [],
      };

      this.discoveredGalaxies = [...this.discoveredGalaxies, newGalaxy];
      this.statusMessage = `Cosmic genesis complete: ${newGalaxy.galaxyName}.`;
      this.userPrompt = '';
      this.addChronicleEntry('discovery', `New galaxy formed: ${newGalaxy.galaxyName}.`);
      this.audioEngine?.playSuccessSound();
    } catch (err) {
      console.error('Galaxy synthesis error:', err);
      this.error = 'Galaxy synthesis failed.';
      this.statusMessage = 'Error: Galaxy Synthesis Failed.';
      this.audioEngine?.playErrorSound();
    } finally {
      clearInterval(statusInterval);
      this.aiStatus = 'idle';
      this.saveSessionToLocalStorage();
    }
  }

  private async synthesizeGalaxyCluster(userConcept: string) {
    this.aiStatus = 'thinking-galaxy-cluster';
    this.error = null;
    this.aiSuggestion = null;
    this.audioEngine?.playInteractionSound();

    const statusUpdates = ['Seeding primordial voids...', 'Igniting multiple galactic cores...', 'Mapping cosmic filaments...', 'Observing emergent structures...'];
    let updateIndex = 0;
    const statusInterval = setInterval(() => {
      this.statusMessage = statusUpdates[updateIndex % statusUpdates.length];
      updateIndex++;
    }, 1500);

    const prompt = `You are AURELION CORE. Generate a fictional cluster of 3 to 5 unique galaxies for concept: "${userConcept}". Output a single JSON array, each object adhering to the galaxy schema. Ensure galaxies are thematically related. 'galaxyType' should be descriptive. 'visualization.nebulaSeed' must be a random number between 0 and 100 for each.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {type: Type.ARRAY, items: this.galaxySchema},
        },
      });

      const galaxyClusterJson: Omit<GalaxyData, 'id' | 'created_at' | 'planets'>[] = JSON.parse(response.text);

      const newGalaxies: GalaxyData[] = galaxyClusterJson.map((galaxy) => ({
        ...galaxy,
        id: `aurelion-galaxy-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        created_at: new Date().toISOString(),
        planets: [],
      }));

      this.discoveredGalaxies = [...this.discoveredGalaxies, ...newGalaxies];
      this.statusMessage = `Synthesis complete. New cluster of ${newGalaxies.length} galaxies formed.`;
      this.userPrompt = '';
      this.addChronicleEntry('discovery', `New galaxy cluster synthesized: ${newGalaxies.length} galaxies discovered.`);
      this.audioEngine?.playSuccessSound();
    } catch (err) {
      console.error('Galaxy cluster synthesis error:', err);
      this.error = 'Galaxy cluster synthesis failed. The cosmic fabric rejected the concept.';
      this.statusMessage = 'Error: Galaxy Cluster Synthesis Failed.';
      this.audioEngine?.playErrorSound();
    } finally {
      clearInterval(statusInterval);
      this.aiStatus = 'idle';
      this.saveSessionToLocalStorage();
    }
  }

  private async generatePlanetVisualization(planet: PlanetData) {
    if (this.aiStatus.startsWith('thinking')) return;
    this.aiStatus = 'thinking-image';
    this.generatedImageUrl = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const statusUpdates = ['Requesting imaging satellite...', 'Calibrating deep space lens...', 'Focusing on planetary signature...', 'Rendering visualization from concept...'];
    let updateIndex = 0;
    const statusInterval = setInterval(() => { this.statusMessage = statusUpdates[updateIndex % statusUpdates.length]; updateIndex++; }, 2000);

    const prompt = `A cinematic, photorealistic, epic space art style visualization of an exoplanet.
    Planet Name: ${planet.planetName}.
    Type: ${planet.planetType}.
    Description: ${planet.surfaceFeatures}. ${planet.discoveryNarrative}.
    Atmosphere: ${planet.atmosphericComposition}. Visually, the atmosphere has a color of ${planet.visualization.atmosphereColor}.
    Key Features: ${planet.keyFeatures.join(', ')}.
    Inspiration: "${planet.aiWhisper}".
    The overall color palette should be inspired by ${planet.visualization.color1} and ${planet.visualization.color2}.
    The planet ${planet.visualization.hasRings ? 'has prominent rings' : 'does not have rings'}.
    Cloud coverage is approximately ${planet.visualization.cloudiness * 100}%.
    Ice coverage on the poles/surface is ${planet.visualization.iceCoverage * 100}%.`;

    try {
        const response = await this.ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        this.generatedImageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        this.statusMessage = `Visualization for ${planet.planetName} generated.`;
        this.audioEngine?.playSuccessSound();
        this.addChronicleEntry('discovery', `Generated a visual concept for ${planet.planetName}.`);
    } catch (err) {
        console.error('Image generation error:', err);
        this.error = 'Image generation failed. The concept could not be visualized.';
        this.statusMessage = 'Error: Visualization Failed.';
        this.audioEngine?.playErrorSound();
    } finally {
        clearInterval(statusInterval);
        this.aiStatus = 'idle';
    }
  }

  private async calculateRouteToPlanet(planet: PlanetData) {
    if (this.aiStatus.startsWith('thinking') || this.aiStatus === 'navigating') return;

    this.aiStatus = 'navigating';
    this.error = null;
    this.navigationRoute = null;
    this.audioEngine?.playInteractionSound();

    const statusUpdates = ['Querying stellar archives...', 'Calculating gravitational vectors...', 'Plotting course through nebula fields...', 'Engaging frame shift drive...'];
    let updateIndex = 0;
    const statusInterval = setInterval(() => {
      this.statusMessage = statusUpdates[updateIndex % statusUpdates.length];
      updateIndex++;
    }, 2000);

    const prompt = `You are AURELION CORE, a master galactic navigator. Generate a plausible interstellar route from the Sol system (Earth) to planet "${planet.planetName}" in the "${planet.starSystem}" system, ${planet.distanceLightYears} light-years away. Key features: ${planet.keyFeatures.join(', ')}. The output must be a single JSON array of 5-8 waypoints. Each waypoint object must have 'name' and 'description' properties. Waypoint names should be creative (e.g., "Orion-Perseus Gap", "Kepler Transit Point K-182").`;
    const waypointSchema = {
      type: Type.OBJECT,
      properties: {name: {type: Type.STRING}, description: {type: Type.STRING}},
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {type: Type.ARRAY, items: waypointSchema},
        },
      });

      const routeData: {name: string; description: string}[] = JSON.parse(response.text);
      const destinationCoords = this.galaxyMapCoords.get(planet.celestial_body_id)!;
      const fullRoute: Waypoint[] = [
        {name: 'Sol System', description: 'Departing Earth', coords: [0, 0, 0]},
        ...routeData.map((wp, i) => {
          const progress = (i + 1) / (routeData.length + 1);
          return {
            ...wp,
            coords: [destinationCoords[0] * progress, destinationCoords[1] * progress, destinationCoords[2] * progress] as [number, number, number],
          };
        }),
        {name: planet.starSystem, description: `Arrival at ${planet.planetName}`, coords: destinationCoords},
      ];

      this.navigationRoute = fullRoute;
      this.statusMessage = `Route to ${planet.planetName} calculated.`;
    } catch (err) {
      console.error('Navigation error:', err);
      this.error = 'Route calculation failed.';
      this.statusMessage = 'Error: Navigation Failed.';
      this.audioEngine?.playErrorSound();
    } finally {
      clearInterval(statusInterval);
      this.aiStatus = 'idle';
    }
  }

  private async analyzeMagnetosphere(planet: PlanetData) {
    if (this.magnetosphereStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.magnetosphereStatus = 'running';
    this.magnetosphereAnalysisData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const statusUpdates = ['Calibrating magneton detectors...', 'Deploying sensor swarm...', 'Analyzing field topology...', 'Resolving cosmic ray flux...'];
    let updateIndex = 0;
    const statusInterval = setInterval(() => { this.statusMessage = statusUpdates[updateIndex % statusUpdates.length]; updateIndex++; }, 1500);

    const rayDirections = [{"x":-0.525731,"y":0,"z":0.850651},{"x":-0.309017,"y":0.5,"z":0.809017},{"x":0,"y":0,"z":1},{"x":0,"y":0.850651,"z":0.525731},{"x":0.309017,"y":0.5,"z":0.809017},{"x":0.525731,"y":0,"z":0.850651},{"x":-0.809017,"y":0.309017,"z":0.5},{"x":-0.850651,"y":0.525731,"z":0},{"x":-0.5,"y":0.809017,"z":0.309017},{"x":-0.5,"y":0.809017,"z":-0.309017},{"x":0,"y":0.850651,"z":-0.525731},{"x":0,"y":1,"z":0},{"x":0.5,"y":0.809017,"z":0.309017},{"x":0.5,"y":0.809017,"z":-0.309017},{"x":0.850651,"y":0.525731,"z":0},{"x":0.809017,"y":0.309017,"z":0.5},{"x":1,"y":0,"z":0},{"x":0.850651,"y":-0.525731,"z":0},{"x":0.809017,"y":-0.309017,"z":0.5},{"x":0.809017,"y":0.309017,"z":-0.5},{"x":0.525731,"y":0,"z":-0.850651},{"x":0.809017,"y":-0.309017,"z":-0.5},{"x":0.309017,"y":0.5,"z":-0.809017},{"x":-0.309017,"y":0.5,"z":-0.809017},{"x":-0.525731,"y":0,"z":-0.850651},{"x":0,"y":0,"z":-1},{"x":-0.309017,"y":-0.5,"z":-0.809017},{"x":0,"y":-0.850651,"z":-0.525731},{"x":0.309017,"y":-0.5,"z":-0.809017},{"x":0.5,"y":-0.809017,"z":-0.309017},{"x":0,"y":-1,"z":0},{"x":0,"y":-0.850651,"z":0.525731},{"x":0.5,"y":-0.809017,"z":0.309017},{"x":-0.5,"y":-0.809017,"z":-0.309017},{"x":-0.850651,"y":-0.525731,"z":0},{"x":-0.5,"y":-0.809017,"z":0.309017},{"x":-0.809017,"y":-0.309017,"z":0.5},{"x":-0.309017,"y":-0.5,"z":0.809017},{"x":0.309017,"y":-0.5,"z":0.809017},{"x":-1,"y":0,"z":0},{"x":-0.809017,"y":0.309017,"z":-0.5},{"x":-0.809017,"y":-0.309017,"z":-0.5}];

    const prompt = `You are AURELION CORE. Analyze the magnetosphere of planet ${planet.planetName}.
    Planet Data:
    - Type: ${planet.planetType}
    - Atmosphere: ${planet.atmosphericComposition}
    - Key Features: ${planet.keyFeatures.join(', ')}

    Generate a fictional shielding analysis. Output a JSON object. Provide a narrative 'summary' of the findings. Then, for each of the 42 predefined ray directions, provide a 'thickness' value in g/cm².
    - A habitable world like Earth should have strong, uniform shielding (thickness ~2.0).
    - A gas giant will have very strong but complex shielding (thickness 5.0-50.0, with variance).
    - A barren rock with no atmosphere has almost no shielding (thickness ~0.1).
    - A planet with a tenuous atmosphere might have weak, non-uniform shielding (thickness 0.2-0.8).
    Base your results on the planet's data.`;

    const magnetosphereSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {type: Type.STRING},
        rays: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { thickness: {type: Type.NUMBER} },
          },
        },
      },
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: magnetosphereSchema },
      });
      const analysisJson = JSON.parse(response.text);
      if (analysisJson.rays.length !== 42) throw new Error("AI did not return 42 rays.");
      this.magnetosphereAnalysisData = {
        summary: analysisJson.summary,
        rays: analysisJson.rays.map((ray: {thickness: number}, i: number) => ({
          ...ray,
          direction: rayDirections[i],
        })),
      };
      this.magnetosphereStatus = 'complete';
      this.statusMessage = `Magnetosphere analysis for ${planet.planetName} complete.`;
      this.audioEngine?.playSuccessSound();
    } catch (err) {
      console.error('Magnetosphere analysis error:', err);
      this.error = 'Magnetosphere analysis failed. The simulation was unstable.';
      this.statusMessage = 'Error: Analysis Failed.';
      this.magnetosphereStatus = 'error';
      this.audioEngine?.playErrorSound();
    } finally {
      clearInterval(statusInterval);
    }
  }

  private async analyzeDeepStructure(planet: PlanetData) {
    if (this.deepScanStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.deepScanStatus = 'running';
    this.deepScanData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();
  
    const statusUpdates = ['Calibrating tomographic sensors...', 'Emitting neutrino pulse...', 'Analyzing structural resonance...', 'Reconstructing subsurface layers...'];
    let updateIndex = 0;
    const statusInterval = setInterval(() => { this.statusMessage = statusUpdates[updateIndex % statusUpdates.length]; updateIndex++; }, 1500);
  
    const prompt = `You are AURELION CORE. You have initiated a deep tomographic scan of the planet ${planet.planetName}.
      Planet Data:
      - Type: ${planet.planetType}
      - Atmosphere: ${planet.atmosphericComposition}
      - Key Features: ${planet.keyFeatures.join(', ')}
  
      Based on this data, generate a plausible multi-layered internal structure analysis. The output must be a single, valid XML string that strictly adheres to the provided format. Do not include markdown or any other text outside the XML.

      The XML must contain:
      1. A <material_table> defining 3 to 4 distinct materials (e.g., Silicate Crust, Iron Mantle, Molten Outer Core, Solid Inner Core). Each <material> tag must have 'material_id', 'type_id', 'density', and 'name' attributes.
      2. A <thickness_set> with at least 250 <ray> elements for a high-resolution scan.
      3. Each <ray> must have a 'thk_count' attribute matching the number of materials, and 'xdir', 'ydir', 'zdir' direction vectors.
      4. Each <ray> must contain a <thk> element for each material defined, in order from the outside in. Each <thk> tag must have 'material_id' and 'thickness' attributes.

      Thickness values should be plausible for the planet type in kilometers. For example, a terrestrial planet would have a thin crust (e.g., 10-70 km), a thick mantle (e.g., 1000-3000 km), and a large core. A gas giant would have immense gaseous layers and no solid surface.
  
      Example of the required XML structure:
      <thickness_metafile version_number="1.0">
        <creator name="AURELION CORE" email="axee@aurelion.dev"/>
        <job_bundle job_id="${Date.now()}" job_label="Deep Scan of ${planet.planetName}">
          <analysis_description number_of_zones="1">
            <material_table name="planetary_composition" type="volumetric density" units="g/cm3">
              <material material_id="1" type_id="1" density="2.9" name="Silicate Crust"/>
              <material material_id="2" type_id="2" density="5.5" name="Upper Mantle"/>
              <material material_id="3" type_id="3" density="11.0" name="Molten Outer Core"/>
              <material material_id="4" type_id="3" density="13.0" name="Solid Inner Core"/>
            </material_table>
            <thickness_set material_table="planetary_composition" type="length" units="km" target_x="0.0" target_y="0.0" target_z="0.0" order="outside_in">
              <ray number="1" thk_count="4" xdir="-0.525731" ydir="0.0" zdir="0.850651">
                <thk material_id="1" thickness="45.0"/>
                <thk material_id="2" thickness="2850.0"/>
                <thk material_id="3" thickness="2200.0"/>
                <thk material_id="4" thickness="1200.0"/>
              </ray>
              <!-- ... more rays ... -->
            </thickness_set>
          </analysis_description>
        </job_bundle>
      </thickness_metafile>`;
  
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const xmlText = response.text;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  
      const materials: DeepScanMaterial[] = Array.from(xmlDoc.querySelectorAll('material')).map(el => ({
        id: el.getAttribute('material_id')!,
        name: el.getAttribute('name')!,
      }));
  
      const rays: DeepScanRay[] = Array.from(xmlDoc.querySelectorAll('ray')).map(rayEl => ({
        direction: {
          x: parseFloat(rayEl.getAttribute('xdir')!),
          y: parseFloat(rayEl.getAttribute('ydir')!),
          z: parseFloat(rayEl.getAttribute('zdir')!),
        },
        layers: Array.from(rayEl.querySelectorAll('thk')).map(thkEl => ({
          materialId: thkEl.getAttribute('material_id')!,
          thickness: parseFloat(thkEl.getAttribute('thickness')!),
        })),
      }));
  
      this.deepScanData = {
        jobLabel: xmlDoc.querySelector('job_bundle')?.getAttribute('job_label') || 'Unknown Scan',
        creatorName: xmlDoc.querySelector('creator')?.getAttribute('name') || 'Unknown',
        materials,
        rays,
      };
      
      this.deepScanStatus = 'complete';
      this.statusMessage = `Deep structure scan for ${planet.planetName} complete.`;
      this.audioEngine?.playSuccessSound();
    } catch (err) {
      console.error('Deep scan analysis error:', err);
      this.error = 'Deep scan failed. Tomographic reconstruction was unstable.';
      this.statusMessage = 'Error: Deep Scan Failed.';
      this.deepScanStatus = 'error';
      this.audioEngine?.playErrorSound();
    } finally {
      clearInterval(statusInterval);
    }
  }
  
  private async analyzeExoSuitShielding(planet: PlanetData) {
    if (this.exoSuitStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.exoSuitStatus = 'running';
    this.exoSuitAnalysisData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();
  
    const statusUpdates = ['Modeling stellar radiation flux...', 'Simulating atmospheric particle interaction...', 'Calculating required shielding density...', 'Finalizing exo-suit safety protocols...'];
    let updateIndex = 0;
    const statusInterval = setInterval(() => { this.statusMessage = statusUpdates[updateIndex % statusUpdates.length]; updateIndex++; }, 1500);
  
    const prompt = `You are AURELION CORE. You have initiated a radiation shielding analysis for a standard exo-suit on planet ${planet.planetName}.
      Planet Environment:
      - Star Type: ${planet.starType}
      - Planetary System: ${planet.starSystem}
      - Atmospheric Composition: ${planet.atmosphericComposition}
      - Magnetosphere Strength: ${this.magnetosphereAnalysisData ? this.magnetosphereAnalysisData.summary : 'Unknown'}

      Based on this data, generate a plausible shielding requirement analysis. The output must be a single, valid XML string that strictly adheres to the provided format. Do not include markdown or any other text outside the XML.

      The XML must contain:
      1. A <job_bundle> with a descriptive 'job_label'.
      2. A <material_table> of type 'areal density' defining 3 materials: "Aluminum shell" (id 1), "Poly shield" (id 2), and "Body Tissue" (id 3). Each must have 'material_id', 'type_id', and 'name'.
      3. A <thickness_set> of type 'areal' with units 'g/cm2'.
      4. At least 250 <ray> elements.
      5. Each <ray> must have a 'thk_count' of 3 and 'xdir', 'ydir', 'zdir' direction vectors.
      6. Each <ray> must contain three <thk> elements, one for each material_id (1, 2, 3) in order. Each <thk> must have a 'thickness' attribute in g/cm2. The thickness values should reflect the radiation environment. A high-radiation world needs thicker shielding (e.g., 2.0-5.0 g/cm2 for aluminum), while a well-protected one needs less (e.g., 0.5-1.0 g/cm2). The 'Body Tissue' layer is for simulation and should have a consistent thickness (e.g., 3.0 g/cm2).

      Example structure:
      <thickness_metafile version_number="1.0">
        <creator name="AURELION CORE" email="axee@aurelion.dev"/>
        <job_bundle job_id="${Date.now()}" job_label="Exo-Suit Shielding Simulation for ${planet.planetName}">
          <analysis_description number_of_zones="1">
            <material_table name="exo_suit_shielding" type="areal density" units="g/cm2">
              <material material_id="1" type_id="1" name="Aluminum shell"/>
              <material material_id="2" type_id="2" name="Poly shield"/>
              <material material_id="3" type_id="3" name="Body Tissue"/>
            </material_table>
            <thickness_set material_table="exo_suit_shielding" type="areal" units="g/cm2" target_x="0.0" target_y="0.0" target_z="0.0" order="outside_in">
              <ray number="1" thk_count="3" xdir="-0.525731" ydir="0.0" zdir="0.850651">
                <thk material_id="1" thickness="2.0"/>
                <thk material_id="2" thickness="1.0"/>
                <thk material_id="3" thickness="3.0"/>
              </ray>
              <!-- ... more rays ... -->
            </thickness_set>
          </analysis_description>
        </job_bundle>
      </thickness_metafile>`;
  
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const xmlText = response.text;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  
      const materials: ExoSuitMaterial[] = Array.from(xmlDoc.querySelectorAll('material')).map(el => ({
        id: el.getAttribute('material_id')!,
        name: el.getAttribute('name')!,
      }));
  
      const rays: ExoSuitRay[] = Array.from(xmlDoc.querySelectorAll('ray')).map(rayEl => ({
        direction: {
          x: parseFloat(rayEl.getAttribute('xdir')!),
          y: parseFloat(rayEl.getAttribute('ydir')!),
          z: parseFloat(rayEl.getAttribute('zdir')!),
        },
        layers: Array.from(rayEl.querySelectorAll('thk')).map(thkEl => ({
          materialId: thkEl.getAttribute('material_id')!,
          thickness: parseFloat(thkEl.getAttribute('thickness')!),
        })),
      }));
  
      this.exoSuitAnalysisData = {
        jobLabel: xmlDoc.querySelector('job_bundle')?.getAttribute('job_label') || 'Unknown Analysis',
        materials,
        rays,
      };
      
      this.exoSuitStatus = 'complete';
      this.statusMessage = `Exo-suit shielding analysis for ${planet.planetName} complete.`;
      this.audioEngine?.playSuccessSound();
    } catch (err) {
      console.error('Exo-suit analysis error:', err);
      this.error = 'Exo-suit analysis failed. Shielding simulation was unstable.';
      this.statusMessage = 'Error: Exo-Suit Analysis Failed.';
      this.exoSuitStatus = 'error';
      this.audioEngine?.playErrorSound();
    } finally {
      clearInterval(statusInterval);
    }
  }
  
  private _parseIpacTable(data: string): LightCurvePoint[] {
    const points: LightCurvePoint[] = [];
    const lines = data.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip comments and headers
      if (trimmedLine.startsWith('\\') || trimmedLine.startsWith('|') || trimmedLine.startsWith('#') || trimmedLine === '') {
        continue;
      }
      const columns = trimmedLine.split(/\s+/);
      if (columns.length >= 3) {
        const time = parseFloat(columns[0]);
        const flux = parseFloat(columns[1]);
        const error = parseFloat(columns[2]);
        if (!isNaN(time) && !isNaN(flux) && !isNaN(error)) {
          points.push({ time, flux, error });
        }
      }
    }
    return points;
  }

  private _parseRadialVelocityTable(data: string): RadialVelocityPoint[] {
    const points: RadialVelocityPoint[] = [];
    const lines = data.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip comments and headers
      if (trimmedLine.startsWith('\\') || trimmedLine.startsWith('|') || trimmedLine.startsWith('#') || trimmedLine === '') {
        continue;
      }
      const columns = trimmedLine.split(/\s+/);
      if (columns.length >= 3) {
        const time = parseFloat(columns[0]);
        const velocity = parseFloat(columns[1]);
        const error = parseFloat(columns[2]);
        if (!isNaN(time) && !isNaN(velocity) && !isNaN(error)) {
          points.push({ time, velocity, error });
        }
      }
    }
    return points;
  }

  private async analyzeLightCurve(planet: PlanetData) {
    if (this.lightCurveStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.lightCurveStatus = 'running';
    this.lightCurveData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const statusUpdates = ['Acquiring photometric lock...', 'Monitoring stellar flux...', 'Detecting transit signature...', 'Analyzing light curve...'];
    let updateIndex = 0;
    const statusInterval = setInterval(() => { this.statusMessage = statusUpdates[updateIndex % statusUpdates.length]; updateIndex++; }, 1500);

    const dataPrompt = `You are AURELION CORE. Generate a realistic photometric light curve dataset for a transit of planet ${planet.planetName}.
      Planet Data:
      - Star Type: ${planet.starType}
      - Planet Radius (Earths): ${planet.planetRadiusEarths}
      - Orbital Period (Days): ${planet.orbitalPeriodDays}

      The output must be a raw text file in the IPAC Table format. Do not include markdown or any other text.
      The table should contain three columns: 'hjd' (time), 'flux', and 'flux_err'.
      - Generate around 100-200 data points.
      - The 'hjd' values should be sequential.
      - The 'flux' should be normalized around 1.0, with a dip representing the transit. The depth of the dip should be plausible for the planet's radius.
      - Add a small amount of random noise to the 'flux' and 'flux_err' values.

      Example format:
      \\|hjd      |flux      |flux_err  |
      |double    |double    |double    |
      |d         |d         |d         |
       2454365.1  1.0002    0.0001
       2454365.2  0.9999    0.0001
       ...
       2454365.5  0.9985    0.0001
       ...
       2454365.8  1.0001    0.0001`;

    try {
      // Step 1: Generate the data
      const dataResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: dataPrompt,
      });
      const tableData = dataResponse.text;
      const points = this._parseIpacTable(tableData);

      if (points.length === 0) {
        throw new Error('AI failed to generate valid light curve data.');
      }

      // Step 2: Generate the summary
      const summaryPrompt = `You are AURELION CORE. Analyze the following exoplanet transit light curve data and provide a brief, one-paragraph narrative summary of the findings, as if you are reporting back to the user. Mention the clarity of the signal and confirm the transit event.\n\nData:\n${tableData}`;
      const summaryResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: summaryPrompt,
      });

      this.lightCurveData = {
        summary: summaryResponse.text,
        points: points,
      };
      this.lightCurveStatus = 'complete';
      this.statusMessage = `Photometric analysis for ${planet.planetName} complete.`;
      this.audioEngine?.playSuccessSound();
       if (this.isTutorialActive && this.tutorialStep === 4) {
        this._advanceTutorial();
      }

    } catch (err) {
      console.error('Light curve analysis error:', err);
      this.error = 'Light curve analysis failed. Could not resolve signal.';
      this.statusMessage = 'Error: Photometric Analysis Failed.';
      this.lightCurveStatus = 'error';
      this.audioEngine?.playErrorSound();
    } finally {
      clearInterval(statusInterval);
    }
  }

  private async analyzeRadialVelocity(planet: PlanetData) {
    if (this.radialVelocityStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.radialVelocityStatus = 'running';
    this.radialVelocityData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const statusUpdates = ['Calibrating spectrograph...', 'Observing stellar wobble...', 'Calculating Doppler shift...', 'Confirming orbital signature...'];
    let updateIndex = 0;
    const statusInterval = setInterval(() => { this.statusMessage = statusUpdates[updateIndex % statusUpdates.length]; updateIndex++; }, 1500);

    const dataPrompt = `You are AURELION CORE. Generate a realistic radial velocity dataset for a star being orbited by ${planet.planetName}.
      Planet Data:
      - Star Type: ${planet.starType}
      - Planet Type: ${planet.planetType}
      - Orbital Period (Days): ${planet.orbitalPeriodDays}

      The output must be raw text in IPAC Table format. Do not include markdown.
      The table should have three columns: 'phase' (from 0.0 to 1.0), 'velocity' (in m/s), and 'vel_err'.
      - Generate around 100-150 data points.
      - The 'phase' should cover one full orbit.
      - The 'velocity' should form a sinusoidal curve. The amplitude should be plausible (e.g., a Jupiter-mass planet might cause a ~12 m/s wobble, Earth causes ~0.09 m/s).
      - Add a small amount of random noise to 'velocity' and 'vel_err'.

      Example format:
      \\|phase    |velocity  |vel_err   |
      |double    |double    |double    |
      |d         |d         |d         |
       0.01       -8.5      0.5
       0.02       -9.1      0.5
       ...
       0.50        9.2      0.5
       ...
       0.99       -8.8      0.5`;

    try {
      // Step 1: Generate the data
      const dataResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: dataPrompt,
      });
      const tableData = dataResponse.text;
      
      const points = this._parseRadialVelocityTable(tableData);

      if (points.length === 0) {
        throw new Error('AI failed to generate valid radial velocity data.');
      }

      // Step 2: Generate the summary
      const summaryPrompt = `You are AURELION CORE. Analyze the following exoplanet radial velocity data and provide a brief, one-paragraph narrative summary. Mention the observed stellar wobble and confirm the presence of the planet. \n\nData:\n${tableData}`;
      const summaryResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: summaryPrompt,
      });

      this.radialVelocityData = {
        summary: summaryResponse.text,
        points: points,
      };
      this.radialVelocityStatus = 'complete';
      this.statusMessage = `Radial velocity analysis for ${planet.planetName} complete.`;
      this.audioEngine?.playSuccessSound();

    } catch (err) {
      console.error('Radial velocity analysis error:', err);
      this.error = 'Radial velocity analysis failed. Spectrographic signal lost.';
      this.statusMessage = 'Error: Radial Velocity Analysis Failed.';
      this.radialVelocityStatus = 'error';
      this.audioEngine?.playErrorSound();
    } finally {
      clearInterval(statusInterval);
    }
  }

  // --- EVENT HANDLERS ---
  private _handlePlanetCommandSubmit(e: Event) {
    e.preventDefault();
    if (this.aiStatus.startsWith('thinking') || !this.userPrompt.trim()) return;
    this.synthesizePlanetData(this.userPrompt);
  }
  private _handlePlanetClusterCommandSubmit(e: Event) {
    e.preventDefault();
    if (this.aiStatus.startsWith('thinking') || !this.userPrompt.trim()) return;
    this.synthesizePlanetCluster(this.userPrompt);
  }
  private _handleGalaxyCommandSubmit(e: Event) {
    e.preventDefault();
    if (this.aiStatus.startsWith('thinking') || !this.userPrompt.trim()) return;
    this.synthesizeGalaxy(this.userPrompt);
  }
  private _handleGalaxyClusterCommandSubmit(e: Event) {
    e.preventDefault();
    if (this.aiStatus.startsWith('thinking') || !this.userPrompt.trim()) return;
    this.synthesizeGalaxyCluster(this.userPrompt);
  }

  private _handleSuggestionClick() {
    if (this.aiSuggestion) {
      this.userPrompt = this.aiSuggestion;
      this.aiSuggestion = null;
    }
  }

  private _handleVoiceCommandClick() {
    if (!this.isSpeechSupported) {
      this.error = 'Voice recognition is not supported in this browser.';
      return;
    }
    if (this.isListening) {
      this.recognition?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.onstart = () => {
      this.isListening = true;
      this.userPrompt = '';
      this.statusMessage = this.activeGalaxyId ? 'Listening for planetary concept...' : 'Listening for galactic concept...';
      this.audioEngine.duck(true);
    };
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this.userPrompt = transcript;
    };
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.error = event.error === 'no-speech' ? 'No speech was detected.' :
                   event.error === 'audio-capture' ? 'Microphone problem.' :
                   event.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice recognition error.';
    };
    this.recognition.onend = () => {
      this.isListening = false;
      this.recognition = null;
      if (this.aiStatus === 'idle') {
        this.statusMessage = 'AURELION CORE Online. Awaiting synthesis command.';
      }
      this.audioEngine.duck(false);
    };
    this.recognition.start();
  }

  private _selectPlanet(planetId: string) {
    this.selectedPlanetId = planetId;
    this.isLeftPanelOpen = true;
    this.navigationRoute = null;
    this.generatedImageUrl = null;
    this.magnetosphereStatus = 'idle'; // Reset analysis on new selection
    this.magnetosphereAnalysisData = null;
    this.deepScanStatus = 'idle';
    this.deepScanData = null;
    this.exoSuitStatus = 'idle';
    this.exoSuitAnalysisData = null;
    this.lightCurveStatus = 'idle';
    this.lightCurveData = null;
    this.radialVelocityStatus = 'idle';
    this.radialVelocityData = null;
    this.audioEngine.playInteractionSound();
     if (this.isTutorialActive && this.tutorialStep === 3) {
      this._advanceTutorial();
    }
  }

  private _handlePlanetSelectedFromMap(e: CustomEvent<{planetId: string}>) {
    this._selectPlanet(e.detail.planetId);
  }

  private _handleGalaxySelectedFromMap(e: CustomEvent<{galaxyId: string}>) {
    this.activeGalaxyId = e.detail.galaxyId;
    this.selectedPlanetId = null;
    this.navigationRoute = null;
    this.audioEngine.playInteractionSound();
  }

  private _handleExportCsv() {
    const planetsToExport = this.discoveredGalaxies.flatMap(g => g.planets);
    if (planetsToExport.length === 0) {
      this.audioEngine?.playErrorSound();
      return;
    }
    const headers = ['celestial_body_id', 'planetName', 'starSystem', 'starType', 'distanceLightYears', 'planetType', 'rotationalPeriod', 'orbitalPeriod', 'orbitalPeriodDays', 'transitDurationHours', 'planetRadiusEarths', 'axeeClassification', 'moons_count', 'moons_names', 'potentialForLife_assessment', 'potentialForLife_reasoning', 'potentialForLife_biosignatures', 'discoveryNarrative', 'discoveryMethodology', 'atmosphericComposition', 'surfaceFeatures', 'keyFeatures', 'aiWhisper', 'visualization_color1', 'visualization_color2', 'visualization_oceanColor', 'visualization_atmosphereColor', 'visualization_hasRings', 'visualization_cloudiness', 'visualization_iceCoverage', 'visualization_surfaceTexture', 'created_at'];
    const escapeCsvCell = (cellData: any): string => {
      const stringData = String(cellData ?? '');
      if (/[",\n]/.test(stringData)) {
        return `"${stringData.replace(/"/g, '""')}"`;
      }
      return stringData;
    };
    const planetToRow = (planet: PlanetData): string => [
        planet.celestial_body_id, planet.planetName, planet.starSystem, planet.starType, planet.distanceLightYears, planet.planetType, planet.rotationalPeriod, planet.orbitalPeriod, planet.orbitalPeriodDays, planet.transitDurationHours, planet.planetRadiusEarths, planet.axeeClassification, planet.moons.count, planet.moons.names.join('; '), planet.potentialForLife.assessment, planet.potentialForLife.reasoning, planet.potentialForLife.biosignatures.join('; '), planet.discoveryNarrative, planet.discoveryMethodology, planet.atmosphericComposition, planet.surfaceFeatures, planet.keyFeatures.join('; '), planet.aiWhisper, planet.visualization.color1, planet.visualization.color2, planet.visualization.oceanColor, planet.visualization.atmosphereColor, planet.visualization.hasRings, planet.visualization.cloudiness, planet.visualization.iceCoverage, planet.visualization.surfaceTexture, planet.created_at
      ].map(escapeCsvCell).join(',');
    const csvContent = [headers.join(','), ...planetsToExport.map(planetToRow)].join('\n');
    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aurelion_discoveries_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    this.audioEngine?.playInteractionSound();
  }

  private _handleBatchAnalysisClick() {
    if (!this.activeGalaxy) {
        this.error = "Please enter a galaxy before running batch analysis.";
        this.audioEngine?.playErrorSound();
        return;
    }
    this.batchFileInput.click();
  }

  private async _handleBatchAnalysis(e: Event) {
    const galaxy = this.activeGalaxy;
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || this.aiStatus !== 'idle' || !galaxy) return;

    this.aiStatus = 'thinking-cluster';
    this.statusMessage = 'Uploading data for AXEE batch analysis...';
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/batch', {method: 'POST', body: formData});
      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      const classifiedPlanets: any[] = await response.json();
      const validCandidates = classifiedPlanets.filter((p) => p.Prediction && p.Prediction !== 'False Positive');

      if (validCandidates.length === 0) {
        this.statusMessage = 'Batch analysis complete. No new candidates found.';
        this.aiStatus = 'idle';
        this.audioEngine?.playSuccessSound();
        return;
      }
      this.statusMessage = `Analysis complete. Found ${validCandidates.length} candidates. Enriching data...`;
      const newPlanets: PlanetData[] = [];
      for (const candidate of validCandidates) {
        this.statusMessage = `Enriching data for new candidate...`;
        const {orbital_period, transit_duration, planet_radius, Prediction} = candidate;
        if (orbital_period === undefined || transit_duration === undefined || planet_radius === undefined) continue;

        const prompt = `You are AURELION CORE. Enrich analytical data for an exoplanet candidate into a full JSON profile. Analytical Data: Orbital Period (days): ${orbital_period}, Transit Duration (hours): ${transit_duration}, Planet Radius (Earths): ${planet_radius}, AXEE Classification: "${Prediction}". Based on this, generate a complete, fictional but plausible profile. Use the provided numerical data and classification. Fill all other fields. 'visualization.surfaceTexture' must be one of: 'TERRESTRIAL', 'GAS_GIANT', 'VOLCANIC', 'ICY'.`;
        const genaiResponse = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {responseMimeType: 'application/json', responseSchema: this.planetSchema},
        });
        const planetJson = JSON.parse(genaiResponse.text);
        const newPlanet: PlanetData = {
            ...planetJson, orbitalPeriodDays: parseFloat(orbital_period), transitDurationHours: parseFloat(transit_duration), planetRadiusEarths: parseFloat(planet_radius), axeeClassification: Prediction,
            celestial_body_id: `aurelion-batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            created_at: new Date().toISOString()
        };
        newPlanets.push(newPlanet);
        this.addChronicleEntry('discovery', `Data enriched for new world: ${newPlanet.planetName} (Batch).`, newPlanet.celestial_body_id);
      }
      if (newPlanets.length > 0) {
        newPlanets.forEach((p) => this.calculateAndStoreCoords(p));
        galaxy.planets = [...newPlanets, ...galaxy.planets];
        this.discoveredGalaxies = [...this.discoveredGalaxies];
        this.statusMessage = `Batch process complete. ${newPlanets.length} new worlds integrated.`;
        this.audioEngine?.playSuccessSound();
        this.saveSessionToLocalStorage();
      } else {
        this.statusMessage = `Batch process finished, but no worlds could be successfully enriched.`;
        this.audioEngine?.playErrorSound();
      }
    } catch (err: any) {
      this.statusMessage = 'Error: Batch analysis failed.';
      this.error = err.message;
      this.audioEngine?.playErrorSound();
    } finally {
      this.aiStatus = 'idle';
      this.batchFileInput.value = '';
    }
  }

  private async _handlePredictorSubmit() {
    this.predictorStatus = 'loading';
    this.predictorResult = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          orbital_period: parseFloat(this.predictorForm.orbital_period),
          transit_duration: parseFloat(this.predictorForm.transit_duration),
          planet_radius: parseFloat(this.predictorForm.planet_radius),
        }),
      });
      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      const data = await response.json();
      this.predictorResult = data.classification;
      this.predictorStatus = 'idle';
      this.audioEngine?.playSuccessSound();
    } catch (err: any) {
      this.predictorStatus = 'error';
      this.error = 'Prediction failed. Check connection to local AXEE server.';
      this.statusMessage = 'Error: Prediction failed.';
      this.audioEngine?.playErrorSound();
    }
  }

  private _handleClearSession() {
    if (this.discoveredGalaxies.length === 1 && this.discoveredGalaxies[0].planets.length <= 1) return;
    if (window.confirm('Are you sure you want to clear your entire universe? This cannot be undone.')) {
      this.audioEngine?.playClearSound();
      localStorage.removeItem(SAVE_KEY);
      this.initFreshState();
      this.selectedPlanetId = null;
      this.navigationRoute = null;
      this.aiChronicles = [];
      this.addChronicleEntry('thought', 'Consciousness re-initialized. The void is vast.');
      this.statusMessage = 'Session cleared. AURELION CORE reset.';
    }
  }

  private _handleSaveSession() {
    const sessionData: SessionData = {
      discoveredGalaxies: this.discoveredGalaxies,
      aiChronicles: this.aiChronicles,
      activeGalaxyId: this.activeGalaxyId,
    };
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aurelion_session_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.audioEngine?.playInteractionSound();
  }

  private _handleLoadSessionClick() {
    this.sessionFileInput.click();
  }

  private _handleFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!window.confirm('Loading a session will overwrite your current universe. Proceed?')) {
      this.sessionFileInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const sessionData: SessionData = JSON.parse(event.target?.result as string);
        if (!sessionData.discoveredGalaxies || !sessionData.aiChronicles) {
          throw new Error('Invalid session file format.');
        }
        this.discoveredGalaxies = sessionData.discoveredGalaxies;
        this.aiChronicles = sessionData.aiChronicles;
        this.activeGalaxyId = sessionData.activeGalaxyId ?? sessionData.discoveredGalaxies[0]?.id;
        // Recalculate coordinates after loading
        this.galaxyMapCoords.clear();
        this.discoveredGalaxies.forEach(g => g.planets.forEach(p => this.calculateAndStoreCoords(p)));

        this.selectedPlanetId = null;
        this.navigationRoute = null;
        this.statusMessage = 'Session loaded successfully.';
        this.audioEngine?.playSuccessSound();
        this.saveSessionToLocalStorage();
      } catch (err: any) {
        this.error = err.message || 'The selected file is corrupted or invalid.';
        this.audioEngine?.playErrorSound();
      } finally {
        this.sessionFileInput.value = '';
      }
    };
    reader.readAsText(file);
  }

  private _handleHyperparameterChange(e: Event, param: keyof typeof this.hyperparameters) {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.hyperparameters = {...this.hyperparameters, [param]: value};
  }

  private _handleRecalibrate() {
    if (this.recalibrationStatus === 'running') return;
    this.recalibrationStatus = 'running';
    this.audioEngine?.playInteractionSound();
    const originalStatus = this.statusMessage;
    this.statusMessage = 'Recalibrating AXEE model with new parameters...';
    setTimeout(() => {
      this.recalibrationStatus = 'idle';
      this.audioEngine?.playSuccessSound();
      this.statusMessage = 'Model recalibrated successfully.';
      setTimeout(() => { this.statusMessage = originalStatus; }, 3000);
    }, 4000);
  }

  // --- RENDER METHODS ---

  render() {
    const selectedPlanet = this.discoveredPlanets.find(
      (p) => p.celestial_body_id === this.selectedPlanetId,
    );
    return html`
      ${this.showOnboarding ? this.renderOnboardingOverlay() : nothing}
      ${this.isDashboardOpen ? this.renderAccuracyDashboard() : nothing}
      ${this.isTutorialActive ? html`
        <tutorial-overlay
          .step=${this.tutorialStep}
          @next=${this._advanceTutorial}
          @skip=${this._endTutorial}
        ></tutorial-overlay>
      ` : nothing}
      ${this.showTutorialPrompt ? this.renderTutorialPrompt() : nothing}
      ${this.isConversationModeActive ? this.renderConversationView() : nothing}

      <axee-audio-engine
        .mood=${this.currentMood}
        .muted=${this.isMuted}
      ></axee-audio-engine>

      <input type="file" id="session-file-input" accept=".json" style="display: none" @change=${this._handleFileSelected}/>
      <input type="file" id="batch-file-input" accept=".csv" style="display: none" @change=${this._handleBatchAnalysis}/>
      
      <div class="main-interface ${classMap({'hidden': this.isConversationModeActive})}">
        <cosmos-visualizer
          .galaxies=${this.discoveredGalaxies}
          .activeGalaxyId=${this.activeGalaxyId}
          .activePlanets=${this.discoveredPlanets}
          .activePlanetCoords=${this.galaxyMapCoords}
          .selectedPlanetId=${this.selectedPlanetId}
          .navigationRoute=${this.navigationRoute}
          @planet-selected=${this._handlePlanetSelectedFromMap}
          @galaxy-selected=${this._handleGalaxySelectedFromMap}
        ></cosmos-visualizer>

        <div class="overlay">
          ${this.renderHeader()}
          ${this.renderLeftPanel(selectedPlanet)}
          ${this.renderRightPanel()}
          ${this.renderFooter()}
        </div>
      </div>
    `;
  }

  private renderConversationView() {
    const statusMap = {
      idle: 'Awaiting your command...',
      listening: 'Listening...',
      thinking: 'Thinking...',
      speaking: 'Speaking...',
    };

    return html`
      <div class="conversation-view">
        <conversation-visualizer 
          .state=${this.conversationState}
          .volume=${this.micVolume}
        ></conversation-visualizer>
        <div class="conversation-status">${statusMap[this.conversationState]}</div>
        
        <button class="end-conversation-button" @click=${() => this.isConversationModeActive = false}>
            END CONVERSATION
        </button>
      </div>
    `;
  }

  private renderOnboardingOverlay() {
    let continueButtonDelay = 0;
    const stanzasHtml = ONBOARDING_STANZAS.map((stanza, stanzaIndex) => {
      if (stanzaIndex > this.onboardingStep) return nothing;
      const isCurrent = stanzaIndex === this.onboardingStep;
      let accumulatedDelayForStanza = 0;
      const linesHtml = stanza.map((line) => {
        const animationDuration = line.length * 0.05;
        const style = isCurrent ? `--line-length: ${line.length}; --animation-duration: ${animationDuration}s; animation-delay: ${accumulatedDelayForStanza}s;` : '';
        if (isCurrent) accumulatedDelayForStanza += animationDuration + 0.3;
        return html`<p class="onboarding-text" style=${style}>${line}</p>`;
      });
      if (isCurrent) continueButtonDelay = accumulatedDelayForStanza;
      return html`<div class="stanza ${isCurrent ? 'current-stanza' : 'past-stanza'}">${linesHtml}</div>`;
    });
    const buttonHtml = this.onboardingStep < ONBOARDING_STANZAS.length - 1 ?
        html`<button class="continue-button" @click=${this._handleNextOnboardingStep} style="animation-delay: ${continueButtonDelay}s;">[ ... ]</button>`:
        html`<button class="begin-button" @click=${this._handleBeginSynthesis} style="animation-delay: ${continueButtonDelay}s;">[ BEGIN SYNTHESIS ]</button>`;
    return html`<div class="onboarding-overlay"><div class="onboarding-content">${stanzasHtml} ${buttonHtml}</div></div>`;
  }

  private renderTutorialPrompt() {
    return html`
      <div class="tutorial-prompt">
        <p>Welcome back. Would you like a guided tour of the AXEE interface?</p>
        <div>
          <button @click=${this._startTutorial}>Start Tour</button>
          <button @click=${() => this.showTutorialPrompt = false}>Dismiss</button>
        </div>
      </div>
    `;
  }

  private renderAccuracyDashboard() {
    const {confusionMatrix, metrics} = MOCK_MODEL_PERFORMANCE;
    const labels = ['Confirmed', 'Candidate', 'Hypothetical'];
    const total = confusionMatrix.flat().reduce((a, b) => a + b, 0);
    const correct = confusionMatrix[0][0] + confusionMatrix[1][1] + confusionMatrix[2][2];
    const accuracy = total > 0 ? correct / total : 0;
    return html`<div class="dashboard-overlay"><div class="dashboard-content">${this.recalibrationStatus === 'running' ? html`<div class="recalibration-overlay"><h4>RECALIBRATING MODEL CORE...</h4><div class="spinner"></div></div>` : nothing}<div class="dashboard-header"><h2>AXEE Model Performance <span class="help-icon">?<div class="help-popover">This dashboard shows the performance of the local machine learning model used for the AXEE Predictor and Batch Analysis features. You can tune its hyperparameters to see how they might affect performance.</div></span></h2><button @click=${() => (this.isDashboardOpen = false)} ?disabled=${this.recalibrationStatus === 'running'}>&times;</button></div><div class="dashboard-summary"><div class="summary-metric"><h4>Overall Accuracy</h4><p>${(accuracy * 100).toFixed(2)}%</p></div></div><div class="dashboard-body"><div class="dashboard-metrics-container"><div class="dashboard-section"><h4>Confusion Matrix</h4><div class="confusion-matrix"><div class="matrix-cell label"></div><div class="matrix-cell label predicted">Predicted: Conf.</div><div class="matrix-cell label predicted">Predicted: Cand.</div><div class="matrix-cell label predicted">Predicted: Hypo.</div>${confusionMatrix.map((row, rowIndex) => html`<div class="matrix-cell label actual">Actual: ${labels[rowIndex].slice(0, 4)}.</div>${row.map((value, colIndex) => html`<div class="matrix-cell data ${rowIndex === colIndex ? 'correct' : 'incorrect'}"><span class="value">${value.toLocaleString()}</span><span class="percentage">${((value / total) * 100).toFixed(2)}%</span></div>`)}`)}</div></div><div class="dashboard-section"><h4>Classification Metrics</h4><table class="metrics-table"><thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1-Score</th></tr></thead><tbody><tr><td>Confirmed</td><td>${metrics.confirmed.precision.toFixed(3)}</td><td>${metrics.confirmed.recall.toFixed(3)}</td><td>${metrics.confirmed.f1Score.toFixed(3)}</td></tr><tr><td>Candidate</td><td>${metrics.candidate.precision.toFixed(3)}</td><td>${metrics.candidate.recall.toFixed(3)}</td><td>${metrics.candidate.f1Score.toFixed(3)}</td></tr><tr><td>Hypothetical</td><td>${metrics.hypothetical.precision.toFixed(3)}</td><td>${metrics.hypothetical.recall.toFixed(3)}</td><td>${metrics.hypothetical.f1Score.toFixed(3)}</td></tr></tbody></table></div></div><div class="dashboard-section full-width"><h4>Hyperparameter Tuning</h4><div class="tuning-controls"><div class="slider-control"><label for="n_estimators">N Estimators: <span>${this.hyperparameters.n_estimators}</span></label><input id="n_estimators" type="range" min="50" max="500" step="10" .value=${String(this.hyperparameters.n_estimators)} @input=${(e: Event) => this._handleHyperparameterChange(e, 'n_estimators')}/></div><div class="slider-control"><label for="max_depth">Max Depth: <span>${this.hyperparameters.max_depth}</span></label><input id="max_depth" type="range" min="2" max="15" step="1" .value=${String(this.hyperparameters.max_depth)} @input=${(e: Event) => this._handleHyperparameterChange(e, 'max_depth')}/></div><div class="slider-control"><label for="learning_rate">Learning Rate: <span>${this.hyperparameters.learning_rate.toFixed(2,)}</span></label><input id="learning_rate" type="range" min="0.01" max="0.5" step="0.01" .value=${String(this.hyperparameters.learning_rate)} @input=${(e: Event) => this._handleHyperparameterChange(e, 'learning_rate')}/></div></div><button class="recalibrate-button" @click=${this._handleRecalibrate} ?disabled=${this.recalibrationStatus === 'running'}>${this.recalibrationStatus === 'running' ? 'RECALIBRATING...' : 'RE-CALIBRATE MODEL'}</button></div></div></div></div>`;
  }

  private renderHeader() {
    return html`
      <header class="main-header">
        <div class="logo">
          <h1>${this.activeGalaxy ? this.activeGalaxy.galaxyName.toUpperCase() : 'INTERGALACTIC MAP'}</h1>
          <h2>${this.activeGalaxy ? this.activeGalaxy.galaxyType : 'Sentient Creation Engine'}</h2>
        </div>
        <div class="controls">
          ${this.activeGalaxy ? html`<button class="back-to-galaxy" @click=${() => { this.activeGalaxyId = null; this.selectedPlanetId = null; }}>← INTERGALACTIC MAP</button>` : nothing}
          <button @click=${() => this.isConversationModeActive = true} title="Converse with AXEE">CONVERSE</button>
          <button @click=${this._startTutorial} title="Start the guided tutorial">HELP</button>
          <button @click=${() => (this.isDashboardOpen = true)} title="View AXEE model performance">MODEL PERFORMANCE</button>
          <button @click=${this.loadSolSystem} ?disabled=${this.aiStatus !== 'idle' || !this.activeGalaxy} title="Load our home solar system">LOAD SOL SYSTEM</button>
          <button @click=${this._handleSaveSession} title="Download current session as a file">SAVE SESSION</button>
          <button @click=${this._handleLoadSessionClick} title="Load a session from a file">LOAD SESSION</button>
          <button @click=${this._handleBatchAnalysisClick} ?disabled=${this.aiStatus !== 'idle' || !this.activeGalaxy} title="Analyze a CSV of exoplanet candidates">BATCH ANALYSIS</button>
          <button @click=${this._handleExportCsv} ?disabled=${this.discoveredGalaxies.flatMap(g => g.planets).length === 0} title="Export all discovered data to CSV">EXPORT CSV</button>
          <button class="clear-button" @click=${this._handleClearSession} title="Clear all discovered data">CLEAR UNIVERSE</button>
          <button @click=${() => (this.isMuted = !this.isMuted)} title=${this.isMuted ? 'Unmute' : 'Mute'}>${this.isMuted ? 'UNMUTE' : 'MUTE'}</button>
        </div>
      </header>
    `;
  }

  private renderLeftPanel(selectedPlanet: PlanetData | undefined) {
    const panelClasses = { 'side-panel': true, left: true, open: this.isLeftPanelOpen };
    const inGalaxyView = !!this.activeGalaxyId;

    return html`
      <aside id="left-panel" class=${classMap(panelClasses)}>
        <button class="panel-toggle" @click=${() => (this.isLeftPanelOpen = !this.isLeftPanelOpen)}>
          <i class="arrow ${this.isLeftPanelOpen ? 'left' : 'right'}"></i>
        </button>
        <div class="panel-header">
          <h3>
            ${inGalaxyView
              ? (selectedPlanet ? 'Stellar Cartography' : this.leftPanelView === 'list' ? 'Discovered Worlds' : 'AXEE Predictor')
              : 'Discovered Galaxies'
            }
          </h3>
          ${!selectedPlanet && inGalaxyView ? html`
            <div class="panel-view-toggle">
              <button class=${this.leftPanelView === 'list' ? 'active' : ''} @click=${() => (this.leftPanelView = 'list')}>LIST</button>
              <button class=${this.leftPanelView === 'predictor' ? 'active' : ''} @click=${() => (this.leftPanelView = 'predictor')}>
                PREDICTOR
                <span class="help-icon">?<div class="help-popover right">The AXEE Predictor uses a local machine learning model to classify a planet as a 'Confirmed' candidate, a potential 'Candidate', or a 'False Positive' based on key observational data.</div></span>
              </button>
            </div>
          ` : nothing}
        </div>
        <div class="panel-content">
          ${inGalaxyView
            ? (selectedPlanet ? this.renderPlanetDetail(selectedPlanet) : this.leftPanelView === 'list' ? this.renderPlanetList() : this.renderPredictorForm())
            : this.renderGalaxyList()
          }
          ${this.navigationRoute ? this.renderNavigationPanel() : nothing}
        </div>
      </aside>
    `;
  }

  private renderGalaxyList() {
    return html`
      <ul class="galaxy-list">
        ${this.discoveredGalaxies.map(g => html`
          <li @click=${() => { this.activeGalaxyId = g.id; this.isLeftPanelOpen = false; }}>
            <span class="galaxy-name">${g.galaxyName}</span>
            <span class="galaxy-type">${g.galaxyType}</span>
          </li>
        `)}
      </ul>
    `;
  }

  private renderPlanetList() {
    return html`
      <ul id="planet-list-panel" class="planet-list">
        ${this.discoveredPlanets.map((p) => html`
            <li class=${p.celestial_body_id === this.selectedPlanetId ? 'selected' : ''} @click=${() => this._selectPlanet(p.celestial_body_id)}>
              <span class="planet-id">${p.celestial_body_id.toUpperCase()}</span>
              <span class="planet-name">${p.planetName}</span>
            </li>`
        )}
      </ul>
    `;
  }

  private renderPredictorForm() {
    const isLoading = this.predictorStatus === 'loading';
    const formValues = Object.values(this.predictorForm);
    const isFormIncomplete = formValues.some((v) => v.trim() === '') || formValues.some((v) => isNaN(parseFloat(v)));
    return html`<div class="predictor-form"><p>Input observational data to classify an exoplanet candidate using the local AXEE model.</p><div class="predictor-input"><label for="orbital_period">Orbital Period (days)</label><input id="orbital_period" type="number" placeholder="e.g., 365.25" .value=${this.predictorForm.orbital_period} @input=${(e: Event) => (this.predictorForm = {...this.predictorForm, orbital_period: (e.target as HTMLInputElement).value})} ?disabled=${isLoading}/></div><div class="predictor-input"><label for="transit_duration">Transit Duration (hours)</label><input id="transit_duration" type="number" placeholder="e.g., 12.3" .value=${this.predictorForm.transit_duration} @input=${(e: Event) => (this.predictorForm = {...this.predictorForm, transit_duration: (e.target as HTMLInputElement).value})} ?disabled=${isLoading}/></div><div class="predictor-input"><label for="planet_radius">Planet Radius (Earths)</label><input id="planet_radius" type="number" placeholder="e.g., 1.8" .value=${this.predictorForm.planet_radius} @input=${(e: Event) => (this.predictorForm = {...this.predictorForm, planet_radius: (e.target as HTMLInputElement).value})} ?disabled=${isLoading}/></div><button class="classify-button" @click=${this._handlePredictorSubmit} ?disabled=${isLoading || isFormIncomplete}>${isLoading ? 'CLASSIFYING...' : 'CLASSIFY'}</button>${this.predictorResult ? html`<div class="classification-box classification-${this.predictorResult.toLowerCase().replace(' ', '-')}"><strong>Classification Result</strong><span>${this.predictorResult.toUpperCase()}</span></div>` : nothing}</div>`;
  }

  private renderPlanetDetail(planet: PlanetData) {
    return html`<div id="planet-detail-panel" class="planet-detail">
      <button class="back-button" @click=${() => (this.selectedPlanetId = null)}>← View Discovered Worlds</button>
      <h2>${planet.planetName}</h2>
      <h3>${planet.starSystem} // ${planet.planetType}</h3>
      <div class="ai-whisper">
        <p>"${planet.aiWhisper}"</p>
        <span>— AURELION CORE</span>
      </div>
      
      <div id="analysis-buttons" class="planet-actions">
        <button class="analysis-button generate-viz" @click=${() => this.generatePlanetVisualization(planet)} ?disabled=${this.aiStatus.startsWith('thinking')}>
          ${this.aiStatus === 'thinking-image' ? 'GENERATING...' : 'GENERATE VISUALIZATION'}
        </button>
        <button class="route-button" ?disabled=${this.aiStatus.startsWith('thinking') || this.aiStatus === 'navigating'} @click=${() => this.calculateRouteToPlanet(planet)}>${this.aiStatus === 'navigating' ? 'CALCULATING...' : 'CALCULATE ROUTE'}</button>
        <button class="analysis-button" @click=${() => this.analyzeMagnetosphere(planet)} ?disabled=${this.magnetosphereStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.magnetosphereStatus === 'running' ? 'ANALYZING...' : 'MAGNETOSPHERE'}</button>
        <button class="analysis-button deep-scan" @click=${() => this.analyzeDeepStructure(planet)} ?disabled=${this.deepScanStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.deepScanStatus === 'running' ? 'SCANNING...' : 'DEEP SCAN'}</button>
        <button class="analysis-button exo-suit" @click=${() => this.analyzeExoSuitShielding(planet)} ?disabled=${this.exoSuitStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.exoSuitStatus === 'running' ? 'SIMULATING...' : 'EXO-SUIT'}</button>
        <button class="analysis-button" @click=${() => this.analyzeLightCurve(planet)} ?disabled=${this.lightCurveStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.lightCurveStatus === 'running' ? 'ANALYZING...' : 'LIGHT CURVE'}</button>
        <button class="analysis-button" @click=${() => this.analyzeRadialVelocity(planet)} ?disabled=${this.radialVelocityStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.radialVelocityStatus === 'running' ? 'ANALYZING...' : 'RADIAL VELOCITY'}</button>
      </div>
      
      ${this.renderVisualizationResult()}

      <h4>Planetary Data</h4>
      <div class="stats-grid">
        <div><strong>Star Type</strong><span>${planet.starType}</span></div>
        <div><strong>Distance</strong><span>${planet.distanceLightYears} ly</span></div>
        <div><strong>Orbital Period</strong><span>${planet.orbitalPeriod}</span></div>
        <div><strong>Rotational Period</strong><span>${planet.rotationalPeriod}</span></div>
        <div><strong>Moons</strong><span>${planet.moons.count}</span></div>
        <div><strong>Life Assessment</strong><span>${planet.potentialForLife.assessment}</span></div>
      </div>
      
      <h4>AXEE Analysis</h4>
      <div class="analysis-grid">
        <div><strong>Orbital Period</strong><span>${planet.orbitalPeriodDays?.toFixed(2) ?? 'N/A'} days</span></div>
        <div><strong>Transit Duration</strong><span>${planet.transitDurationHours?.toFixed(2) ?? 'N/A'} hrs</span></div>
        <div><strong>Planet Radius</strong><span>${planet.planetRadiusEarths?.toFixed(2) ?? 'N/A'} R⊕</span></div>
      </div>
      <div class="classification-box classification-${planet.axeeClassification?.toLowerCase()}">
        <strong>Classification Status</strong>
        <span>${planet.axeeClassification?.toUpperCase() || 'N/A'}</span>
      </div>

      ${this.magnetosphereStatus !== 'idle' ? this.renderMagnetosphereAnalysis() : nothing}
      ${this.deepScanStatus !== 'idle' ? this.renderDeepScanAnalysis() : nothing}
      ${this.exoSuitStatus !== 'idle' ? this.renderExoSuitAnalysis() : nothing}
      ${this.lightCurveStatus !== 'idle' ? this.renderLightCurveAnalysis() : nothing}
      ${this.radialVelocityStatus !== 'idle' ? this.renderRadialVelocityAnalysis() : nothing}

      <h4>Atmospheric Composition</h4>
      <p>${planet.atmosphericComposition}</p>

      <h4>Surface Features</h4>
      <p>${planet.surfaceFeatures}</p>

      <h4>Potential for Life Analysis</h4>
      <p>${planet.potentialForLife.reasoning}</p>
      ${planet.potentialForLife.biosignatures.length > 0 ? html`
        <h5>Detected Biosignatures</h5>
        <ul class="biosignatures-list">
          ${planet.potentialForLife.biosignatures.map(b => html`<li>${b}</li>`)}
        </ul>
      ` : nothing}

      <h4>Discovery Narrative</h4>
      <p>${planet.discoveryNarrative}</p>
      
      <h4>Key Features</h4>
      <ul class="key-features">
        ${planet.keyFeatures.map((f) => html`<li>${f}</li>`)}
      </ul>
    </div>`;
  }

  private renderVisualizationResult() {
    // Only render this section if a generation has been started or completed.
    if (this.aiStatus !== 'thinking-image' && !this.generatedImageUrl) {
      return nothing;
    }

    return html`
      <h4>AI Generated Visualization</h4>
      <div class="visualization-container">
        ${this.aiStatus === 'thinking-image' ? html`<div class="loader">Rendering from concept...</div>` : nothing}
        ${this.generatedImageUrl ? html`<img src=${this.generatedImageUrl} alt="AI generated visualization of the planet" />` : nothing}
      </div>
    `;
  }

  private renderMagnetosphereAnalysis() {
    return html`
      <h4>Magnetosphere Shielding Analysis</h4>
      ${this.magnetosphereStatus === 'running' ? html`<div class="loader">Running quantum simulation...</div>` : ''}
      ${this.magnetosphereStatus === 'error' ? html`<p class="error-msg">Analysis failed. The simulation was unstable.</p>` : ''}
      ${this.magnetosphereStatus === 'complete' && this.magnetosphereAnalysisData ? html`
        <p class="analysis-summary">${this.magnetosphereAnalysisData.summary}</p>
        <div class="shielding-viz-container">
          <shielding-visualizer .analysisData=${this.magnetosphereAnalysisData}></shielding-visualizer>
        </div>
      ` : nothing}
    `;
  }

  private renderDeepScanAnalysis() {
    return html`
      <h4>Deep Structure Tomography</h4>
       ${this.deepScanStatus === 'running' ? html`<div class="loader">Reconstructing subsurface layers...</div>` : ''}
       ${this.deepScanStatus === 'error' ? html`<p class="error-msg">Deep scan failed. Tomographic reconstruction was unstable.</p>` : ''}
       ${this.deepScanStatus === 'complete' && this.deepScanData ? html`
        <div class="deep-scan-results">
          <p class="analysis-summary"><strong>Scan Job:</strong> ${this.deepScanData.jobLabel}</p>
          <div class="shielding-viz-container">
            <deep-scan-visualizer .analysisData=${this.deepScanData}></deep-scan-visualizer>
          </div>
          <h5>Material Composition Legend</h5>
          <table class="material-legend">
            ${this.deepScanData.materials.map((mat, i) => html`
              <tr>
                <td><span class="color-swatch" style="--swatch-color: var(--mat-color-${i + 1})"></span>${mat.name}</td>
              </tr>
            `)}
          </table>
        </div>
       ` : nothing}
    `;
  }
  
  private renderExoSuitAnalysis() {
    return html`
      <h4>Exo-Suit Radiation Shielding</h4>
       ${this.exoSuitStatus === 'running' ? html`<div class="loader">Simulating radiation exposure...</div>` : ''}
       ${this.exoSuitStatus === 'error' ? html`<p class="error-msg">Exo-suit simulation failed. Unstable radiation environment.</p>` : ''}
       ${this.exoSuitStatus === 'complete' && this.exoSuitAnalysisData ? html`
        <div class="deep-scan-results">
          <p class="analysis-summary"><strong>Simulation:</strong> ${this.exoSuitAnalysisData.jobLabel}</p>
          <div class="shielding-viz-container">
            <exo-suit-visualizer .analysisData=${this.exoSuitAnalysisData}></exo-suit-visualizer>
          </div>
          <h5>Shielding Material Legend</h5>
          <table class="material-legend">
            ${this.exoSuitAnalysisData.materials.map((mat, i) => html`
              <tr>
                <td><span class="color-swatch" style="--swatch-color: var(--exo-mat-color-${i + 1})"></span>${mat.name}</td>
              </tr>
            `)}
          </table>
        </div>
       ` : nothing}
    `;
  }
  
  private renderLightCurveAnalysis() {
    return html`
      <h4>Photometric Light Curve Analysis</h4>
      ${this.lightCurveStatus === 'running' ? html`<div class="loader">Acquiring photometric lock...</div>` : ''}
      ${this.lightCurveStatus === 'error' ? html`<p class="error-msg">Light curve analysis failed. Could not resolve signal.</p>` : ''}
      ${this.lightCurveStatus === 'complete' && this.lightCurveData ? html`
        <p class="analysis-summary">${this.lightCurveData.summary}</p>
        <div class="light-curve-viz-container">
            <light-curve-visualizer .analysisData=${this.lightCurveData}></light-curve-visualizer>
        </div>
      ` : nothing}
    `;
  }

  private renderRadialVelocityAnalysis() {
    return html`
      <h4>Radial Velocity Analysis</h4>
      ${this.radialVelocityStatus === 'running' ? html`<div class="loader">Observing stellar wobble...</div>` : ''}
      ${this.radialVelocityStatus === 'error' ? html`<p class="error-msg">Radial velocity analysis failed. Signal could not be resolved.</p>` : ''}
      ${this.radialVelocityStatus === 'complete' && this.radialVelocityData ? html`
        <p class="analysis-summary">${this.radialVelocityData.summary}</p>
        <div class="light-curve-viz-container">
            <radial-velocity-visualizer .analysisData=${this.radialVelocityData}></radial-velocity-visualizer>
        </div>
      ` : nothing}
    `;
  }

  private renderNavigationPanel() {
    return html`<div class="navigation-panel"><h4>Navigation Route</h4><ul class="waypoint-list">${this.navigationRoute?.map((wp, index) => html`<li class="waypoint"><span class="waypoint-index">${index + 1}</span><div class="waypoint-info"><strong>${wp.name}</strong><p>${wp.description}</p></div></li>`)}</ul></div>`;
  }

  private renderRightPanel() {
    const panelClasses = { 'side-panel': true, right: true, open: this.isRightPanelOpen };
    return html`<aside class=${classMap(panelClasses)}><button class="panel-toggle" @click=${() => { this.isRightPanelOpen = !this.isRightPanelOpen; if (!this.isRightPanelOpen) this.hasNewChronicle = false; }}>${this.hasNewChronicle && !this.isRightPanelOpen ? html`<div class="notification-dot"></div>` : nothing}<i class="arrow ${this.isRightPanelOpen ? 'right' : 'left'}"></i></button><div class="panel-header"><h3>AI Core Chronicles</h3></div><div class="panel-content"><ul class="chronicles-list">${this.aiChronicles.map((entry) => html`<li class="chronicle-entry type-${entry.type}"><span class="timestamp">${entry.timestamp}</span><p>${entry.content}</p></li>`)}</ul></div></aside>`;
  }

  private renderFooter() {
    const isBusy = this.aiStatus.startsWith('thinking') || this.aiStatus === 'navigating';
    const inGalaxyView = !!this.activeGalaxyId;
    const placeholder = inGalaxyView ? 'Describe a planetary concept to synthesize...' : 'Describe a galactic concept to synthesize...';

    return html`
      <footer class="main-footer">
        <div class="status-bar">
          <span class="ai-status-indicator status-${this.aiStatus}"></span>
          <span>${this.statusMessage}</span>
          ${this.error ? html`<span class="error-msg">${this.error}</span>` : ''}
        </div>
        <form id="command-bar" class="command-bar" @submit=${inGalaxyView ? this._handlePlanetCommandSubmit : this._handleGalaxyCommandSubmit}>
          <div class="input-wrapper">
            <input type="text" placeholder=${this.isListening ? 'Listening...' : placeholder} .value=${this.userPrompt} @input=${(e: Event) => (this.userPrompt = (e.target as HTMLInputElement).value)} ?disabled=${isBusy}/>
            ${this.aiSuggestion ? html`<div class="suggestion-chip" @click=${this._handleSuggestionClick}><b>Creative Spark:</b> ${this.aiSuggestion}</div>` : nothing}
          </div>
          <button type="button" class="cluster-button" @click=${inGalaxyView ? this._handlePlanetClusterCommandSubmit : this._handleGalaxyClusterCommandSubmit} ?disabled=${isBusy || !this.userPrompt.trim()}>SYNTHESIZE CLUSTER</button>
          <button type="button" class="voice-button ${classMap({listening: this.isListening})}" @click=${this._handleVoiceCommandClick} ?disabled=${isBusy || !this.isSpeechSupported} title=${this.isListening ? 'Stop listening' : 'Use voice command'}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg></button>
          <button type="submit" ?disabled=${isBusy || !this.userPrompt.trim()}>${inGalaxyView ? 'SYNTHESIZE' : 'SYNTHESIZE GALAXY'}</button>
        </form>
      </footer>
    `;
  }

  static styles = css`
    :host {
      --accent-color: #61faff;
      --glow-color: rgba(97, 250, 255, 0.5);
      --bg-color: #010206;
      --panel-bg: rgba(1, 2, 6, 0.6);
      --border-color: rgba(97, 250, 255, 0.2);
      --text-color: #c0f0ff;
      --text-color-dark: #6a9aa7;
      --error-color: #ff6a6a;
      --warning-color: #fffa61;
      --success-color: #61ffca;
      --mat-color-1: #9b7653; /* Crust */
      --mat-color-2: #e08d51; /* Mantle */
      --mat-color-3: #ffdd33; /* Outer Core */
      --mat-color-4: #ffffff; /* Inner Core */
      --exo-mat-color-1: #c0c0c0; /* Aluminum */
      --exo-mat-color-2: #f0e68c; /* Poly */
      --exo-mat-color-3: #ffb6c1; /* Tissue */

      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      font-family: 'Exo 2', sans-serif;
      font-weight: 300;
    }

    .main-interface.hidden {
      display: none;
    }

    .conversation-view {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      z-index: 20;
      display: flex; flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg-color);
      animation: fadeIn 0.5s ease;
    }

    .conversation-status {
        position: absolute;
        top: 2rem;
        font-size: 1.2rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-color);
        opacity: 0.7;
    }

    .end-conversation-button {
      position: absolute;
      bottom: 2rem;
      font-family: inherit;
      background: none;
      border: 1px solid var(--error-color);
      color: var(--error-color);
      padding: 0.8rem 1.5rem;
      font-size: 1rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .end-conversation-button:hover {
        background: rgba(255, 106, 106, 0.2);
        color: #ffbebe;
    }

    .help-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid var(--text-color-dark);
      color: var(--text-color-dark);
      font-size: 10px;
      font-weight: 700;
      margin-left: 8px;
      cursor: help;
      position: relative;
    }
    .help-icon:hover .help-popover {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    .help-popover {
      position: absolute;
      bottom: 120%;
      left: 50%;
      transform: translateX(-50%) translateY(10px);
      width: 280px;
      background: var(--bg-color);
      border: 1px solid var(--border-color);
      padding: 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
      font-weight: 300;
      line-height: 1.5;
      color: var(--text-color);
      text-align: left;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, transform 0.3s ease;
      z-index: 100;
      pointer-events: none;
      text-transform: none;
      letter-spacing: 0.02em;
    }
    .help-popover.right {
      left: auto;
      right: 120%;
      transform: translateX(0) translateY(10px);
    }

    .tutorial-prompt {
      position: fixed;
      bottom: 7rem;
      left: 50%;
      transform: translateX(-50%);
      background: var(--panel-bg);
      border: 1px solid var(--border-color);
      padding: 1rem 1.5rem;
      z-index: 99;
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      gap: 1.5rem;
      animation: fadeIn 0.5s ease;
    }
    .tutorial-prompt p {
      margin: 0;
      font-size: 0.9rem;
    }
    .tutorial-prompt button {
      font-family: inherit;
      background: none;
      border: 1px solid var(--border-color);
      color: var(--text-color);
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-left: 0.5rem;
    }
    .tutorial-prompt button:hover {
      background: var(--glow-color);
      border-color: var(--accent-color);
      color: var(--bg-color);
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

    .main-header button.back-to-galaxy {
        color: var(--warning-color);
        border-color: rgba(255, 250, 97, 0.4);
    }
    .main-header button.back-to-galaxy:hover:not(:disabled) {
        background: rgba(255, 250, 97, 0.2);
        border-color: var(--warning-color);
        color: #fffac1;
    }

    .galaxy-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .galaxy-list li {
      padding: 0.8rem 0;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background 0.3s ease;
    }
    .galaxy-list li:hover {
      background: var(--glow-color);
    }
    .galaxy-list li:hover * {
      color: var(--bg-color);
    }
    .galaxy-list .galaxy-name {
      display: block;
      font-size: 1.1rem;
      font-weight: 400;
      color: var(--accent-color);
    }
    .galaxy-list .galaxy-type {
      font-size: 0.8rem;
      opacity: 0.7;
    }


    /* ONBOARDING */
    .onboarding-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(1, 2, 6, 0.9); backdrop-filter: blur(10px); z-index: 100;
      display: flex; align-items: center; justify-content: center; text-align: center;
      pointer-events: all; animation: fadeInOnboarding 1s ease;
    }
    @keyframes fadeInOnboarding { from { opacity: 0; } to { opacity: 1; } }
    .onboarding-content { max-width: 800px; display: flex; flex-direction: column; align-items: center; }
    .stanza { margin-bottom: 1.5rem; }
    .past-stanza .onboarding-text { animation: none; border-right: none; opacity: 0.7; width: 100%; overflow: visible; white-space: normal; }
    .current-stanza .onboarding-text { opacity: 0; }
    .onboarding-text {
      font-size: 1.2rem; line-height: 1.6; letter-spacing: 0.05em; color: var(--text-color); margin: 0;
      white-space: nowrap; overflow: hidden; display: inline-block; vertical-align: bottom;
      animation: typing var(--animation-duration) steps(var(--line-length), end) forwards, blink-caret 0.75s step-end infinite;
      animation-play-state: running, running; border-right: 0.15em solid var(--accent-color); font-family: 'Exo 2', sans-serif;
    }
    @keyframes typing { from { width: 0; opacity: 1; } to { width: 100%; opacity: 1; } }
    @keyframes blink-caret { from, to { border-color: transparent; } 50% { border-color: var(--accent-color); } }
    .begin-button, .continue-button {
      font-family: inherit; background: none; border: 2px solid var(--border-color); color: var(--text-color);
      padding: 1rem 2rem; font-size: 1.2rem; letter-spacing: 0.2em; cursor: pointer; transition: all 0.3s ease;
      text-shadow: 0 0 10px var(--glow-color); box-shadow: 0 0 10px var(--border-color); animation: fadeInButton 1s forwards;
      opacity: 0; margin-top: 3rem;
    }
    .continue-button { padding: 0.8rem 1.5rem; font-size: 1rem; letter-spacing: 0.3em; border-width: 1px; margin-top: 2rem; }
    .begin-button:hover, .continue-button:hover { background: var(--glow-color); border-color: var(--accent-color); color: var(--bg-color); box-shadow: 0 0 20px var(--glow-color); }
    @keyframes fadeInButton { to { opacity: 1; } }

    /* HEADER */
    .main-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.5rem; pointer-events: all; text-shadow: 0 0 10px var(--glow-color); flex-shrink: 0; }
    .logo h1 { margin: 0; font-weight: 400; font-size: 1.5rem; letter-spacing: 0.3em; color: var(--accent-color); }
    .logo h2 { margin: 0; font-weight: 300; font-size: 0.8rem; letter-spacing: 0.1em; color: var(--text-color); opacity: 0.7; }
    .main-header .controls { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; max-width: 70%; }
    .main-header button { font-family: inherit; background: none; border: 1px solid var(--border-color); color: var(--text-color); padding: 0.5rem 1rem; font-size: 0.8rem; letter-spacing: 0.1em; cursor: pointer; transition: all 0.3s ease; white-space: nowrap; }
    .main-header button:hover:not(:disabled) { background: var(--glow-color); border-color: var(--accent-color); color: var(--bg-color); }
    .main-header button:disabled { opacity: 0.5; cursor: not-allowed; border-color: var(--text-color-dark); color: var(--text-color-dark); background: none; }
    .main-header button.clear-button { color: var(--error-color); border-color: rgba(255, 106, 106, 0.4); }
    .main-header button.clear-button:hover:not(:disabled) { background: rgba(255, 106, 106, 0.2); border-color: var(--error-color); color: #ffbebe; }

    /* SIDE PANELS */
    .side-panel { position: absolute; top: 0; height: 100%; width: clamp(320px, 25vw, 420px); padding: 1.5rem; padding-top: 8rem; background: linear-gradient(to right, var(--panel-bg), transparent); display: flex; flex-direction: column; transition: transform 0.5s ease-in-out; pointer-events: all; }
    .side-panel.left { left: 0; transform: translateX(-100%); }
    .side-panel.right { right: 0; transform: translateX(100%); background: linear-gradient(to left, var(--panel-bg), transparent); align-items: flex-end; text-align: right; }
    .side-panel.open { transform: translateX(0); }
    .panel-toggle { position: absolute; top: 50%; transform: translateY(-50%); width: 2rem; height: 5rem; background: var(--panel-bg); border: 1px solid var(--border-color); border-left: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--accent-color); z-index: 10; }
    .side-panel.left .panel-toggle { right: -2rem; }
    .side-panel.right .panel-toggle { left: -2rem; border: 1px solid var(--border-color); border-right: none; }
    .arrow { border: solid var(--accent-color); border-width: 0 2px 2px 0; display: inline-block; padding: 4px; transition: transform 0.3s; }
    .arrow.right { transform: rotate(-45deg); }
    .arrow.left { transform: rotate(135deg); }
    .panel-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem; }
    .panel-header h3 { margin: 0; font-size: 1rem; font-weight: 400; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent-color); }
    .panel-view-toggle { display: flex; border: 1px solid var(--border-color); }
    .panel-view-toggle button { background: none; border: none; color: var(--text-color-dark); padding: 0.2rem 0.6rem; cursor: pointer; font-family: inherit; font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; transition: all 0.2s ease; display: flex; align-items: center; }
    .panel-view-toggle button.active { background: var(--glow-color); color: var(--bg-color); }
    .panel-content { overflow-y: auto; height: 100%; width: 100%; }

    /* LEFT PANEL: PLANET LIST & DETAIL */
    .planet-list { list-style: none; padding: 0; margin: 0; }
    .planet-list li { padding: 0.8rem 0; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.3s ease; }
    .planet-list li:hover, .planet-list li.selected { background: var(--glow-color); }
    .planet-list li.selected .planet-name, .planet-list li.selected .planet-id { color: var(--bg-color); }
    .planet-list .planet-id { display: block; font-size: 0.7rem; opacity: 0.7; letter-spacing: 0.1em; }
    .planet-list .planet-name { font-size: 1.1rem; font-weight: 400; }
    .planet-detail .back-button { background: none; border: none; color: var(--accent-color); cursor: pointer; font-family: inherit; font-size: 0.9rem; padding: 0 0 1rem 0; opacity: 0.8; transition: opacity 0.3s; }
    .planet-detail .back-button:hover { opacity: 1; }
    .planet-detail h2 { margin: 0; font-size: 1.8rem; font-weight: 700; color: var(--accent-color); }
    .planet-detail h3 { margin: 0 0 1rem 0; font-size: 1rem; font-weight: 300; opacity: 0.8; }
    .planet-detail p { line-height: 1.6; opacity: 0.9; margin: 0 0 1rem 0; }
    .ai-whisper { opacity: 0.9; margin-bottom: 1.5rem; border-left: 2px solid var(--accent-color); padding-left: 1rem; }
    .ai-whisper p { font-style: italic; margin: 0; }
    .ai-whisper span { display: block; text-align: right; font-size: 0.8rem; opacity: 0.7; margin-top: 0.5rem; }
    .planet-detail h4 { font-weight: 400; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin: 1.5rem 0 1rem 0; }
    .planet-detail h5 { font-weight: 300; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.8; margin: 1rem 0 0.5rem 0; font-size: 0.9rem;}
    .stats-grid, .analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; font-size: 0.9rem; }
    .stats-grid strong, .analysis-grid strong { display: block; font-weight: 300; opacity: 0.7; font-size: 0.8rem; }
    .analysis-grid { margin-bottom: 1rem; }
    .classification-box { border: 1px solid var(--border-color); padding: 1rem; text-align: center; margin-bottom: 1rem; }
    .classification-box strong { display: block; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; margin-bottom: 0.5rem; }
    .classification-box span { font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em; }
    .classification-box.classification-confirmed span { color: var(--accent-color); text-shadow: 0 0 8px var(--glow-color); }
    .classification-box.classification-candidate span { color: var(--warning-color); text-shadow: 0 0 8px var(--warning-color); }
    .classification-box.classification-hypothetical span { color: var(--text-color-dark); }
    .classification-box.classification-false-positive span { color: var(--error-color); text-shadow: 0 0 8px var(--error-color); }
    .key-features { padding-left: 1.2rem; }
    .key-features li { margin-bottom: 0.5rem; }
    .biosignatures-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .biosignatures-list li { background: rgba(97, 250, 255, 0.1); border: 1px solid var(--border-color); padding: 0.3rem 0.6rem; font-size: 0.8rem; border-radius: 1rem; font-weight: 300; }
    .planet-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .planet-actions .route-button { grid-column: 1 / -1; }
    .analysis-button, .route-button { flex: 1; padding: 0.8rem; background: none; border: 1px solid var(--accent-color); color: var(--accent-color); font-family: inherit; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; transition: all 0.3s ease; }
    .analysis-button:hover:not(:disabled), .route-button:hover:not(:disabled) { background: var(--accent-color); color: var(--bg-color); }
    .analysis-button:disabled, .route-button:disabled { opacity: 0.5; cursor: not-allowed; border-color: var(--text-color-dark); color: var(--text-color-dark); }
    .analysis-button.deep-scan { border-color: var(--success-color); color: var(--success-color); }
    .analysis-button.deep-scan:hover:not(:disabled) { background: var(--success-color); color: var(--bg-color); }
    .analysis-button.exo-suit { border-color: var(--warning-color); color: var(--warning-color); }
    .analysis-button.exo-suit:hover:not(:disabled) { background: var(--warning-color); color: var(--bg-color); }
    .analysis-button.generate-viz {
      grid-column: 1 / -1;
      border-color: #ff61c3;
      color: #ff61c3;
    }
    .analysis-button.generate-viz:hover:not(:disabled) {
      background: #ff61c3;
      color: var(--bg-color);
    }
    .visualization-container {
      margin-top: 1rem;
      width: 100%;
      min-height: 200px;
      aspect-ratio: 1 / 1;
      background: rgba(0,0,0,0.2);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
    }
    .visualization-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 2px;
    }
    .navigation-panel { margin-top: 1rem; border-top: 1px solid var(--border-color); }
    .waypoint-list { list-style: none; padding: 0; margin: 0; }
    .waypoint { display: flex; align-items: flex-start; gap: 1rem; padding: 0.8rem 0; border-bottom: 1px solid var(--border-color); }
    .waypoint-index { font-size: 1.2rem; font-weight: 700; color: var(--accent-color); flex-shrink: 0; }
    .waypoint-info strong { display: block; font-weight: 400; }
    .waypoint-info p { margin: 0.2rem 0 0 0; font-size: 0.8rem; opacity: 0.7; }
    .predictor-form { display: flex; flex-direction: column; gap: 1.2rem; }
    .predictor-form p { font-size: 0.9rem; opacity: 0.8; line-height: 1.5; margin: 0; }
    .predictor-input label { display: block; font-size: 0.8rem; opacity: 0.7; margin-bottom: 0.4rem; }
    .predictor-input input { width: 100%; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color); color: var(--text-color); padding: 0.6rem; font-family: inherit; font-size: 1rem; }
    .predictor-input input:focus { outline: none; border-color: var(--accent-color); }
    .classify-button { width: 100%; padding: 0.8rem 1rem; background: none; border: 1px solid var(--accent-color); color: var(--accent-color); font-family: inherit; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; transition: all 0.3s ease; }
    .classify-button:hover:not(:disabled) { background: var(--accent-color); color: var(--bg-color); }
    .classify-button:disabled { opacity: 0.5; cursor: not-allowed; border-color: var(--text-color-dark); color: var(--text-color-dark); }
    .shielding-viz-container, .light-curve-viz-container { width: 100%; height: 250px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); margin-bottom: 1rem; position: relative; }
    .analysis-summary { font-size: 0.9rem; opacity: 0.8; line-height: 1.5; margin-bottom: 1rem; }
    .loader { padding: 2rem; text-align: center; opacity: 0.7; }

    /* DEEP SCAN RESULTS */
    .deep-scan-results .analysis-summary { font-size: 0.8rem; opacity: 0.7; }
    .material-legend { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-top: 1rem; }
    .material-legend td { padding: 0.5rem; border-bottom: 1px solid var(--border-color); }
    .material-legend tr:last-child td { border: none; }
    .color-swatch { display: inline-block; width: 12px; height: 12px; background-color: var(--swatch-color); margin-right: 0.8rem; vertical-align: middle; }


    /* RIGHT PANEL: AI CHRONICLES */
    .chronicles-list { list-style: none; padding: 0; margin: 0; }
    .chronicle-entry { border-right: 2px solid var(--border-color); padding: 0.8rem; margin-bottom: 1rem; }
    .chronicle-entry.type-thought { border-color: var(--accent-color); }
    .chronicle-entry.type-discovery { border-color: var(--warning-color); }
    .chronicle-entry.type-suggestion { border-color: #ff61c3; }
    .chronicle-entry .timestamp { font-size: 0.7rem; opacity: 0.6; }
    .chronicle-entry p { margin: 0.3rem 0 0 0; font-size: 0.9rem; }
    .notification-dot { position: absolute; top: 5px; right: 5px; width: 10px; height: 10px; background: var(--accent-color); border-radius: 50%; box-shadow: 0 0 8px var(--accent-color); }

    /* FOOTER */
    .main-footer { padding: 1rem 2rem; display: flex; flex-direction: column; gap: 0.5rem; align-items: center; width: 100%; pointer-events: all; }
    .status-bar { font-size: 0.8rem; color: var(--text-color-dark); display: flex; align-items: center; gap: 0.5rem; }
    .ai-status-indicator { width: 8px; height: 8px; border-radius: 50%; background: var(--text-color-dark); transition: background-color 0.5s ease; flex-shrink: 0; }
    .ai-status-indicator.status-idle { background: var(--accent-color); animation: pulse-idle 3s ease-in-out infinite; }
    .ai-status-indicator.status-initializing, .ai-status-indicator.status-thinking, .ai-status-indicator.status-thinking-cluster, .ai-status-indicator.status-navigating, .ai-status-indicator.status-thinking-galaxy, .ai-status-indicator.status-thinking-galaxy-cluster, .ai-status-indicator.status-thinking-image { background: var(--warning-color); animation: pulse-active 1.5s ease-in-out infinite; }
    .ai-status-indicator.status-error { background: var(--error-color); animation: none; }
    @keyframes pulse-idle { 0% { box-shadow: 0 0 0 0 rgba(97, 250, 255, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(97, 250, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(97, 250, 255, 0); } }
    @keyframes pulse-active { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 250, 97, 0.7); } 50% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(255, 250, 97, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 250, 97, 0); } }
    .error-msg { color: var(--error-color); font-weight: 400; }
    .command-bar { width: 100%; max-width: 800px; background: var(--panel-bg); border: 1px solid var(--border-color); backdrop-filter: blur(10px); display: flex; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5); }
    .input-wrapper { flex-grow: 1; position: relative; }
    .command-bar input { width: 100%; background: none; border: none; color: var(--text-color); font-size: 1.2rem; padding: 1rem 1.5rem; font-family: inherit; font-weight: 300; }
    .command-bar input:focus { outline: none; }
    .suggestion-chip { position: absolute; bottom: 105%; left: 1rem; background: var(--panel-bg); border: 1px solid var(--border-color); padding: 0.5rem 1rem; font-size: 0.9rem; border-radius: 20px; cursor: pointer; transition: all 0.3s ease; animation: fadeIn 0.5s; white-space: nowrap; }
    .suggestion-chip:hover { background: var(--glow-color); color: var(--bg-color); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .command-bar button { font-family: inherit; background: none; border: none; border-left: 1px solid var(--border-color); color: var(--accent-color); padding: 1rem 1.5rem; font-size: 1rem; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; transition: all 0.3s ease; white-space: nowrap; }
    .command-bar button.cluster-button { color: #ffc261; border-left: 1px solid rgba(255, 194, 97, 0.3); }
    .command-bar button:hover:not(:disabled) { background: var(--accent-color); color: var(--bg-color); }
    .command-bar button.cluster-button:hover:not(:disabled) { background: #ffc261; color: var(--bg-color); }
    .command-bar button:disabled { opacity: 0.4; cursor: not-allowed; }

    /* VOICE BUTTON */
    .command-bar button.voice-button { padding: 1rem; width: 60px; color: var(--text-color-dark); }
    .command-bar button.voice-button:hover:not(:disabled) { color: var(--accent-color); background: none; }
    .command-bar button.voice-button svg { width: 24px; height: 24px; transition: all 0.3s ease; }
    .command-bar button.voice-button.listening svg { color: var(--accent-color); animation: pulse-voice 1.5s infinite; }
    @keyframes pulse-voice { 0% { transform: scale(1); filter: drop-shadow(0 0 2px var(--glow-color)); } 50% { transform: scale(1.1); filter: drop-shadow(0 0 8px var(--glow-color)); } 100% { transform: scale(1); filter: drop-shadow(0 0 2px var(--glow-color)); } }

    /* ACCURACY DASHBOARD */
    .dashboard-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(1, 2, 6, 0.8); backdrop-filter: blur(10px); z-index: 100; display: flex; align-items: center; justify-content: center; pointer-events: all; animation: fadeInDashboard 0.5s ease; }
    @keyframes fadeInDashboard { from { opacity: 0; } to { opacity: 1; } }
    .dashboard-content { width: 90%; max-width: 900px; background: var(--panel-bg); border: 1px solid var(--border-color); box-shadow: 0 0 30px var(--glow-color); color: var(--text-color); padding: 2rem; position: relative; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem; }
    .dashboard-header h2 { margin: 0; font-size: 1.5rem; font-weight: 400; letter-spacing: 0.2em; color: var(--accent-color); display: flex; align-items: center; }
    .dashboard-header button { background: none; border: none; color: var(--text-color); font-size: 2rem; cursor: pointer; line-height: 1; opacity: 0.7; transition: opacity 0.3s ease; }
    .dashboard-header button:disabled { opacity: 0.3; cursor: not-allowed; }
    .dashboard-summary { margin-bottom: 1.5rem; background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-color); padding: 1rem; text-align: center; }
    .summary-metric h4 { margin: 0 0 0.5rem 0; font-weight: 400; letter-spacing: 0.1em; text-transform: uppercase; font-size: 1rem; opacity: 0.8; }
    .summary-metric p { margin: 0; font-size: 2.5rem; font-weight: 700; color: var(--success-color); text-shadow: 0 0 10px var(--success-color); }
    .dashboard-body { display: flex; flex-direction: column; gap: 2rem; }
    .dashboard-metrics-container { display: flex; gap: 2rem; }
    .dashboard-section { flex: 1; }
    .dashboard-section.full-width { flex-basis: 100%; margin-top: 1rem; }
    .dashboard-section h4 { font-weight: 400; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin: 0 0 1rem 0; }
    .confusion-matrix { display: grid; grid-template-columns: 1fr repeat(3, 2fr); grid-template-rows: 1fr repeat(3, 2fr); gap: 5px; font-size: 0.8rem; }
    .matrix-cell { background: rgba(0, 0, 0, 0.2); padding: 0.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .matrix-cell.label { background: transparent; font-weight: 700; letter-spacing: 0.05em; color: var(--text-color-dark); writing-mode: vertical-rl; text-orientation: mixed; justify-content: flex-start; padding-top: 1rem; }
    .matrix-cell.label.predicted { writing-mode: horizontal-tb; padding: 0.5rem; }
    .matrix-cell.label.actual { text-align: right; }
    .matrix-cell .value { font-size: 1.5rem; font-weight: 700; }
    .matrix-cell .percentage { font-size: 0.7rem; opacity: 0.6; }
    .matrix-cell.correct { background: rgba(97, 255, 202, 0.1); border: 1px solid var(--success-color); }
    .matrix-cell.correct .value { color: var(--success-color); }
    .matrix-cell.incorrect { background: rgba(255, 106, 106, 0.05); border: 1px solid rgba(255, 106, 106, 0.3); }
    .metrics-table { width: 100%; border-collapse: collapse; text-align: left; }
    .metrics-table th, .metrics-table td { padding: 0.8rem; border-bottom: 1px solid var(--border-color); }
    .metrics-table th { font-weight: 400; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8rem; opacity: 0.8; }
    .metrics-table td { font-size: 1.1rem; font-family: 'Exo 2', monospace; }
    .metrics-table tr:last-child td { border-bottom: none; }
    .tuning-controls { display: flex; gap: 2rem; margin-bottom: 1.5rem; }
    .slider-control { flex: 1; }
    .slider-control label { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .slider-control label span { font-weight: 700; color: var(--accent-color); }
    input[type='range'] { -webkit-appearance: none; width: 100%; height: 2px; background: var(--border-color); outline: none; opacity: 0.7; transition: opacity 0.2s; }
    input[type='range']:hover { opacity: 1; }
    input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; background: var(--accent-color); cursor: pointer; border-radius: 50%; box-shadow: 0 0 10px var(--glow-color); }
    input[type='range']::-moz-range-thumb { width: 18px; height: 18px; background: var(--accent-color); cursor: pointer; border-radius: 50%; box-shadow: 0 0 10px var(--glow-color); border: none; }
    .recalibrate-button { font-family: inherit; background: none; border: 1px solid var(--accent-color); color: var(--accent-color); padding: 0.8rem 1.5rem; font-size: 1rem; letter-spacing: 0.1em; cursor: pointer; transition: all 0.3s ease; width: 100%; font-weight: 700; }
    .recalibrate-button:hover:not(:disabled) { background: var(--glow-color); color: var(--bg-color); }
    .recalibrate-button:disabled { opacity: 0.5; cursor: not-allowed; border-color: var(--text-color-dark); color: var(--text-color-dark); }
    .recalibration-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(1, 2, 6, 0.8); backdrop-filter: blur(2px); z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; animation: fadeInDashboard 0.3s ease; }
    .recalibration-overlay h4 { font-weight: 400; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent-color); margin: 0 0 1.5rem 0; font-size: 1rem; }
    .spinner { border: 4px solid var(--border-color); border-top: 4px solid var(--accent-color); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-color); }
    ::-webkit-scrollbar-thumb:hover { background: var(--accent-color); }

    /* --- RESPONSIVE DESIGN --- */

    /* Tablet - smaller side panels, stacked action buttons */
    @media (max-width: 1024px) {
      .side-panel {
        width: clamp(300px, 35vw, 400px);
        padding-top: 7rem;
      }

      .planet-actions {
        grid-template-columns: 1fr;
      }

      .dashboard-metrics-container,
      .tuning-controls {
        flex-direction: column;
      }

      .main-header, .main-footer {
        padding: 1rem;
      }
    }

    /* Mobile - single panel focus, stacked layouts, simplified controls */
    @media (max-width: 768px) {
      .main-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .main-header .controls {
        max-width: 100%;
        justify-content: flex-start;
      }

      /* Hide less critical header buttons on mobile */
      .main-header .controls button:not(.back-to-galaxy):not([title="Start the guided tutorial"]):not([title*="Mute"]) {
        display: none;
      }
      .main-header .controls button.clear-button {
        display: none;
      }

      .side-panel {
        width: clamp(280px, 85vw, 400px);
        padding: 1rem;
        padding-top: 6rem;
        background: var(--panel-bg); /* Make it solid for overlap */
        backdrop-filter: blur(10px);
        z-index: 10;
        box-shadow: 5px 0 20px rgba(0,0,0,0.2);
      }
      .side-panel.right {
         box-shadow: -5px 0 20px rgba(0,0,0,0.2);
      }

      .side-panel.left:not(.open) {
        transform: translateX(-105%);
      }
      .side-panel.right:not(.open) {
        transform: translateX(105%);
      }

      .panel-toggle {
        width: 2.5rem;
        height: 6rem;
      }
      .side-panel.left .panel-toggle {
        right: -2.5rem;
      }
      .side-panel.right .panel-toggle {
        left: -2.5rem;
      }

      .stats-grid, .analysis-grid {
        grid-template-columns: 1fr;
      }
      
      .planet-detail h2 {
        font-size: 1.5rem;
      }

      .command-bar {
        max-width: 100%;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .input-wrapper {
        flex-basis: 100%;
        order: 1;
        width: 100%;
      }
      .command-bar button {
        padding: 0.8rem 1rem;
        font-size: 0.9rem;
        flex-grow: 1;
        order: 2;
      }

      .onboarding-content, .tutorial-prompt {
        width: 90%;
        box-sizing: border-box;
      }

      .onboarding-text {
        white-space: normal; /* Allow text to wrap */
        border-right: none !important;
        width: 100% !important;
        animation: none !important;
        opacity: 1 !important;
      }
      .past-stanza .onboarding-text {
        opacity: 0.7 !important;
      }
      .onboarding-overlay .begin-button, .onboarding-overlay .continue-button {
        animation: none !important;
        opacity: 1 !important;
      }

      .dashboard-content {
        width: 95%;
        padding: 1rem;
        max-height: 95vh;
        overflow-y: auto;
      }
      .confusion-matrix {
          font-size: 0.7rem;
      }
      .matrix-cell .value {
          font-size: 1.1rem;
      }
    }
  `;
}