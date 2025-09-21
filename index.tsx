/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, GenerateContentResponse} from '@google/genai';
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

const IMAP_MISSION_BRIEFING_TEXT = `
Connect initiate or build The  powerfull unique Interstellar Mapping and Acceleration Probe, or IMAP engines , will explore and map the very boundaries of our heliosphere — a huge bubble created by the Sun's wind that encapsulates our entire solar system — and study how the heliosphere interacts with the local galactic neighborhood beyond.

As a modern-day celestial cartographer, IMAP will also explore and chart the vast range of particles in interplanetary space, helping to investigate two of the most important overarching issues in heliophysics — the energization of charged particles from the Sun, and the interaction of the solar wind at its boundary with interstellar space. Additionally, IMAP will support real-time observations of the solar wind and energetic particles, which can produce hazardous conditions in the space environment near Earth. 

What is IMAP?
The IMAP mission will use 10 scientific instruments to chart a comprehensive picture of what’s roiling in space, from high-energy particles originating at the Sun, to magnetic fields in interplanetary space, to remnants of exploded stars in interstellar space.

Pushing Boundaries 

The mission will primarily investigate two of the most important overarching issues in heliophysics. Namely, how charged particles from the Sun are energized to form what’s known as the solar wind and how that wind interacts with interstellar space at the heliosphere’s boundary.

This boundary offers protection from the harsher radiation from the rest of the galaxy. It is key to creating and maintaining a habitable solar system. The physics of the boundary and how it changes over time helps explain why our solar system can support life as we know it.

Keeping an Eye on Space Weather 

The IMAP mission will additionally support real-time observations of the solar wind, which can flood the near-Earth space environment with dangerous particles and radiation that could harm technology and astronauts in space and disrupt global communications and electrical grids on Earth. The IMAP spacecraft is situated at the first Earth-Sun Lagrange point (L1), at around one million miles from Earth toward the Sun. There, it can provide about a half hour's warning to voyaging astronauts and spacecraft near Earth of harmful radiation coming their way.

Together, these areas of research will: 

Uncover fundamental physics at scales both tiny and immense. 
Improve forecasting of solar wind disturbances and particle radiation hazards from space.
Draw a picture of our nearby galactic neighborhood.
Help determine some of the basic cosmic building materials of the universe.
Increase understanding of how the heliosphere shields life in the solar system from cosmic rays.
`;

const JWST_INFO_TEXT = `The James Webb Space Telescope is the world's premier space science observatory. Webb is solving mysteries in our solar system, looking beyond to distant worlds around other stars, and probing the mysterious structures and origins of our universe and our place in it. Webb is an international program led by NASA with its partners, ESA (European Space Agency) and the Canadian Space Agency.

The telescope's revolutionary technology will explore every phase of cosmic history – from within our solar system to the most distant observable galaxies in the early universe, and everything in between. Webb will reveal new and unexpected discoveries, and help humanity understand the origins of the universe and our place in it. Key scientific goals for Webb include studying the first stars and galaxies that formed after the Big Bang, investigating how galaxies evolve over time, observing the birth of stars and planetary systems, and characterizing the atmospheres of exoplanets to search for potential signs of life.`;

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

// FIX: Define and export ML_Lab_State and ClassificationLogEntry interfaces to be used in other modules.
export interface ClassificationLogEntry {
  id: number;
  input: {[key: string]: string};
  result: {
    prediction: string;
    confidence: number;
  };
}

export interface ML_Lab_State {
  dataset: 'koi' | 'toi' | 'k2' | 'neossat';
  features: string[];
  isTraining: boolean;
  isClassifying: boolean;
  isLiveMode: boolean;
  trainingResults: {
    accuracy: number;
    precision: number;
    recall: number;
    matrix: number[][];
    feature_importance: {feature: string; importance: number}[];
    summary: string;
  } | null;
  classificationInput: {[key: string]: string};
  classificationResult: {
    prediction: string;
    confidence: number;
    reasoning: string;
  } | null;
  liveClassificationLog: ClassificationLogEntry[];
  error: string | null;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface Annotation {
  id: string;
  rect: {x: number; y: number; width: number; height: number}; // image coordinates
  label: string;
  analysis?: string;
  isAnalyzing?: boolean;
  element?: HTMLElement;
}

export type MusicMood = 'galaxy' | 'serene' | 'tense' | 'mysterious' | 'off';

const AVAILABLE_PROTOCOLS = [
  'air_temps',
  'precipitations',
  'land_covers',
  'soil_moistures',
  'greenings',
  'snowpacks',
  'aerosols',
  'barometric_pressures',
  'conductivities',
  'humidities',
  'salinities',
  'sky_conditions',
  'water_temperatures',
  'winds',
];

const ML_FEATURES = {
  koi: [
    {id: 'koi_period', name: 'Orbital Period', range: [1, 50]},
    {id: 'koi_duration', name: 'Transit Duration', range: [1, 10]},
    {id: 'koi_depth', name: 'Transit Depth', range: [50, 5000]},
    {id: 'koi_prad', name: 'Planetary Radius', range: [0.5, 15]},
    {id: 'koi_teq', name: 'Equilibrium Temperature', range: [200, 2000]},
    {id: 'koi_insol', name: 'Insolation Flux', range: [1, 1000]},
  ],
  toi: [
    {id: 'toi_period', name: 'Orbital Period', range: [1, 50]},
    {id: 'toi_duration', name: 'Transit Duration', range: [1, 10]},
    {id: 'toi_depth', name: 'Transit Depth', range: [50, 5000]},
    {id: 'toi_prad', name: 'Planetary Radius', range: [0.5, 15]},
  ],
  k2: [
    {id: 'k2_period', name: 'Orbital Period', range: [1, 50]},
    {id: 'k2_duration', name: 'Transit Duration', range: [1, 10]},
    {id: 'k2_depth', name: 'Transit Depth', range: [50, 5000]},
    {id: 'k2_prad', name: 'Planetary Radius', range: [0.5, 15]},
  ],
  neossat: [
    {id: 'neossat_mag', name: 'Apparent Magnitude', range: [10, 25]},
    {id: 'neossat_moid', name: 'MOID (AU)', range: [0.001, 0.5]},
    {id: 'neossat_albedo', name: 'Albedo', range: [0.01, 0.9]},
    {id: 'neossat_diameter', name: 'Est. Diameter (km)', range: [0.01, 10]},
  ],
};

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to AXEE',
    content:
      "This brief tour will guide you through synthesizing and exploring your own pocket universe. You can press 'Escape' at any time to exit.",
    highlightStyle: {
      top: '50%',
      left: '50%',
      width: '0px',
      height: '0px',
      transform: 'translate(-50%, -50%)',
    },
    panelStyle: {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '500px',
    },
  },
  {
    title: 'The Command Bar',
    content:
      "This is the command bar. Type a description of a galaxy (e.g., 'a galaxy made of crystal') and press the send button or Enter to begin.",
    highlightStyle: {
      top: 'calc(100vh - 7rem)',
      left: '50%',
      width: '720px',
      height: '60px',
      transform: 'translate(-50%, -50%)',
      borderRadius: '4px',
    },
    panelStyle: {
      bottom: '8rem',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '500px',
    },
  },
  {
    title: 'Navigating Space',
    content:
      'New galaxies appear in intergalactic space. Use your mouse to look around. Click on a galaxy to travel to it.',
    highlightStyle: {
      top: '50%',
      left: '50%',
      width: '400px',
      height: '400px',
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
    },
    panelStyle: {
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '500px',
    },
  },
  {
    title: 'Synthesizing Planets',
    content:
      "Once viewing a galaxy, use the command bar again to create a planet within it. Try 'a world with glowing rivers'.",
    highlightStyle: {
      top: 'calc(100vh - 7rem)',
      left: '50%',
      width: '720px',
      height: '60px',
      transform: 'translate(-50%, -50%)',
      borderRadius: '4px',
    },
    panelStyle: {
      bottom: '8rem',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '500px',
    },
  },
  {
    title: 'Exploring Planets',
    content:
      'Planets you discover will orbit the galactic core. Click on a planet to get a closer look and learn more about it.',
    highlightStyle: {
      top: '50%',
      left: '50%',
      width: '200px',
      height: '200px',
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
    },
    panelStyle: {
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '500px',
    },
  },
  {
    title: 'Planetary Data',
    content:
      'When viewing a planet, this panel displays key data, unique features, and fascinating factoids generated by the AI.',
    highlightStyle: {
      top: '5rem',
      right: '1rem',
      width: '350px',
      height: '400px',
    },
    panelStyle: {
      top: '5rem',
      right: 'calc(1rem + 350px + 1rem)',
      width: '400px',
    },
  },
  {
    title: 'Navigation HUD',
    content:
      'This is your main HUD. Use these controls to navigate back to the galaxy view, explore our own Solar System, or access the Research Hub.',
    highlightStyle: {
      bottom: '8rem',
      left: '1rem',
      width: '250px',
      height: '180px',
    },
    panelStyle: {
      bottom: '8rem',
      left: 'calc(1rem + 250px + 1rem)',
      width: '400px',
    },
  },
  {
    title: 'The Research Hub',
    content:
      'The Research Hub contains a catalog of discovered stars, a machine learning lab to classify exoplanets, and a database of real NASA technology.',
    highlightStyle: {
      top: '50%',
      left: '50%',
      width: '0px',
      height: '0px',
      transform: 'translate(-50%, -50%)',
    },
    panelStyle: {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '500px',
    },
  },
  {
    title: 'Exploration Awaits',
    content: "You're now ready to explore. End this tour at any time. Happy discovering!",
    highlightStyle: {
      top: '50%',
      left: '50%',
      width: '0px',
      height: '0px',
      transform: 'translate(-50%, -50%)',
    },
    panelStyle: {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '500px',
    },
  },
];

@customElement('axee-interface')
export class AxeeInterface extends LitElement {
  @state() private isLoading = false;
  @state() private statusMessage = 'Awaiting new galaxy synthesis protocol.';
  @state() private galaxies: Map<string, GalaxyData> = new Map();
  @state() private currentGalaxyId: string | null = null;
  @state() private selectedPlanetId: string | null = null;
  @state() private currentFocus: FocusChangeEvent = {type: 'intergalactic'};
  @state() private error: string | null = null;
  @state() private userPrompt = '';
  @state() private groundingChunks: GroundingChunk[] = [];
  @state() private showWelcome = true;
  @state() private starCatalog: StarData[] = [];

  // Galaxy Customization states
  @state() private showGalaxyCustomization = false;
  @state() private galaxyCustomization: {
    useCustom: boolean;
    type: 'Spiral' | 'Barred Spiral' | 'Elliptical' | 'Irregular' | 'auto';
    insideColor: string;
    outsideColor: string;
    bulgeSize: number;
    armTightness: number;
  } = {
    useCustom: false,
    type: 'auto',
    insideColor: '#ffddaa',
    outsideColor: '#aaddff',
    bulgeSize: 0.4,
    armTightness: 1.0,
  };

  // Audio & Voice states
  @state() private isSpeaking = false;
  @state() private isMuted = false;
  @state() private currentMood: MusicMood = 'galaxy';
  @state() private hasInteracted = false;

  // GLOBE API states
  @state() private isFetchingGlobeData = false;
  @state() private globeData: any = null;
  @state() private globeError: string | null = null;
  @state() private globeQuery = {
    protocols: ['air_temps'],
    startDate: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    countryCode: 'USA',
  };

  // Deep Space Imagery states
  @state() private annotations: Annotation[] = [];
  @state() private activeAnnotationId: string | null = null;
  @state() private isDrawingAnnotation = false;
  @state() private isAnalyzing = false;

  // Research Hub states
  @state() private activeResearchView:
    | 'catalog'
    | 'ml'
    | 't2'
    | 'jwst'
    | 'spaceweather'
    | 'video'
    | 'nasa_data' = 'catalog';

  // ML Lab states
  @state() private mlLabState: ML_Lab_State = {
    dataset: 'koi',
    features: ['koi_period', 'koi_duration', 'koi_depth', 'koi_prad'],
    isTraining: false,
    isClassifying: false,
    isLiveMode: false,
    trainingResults: null,
    classificationInput: {
      koi_period: '8.7',
      koi_duration: '2.5',
      koi_depth: '150.0',
      koi_prad: '1.2',
    },
    classificationResult: null,
    liveClassificationLog: [],
    error: null,
  };

  // Video Lab states
  @state() private videoLabState: {
    prompt: string;
    inputImage: {base64: string; mimeType: string; name: string} | null;
    isLoading: boolean;
    loadingMessage: string;
    generatedVideoUrl: string | null;
    error: string | null;
  } = {
    prompt: 'A photorealistic cat astronaut exploring a neon-lit alien jungle',
    inputImage: null,
    isLoading: false,
    loadingMessage: '',
    generatedVideoUrl: null,
    error: null,
  };

  // NASA T2 API states
  @state() private t2ApiState: {
    query: {
      type: 'patent' | 'software' | 'spinoff';
      keywords: string;
    };
    isLoading: boolean;
    results: any[][] | null;
    error: string | null;
    selectedResult: any[] | null;
  } = {
    query: {
      type: 'patent',
      keywords: '',
    },
    isLoading: false,
    results: null,
    error: null,
    selectedResult: null,
  };

  // IMAP states
  @state() private imapState: {
    summary: string | null;
    isStreaming: boolean;
    dataLog: string[];
    isFetchingSummary: boolean;
  } = {
    summary: null,
    isStreaming: false,
    dataLog: [],
    isFetchingSummary: false,
  };
  private imapStreamInterval: number | null = null;

  // JWST states
  @state() private jwstState: {
    summary: string | null;
    isFetchingSummary: boolean;
    images: {key: string; name: string; url: string}[];
    selectedImageKey: string;
  } = {
    summary: null,
    isFetchingSummary: false,
    images: [
      {
        key: 'carina',
        name: 'Cosmic Cliffs in Carina Nebula',
        url: 'https://storage.googleapis.com/static.aurelion.axee/jwst-carina.jpg',
      },
      {
        key: 'quintet',
        name: "Stephan's Quintet",
        url: 'https://storage.googleapis.com/static.aurelion.axee/jwst-quintet.jpg',
      },
      {
        key: 'pillars',
        name: 'Pillars of Creation',
        url: 'https://storage.googleapis.com/static.aurelion.axee/jwst-pillars.jpg',
      },
    ],
    selectedImageKey: 'carina',
  };
  private jwstOsdViewer: OpenSeadragon.Viewer | null = null;

  // Space Weather states
  @state() private spaceWeatherState: {
    selectedCategory: string;
    isLoading: boolean;
    lastUpdated: Date | null;
  } = {
    selectedCategory: 'Forecasts',
    isLoading: false,
    lastUpdated: null,
  };

  // Tutorial states
  @state() private isTutorialActive = false;
  @state() private tutorialStep = 0;

  // Comparison states
  @state() private isComparisonModeActive = false;
  @state() private comparisonList: string[] = [];
  @state() private showComparisonPanel = false;

  @query('axee-audio-engine') private audioEngine!: AxeeAudioEngine;
  @query('axee-visuals-3d') private visuals3d!: AxeeVisuals3D;
  @query('.live-log') private liveLogContainer?: HTMLDivElement;

  private ai: GoogleGenAI;
  private discoveryInterval: number | null = null;
  private liveModeInterval: number | null = null;

  // Icons for ML Lab
  private static confirmedIcon = html`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
    />
  </svg>`;
  private static candidateIcon = html`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path
      d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z M4.2,14C4.07,13.36 4,12.69 4,12C4,10.13 4.67,8.44 5.8,7.18L7.3,8.87C6.5,9.81 6,10.86 6,12C6,12.69 6.1,13.34 6.29,13.93L4.2,14Z M19.8,10C19.93,10.64 20,11.31 20,12C20,13.87 19.33,15.56 18.2,16.82L16.7,15.13C17.5,14.19 18,13.14 18,12C18,11.31 17.9,10.66 17.71,10.07L19.8,10Z"
    />
  </svg>`;
  private static falsePositiveIcon = html`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path
      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
    />
  </svg>`;
  private static phaIcon = html`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path
      d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
    />
  </svg>`;
  private static nhoIcon = html`<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path
      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
    />
  </svg>`;

  constructor() {
    super();
    this.ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    this.statusMessage = 'Welcome to AXEE. Awaiting synthesis protocol.';
  }

  firstUpdated() {
    this.visuals3d.addEventListener('analyze-annotation', (e) =>
      this.handleAnalyzeAnnotation(e as CustomEvent),
    );
    this.visuals3d.addEventListener('annotation-drawn', (e) =>
      this.handleAnnotationDrawn(e as CustomEvent),
    );
    this.visuals3d.addEventListener('toggle-comparison-planet', (e) =>
      this.handleToggleComparisonPlanet(e as CustomEvent),
    );
  }

  protected updated(
    changedProperties: Map<PropertyKey, unknown> | Map<PropertyKey, unknown>,
  ): void {
    if (changedProperties.has('currentFocus')) {
      const oldFocusType = changedProperties.get('currentFocus') as
        | FocusChangeEvent
        | undefined;
      const focusType = this.currentFocus.type;
      // Stop live mode when leaving the ML lab view
      if (focusType !== 'research' && this.mlLabState.isLiveMode) {
        this.toggleLiveMode();
      }

      // Start IMAP summary fetch when entering view
      if (focusType === 'imap' && !this.imapState.summary) {
        this.fetchImapSummary();
      }

      // Stop IMAP stream when leaving view
      if (oldFocusType?.type === 'imap' && focusType !== 'imap') {
        this.stopImapStream();
      }

      if (focusType === 'nebula') {
        this.isDrawingAnnotation = false;
        this.annotations = [];
        this.activeAnnotationId = null;
      }

      if (focusType === 'galaxy' && this.currentFocus.id) {
        this.currentGalaxyId = this.currentFocus.id;
        this.selectedPlanetId = null;
        this.currentMood = 'galaxy';
        this.speak(
          `Entering ${this.galaxies.get(this.currentGalaxyId!)?.name}.`,
        );
        this.startAutonomousDiscovery();

        // Generate the first planet of the new galaxy
        const galaxyName = this.galaxies.get(this.currentGalaxyId!)?.name;
        this.synthesizeExoplanet(
          galaxyName
            ? `a world at the edge of the ${galaxyName}`
            : 'a primordial world',
        );
      } else if (focusType === 'planet' && this.currentFocus.id) {
        this.selectedPlanetId = this.currentFocus.id;
      } else if (focusType === 'intergalactic') {
        this.currentGalaxyId = null;
        this.selectedPlanetId = null;
        this.currentMood = 'galaxy';
        this.stopAutonomousDiscovery();
      } else {
        this.stopAutonomousDiscovery();
      }

      // Exit comparison mode if focus changes away from a galaxy
      if (focusType !== 'galaxy' && this.isComparisonModeActive) {
        this.toggleComparisonMode();
      }
    }

    if (changedProperties.has('activeResearchView')) {
      const oldView = changedProperties.get('activeResearchView');
      // Destroy OSD viewer when leaving JWST view
      if (oldView === 'jwst' && this.activeResearchView !== 'jwst') {
        this.destroyJwstOsdViewer();
      }
      // Initialize OSD viewer when entering JWST view
      if (this.activeResearchView === 'jwst' && oldView !== 'jwst') {
        if (!this.jwstState.summary) {
          this.fetchJwstSummary();
        }
        // Delay init to allow DOM to render
        setTimeout(() => this.initJwstOsdViewer(), 100);
      }
    }

    if (changedProperties.has('mlLabState') && this.liveLogContainer) {
      const oldState = changedProperties.get('mlLabState') as
        | typeof this.mlLabState
        | undefined;
      // Check if a new entry was added to the log
      if (
        this.mlLabState.isLiveMode &&
        oldState &&
        this.mlLabState.liveClassificationLog[0]?.id !==
          oldState.liveClassificationLog[0]?.id
      ) {
        // Scroll to the top because new items are prepended
        this.liveLogContainer.scrollTop = 0;
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    if (this.liveModeInterval) {
      clearInterval(this.liveModeInterval);
    }
    this.stopImapStream();
    this.destroyJwstOsdViewer();
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

    .welcome-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 700px;
      max-width: 90%;
      padding: 2.5rem;
      background: rgba(0, 25, 0, 0.92);
      border: 1px solid #0f0;
      box-shadow: 0 0 25px rgba(0, 255, 0, 0.5),
        0 0 15px rgba(0, 255, 0, 0.8) inset;
      text-align: center;
      z-index: 100;
      pointer-events: all;
      opacity: 0;
      animation: fadeInWelcome 1s 0.5s forwards;
      color: #0f0;
      text-shadow: 0 0 5px #0f0;
    }

    @keyframes fadeInWelcome {
      to {
        opacity: 1;
      }
    }

    .welcome-overlay h1 {
      font-size: 2.2rem;
      margin: 0 0 1.5rem 0;
      color: #fff;
      text-shadow: 0 0 10px #0f0, 0 0 20px #0f0;
      letter-spacing: 0.1em;
      font-weight: 700;
    }

    .welcome-overlay p {
      font-size: 1rem;
      line-height: 1.7;
      margin: 0 auto 1.5rem auto;
      opacity: 0.9;
      max-width: 80%;
    }

    .welcome-overlay .welcome-overlay-buttons {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    }

    .welcome-overlay button {
      font-family: 'Orbitron', sans-serif;
      background: transparent;
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.8rem 2.5rem;
      font-size: 1.3rem;
      cursor: pointer;
      text-shadow: 0 0 5px #0f0;
      transition: background 0.3s, box-shadow 0.3s, color 0.3s,
        border-color 0.3s;
      letter-spacing: 0.2em;
    }

    .welcome-overlay button:hover {
      background: rgba(0, 255, 0, 0.2);
      box-shadow: 0 0 15px #0f0;
    }

    .welcome-overlay button.secondary {
      background: transparent;
      border-color: #0a0;
      color: #0c0;
      font-size: 1rem;
      padding: 0.8rem 1.5rem;
    }

    .welcome-overlay button.secondary:hover {
      border-color: #0f0;
      color: #0f0;
      background: rgba(0, 255, 0, 0.1);
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
      flex-wrap: wrap;
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
    .hud-button.active {
      background: rgba(0, 255, 0, 0.2);
      box-shadow: 0 0 8px #0f0;
    }
    .hud-button:hover:not(:disabled) {
      background: rgba(0, 255, 0, 0.2);
    }
    .hud-button:disabled {
      cursor: not-allowed;
      border-color: rgba(0, 255, 0, 0.5);
    }
    .hud-button:disabled svg {
      fill: rgba(0, 255, 0, 0.5);
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
      opacity: 0.7;
    }

    .command-bar input[type='text']:focus {
      outline: none;
    }

    .send-button,
    .settings-button {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .send-button svg,
    .settings-button svg {
      width: 24px;
      height: 24px;
      fill: #0f0;
      transition: fill 0.3s, filter 0.3s, transform 0.3s;
    }

    .send-button:hover:not(:disabled) svg,
    .settings-button:hover:not(:disabled) svg {
      filter: drop-shadow(0 0 5px #0f0);
    }

    .settings-button.active svg {
      transform: rotate(45deg);
      filter: drop-shadow(0 0 5px #0f0);
    }

    .send-button:disabled svg {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Galaxy Customization Panel */
    .galaxy-customization-panel {
      pointer-events: all;
      width: 700px;
      max-width: 90%;
      padding: 1.5rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem 2rem;
      margin-bottom: 1rem;
    }

    .galaxy-customization-panel h3 {
      grid-column: 1 / -1;
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
      color: #fff;
    }
    .customization-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .customization-group.full-width {
      grid-column: 1 / -1;
    }
    .customization-group label {
      font-size: 0.9rem;
      opacity: 0.8;
      display: flex;
      justify-content: space-between;
    }
    .customization-group input,
    .customization-group select {
      font-family: 'Orbitron', sans-serif;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.5rem;
      font-size: 1rem;
      width: 100%;
    }

    .customization-group input[type='range'] {
      padding: 0;
      -webkit-appearance: none;
      appearance: none;
      height: 5px;
      background: rgba(0, 255, 0, 0.2);
      outline: none;
    }

    .customization-group input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 15px;
      height: 15px;
      background: #0f0;
      cursor: pointer;
      border: 1px solid #fff;
      box-shadow: 0 0 5px #0f0;
    }

    .customization-group input[type='color'] {
      padding: 0;
      height: 38px;
    }

    .customization-group input[type='checkbox'] {
      width: auto;
    }

    .toggle-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
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

    .holographic-panel {
      background: rgba(0, 40, 30, 0.8);
      border: 1px solid #0f0;
      box-shadow: 0 0 15px rgba(0, 255, 0, 0.4),
        inset 0 0 10px rgba(0, 255, 0, 0.3);
      backdrop-filter: blur(5px);
      transition: opacity 0.5s, transform 0.5s;
      color: #0f0;
      text-shadow: 0 0 5px #0f0;
      pointer-events: all;
    }

    .earth-observation-panel {
      width: 900px;
      max-width: 90%;
      display: flex;
      gap: 1rem;
      align-items: center;
      padding: 1rem;
    }

    .earth-observation-panel .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .earth-observation-panel label {
      font-size: 0.8rem;
      opacity: 0.7;
      text-transform: uppercase;
    }

    .earth-observation-panel input,
    .earth-observation-panel select {
      font-family: 'Orbitron', sans-serif;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.5rem;
      font-size: 0.9rem;
    }
    .earth-observation-panel select[multiple] {
      height: 60px;
    }
    .earth-observation-panel button {
      align-self: flex-end;
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      height: 38px;
    }

    .globe-results-panel,
    .annotations-panel {
      position: absolute;
      top: 50%;
      right: 2rem;
      transform: translateY(-50%);
      width: 400px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      padding: 1rem;
    }
    .globe-results-panel h3,
    .annotations-panel h3 {
      margin: 0 0 1rem 0;
    }
    .globe-results-panel ul {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.8rem;
    }
    .globe-results-panel li {
      padding: 0.5rem;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
    }
    .globe-results-panel li span {
      opacity: 0.7;
    }
    .annotations-panel .annotation-item {
      padding: 0.75rem;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
      cursor: pointer;
      transition: background 0.3s;
    }
    .annotations-panel .annotation-item:hover {
      background: rgba(0, 255, 0, 0.1);
    }
    .annotations-panel .annotation-item.active {
      background: rgba(0, 255, 0, 0.2);
    }
    .annotations-panel .annotation-label-text {
      font-weight: bold;
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .annotations-panel .annotation-label-text button {
      font-family: 'Orbitron', sans-serif;
      background: transparent;
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.3rem 0.6rem;
      font-size: 0.8rem;
      cursor: pointer;
    }
    .annotations-panel .annotation-label-text button:hover:not(:disabled) {
      background: rgba(0, 255, 0, 0.2);
    }
    .annotations-panel .annotation-label-text button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .annotations-panel .analysis-result {
      font-size: 0.9rem;
      line-height: 1.5;
      margin-top: 0.5rem;
      white-space: pre-wrap;
    }
    .annotations-panel .analysis-result strong,
    .annotations-panel .analysis-result em {
      color: #fff;
    }

    .imagery-controls {
      pointer-events: all;
    }
    .imagery-controls button {
      font-family: 'Orbitron', sans-serif;
      background: rgba(0, 20, 0, 0.8);
      border: 1px solid #0f0;
      box-shadow: 0 0 10px #0f0 inset;
      color: #0f0;
      padding: 0.8rem 1.5rem;
      font-size: 1.1rem;
      cursor: pointer;
    }
    .imagery-controls button:hover:not(:disabled) {
      background: rgba(0, 255, 0, 0.2);
    }

    .research-hub-panel,
    .imap-panel {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 1100px;
      max-width: 90%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }

    .research-hub-header {
      padding: 1rem 2rem;
      border-bottom: 1px solid rgba(0, 255, 0, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .research-hub-header h2 {
      font-size: 1.8rem;
      margin: 0;
      color: #fff;
      text-shadow: 0 0 8px #0f0;
    }

    .research-hub-nav {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .research-hub-nav button {
      font-family: 'Orbitron', sans-serif;
      background: transparent;
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.6rem 1.2rem;
      font-size: 1rem;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.3s, background 0.3s;
    }

    .research-hub-nav button:hover {
      opacity: 1;
      background: rgba(0, 255, 0, 0.1);
    }

    .research-hub-nav button.active {
      opacity: 1;
      background: rgba(0, 255, 0, 0.2);
      box-shadow: 0 0 8px #0f0;
    }

    .research-hub-content {
      padding: 0;
      overflow-y: auto;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }

    .star-catalog-panel,
    .ml-lab-panel {
      padding: 2rem;
    }

    .star-catalog-panel h3,
    .ml-lab-panel h3 {
      font-size: 1.4rem;
      margin: 1.5rem 0 1rem 0;
      color: #0f0;
    }
    .star-catalog-panel h3:first-child {
      margin-top: 0;
    }

    .star-catalog-panel ul {
      list-style: none;
      padding-left: 0;
    }

    .star-catalog-panel li {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-left: 3px solid rgba(0, 255, 0, 0.3);
    }
    .star-catalog-panel strong {
      color: #fff;
      font-weight: 700;
      display: block;
      margin-bottom: 0.5rem;
      font-size: 1.2rem;
    }
    .star-catalog-panel .star-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      font-size: 0.9rem;
      opacity: 0.8;
      margin-top: 0.5rem;
    }
    .star-catalog-panel .star-details span {
      background: rgba(0, 0, 0, 0.2);
      padding: 0.25rem 0.5rem;
    }
    .t2-result-description {
      opacity: 0.8;
      font-size: 0.9rem;
      line-height: 1.5;
      margin-top: 0.5rem;
      margin-bottom: 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* IMAP Panel Styles */
    .imap-panel {
      flex-direction: row;
      gap: 2rem;
      padding: 2rem;
    }
    .imap-panel h2 {
      font-size: 1.8rem;
      margin: 0 0 1.5rem 0;
      color: #fff;
      text-shadow: 0 0 8px #0f0;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
      padding-bottom: 1rem;
    }
    .imap-panel h3 {
      font-size: 1.4rem;
      margin: 2rem 0 1rem 0;
      color: #0f0;
    }
    .imap-panel > div {
      flex: 1;
    }
    .imap-column-1 {
      max-width: 50%;
    }
    .imap-column-2 {
      display: flex;
      flex-direction: column;
    }
    .imap-panel .mission-summary strong,
    .imap-panel .mission-summary em {
      color: #fff;
    }
    .imap-panel button {
      font-family: 'Orbitron', sans-serif;
      background: transparent;
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.8rem 1.5rem;
      font-size: 1.1rem;
      cursor: pointer;
      text-shadow: 0 0 5px #0f0;
      transition: background 0.3s, box-shadow 0.3s;
      margin-bottom: 1rem;
    }
    .imap-panel button:hover:not(:disabled) {
      background: rgba(0, 255, 0, 0.2);
      box-shadow: 0 0 10px #0f0;
    }
    .imap-panel button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .imap-panel button.active {
      background: rgba(0, 255, 0, 0.2);
      box-shadow: 0 0 10px #0f0;
    }
    .data-log-container {
      flex-grow: 1;
      height: 300px;
      overflow-y: scroll;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.5rem;
      border: 1px solid rgba(0, 255, 0, 0.2);
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
    }
    .data-log-entry {
      padding: 0.25rem;
      white-space: nowrap;
      animation: fadeInLog 0.5s;
    }
    .heliosphere-schematic {
      background: rgba(0, 255, 0, 0.05);
      border: 1px solid rgba(0, 255, 0, 0.1);
      padding: 1rem;
    }
    .heliosphere-schematic text {
      font-family: 'Orbitron', sans-serif;
      fill: #0f0;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .heliosphere-schematic .label-line {
      stroke: #0f0;
      stroke-width: 0.5px;
      opacity: 0.5;
    }

    /* JWST Panel Styles */
    .jwst-panel {
      padding: 2rem;
      display: flex;
      gap: 2rem;
      flex-grow: 1;
      min-height: 0;
    }
    .jwst-column-1 {
      flex: 0 0 350px;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .jwst-column-1 .mission-summary {
      overflow-y: auto;
      flex-shrink: 1;
    }
    .jwst-column-2 {
      flex: 1 1 auto;
      min-width: 0;
      background: #000;
      border: 1px solid rgba(0, 255, 0, 0.2);
    }
    #jwst-osd-viewer {
      width: 100%;
      height: 100%;
    }
    .jwst-panel h3 {
      font-size: 1.4rem;
      margin: 1.5rem 0 1rem 0;
      color: #0f0;
    }
    .jwst-panel h3:first-child {
      margin-top: 0;
    }
    .jwst-image-list {
      list-style: none;
      padding: 0;
      margin: 0;
      overflow-y: auto;
      border: 1px solid rgba(0, 255, 0, 0.2);
      flex-shrink: 1;
    }
    .jwst-image-list li {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(0, 255, 0, 0.1);
      cursor: pointer;
      transition: background 0.3s, color 0.3s, box-shadow 0.3s;
    }
    .jwst-image-list li:hover {
      background: rgba(0, 255, 0, 0.1);
    }
    .jwst-image-list li.active {
      background: rgba(0, 255, 0, 0.2);
      color: #fff;
      box-shadow: inset 3px 0 0 #0f0;
    }

    /* Video Lab Panel Styles */
    .video-lab-panel {
      padding: 2rem;
      display: flex;
      gap: 2rem;
      flex-grow: 1;
      min-height: 0;
    }
    .video-lab-controls {
      flex: 0 0 400px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .video-lab-controls textarea {
      font-family: 'Orbitron', sans-serif;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.5rem;
      font-size: 1rem;
      resize: vertical;
      min-height: 80px;
    }
    .video-lab-controls input[type='file'] {
      font-family: 'Orbitron', sans-serif;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.5rem;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .video-lab-controls input[type='file']::file-selector-button {
      font-family: 'Orbitron', sans-serif;
      background: transparent;
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.3rem 0.6rem;
      cursor: pointer;
      margin-right: 1rem;
      transition: background 0.3s;
    }
    .video-lab-controls input[type='file']::file-selector-button:hover {
      background: rgba(0, 255, 0, 0.2);
    }
    .image-preview {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.5rem;
      border: 1px solid rgba(0, 255, 0, 0.2);
    }
    .image-preview img {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border: 1px solid rgba(0, 255, 0, 0.2);
    }
    .image-preview span {
      flex-grow: 1;
      font-size: 0.8rem;
      opacity: 0.8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .image-preview button {
      background: none;
      border: none;
      color: #ff4444;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .video-lab-results {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(0, 255, 0, 0.2);
      padding: 2rem;
      text-align: center;
    }
    .video-loading h4,
    .video-error h4,
    .video-idle h4,
    .video-player-container h4 {
      font-size: 1.4rem;
      margin: 1rem 0;
      color: #fff;
    }
    .video-loading p {
      opacity: 0.8;
    }
    .video-loading .warning {
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: #ffd700;
      opacity: 0.9;
    }
    .video-error p {
      color: #ff4444;
    }
    .video-player-container video {
      max-width: 100%;
      max-height: 50vh;
      border: 1px solid #0f0;
      background: #000;
    }

    /* ML Lab Panel Styles */
    .ml-lab-panel {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
    }
    .ml-lab-panel > .training-panel {
      flex: 1;
      transition: opacity 0.5s;
    }
    .ml-lab-panel > .results-panel {
      flex: 1;
      transition: flex 0.5s;
    }
    .ml-lab-panel.live-active > .training-panel {
      opacity: 0.6;
      pointer-events: none;
    }
    .ml-lab-panel.live-active > .results-panel {
      flex: 1.5;
    }
    .ml-lab-panel > .training-panel, .ml-lab-panel > .results-panel {
      flex: 1;
    }
    .ml-lab-intro {
      width: 100%;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
    }
    .ml-lab-intro h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
      color: #fff;
    }
    .ml-lab-intro p {
      margin: 0;
      opacity: 0.8;
      font-size: 0.9rem;
      line-height: 1.6;
    }
    .training-form,
    .classification-panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .ml-form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border: 0;
      padding: 0;
    }
    .ml-form-group > label,
    .ml-form-group > legend {
      font-size: 0.9rem;
      opacity: 0.8;
      text-transform: uppercase;
    }
    .ml-lab-panel select,
    .ml-lab-panel input[type='text'],
    .ml-lab-panel input[type='number'] {
      font-family: 'Orbitron', sans-serif;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.5rem;
      font-size: 1rem;
    }
    .dataset-description {
      font-size: 0.85rem;
      opacity: 0.7;
      line-height: 1.5;
      margin-top: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      padding: 0.5rem 0.75rem;
      border-left: 2px solid rgba(0, 255, 0, 0.3);
      font-style: italic;
    }
    .feature-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.5rem;
      border: 1px solid rgba(0, 255, 0, 0.2);
    }
    .feature-list label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .ml-lab-panel button,
    .t2-search-form button {
      font-family: 'Orbitron', sans-serif;
      background: transparent;
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.8rem 1.5rem;
      font-size: 1.1rem;
      cursor: pointer;
      text-shadow: 0 0 5px #0f0;
      transition: background 0.3s, box-shadow 0.3s;
    }
    .ml-lab-panel button.live-mode-btn.active {
      background: rgba(0, 255, 0, 0.2);
      box-shadow: 0 0 10px #0f0;
    }
    .ml-lab-panel button:hover:not(:disabled),
    .t2-search-form button:hover:not(:disabled) {
      background: rgba(0, 255, 0, 0.2);
      box-shadow: 0 0 10px #0f0;
    }
    .ml-lab-panel button:disabled,
    .t2-search-form button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .results-panel {
      border-left: 1px solid rgba(0, 255, 0, 0.2);
      padding-left: 2rem;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
    }
    .metric span:first-child {
      opacity: 0.7;
    }
    .confusion-matrix {
      margin-top: 1rem;
      border-collapse: collapse;
      width: 100%;
      text-align: center;
    }
    .confusion-matrix th,
    .confusion-matrix td {
      border: 1px solid rgba(0, 255, 0, 0.3);
      padding: 0.5rem;
    }
    .confusion-matrix th {
      font-weight: normal;
      opacity: 0.7;
    }
    .classification-result {
      padding: 1rem;
      border: 1px solid #0f0;
      margin-top: 1rem;
    }
    .prediction-CONFIRMED {
      color: #ffd700;
      text-shadow: 0 0 8px #ffd700;
    }
    .prediction-CANDIDATE {
      color: #ffff44;
      text-shadow: 0 0 8px #ffff44;
    }
    .prediction-FALSE-POSITIVE {
      color: #ff4444;
      text-shadow: 0 0 8px #ff4444;
    }
    .prediction-PHA {
      color: #ff4444;
      text-shadow: 0 0 8px #ff4444;
    }
    .prediction-NHO {
      color: #88ff88;
      text-shadow: 0 0 8px #88ff88;
    }
    .live-log-container {
      margin-top: 1.5rem;
      border-top: 1px solid rgba(0, 255, 0, 0.2);
      padding-top: 1.5rem;
    }
    .live-log {
      height: 200px;
      overflow-y: scroll;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.5rem;
      border: 1px solid rgba(0, 255, 0, 0.2);
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
    }
    .log-entry {
      padding: 0.25rem;
      white-space: nowrap;
      animation: fadeInLog 0.5s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .log-prediction {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-weight: 700;
    }

    .log-prediction svg {
      width: 1.1em;
      height: 1.1em;
      position: relative;
      top: -1px;
    }

    .prediction-CONFIRMED svg {
      fill: #ffd700;
    }
    .prediction-CANDIDATE svg {
      fill: #ffff44;
    }
    .prediction-FALSE-POSITIVE svg {
      fill: #ff4444;
    }
    .prediction-PHA svg {
      fill: #ff4444;
    }
    .prediction-NHO svg {
      fill: #88ff88;
    }

    /* NASA T2 Panel Styles */
    .t2-search-form {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 2rem;
    }
    .t2-search-form select,
    .t2-search-form input {
      font-family: 'Orbitron', sans-serif;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.8rem;
      font-size: 1rem;
    }
    .t2-search-form input {
      flex-grow: 1;
    }
    .t2-results-container {
      max-height: 50vh;
      overflow-y: auto;
      padding-right: 1rem;
    }
    .t2-results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .t2-result-card {
      background: rgba(0, 255, 0, 0.05);
      border: 1px solid rgba(0, 255, 0, 0.2);
      padding: 1rem;
      cursor: pointer;
      transition: background 0.3s, box-shadow 0.3s;
    }
    .t2-result-card:hover {
      background: rgba(0, 255, 0, 0.1);
      box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
    }
    .t2-result-card-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .t2-result-card-header svg {
      width: 28px;
      height: 28px;
      fill: #0f0;
      flex-shrink: 0;
    }
    .t2-result-card-header h4 {
      margin: 0;
      font-size: 1.1rem;
      color: #fff;
    }

    .t2-detail-modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      pointer-events: all;
    }
    .t2-detail-modal {
      width: 800px;
      max-width: 90%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }
    .t2-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(0, 255, 0, 0.3);
    }
    .t2-detail-header h3 {
      margin: 0;
      font-size: 1.5rem;
      color: #fff;
    }
    .t2-detail-header button {
      background: none;
      border: 1px solid #0f0;
      color: #0f0;
      font-size: 1.2rem;
      cursor: pointer;
      width: 32px;
      height: 32px;
    }
    .t2-detail-content {
      padding: 1.5rem;
      overflow-y: auto;
    }
    .t2-detail-content p {
      line-height: 1.7;
      margin: 0 0 1.5rem 0;
    }
    .t2-detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      font-size: 0.9rem;
    }
    .t2-detail-grid > div {
      background: rgba(0, 0, 0, 0.2);
      padding: 0.5rem;
    }
    .t2-detail-grid strong {
      display: block;
      opacity: 0.7;
      text-transform: uppercase;
      font-size: 0.8rem;
      margin-bottom: 0.25rem;
    }

    /* Space Weather Panel Styles */
    .spaceweather-panel {
      padding: 2rem;
      display: flex;
      gap: 2rem;
      flex-grow: 1;
      min-height: 0;
    }
    .spaceweather-nav {
      flex: 0 0 250px;
      border-right: 1px solid rgba(0, 255, 0, 0.2);
      padding-right: 2rem;
    }
    .spaceweather-nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .spaceweather-nav li {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
      border-left: 3px solid transparent;
      cursor: pointer;
      transition: background 0.3s, border-color 0.3s;
    }
    .spaceweather-nav li:hover {
      background: rgba(0, 255, 0, 0.05);
    }
    .spaceweather-nav li.active {
      background: rgba(0, 255, 0, 0.1);
      border-left-color: #0f0;
      color: #fff;
    }
    .spaceweather-nav li svg {
      width: 24px;
      height: 24px;
      fill: #0f0;
      flex-shrink: 0;
      opacity: 0.7;
    }
    .spaceweather-nav li.active svg {
      opacity: 1;
    }
    .spaceweather-content {
      flex: 1 1 auto;
      min-width: 0;
      overflow-y: auto;
    }
    .spaceweather-content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .spaceweather-content-header h3 {
      font-size: 1.6rem;
      color: #fff;
      margin: 0;
    }
    .spaceweather-content-header button.hud-button {
      padding: 0.5rem;
    }
    .spaceweather-content-header button:disabled svg {
      animation: spin-refresh 1.5s linear infinite;
    }
    .spaceweather-content .loader-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }
    .spaceweather-content ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .spaceweather-content li {
      background: rgba(0, 0, 0, 0.2);
      padding: 1rem 1.5rem;
      margin-bottom: 1rem;
      border-left: 2px solid rgba(0, 255, 0, 0.2);
    }
    .spaceweather-content h4 {
      font-size: 1.1rem;
      margin: 0 0 0.5rem 0;
      color: #fff;
    }
    .spaceweather-content p {
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.8;
      line-height: 1.6;
    }

    /* NASA Data Panel Styles */
    .nasa-data-panel {
      padding: 2rem;
      animation: fadeInPanel 0.5s ease-out;
    }
    .resource-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }
    .resource-card {
      background: rgba(0, 255, 0, 0.05);
      border: 1px solid rgba(0, 255, 0, 0.2);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: background 0.3s, box-shadow 0.3s;
      animation: slideUpFadeIn 0.5s ease-out forwards;
      opacity: 0;
      transform: translateY(20px);
    }
    .resource-card:hover {
      background: rgba(0, 255, 0, 0.1);
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.4);
    }
    .resource-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .resource-header svg {
      width: 32px;
      height: 32px;
      fill: #0f0;
      flex-shrink: 0;
    }
    .resource-header h4 {
      margin: 0;
      font-size: 1.2rem;
      color: #fff;
    }
    .resource-card p {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.6;
      opacity: 0.8;
      flex-grow: 1;
    }
    .resource-card a {
      color: #0f0;
      text-decoration: none;
      border: 1px solid #0f0;
      padding: 0.5rem 1rem;
      text-align: center;
      align-self: flex-start;
      transition: background 0.3s, color 0.3s;
    }
    .resource-card a:hover {
      background: #0f0;
      color: #000;
      text-shadow: none;
    }

    /* Tutorial Styles */
    .tutorial-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      pointer-events: all;
    }
    .tutorial-overlay:focus {
      outline: none;
    }
    .tutorial-spotlight {
      position: absolute;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
      border: 2px solid #0f0;
      pointer-events: none;
      transition: all 0.5s ease-in-out;
    }
    .tutorial-panel {
      position: absolute;
      padding: 1.5rem;
      z-index: 1001;
      transition: all 0.5s ease-in-out;
    }
    .tutorial-panel h3 {
      font-size: 1.4rem;
      margin: 0 0 1rem 0;
      color: #fff;
    }
    .tutorial-panel p {
      font-size: 1rem;
      line-height: 1.6;
      margin: 0 0 1.5rem 0;
    }
    .tutorial-navigation {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid rgba(0, 255, 0, 0.2);
      padding-top: 1rem;
    }
    .tutorial-navigation button {
      font-family: 'Orbitron', sans-serif;
      background: transparent;
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.6rem 1.2rem;
      font-size: 1rem;
      cursor: pointer;
    }
    .tutorial-navigation button:hover {
      background: rgba(0, 255, 0, 0.2);
    }
    .tutorial-skip {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: none;
      color: #0f0;
      opacity: 0.8;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .tutorial-skip:hover {
      opacity: 1;
      text-decoration: underline;
    }

    /* Comparison Tray Styles */
    .comparison-tray {
      pointer-events: all;
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(0, 20, 0, 0.8);
      border: 1px solid #0f0;
      box-shadow: 0 0 10px #0f0 inset;
      padding: 0.5rem 1rem;
      width: auto;
      max-width: 90%;
      border-radius: 4px;
    }
    .comparison-tray-items {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .comparison-item {
      background: rgba(0, 255, 0, 0.1);
      padding: 0.3rem 0.6rem;
      border-radius: 2px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }
    .comparison-item button {
      background: none;
      border: none;
      color: #0f0;
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.7;
    }
    .comparison-item button:hover {
      opacity: 1;
    }
    .comparison-tray button.compare-btn {
      font-family: 'Orbitron', sans-serif;
      background: transparent;
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.5rem 1rem;
      cursor: pointer;
    }
    .comparison-tray button.compare-btn:hover:not(:disabled) {
      background: rgba(0, 255, 0, 0.2);
    }
    .comparison-tray button.compare-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Comparison Panel Styles */
    .comparison-panel-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      pointer-events: all;
    }
    .comparison-panel {
      width: 90%;
      max-width: 1400px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .comparison-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(0, 255, 0, 0.3);
    }
    .comparison-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #fff;
    }
    .comparison-header button {
      background: none;
      border: 1px solid #0f0;
      color: #0f0;
      font-size: 1.2rem;
      cursor: pointer;
      width: 32px;
      height: 32px;
    }
    .comparison-content {
      overflow-x: auto;
    }
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .comparison-table th,
    .comparison-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
      vertical-align: top;
    }
    .comparison-table th {
      font-size: 1.2rem;
      color: #fff;
    }
    .comparison-table td {
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .comparison-table tr > th:first-child,
    .comparison-table tr > td:first-child {
      font-weight: bold;
      opacity: 0.8;
      width: 200px;
    }
    .comparison-table ul {
      margin: 0;
      padding-left: 1rem;
    }

    @keyframes fadeInPanel {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUpFadeIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeInLog {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes spin-refresh {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(-360deg);
      }
    }
  `;

  private speak(text: string) {
    if (this.isMuted || !('speechSynthesis' in window)) {
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
    if (this.showWelcome) this.showWelcome = false;
    if (this.isTutorialActive) this.endTutorial();
    this.audioEngine.playInteractionSound();
    if (!this.hasInteracted) {
      this.hasInteracted = true;
    }

    if (this.currentFocus.type === 'intergalactic') {
      this.synthesizeGalaxy(this.userPrompt || 'a strange, new galaxy');
    } else {
      this.synthesizeExoplanet(
        this.userPrompt || 'a strange, undiscovered world',
      );
    }
    this.userPrompt = '';
  }

  private startAutonomousDiscovery() {
    this.stopAutonomousDiscovery();
    this.discoveryInterval = window.setInterval(() => {
      this.synthesizeExoplanet('another new world');
    }, 60000); // Discover a new planet every 60 seconds
  }

  private stopAutonomousDiscovery() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
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

      if (this.galaxyCustomization.useCustom) {
        prompt += `\n\nCRITICAL: The user has provided specific visual parameters. You MUST use them.
        - Type: "${
          this.galaxyCustomization.type === 'auto'
            ? 'Your choice'
            : this.galaxyCustomization.type
        }"
        - Inside Color: "${this.galaxyCustomization.insideColor}"
        - Outside Color: "${this.galaxyCustomization.outsideColor}"
        - Bulge Size: ${this.galaxyCustomization.bulgeSize}
        - Arm Tightness: ${this.galaxyCustomization.armTightness}
        Your creative role is to generate the 'name' and 'description' to match the user's prompt text, while strictly adhering to the provided visual parameters.`;
      }

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

      // Robustly override AI response with user's custom settings if enabled
      if (this.galaxyCustomization.useCustom) {
        if (this.galaxyCustomization.type !== 'auto') {
          data.type = this.galaxyCustomization.type;
        }
        data.visualization.insideColor = this.galaxyCustomization.insideColor;
        data.visualization.outsideColor =
          this.galaxyCustomization.outsideColor;
        if (data.type.toLowerCase().includes('spiral')) {
          data.visualization.bulgeSize = this.galaxyCustomization.bulgeSize;
          data.visualization.armTightness =
            this.galaxyCustomization.armTightness;
          data.visualization.isBarred = data.type === 'Barred Spiral';
        } else {
          data.visualization.bulgeSize = 0;
          data.visualization.armTightness = 0;
          data.visualization.isBarred = false;
        }
      }

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
      this.speak(`New galaxy discovered. Designating ${newGalaxy.name}.`);
      this.audioEngine.playSuccessSound();
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error = `Cosmic Interference: ${errorMessage}`;
      this.statusMessage = 'Synthesis Failed. Please try a new directive.';
      console.error(e);
      this.speak('Synthesis failed.');
      this.audioEngine.playErrorSound();
    } finally {
      this.isLoading = false;
    }
  }

  async synthesizeGalaxyCluster() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.error = null;
    this.statusMessage = 'Expanding cosmic horizon... Synthesizing new cluster...';
    this.audioEngine.playInteractionSound();

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
      this.speak(`New galactic cluster discovered.`);
      this.audioEngine.playSuccessSound();
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error = `Cosmic Interference: ${errorMessage}`;
      this.statusMessage = 'Cluster Synthesis Failed. Please try again.';
      console.error(e);
      this.speak('Synthesis failed.');
      this.audioEngine.playErrorSound();
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
        "surfaceFeatures": "string (e.g., 'Vast oceans of liquid methane, cryovolcanoes', 'Expansive deserts of red sand, deep canyons')",
        "keyFeatures": ["string", "string", "..."],
        "factoids": ["string", "string", "... (A list of 3-5 short, surprising, and mind-blowing trivia factoids about the planet. Each factoid MUST be a single, complete sentence and under 140 characters.)"],
        "aiWhisper": "string (A highly evocative, poetic, one-sentence description that captures the planet's soul. It MUST be unique and reflect the planet's key features, potential for life, and visual appearance described in the 'visualization' object. Imagine whispering its deepest secret. For example, for a volcanic world with glowing cracks, 'Its heart of fire beats beneath a fractured, obsidian skin.' For a serene water world, 'Here, oceans dream under a sky of liquid turquoise.')",
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
      const data = JSON.parse(jsonString) as PlanetData;
      data.celestial_body_id = `axee-planet-${Date.now()}`;

      // Update state and star catalog
      const newGalaxies = new Map(this.galaxies);
      const currentGalaxy = newGalaxies.get(this.currentGalaxyId!);
      if (currentGalaxy) {
        // Add star to catalog
        if (data.hostStar) {
          const starExists = this.starCatalog.some(
            (star) =>
              star.name === data.hostStar.name &&
              star.galaxyId === currentGalaxy.id,
          );
          if (!starExists) {
            const newStar: StarData = {
              id: `axee-star-${Date.now()}`,
              name: data.hostStar.name,
              type: data.hostStar.type,
              temperatureKelvin: data.hostStar.temperatureKelvin,
              luminositySuns: data.hostStar.luminositySuns,
              galaxyId: currentGalaxy.id,
              galaxyName: currentGalaxy.name,
            };
            this.starCatalog = [...this.starCatalog, newStar];
          }
        }
        currentGalaxy.planets.set(data.celestial_body_id, data);
        this.galaxies = newGalaxies;
      }

      this.statusMessage = `Discovery: ${data.planetName}`;
      this.speak(
        `New discovery. Announcing ${data.planetName}, a ${data.planetType}.`,
      );
      this.audioEngine.playSuccessSound();
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error = `Cosmic Interference: ${errorMessage}`;
      this.statusMessage = 'Synthesis Failed. Please try a new directive.';
      console.error(e);
      this.speak('Synthesis failed.');
      this.audioEngine.playErrorSound();
    } finally {
      this.isLoading = false;
    }
  }

  // Galaxy Customization Methods
  private handleGalaxyCustomizationChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const {name, value, type} = target;

    let processedValue: string | number | boolean = value;
    if (type === 'checkbox') {
      processedValue = (target as HTMLInputElement).checked;
    } else if (type === 'range' || type === 'number') {
      processedValue = parseFloat(value);
    }

    this.galaxyCustomization = {
      ...this.galaxyCustomization,
      [name]: processedValue,
    };
  }

  // NASA T2 API Methods
  private async handleT2ApiSearch() {
    if (!this.t2ApiState.query.keywords.trim()) {
      this.t2ApiState = {
        ...this.t2ApiState,
        error: 'Please enter keywords to search.',
        results: null,
      };
      return;
    }

    this.t2ApiState = {
      ...this.t2ApiState,
      isLoading: true,
      error: null,
      selectedResult: null,
    };

    const {type} = this.t2ApiState.query;

    const mockT2Results = {
      patent: [
        [
          'MSC-25888-1', // ID
          '15/788,881', // Ref Number
          'Advanced Composite Material for Spacecraft', // Title
          'A lightweight, high-strength composite material designed for use in next-generation spacecraft hulls, offering superior radiation shielding and thermal resistance. Developed at Johnson Space Center.', // Description
          '', // Image URL
          'Materials and Coatings', // Category
          'Available for Licensing', // Status
          'MSC-25888-1', // Case Number
          '15/788,881', // Serial Number
          'Johnson Space Center', // Center
        ],
        [
          'LEW-19768-1',
          '14/685,389',
          'High-Efficiency Solar Cell Technology',
          'A novel photovoltaic cell design that achieves higher conversion efficiency by utilizing multi-junction semiconductor materials. Ideal for long-duration space missions and terrestrial renewable energy applications.',
          '',
          'Power Generation and Storage',
          'Patent Pending',
          'LEW-19768-1',
          '14/685,389',
          'Glenn Research Center',
        ],
      ],
      software: [
        [
          'GSC-18128-1',
          'GSC-18128-1',
          'Orbit Prediction and Visualization Software (OPAV)',
          'A high-performance software suite for calculating and visualizing spacecraft orbits with high precision. Includes modules for collision avoidance and maneuver planning. Developed at Goddard Space Flight Center.',
          '',
          'Design and Integration Tools',
          'Available for Download',
          'GSC-18128-1',
          'GSC-18128-1',
          'Goddard Space Flight Center',
        ],
      ],
      spinoff: [
        [
          'KSC-14000-1',
          'KSC-14000-1',
          'Aerogel-Based Insulation for Commercial Use',
          'Originally developed for insulating cryogenic rocket fuels, this aerogel technology has been adapted for highly efficient and lightweight insulation in commercial buildings and industrial applications.',
          '',
          'Spinoff',
          'Commercial Product',
          'KSC-14000-1',
          'KSC-14000-1',
          'Kennedy Space Center',
        ],
      ],
    };

    // Simulate API call due to CORB issues with the public API
    setTimeout(() => {
      this.t2ApiState = {
        ...this.t2ApiState,
        results: mockT2Results[type] || [],
        isLoading: false,
      };
    }, 1000);
  }

  // IMAP Methods
  private async fetchImapSummary() {
    this.imapState = {...this.imapState, isFetchingSummary: true};
    const prompt = `You are AXEE, an AI Mission Specialist. The following text describes the Interstellar Mapping and Acceleration Probe (IMAP) mission. Synthesize this information into a concise, engaging mission briefing suitable for a holographic display. Use markdown for formatting, including bolding key terms. Focus on the mission's purpose, key objectives, and its importance for science and space weather prediction.
    
    Mission Document:
    ---
    ${IMAP_MISSION_BRIEFING_TEXT}
    ---
    `;
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      this.imapState = {
        ...this.imapState,
        summary: response.text,
        isFetchingSummary: false,
      };
    } catch (e) {
      console.error('Failed to fetch IMAP summary:', e);
      this.imapState = {
        ...this.imapState,
        summary: 'Error: Could not retrieve mission briefing.',
        isFetchingSummary: false,
      };
    }
  }

  private async generateImapDataPacket() {
    if (this.isLoading) return; // Don't overwhelm the API
    this.isLoading = true;
    try {
      const prompt = `You are the IMAP probe's real-time data downlink. Generate a single, short, technical data packet (under 150 characters) about current solar wind conditions or heliospheric boundary observations. The format must be exactly: [TIMESTAMP] | SRC:[INSTRUMENT] | EVT:[EVENT_TYPE] | VAL:[VALUE] | UNIT:[UNIT] | STATUS:OK. Use instrument names like SWE, SWAPI, MAG, ENA. Example: [${new Date().toISOString()}] | SRC:SWE | EVT:SOLAR_WIND_SPEED | VAL:451.2 | UNIT:km/s | STATUS:OK`;
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {thinkingConfig: {thinkingBudget: 0}},
      });

      const newLog = [
        response.text.trim(),
        ...this.imapState.dataLog,
      ].slice(0, 100);
      this.imapState = {...this.imapState, dataLog: newLog};
    } catch (e) {
      console.error('Failed to generate IMAP data packet:', e);
    } finally {
      this.isLoading = false;
    }
  }

  private toggleImapStream() {
    if (this.imapState.isStreaming) {
      this.stopImapStream();
    } else {
      this.imapState = {...this.imapState, isStreaming: true};
      this.generateImapDataPacket(); // Initial packet
      this.imapStreamInterval = window.setInterval(
        () => this.generateImapDataPacket(),
        10000,
      );
    }
  }

  private stopImapStream() {
    if (this.imapStreamInterval) {
      clearInterval(this.imapStreamInterval);
      this.imapStreamInterval = null;
    }
    this.imapState = {...this.imapState, isStreaming: false};
  }

  // JWST Methods
  private async fetchJwstSummary() {
    this.jwstState = {...this.jwstState, isFetchingSummary: true};
    const prompt = `You are AXEE, an AI Mission Specialist. The following text describes the James Webb Space Telescope (JWST). Synthesize this information into a concise, engaging mission overview suitable for a holographic display. Use markdown for formatting, including bolding key terms. Focus on the telescope's purpose, key capabilities, and its importance for modern astronomy.
    
    Mission Document:
    ---
    ${JWST_INFO_TEXT}
    ---
    `;
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      this.jwstState = {
        ...this.jwstState,
        summary: response.text,
        isFetchingSummary: false,
      };
    } catch (e) {
      console.error('Failed to fetch JWST summary:', e);
      this.jwstState = {
        ...this.jwstState,
        summary: 'Error: Could not retrieve mission overview.',
        isFetchingSummary: false,
      };
    }
  }

  private initJwstOsdViewer() {
    const viewerElement = this.shadowRoot?.querySelector('#jwst-osd-viewer');
    if (viewerElement && !this.jwstOsdViewer) {
      const selectedImage = this.jwstState.images.find(
        (img) => img.key === this.jwstState.selectedImageKey,
      );
      if (!selectedImage) return;

      this.jwstOsdViewer = OpenSeadragon({
        element: viewerElement as HTMLElement,
        prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
        tileSources: {
          type: 'image',
          url: selectedImage.url,
        },
        animationTime: 1.0,
        blendTime: 0.1,
        constrainDuringPan: true,
        maxZoomPixelRatio: 2,
        minZoomLevel: 0.5,
        visibilityRatio: 1,
        zoomPerScroll: 1.5,
      });
    }
  }

  private destroyJwstOsdViewer() {
    if (this.jwstOsdViewer) {
      this.jwstOsdViewer.destroy();
      this.jwstOsdViewer = null;
    }
  }

  private handleJwstImageSelect(key: string) {
    this.jwstState = {...this.jwstState, selectedImageKey: key};
    const selectedImage = this.jwstState.images.find((img) => img.key === key);
    if (this.jwstOsdViewer && selectedImage) {
      this.jwstOsdViewer.open({
        type: 'image',
        url: selectedImage.url,
      });
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

  private handleFocusChanged(e: CustomEvent<FocusChangeEvent>) {
    this.audioEngine.playInteractionSound();
    this.currentFocus = e.detail;
  }

  private handleReturnToGalaxy() {
    this.currentFocus = {type: 'galaxy', id: this.currentGalaxyId!};
  }

  private handleReturnToIntergalactic() {
    this.currentFocus = {type: 'intergalactic'};
  }

  private handleReturnToSolarSystem() {
    this.currentFocus = {type: 'solar_system'};
  }

  private toggleMute() {
    this.audioEngine.playInteractionSound();
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isSpeaking) {
      window.speechSynthesis.cancel();
    }
  }

  private async fetchGlobeData() {
    this.isFetchingGlobeData = true;
    this.globeData = null;
    this.globeError = null;

    const {protocols, startDate, endDate, countryCode} = this.globeQuery;
    if (protocols.length === 0 || !startDate || !endDate || !countryCode) {
      this.globeError = 'Please fill all query fields.';
      this.isFetchingGlobeData = false;
      return;
    }

    // Simulate API call due to CORB issues with the public API
    const mockGlobeData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {type: 'Point', coordinates: [-104.9903, 39.7392]},
          properties: {
            protocol: protocols[0],
            measuredDate: new Date().toISOString(),
            siteName: 'Denver, USA',
          },
        },
        {
          type: 'Feature',
          geometry: {type: 'Point', coordinates: [-95.3698, 29.7604]},
          properties: {
            protocol: protocols[0],
            measuredDate: new Date().toISOString(),
            siteName: 'Houston, USA',
          },
        },
        {
          type: 'Feature',
          geometry: {type: 'Point', coordinates: [-84.388, 33.749]},
          properties: {
            protocol: protocols[0],
            measuredDate: new Date().toISOString(),
            siteName: 'Atlanta, USA',
          },
        },
        {
          type: 'Feature',
          geometry: {type: 'Point', coordinates: [-80.6488, 28.5729]},
          properties: {
            protocol: protocols[0],
            measuredDate: new Date().toISOString(),
            siteName: 'Cape Canaveral, USA',
          },
        },
      ],
    };

    setTimeout(() => {
      this.globeData = mockGlobeData;
      this.isFetchingGlobeData = false;
    }, 1200);
  }

  private handleGlobeQueryChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const name = target.name;
    let value: string | string[];

    if (target.tagName === 'SELECT' && target.hasAttribute('multiple')) {
      value = Array.from((target as HTMLSelectElement).selectedOptions).map(
        (option) => option.value,
      );
    } else {
      value = (target as HTMLInputElement).value;
    }

    this.globeQuery = {
      ...this.globeQuery,
      [name]: value,
    };
  }

  // Deep Space Imagery Methods
  private requestAnnotationAnalysis(annotationId: string) {
    // FIX: The `prepareAnalysis` method was removed from `AxeeVisuals3D` to resolve a
    // method resolution error. The logic to create and dispatch the 'analyze-annotation'
    // event is now handled directly within this component.
    const annotation = this.annotations.find((ann) => ann.id === annotationId);
    if (!annotation) {
      console.error(`Annotation with id ${annotationId} not found.`);
      return;
    }
    // In a real implementation, this would capture a portion of the canvas.
    // For this simulation, we use mock data.
    const mockImageData =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const event = new CustomEvent('analyze-annotation', {
      detail: {id: annotationId, imageData: mockImageData},
      bubbles: true,
      composed: true,
    });
    this.visuals3d.dispatchEvent(event);
  }

  private async handleAnalyzeAnnotation(
    e: CustomEvent<{id: string; imageData: string}>,
  ) {
    const {id, imageData} = e.detail;

    const annIndex = this.annotations.findIndex((a) => a.id === id);
    if (annIndex === -1) return;

    const updatedAnnotations = [...this.annotations];
    updatedAnnotations[annIndex] = {
      ...updatedAnnotations[annIndex],
      isAnalyzing: true,
    };
    this.annotations = updatedAnnotations;

    const prompt = `You are an expert astronomer affiliated with the Space Telescope Science Institute. Analyze this deep space image region, captured by a next-generation space telescope. Provide a concise, insightful description of the visible celestial objects, structures, and phenomena. Your analysis should be accessible to a public audience but grounded in real science.

Focus on:
- Star types and clusters (e.g., young blue stars, old red giants).
- Nebulae characteristics (e.g., emission nebula, reflection nebula, dark nebula).
- Structural features (e.g., gas pillars, Bok globules, protoplanetary disks if visible).
- Evidence of star formation activity.

Format your response using markdown for key terms (e.g., **Emission Nebula**, *Herbig-Haro object*).`;

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageData,
      },
    };
    const textPart = {text: prompt};

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {parts: [imagePart, textPart]},
      });

      const analysisResult = response.text;

      const finalAnnotations = [...this.annotations];
      finalAnnotations[annIndex] = {
        ...finalAnnotations[annIndex],
        analysis: analysisResult,
        isAnalyzing: false,
      };
      this.annotations = finalAnnotations;
    } catch (err) {
      console.error('Gemini analysis failed:', err);
      const finalAnnotations = [...this.annotations];
      finalAnnotations[annIndex] = {
        ...finalAnnotations[annIndex],
        analysis: 'Error: Analysis failed to complete.',
        isAnalyzing: false,
      };
      this.annotations = finalAnnotations;
    }
  }

  private handleAnnotationDrawn(
    e: CustomEvent<{rect: {x: number; y: number; width: number; height: number}}>,
  ) {
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      rect: e.detail.rect,
      label: `Region ${this.annotations.length + 1}`,
      isAnalyzing: false,
    };
    this.annotations = [...this.annotations, newAnnotation];
    this.isDrawingAnnotation = false;
  }

  // ML Lab Methods
  private handleMlLabFormChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const {name, value, type} = target;

    if (name === 'dataset') {
      const dataset = value as 'koi' | 'toi' | 'k2' | 'neossat';
      const newFeaturesForDataset = ML_FEATURES[dataset];
      const newFeatures = newFeaturesForDataset.map((f) => f.id);
      const newClassificationInput: {[key: string]: string} = {};
      newFeaturesForDataset.forEach((feature) => {
        const [min, max] = feature.range;
        const defaultValue = (min + (max - min) / 4).toFixed(
          feature.id.includes('moid') || feature.id.includes('albedo') ? 3 : 1,
        );
        newClassificationInput[feature.id] = defaultValue;
      });

      this.mlLabState = {
        ...this.mlLabState,
        dataset,
        features: newFeatures,
        trainingResults: null,
        classificationResult: null,
        classificationInput: newClassificationInput,
      };
    } else if (type === 'checkbox') {
      const {checked, id} = target as HTMLInputElement;
      const currentFeatures = this.mlLabState.features;
      const newFeatures = checked
        ? [...currentFeatures, id]
        : currentFeatures.filter((f) => f !== id);
      this.mlLabState = {
        ...this.mlLabState,
        features: newFeatures,
      };
    } else {
      // Classification input
      this.mlLabState = {
        ...this.mlLabState,
        classificationInput: {
          ...this.mlLabState.classificationInput,
          [name]: value,
        },
      };
    }
  }

  private async handleTrainModel() {
    this.mlLabState = {
      ...this.mlLabState,
      isTraining: true,
      trainingResults: null,
      classificationResult: null,
      error: null,
    };

    const datasetName = {
      koi: 'Kepler Objects of Interest (KOI)',
      toi: 'TESS Objects of Interest (TOI)',
      k2: 'K2 Planets and Candidates',
      neossat: 'NEOSSat Near-Earth Object Data',
    }[this.mlLabState.dataset];
    const featuresList = this.mlLabState.features.join(', ');

    let prompt: string;
    if (this.mlLabState.dataset === 'neossat') {
      prompt = `You are a data scientist AI. You have been tasked with training a Random Forest classifier to identify Potentially Hazardous Asteroids (PHAs).
The user has selected the ${datasetName} dataset.
The user has chosen the following features for training: ${featuresList}.
The classification goal is to distinguish between 'Potentially Hazardous Asteroid' (PHA) and 'Non-Hazardous Object' (NHO).

Based on this, simulate the training process and return a JSON object with the model's performance. The JSON should be realistic for this kind of task. A high but not perfect accuracy is expected.

Your entire response MUST be a single, valid JSON object with this structure:
{
  "accuracy": "number (between 0.94 and 0.99)",
  "precision": "number (between 0.93 and 0.98)",
  "recall": "number (between 0.92 and 0.97)",
  "matrix": [[number, number], [number, number]] (a 2x2 confusion matrix: [[True NHO, False PHA], [False NHO, True PHA]], representing counts from a test set of 5000 samples),
  "feature_importance": [{ "feature": "string", "importance": "number (sum of all should be 1.0)"}],
  "summary": "string (A brief, one-paragraph summary of the model's performance and key takeaways for NEO classification.)"
}`;
    } else {
      prompt = `You are a data scientist AI. You have been tasked with training a Random Forest classifier to detect exoplanets.
The user has selected the ${datasetName} dataset.
The user has chosen the following features for training: ${featuresList}.

Based on this, simulate the training process and return a JSON object with the model's performance. The JSON should be realistic for this kind of task. A high but not perfect accuracy is expected.

Your entire response MUST be a single, valid JSON object with this structure:
{
  "accuracy": "number (between 0.92 and 0.98)",
  "precision": "number (between 0.91 and 0.97)",
  "recall": "number (between 0.90 and 0.96)",
  "matrix": [[number, number], [number, number]] (a 2x2 confusion matrix: [[True Negative, False Positive], [False Negative, True Positive]], representing counts from a test set of 2000 samples),
  "feature_importance": [{ "feature": "string", "importance": "number (sum of all should be 1.0)"}],
  "summary": "string (A brief, one-paragraph summary of the model's performance and key takeaways.)"
}`;
    }

    try {
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

      this.mlLabState = {
        ...this.mlLabState,
        trainingResults: data,
      };
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'An unknown error occurred.';
      this.mlLabState = {
        ...this.mlLabState,
        error: `Model training simulation failed: ${errorMessage}`,
      };
    } finally {
      this.mlLabState = {...this.mlLabState, isTraining: false};
    }
  }

  private async handleClassifyData() {
    this.mlLabState = {
      ...this.mlLabState,
      isClassifying: true,
      classificationResult: null,
      error: null,
    };
    const currentInput = {...this.mlLabState.classificationInput};

    const datasetName = {
      koi: 'Kepler Objects of Interest (KOI)',
      toi: 'TESS Objects of Interest (TOI)',
      k2: 'K2 Planets and Candidates',
      neossat: 'NEOSSat Near-Earth Object Data',
    }[this.mlLabState.dataset];
    const featuresList =
      this.mlLabState.trainingResults?.feature_importance
        .map((f) => f.feature)
        .join(', ') || this.mlLabState.features.join(', ');

    let prompt: string;
    if (this.mlLabState.dataset === 'neossat') {
      prompt = `You are an AI emulating a trained Random Forest model for Near-Earth Object classification.
The model was trained on the ${datasetName} dataset using these features: ${featuresList}. Its goal is to identify Potentially Hazardous Asteroids (PHAs).

Now, classify the following new object based on its data:
${JSON.stringify(currentInput)}

Return a JSON object with your prediction. The prediction should be one of "PHA" (Potentially Hazardous Asteroid) or "NHO" (Non-Hazardous Object).

Your entire response MUST be a single, valid JSON object with this structure:
{
  "prediction": "string",
  "confidence": "number (a value between 0.0 and 1.0 representing the model's confidence)",
  "reasoning": "string (A short, one or two-sentence explanation for the classification, mentioning which input features like MOID or diameter were most influential.)"
}`;
    } else {
      prompt = `You are an AI emulating a trained Random Forest model for exoplanet classification.
The model was trained on the ${datasetName} dataset using these features: ${featuresList}.

Now, classify the following new candidate based on its data:
${JSON.stringify(currentInput)}

Return a JSON object with your prediction. The prediction should be one of "CONFIRMED", "CANDIDATE", or "FALSE POSITIVE".

Your entire response MUST be a single, valid JSON object with this structure:
{
  "prediction": "string",
  "confidence": "number (a value between 0.0 and 1.0 representing the model's confidence)",
  "reasoning": "string (A short, one or two-sentence explanation for the classification, mentioning which input features were most influential.)"
}`;
    }
    try {
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

      if (this.mlLabState.isLiveMode) {
        const newLogEntry: ClassificationLogEntry = {
          id: Date.now(),
          input: currentInput,
          result: {
            prediction: data.prediction,
            confidence: data.confidence,
          },
        };
        this.mlLabState = {
          ...this.mlLabState,
          liveClassificationLog: [
            newLogEntry,
            ...this.mlLabState.liveClassificationLog,
          ].slice(0, 50), // Keep log size manageable
        };
      } else {
        this.mlLabState = {
          ...this.mlLabState,
          classificationResult: data,
        };
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'An unknown error occurred.';
      this.mlLabState = {
        ...this.mlLabState,
        error: `Classification failed: ${errorMessage}`,
      };
    } finally {
      this.mlLabState = {...this.mlLabState, isClassifying: false};
    }
  }

  private toggleLiveMode = () => {
    const isLive = !this.mlLabState.isLiveMode;
    this.mlLabState = {
      ...this.mlLabState,
      isLiveMode: isLive,
      classificationResult: null, // Clear single result on mode change
    };

    if (isLive) {
      this.liveModeInterval = window.setInterval(this.runLiveStep, 8000);
      this.runLiveStep(); // Run immediately
    } else {
      if (this.liveModeInterval) {
        clearInterval(this.liveModeInterval);
        this.liveModeInterval = null;
      }
    }
  };

  private runLiveStep = () => {
    if (this.mlLabState.isClassifying) return; // Skip if already busy

    const currentFeatures = ML_FEATURES[this.mlLabState.dataset];
    const newInput: {[key: string]: string} = {};

    currentFeatures.forEach((feature) => {
      const [min, max] = feature.range;
      const value = Math.random() * (max - min) + min;
      newInput[feature.id] = value.toFixed(2);
    });

    this.mlLabState = {
      ...this.mlLabState,
      classificationInput: newInput,
    };
    this.handleClassifyData();
  };

  private parseMarkdown(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/(\r\n|\n|\r)/g, '<br>');
  }

  // Tutorial Methods
  private startTutorial() {
    this.showWelcome = false;
    this.isTutorialActive = true;
    this.tutorialStep = 0;
    // Reset view for a consistent starting point
    this.currentFocus = {type: 'intergalactic'};
    this.galaxies = new Map();
    this.starCatalog = [];
  }

  private endTutorial() {
    this.isTutorialActive = false;
  }

  private advanceTutorial(direction: number) {
    const nextStep = this.tutorialStep + direction;
    if (nextStep >= 0 && nextStep < TUTORIAL_STEPS.length) {
      this.tutorialStep = nextStep;
    } else {
      this.endTutorial();
    }
  }

  // Comparison Methods
  private toggleComparisonMode() {
    this.isComparisonModeActive = !this.isComparisonModeActive;
    if (!this.isComparisonModeActive) {
      this.comparisonList = [];
      this.showComparisonPanel = false;
    }
  }

  private handleToggleComparisonPlanet(e: CustomEvent<{planetId: string}>) {
    const {planetId} = e.detail;
    const currentList = this.comparisonList;
    if (currentList.includes(planetId)) {
      this.comparisonList = currentList.filter((id) => id !== planetId);
    } else {
      this.comparisonList = [...currentList, planetId];
    }
  }

  private getPlanetDataById(planetId: string): PlanetData | null {
    for (const galaxy of this.galaxies.values()) {
      if (galaxy.planets.has(planetId)) {
        return galaxy.planets.get(planetId)!;
      }
    }
    return null;
  }

  // Video Lab Methods
  private handleVideoLabFormChange(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.videoLabState = {...this.videoLabState, prompt: target.value};
  }

  private handleVideoLabImageChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        this.videoLabState = {
          ...this.videoLabState,
          inputImage: {
            base64: base64String,
            mimeType: file.type,
            name: file.name,
          },
        };
      };
      reader.readAsDataURL(file);
    }
  }

  private async handleGenerateVideo() {
    this.videoLabState = {
      ...this.videoLabState,
      isLoading: true,
      error: null,
      generatedVideoUrl: null,
      loadingMessage: 'Initializing synthesis core...',
    };

    const VIDEO_LOADING_MESSAGES = [
      'Parsing prompt vectors...',
      'Allocating quantum compute resources...',
      'Beginning temporal rendering...',
      'Interpolating keyframes...',
      'Applying cosmic ray simulation...',
      'Enhancing visual fidelity...',
      'Compressing spacetime stream...',
      'Finalizing video output...',
      'Almost there, calibrating playback...',
    ];
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % VIDEO_LOADING_MESSAGES.length;
      this.videoLabState = {
        ...this.videoLabState,
        loadingMessage: VIDEO_LOADING_MESSAGES[messageIndex],
      };
    }, 8000);

    try {
      const request: {
        model: string;
        prompt: string;
        image?: {imageBytes: string; mimeType: string};
        config: {numberOfVideos: number};
      } = {
        model: 'veo-2.0-generate-001',
        prompt: this.videoLabState.prompt,
        config: {
          numberOfVideos: 1,
        },
      };

      if (this.videoLabState.inputImage) {
        request.image = {
          imageBytes: this.videoLabState.inputImage.base64,
          mimeType: this.videoLabState.inputImage.mimeType,
        };
      }

      let operation = await this.ai.models.generateVideos(request);

      while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        operation = await this.ai.operations.getVideosOperation({operation});
      }

      clearInterval(messageInterval);

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error(
          'Video generation succeeded but no download link was provided.',
        );
      }

      this.videoLabState = {
        ...this.videoLabState,
        loadingMessage: 'Downloading synthesized video...',
      };

      // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
      const videoResponse = await fetch(
        `${downloadLink}&key=${process.env.API_KEY}`,
      );
      if (!videoResponse.ok) {
        throw new Error(
          `Failed to download video file. Status: ${videoResponse.status}`,
        );
      }

      const videoBlob = await videoResponse.blob();
      const videoUrl = URL.createObjectURL(videoBlob);

      this.videoLabState = {
        ...this.videoLabState,
        isLoading: false,
        generatedVideoUrl: videoUrl,
      };
    } catch (e) {
      clearInterval(messageInterval);
      const errorMessage =
        e instanceof Error
          ? e.message
          : 'An unknown error occurred during video synthesis.';
      this.videoLabState = {
        ...this.videoLabState,
        isLoading: false,
        error: errorMessage,
      };
      console.error(e);
    }
  }

  private renderTutorial() {
    if (!this.isTutorialActive) return nothing;
    const step = TUTORIAL_STEPS[this.tutorialStep];
    const isFirstStep = this.tutorialStep === 0;
    const isLastStep = this.tutorialStep === TUTORIAL_STEPS.length - 1;

    return html`
      <div
        class="tutorial-overlay"
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Escape') this.endTutorial();
        }}
        tabindex="0"
      >
        <div
          class="tutorial-spotlight"
          style=${styleMap(step.highlightStyle)}
        ></div>
        <div
          class="holographic-panel tutorial-panel"
          style=${styleMap(step.panelStyle)}
        >
          <h3>
            ${step.title} (${this.tutorialStep + 1}/${TUTORIAL_STEPS.length})
          </h3>
          <p>${unsafeHTML(step.content)}</p>
          <div class="tutorial-navigation">
            ${!isFirstStep
              ? html`<button @click=${() => this.advanceTutorial(-1)}>
                  Previous
                </button>`
              : html`<div></div>`}
            <button @click=${() => this.advanceTutorial(1)}>
              ${isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
          <button class="tutorial-skip" @click=${this.endTutorial}>
            Skip Tour
          </button>
        </div>
      </div>
    `;
  }

  private renderStarCatalogPanel() {
    return html`
      <div class="star-catalog-panel">
        ${this.starCatalog.length === 0
          ? html`<p>
              No stars have been cataloged yet. Synthesize new exoplanets to
              discover their host stars.
            </p>`
          : html`
              <ul>
                ${this.starCatalog.map((star) => {
                  const galaxy = this.galaxies.get(star.galaxyId);
                  return html`
                    <li>
                      <strong>${star.name}</strong>
                      <div class="star-details">
                        <span>STAR TYPE: ${star.type}</span>
                        <span>TEMP: ${star.temperatureKelvin} K</span>
                        <span>LUMINOSITY: ${star.luminositySuns} Sols</span>
                        <span
                          >GALAXY:
                          ${star.galaxyName}${galaxy
                            ? ` (${galaxy.type})`
                            : ''}</span
                        >
                      </div>
                    </li>
                  `;
                })}
              </ul>
            `}
      </div>
    `;
  }

  private renderT2ApiPanel() {
    const patentIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-2 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V4h7v4z"
      />
    </svg>`;
    const softwareIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
      />
    </svg>`;
    const spinoffIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M17 4.5c-2.48 0-4.5 2.02-4.5 4.5V11H8V8l-5 5 5 5v-3h4.5v1.5c0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5V9c0-2.48-2.02-4.5-4.5-4.5z"
      />
    </svg>`;

    const getIcon = (type: string) => {
      switch (type) {
        case 'patent':
          return patentIcon;
        case 'software':
          return softwareIcon;
        case 'spinoff':
          return spinoffIcon;
        default:
          return nothing;
      }
    };

    return html`
      <div class="star-catalog-panel">
        <div class="t2-api-panel">
          <h3>Search NASA Technology Transfer Database</h3>
          <div class="t2-search-form">
            <select
              id="t2-type"
              name="t2-type"
              .value=${this.t2ApiState.query.type}
              @change=${(e: Event) => {
                this.t2ApiState = {
                  ...this.t2ApiState,
                  query: {
                    ...this.t2ApiState.query,
                    type: (e.target as HTMLSelectElement).value as any,
                  },
                };
              }}
            >
              <option value="patent">Patents</option>
              <option value="software">Software</option>
              <option value="spinoff">Spinoffs</option>
            </select>
            <input
              id="t2-keywords"
              name="t2-keywords"
              type="text"
              placeholder="Enter keywords (e.g., rocket)"
              .value=${this.t2ApiState.query.keywords}
              @input=${(e: Event) => {
                this.t2ApiState = {
                  ...this.t2ApiState,
                  query: {
                    ...this.t2ApiState.query,
                    keywords: (e.target as HTMLInputElement).value,
                  },
                };
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') this.handleT2ApiSearch();
              }}
            />
            <button
              @click=${this.handleT2ApiSearch}
              ?disabled=${this.t2ApiState.isLoading ||
              !this.t2ApiState.query.keywords.trim()}
            >
              ${this.t2ApiState.isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <div class="t2-results-container">
            ${this.t2ApiState.isLoading
              ? html`<div
                  style="display: flex; justify-content: center; padding: 2rem;"
                >
                  <div class="loader">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>`
              : this.t2ApiState.error
              ? html`<p style="color: #ff4444;">${this.t2ApiState.error}</p>`
              : this.t2ApiState.results
              ? this.t2ApiState.results.length > 0
                ? html` <p>
                      Displaying ${this.t2ApiState.results.length} results.
                    </p>
                    <div class="t2-results-grid">
                      ${this.t2ApiState.results.map(
                        (item) => html`
                          <div
                            class="t2-result-card"
                            @click=${() =>
                              (this.t2ApiState = {
                                ...this.t2ApiState,
                                selectedResult: item,
                              })}
                          >
                            <div class="t2-result-card-header">
                              ${getIcon(this.t2ApiState.query.type)}
                              <h4>${item[2]}</h4>
                            </div>
                            <p class="t2-result-description">${item[3]}</p>
                          </div>
                        `,
                      )}
                    </div>`
                : html`<p>
                    No results found for "${this.t2ApiState.query.keywords}".
                  </p>`
              : html`<p>
                  Enter a query to search the NASA T2 database.
                </p>`}
          </div>
        </div>
      </div>
      ${this.t2ApiState.selectedResult
        ? html`
            <div
              class="t2-detail-modal-overlay"
              @click=${() =>
                (this.t2ApiState = {
                  ...this.t2ApiState,
                  selectedResult: null,
                })}
            >
              <div
                class="holographic-panel t2-detail-modal"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <div class="t2-detail-header">
                  <h3>${this.t2ApiState.selectedResult[2]}</h3>
                  <button
                    @click=${() =>
                      (this.t2ApiState = {
                        ...this.t2ApiState,
                        selectedResult: null,
                      })}
                  >
                    &times;
                  </button>
                </div>
                <div class="t2-detail-content">
                  <p>${this.t2ApiState.selectedResult[3]}</p>
                  <div class="t2-detail-grid">
                    <div>
                      <strong>ID</strong>
                      <span>${this.t2ApiState.selectedResult[0]}</span>
                    </div>
                    <div>
                      <strong>Reference Number</strong>
                      <span>${this.t2ApiState.selectedResult[1]}</span>
                    </div>
                    <div>
                      <strong>Category</strong>
                      <span
                        >${this.t2ApiState.selectedResult[5] || 'N/A'}</span
                      >
                    </div>
                    <div>
                      <strong>NASA Center</strong>
                      <span
                        >${this.t2ApiState.selectedResult[9] || 'N/A'}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `
        : nothing}
    `;
  }

  private getPredictionIcon(prediction: string) {
    switch (prediction) {
      case 'CONFIRMED':
        return AxeeInterface.confirmedIcon;
      case 'CANDIDATE':
        return AxeeInterface.candidateIcon;
      case 'FALSE POSITIVE':
        return AxeeInterface.falsePositiveIcon;
      case 'PHA':
        return AxeeInterface.phaIcon;
      case 'NHO':
        return AxeeInterface.nhoIcon;
      default:
        return nothing;
    }
  }

  private renderMlLabPanel() {
    return html`
      <div
        class="ml-lab-panel ${classMap({
          'live-active': this.mlLabState.isLiveMode,
        })}"
      >
        <div class="ml-lab-intro">
            <h3>The Challenge of Discovery</h3>
            <p>
            Thousands of new planets have been discovered, but most were identified manually. With advances in AI, we can now automatically analyze vast datasets from missions like Kepler, K2, and TESS to find exoplanets hiding in the noise. This lab allows you to train a simulated AI model on this real-world data and use it to classify new celestial objects.
            </p>
        </div>
        <div class="training-panel">
          <h3>Model Configuration</h3>
          <div class="training-form">
            <div class="ml-form-group">
              <label for="dataset">Astronomical Dataset</label>
              <select
                id="dataset"
                name="dataset"
                .value=${this.mlLabState.dataset}
                @change=${this.handleMlLabFormChange}
                ?disabled=${this.mlLabState.isTraining ||
                this.mlLabState.isLiveMode}
              >
                <option value="koi">Kepler Objects of Interest</option>
                <option value="toi">TESS Objects of Interest</option>
                <option value="k2">K2 Candidates</option>
                <option value="neossat">NEOSSat Astronomy Data</option>
              </select>
              ${this.mlLabState.dataset === 'koi'
                ? html`<p class="dataset-description">
                    The Kepler space telescope provided nearly a decade of data on stellar transits, leading to thousands of discoveries. This dataset contains all confirmed exoplanets, candidates, and false positives from its primary mission, forming a foundational catalog for training exoplanet detection models.
                  </p>`
                : this.mlLabState.dataset === 'toi'
                ? html`<p class="dataset-description">
                    Successor to Kepler, the Transiting Exoplanet Survey Satellite (TESS) has been collecting data since 2018. The TESS Objects of Interest (TOI) catalog is a continuously updated list of candidates, confirmed planets, and false positives identified by the mission, surveying the entire sky.
                  </p>`
                : this.mlLabState.dataset === 'k2'
                ? html`<p class="dataset-description">
                    After its primary mission, Kepler was repurposed as K2, surveying different fields of view along the ecliptic plane. This dataset contains all confirmed planets and candidates from this extended mission, showcasing the telescope's continued discovery potential.
                  </p>`
                : this.mlLabState.dataset === 'neossat'
                ? html`<p class="dataset-description">
                    Near - Earth Object Surveillance Satellite (NEOSSat) -
                    Astronomy Data: The dataset includes the astronomical images
                    from the Near-Earth Object Surveillance Satellite (NEOSSat).
                    NEOSSat is the world's first space telescope dedicated to
                    detecting and tracking asteroids, comets, satellites, and
                    space debris.
                  </p>`
                : nothing}
            </div>
            <fieldset class="ml-form-group">
              <legend>Training Features</legend>
              <div class="feature-list">
                ${ML_FEATURES[this.mlLabState.dataset].map(
                  (feature) => html`
                    <label
                      style="${this.mlLabState.isTraining ||
                      this.mlLabState.isLiveMode
                        ? 'cursor: not-allowed; opacity: 0.6;'
                        : ''}"
                    >
                      <input
                        type="checkbox"
                        id=${feature.id}
                        .checked=${this.mlLabState.features.includes(
                          feature.id,
                        )}
                        @change=${this.handleMlLabFormChange}
                        ?disabled=${this.mlLabState.isTraining ||
                        this.mlLabState.isLiveMode}
                      />
                      ${feature.name}
                    </label>
                  `,
                )}
              </div>
            </fieldset>
            <button
              @click=${this.handleTrainModel}
              ?disabled=${this.mlLabState.isTraining ||
              this.mlLabState.isLiveMode}
            >
              ${this.mlLabState.isTraining ? 'Training Model...' : 'Train Model'}
            </button>
          </div>
        </div>

        <div class="results-panel">
          ${this.mlLabState.trainingResults && !this.mlLabState.isLiveMode
            ? html`
                <h3>Training Results</h3>
                <div class="metric">
                  <span>Accuracy</span>
                  <span
                    >${(
                      this.mlLabState.trainingResults.accuracy * 100
                    ).toFixed(2)}%</span
                  >
                </div>
                <div class="metric">
                  <span>Precision</span>
                  <span
                    >${(
                      this.mlLabState.trainingResults.precision * 100
                    ).toFixed(2)}%</span
                  >
                </div>
                <div class="metric">
                  <span>Recall</span>
                  <span
                    >${(
                      this.mlLabState.trainingResults.recall * 100
                    ).toFixed(2)}%</span
                  >
                </div>
                <p>${this.mlLabState.trainingResults.summary}</p>
                ${this.mlLabState.dataset === 'neossat'
                  ? html` <table class="confusion-matrix">
                      <tr>
                        <th></th>
                        <th>Predicted NHO</th>
                        <th>Predicted PHA</th>
                      </tr>
                      <tr>
                        <th>Actual NHO</th>
                        <td>
                          ${this.mlLabState.trainingResults.matrix[0][0]}
                        </td>
                        <td>
                          ${this.mlLabState.trainingResults.matrix[0][1]}
                        </td>
                      </tr>
                      <tr>
                        <th>Actual PHA</th>
                        <td>
                          ${this.mlLabState.trainingResults.matrix[1][0]}
                        </td>
                        <td>
                          ${this.mlLabState.trainingResults.matrix[1][1]}
                        </td>
                      </tr>
                    </table>`
                  : html`
                      <table class="confusion-matrix">
                        <tr>
                          <th></th>
                          <th>Predicted Not Planet</th>
                          <th>Predicted Planet</th>
                        </tr>
                        <tr>
                          <th>Actual Not Planet</th>
                          <td>
                            ${this.mlLabState.trainingResults.matrix[0][0]}
                          </td>
                          <td>
                            ${this.mlLabState.trainingResults.matrix[0][1]}
                          </td>
                        </tr>
                        <tr>
                          <th>Actual Planet</th>
                          <td>
                            ${this.mlLabState.trainingResults.matrix[1][0]}
                          </td>
                          <td>
                            ${this.mlLabState.trainingResults.matrix[1][1]}
                          </td>
                        </tr>
                      </table>
                    `}
              `
            : !this.mlLabState.isLiveMode
            ? html`<h3>Awaiting Training Data</h3>
                <p>
                  Train a model using the configuration panel to enable
                  classification.
                </p>`
            : nothing}
          ${this.mlLabState.trainingResults
            ? html`
                <div class="classification-panel">
                  <h3>Classification</h3>
                  <button
                    @click=${this.toggleLiveMode}
                    class="live-mode-btn ${classMap({
                      active: this.mlLabState.isLiveMode,
                    })}"
                  >
                    ${this.mlLabState.isLiveMode
                      ? 'Stop Live Mode'
                      : 'Start Live Mode'}
                  </button>
                  ${this.mlLabState.isLiveMode
                    ? html`
                        <div class="live-log-container">
                          <h4>Live Data Stream</h4>
                          <div class="live-log">
                            ${this.mlLabState.liveClassificationLog.map(
                              (entry) => html`
                                <div class="log-entry">
                                  <span
                                    >[${new Date(
                                      entry.id,
                                    ).toLocaleTimeString()}]</span
                                  >
                                  <span
                                    class="log-prediction prediction-${entry
                                      .result.prediction}"
                                    >${this.getPredictionIcon(
                                      entry.result.prediction,
                                    )}
                                    ${entry.result.prediction}</span
                                  >
                                  <span class="log-confidence"
                                    >(${(
                                      entry.result.confidence * 100
                                    ).toFixed(1)}%)</span
                                  >
                                </div>
                              `,
                            )}
                          </div>
                        </div>
                      `
                    : html`
                        <div style="margin-top: 1rem">
                          <h4>Manual Classification</h4>
                          ${ML_FEATURES[this.mlLabState.dataset].map(
                            (feature) => html`
                              <div
                                class="ml-form-group"
                                style="margin-bottom: 0.5rem;"
                              >
                                <label for=${`cls-${feature.id}`}
                                  >${feature.name}</label
                                >
                                <input
                                  id=${`cls-${feature.id}`}
                                  type="number"
                                  name=${feature.id}
                                  .value=${this.mlLabState.classificationInput[
                                    feature.id
                                  ] || ''}
                                  @input=${this.handleMlLabFormChange}
                                  step="0.01"
                                />
                              </div>
                            `,
                          )}
                          <button
                            @click=${this.handleClassifyData}
                            ?disabled=${this.mlLabState.isClassifying}
                            style="margin-top: 1rem;"
                          >
                            ${this.mlLabState.isClassifying
                              ? 'Classifying...'
                              : 'Classify'}
                          </button>
                          ${this.mlLabState.classificationResult
                            ? html`
                                <div class="classification-result">
                                  <div
                                    class="log-prediction prediction-${this
                                      .mlLabState.classificationResult
                                      .prediction}"
                                  >
                                    ${this.getPredictionIcon(
                                      this.mlLabState.classificationResult
                                        .prediction,
                                    )}
                                    <strong
                                      >${this.mlLabState.classificationResult
                                        .prediction}</strong
                                    >
                                  </div>
                                  <div>
                                    Confidence:
                                    ${(
                                      this.mlLabState.classificationResult
                                        .confidence * 100
                                    ).toFixed(1)}%
                                  </div>
                                  <p style="opacity: 0.8; font-size: 0.9rem;">
                                    ${this.mlLabState.classificationResult
                                      .reasoning}
                                  </p>
                                </div>
                              `
                            : nothing}
                        </div>
                      `}
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private renderJwstPanel() {
    return html`
      <div class="jwst-panel">
        <div class="jwst-column-1">
          <h3>James Webb Space Telescope</h3>
          <div class="mission-summary">
            ${this.jwstState.isFetchingSummary
              ? html`<div class="loader"><div></div><div></div><div></div></div>`
              : unsafeHTML(this.parseMarkdown(this.jwstState.summary!))}
          </div>
          <h3>Image Catalog</h3>
          <ul class="jwst-image-list">
            ${this.jwstState.images.map(
              (image) => html`
                <li
                  class=${classMap({
                    active: this.jwstState.selectedImageKey === image.key,
                  })}
                  @click=${() => this.handleJwstImageSelect(image.key)}
                >
                  ${image.name}
                </li>
              `,
            )}
          </ul>
        </div>
        <div class="jwst-column-2">
          <div id="jwst-osd-viewer"></div>
        </div>
      </div>
    `;
  }

  private renderVideoLabPanel() {
    return html`
      <div class="video-lab-panel">
        <div class="video-lab-controls">
          <h3>Video Synthesis Directive</h3>
          <div class="ml-form-group">
            <label for="video-prompt">Prompt</label>
            <textarea
              id="video-prompt"
              name="video-prompt"
              rows="4"
              .value=${this.videoLabState.prompt}
              @input=${this.handleVideoLabFormChange}
              ?disabled=${this.videoLabState.isLoading}
            ></textarea>
          </div>
          <div class="ml-form-group">
            <label for="video-image">Source Image (Optional)</label>
            <input
              type="file"
              id="video-image"
              name="video-image"
              accept="image/png, image/jpeg"
              @change=${this.handleVideoLabImageChange}
              ?disabled=${this.videoLabState.isLoading}
            />
          </div>
          ${this.videoLabState.inputImage
            ? html`
                <div class="image-preview">
                  <img
                    src=${`data:${this.videoLabState.inputImage.mimeType};base64,${this.videoLabState.inputImage.base64}`}
                    alt="Input preview"
                  />
                  <span>${this.videoLabState.inputImage.name}</span>
                  <button
                    @click=${() =>
                      (this.videoLabState = {
                        ...this.videoLabState,
                        inputImage: null,
                      })}
                    ?disabled=${this.videoLabState.isLoading}
                  >
                    &times;
                  </button>
                </div>
              `
            : nothing}
          <button
            @click=${this.handleGenerateVideo}
            ?disabled=${this.videoLabState.isLoading ||
            !this.videoLabState.prompt.trim()}
            style="margin-top: 1rem;"
          >
            ${this.videoLabState.isLoading
              ? 'Synthesizing...'
              : 'Generate Video'}
          </button>
        </div>
        <div class="video-lab-results">
          ${this.videoLabState.isLoading
            ? html`
                <div class="video-loading">
                  <div class="loader"><div></div><div></div><div></div></div>
                  <h4>Synthesis in Progress</h4>
                  <p>${this.videoLabState.loadingMessage}</p>
                  <p class="warning">
                    Video generation can take several minutes. Please do not
                    navigate away.
                  </p>
                </div>
              `
            : this.videoLabState.error
            ? html`
                <div class="video-error">
                  <h4>Synthesis Failed</h4>
                  <p>${this.videoLabState.error}</p>
                </div>
              `
            : this.videoLabState.generatedVideoUrl
            ? html`
                <div class="video-player-container">
                  <h4>Synthesis Complete</h4>
                  <video
                    controls
                    autoplay
                    loop
                    src=${this.videoLabState.generatedVideoUrl}
                  ></video>
                </div>
              `
            : html`
                <div class="video-idle">
                  <h4>Awaiting Directive</h4>
                  <p>
                    Enter a prompt and optionally provide an image to begin
                    video synthesis.
                  </p>
                </div>
              `}
        </div>
      </div>
    `;
  }

  private handleRefreshSpaceWeatherData() {
    this.spaceWeatherState = {...this.spaceWeatherState, isLoading: true};
    // Simulate API call
    setTimeout(() => {
      this.spaceWeatherState = {
        ...this.spaceWeatherState,
        isLoading: false,
        lastUpdated: new Date(),
      };
    }, 1500);
  }

  private renderSpaceWeatherPanel() {
    const categories = {
      Forecasts: {
        icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v5h-2zm0 6h2v2h-2z"/></svg>`,
        content: [
          {
            title: '24-Hour Outlook',
            content:
              'Solar activity is expected to be low with a chance for C-class flares. Geomagnetic field expected to be quiet to unsettled. No significant space weather events predicted.',
          },
          {
            title: 'Proton Flux',
            content:
              'Proton flux levels are currently at background levels. No proton events are expected in the next 72 hours.',
          },
        ],
      },
      Alerts: {
        icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
        content: [
          {
            title: 'Active Alert: G1 Minor Geomagnetic Storm',
            content:
              'A G1 (Minor) geomagnetic storm is currently in progress due to the arrival of a coronal mass ejection (CME). Power grid fluctuations can occur. Minor impact on satellite operations is possible.',
          },
          {
            title: 'No New Alerts',
            content: 'System is monitoring all channels. Stand by for updates.',
          },
        ],
      },
      'Solar Flares': {
        icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z"/></svg>`,
        content: [
          {
            title: 'Recent Event: C3.5 Flare',
            content:
              'A C3.5 class solar flare was observed from Region 3664 at 08:45 UTC. A minor radio blackout may have occurred over the Pacific region.',
          },
        ],
      },
      'Geomagnetic Storms': {
        icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4.07 13.03l2.83-2.83C6.33 9.4 6 8.24 6 7c0-2.21 1.79-4 4-4 .99 0 1.89.36 2.6.95l2.83-2.83C13.97.46 11.23 0 8 0 3.58 0 0 3.58 0 8c0 1.95.7 3.73 1.84 5.03l2.23-2zM22 16c0 2.21-1.79 4-4 4-.99 0-1.89-.36-2.6-.95l-2.83 2.83c1.46.66 2.7.97 3.43.97 4.42 0 8-3.58 8-8 0-1.95-.7-3.73-1.84-5.03l-2.23 2c.57.8.87 1.81.87 2.8z"/></svg>`,
        content: [
          {
            title: 'Kp-index: 5 (Minor Storm)',
            content:
              'The estimated planetary Kp-index is currently at 5, indicating minor geomagnetic storm conditions. Aurora may be visible at high latitudes (northern Michigan and Maine).',
          },
        ],
      },
      'Radiation Storms': {
        icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z"/></svg>`,
        content: [
          {
            title: 'S1 Minor Solar Radiation Storm Watch',
            content:
              'A watch is in effect for a potential S1 (Minor) solar radiation storm due to a recent CME. If it occurs, minor impacts on HF radio and satellite operations are possible.',
          },
        ],
      },
    };
    const selected = this.spaceWeatherState.selectedCategory;
    const selectedContent =
      categories[selected as keyof typeof categories].content;
    const refreshIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`;

    return html`
      <div class="spaceweather-panel">
        <nav class="spaceweather-nav">
          <ul>
            ${Object.entries(categories).map(
              ([name, data]) => html`
                <li
                  class=${classMap({active: selected === name})}
                  @click=${() =>
                    (this.spaceWeatherState = {
                      ...this.spaceWeatherState,
                      selectedCategory: name,
                      lastUpdated: null,
                    })}
                >
                  ${data.icon}
                  <span>${name}</span>
                </li>
              `,
            )}
          </ul>
        </nav>
        <div class="spaceweather-content">
          <div class="spaceweather-content-header">
            <h3>${selected}</h3>
            <button
              class="hud-button"
              @click=${this.handleRefreshSpaceWeatherData}
              ?disabled=${this.spaceWeatherState.isLoading}
              title="Refresh Data"
            >
              ${refreshIcon}
            </button>
          </div>

          ${this.spaceWeatherState.isLoading
            ? html`<div class="loader-container"><div class="loader"><div></div><div></div><div></div></div></div>`
            : html`
                <ul>
                  ${this.spaceWeatherState.lastUpdated
                    ? html`<li>
                        <h4>
                          Data refreshed:
                          ${this.spaceWeatherState.lastUpdated.toLocaleTimeString()}
                        </h4>
                      </li>`
                    : nothing}
                  ${selectedContent.map(
                    (item) => html`
                      <li>
                        <h4>${item.title}</h4>
                        <p>${item.content}</p>
                      </li>
                    `,
                  )}
                </ul>
              `}
        </div>
      </div>
    `;
  }

  private renderNasaDataPanel() {
    const dataIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>`;
    const mlIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`;
    const satelliteIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.31 8.54l-2.83 2.83 2.83 2.83L9.48 17.03l-2.83-2.83-2.83 2.83L1 14.2l2.83-2.83L1 8.54l2.83-2.83 2.83 2.83L9.48 5.7l2.83 2.84zm8.86-1.01L17 3.37l-4.16 4.16 4.16 4.16 4.16-4.16-1.15-1.15-3.01 3-3-3 1.15-1.15 3.01 3.01 3.01-3.01z"/></svg>`;
    const jwstIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3l-1.45 2.51L8 7l2.55 1.49L12 11l1.45-2.51L16 7l-2.55-1.49L12 3zm0 18l-1.45-2.51L8 17l2.55-1.49L12 13l1.45 2.51L16 17l-2.55 1.49L12 21zM21 12l-2.51 1.45L17 16l1.49-2.55L21 12zm-18 0l2.51 1.45L7 16l-1.49-2.55L3 12z"/></svg>`;

    const NASA_RESOURCES = [
      {
        title: 'Exoplanet Transit Surveys (Kepler, K2, TESS)',
        icon: dataIcon,
        description: `Explore catalogs from NASA's premier planet-hunting space telescopes. Kepler, its successor K2, and TESS discover exoplanets by observing transits—the tiny dips in starlight as a planet passes its star. The Kepler Objects of Interest (KOI) and TESS Objects of Interest (TOI) databases are foundational for modern astronomy.`,
        link: 'https://exoplanetarchive.ipac.caltech.edu/',
      },
      {
        title: 'Machine Learning in Exoplanetology',
        icon: mlIcon,
        description: `The vast amount of data from transit surveys necessitates automated analysis. Machine learning algorithms, particularly ensemble-based models like Random Forests, are trained on these datasets to automatically classify signals, separating true exoplanet candidates from astrophysical false positives with high accuracy.`,
        link: 'https://arxiv.org/abs/1802.04712',
      },
      {
        title: 'NEOSSat: Near-Earth Object Surveillance',
        icon: satelliteIcon,
        description: `The NEOSSat microsatellite is the world's first space telescope dedicated to detecting and tracking asteroids and comets. By observing from orbit, it can spot objects that are difficult to see from the ground, contributing vital data to planetary defense efforts and our understanding of the solar system's smaller bodies.`,
        link: 'https://www.asc-csa.gc.ca/eng/satellites/neossat/',
      },
      {
        title: 'James Webb Space Telescope (JWST)',
        icon: jwstIcon,
        description: `As the world's premier space observatory, JWST is revolutionizing our view of the cosmos. Its powerful infrared capabilities allow it to peer through dust clouds to see the birth of stars and planetary systems, and to analyze the atmospheres of distant exoplanets in unprecedented detail, searching for the building blocks of life.`,
        link: 'https://webbtelescope.org/',
      },
    ];
    return html`
      <div class="nasa-data-panel">
        <div class="resource-grid">
          ${NASA_RESOURCES.map(
            (resource, index) => html`
              <div
                class="resource-card"
                style="animation-delay: ${index * 100}ms"
              >
                <div class="resource-header">
                  ${resource.icon}
                  <h4>${resource.title}</h4>
                </div>
                <p>${resource.description}</p>
                <a
                  href=${resource.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  >Learn More</a
                >
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  private renderResearchHub() {
    return html`
      <div class="holographic-panel research-hub-panel">
        <div class="research-hub-header">
          <h2>AXEE RESEARCH HUB</h2>
          <nav class="research-hub-nav">
            <button
              class=${classMap({
                active: this.activeResearchView === 'catalog',
              })}
              @click=${() => (this.activeResearchView = 'catalog')}
            >
              Star Catalog
            </button>
            <button
              class=${classMap({active: this.activeResearchView === 'ml'})}
              @click=${() => (this.activeResearchView = 'ml')}
            >
              Exoplanet Classification Lab
            </button>
            <button
              class=${classMap({active: this.activeResearchView === 't2'})}
              @click=${() => (this.activeResearchView = 't2')}
            >
              NASA Tech Transfer
            </button>
            <button
              class=${classMap({
                active: this.activeResearchView === 'spaceweather',
              })}
              @click=${() => (this.activeResearchView = 'spaceweather')}
            >
              Space Weather
            </button>
            <button
              class=${classMap({active: this.activeResearchView === 'video'})}
              @click=${() => (this.activeResearchView = 'video')}
            >
              Video Synthesis
            </button>
            <button
              class=${classMap({
                active: this.activeResearchView === 'nasa_data',
              })}
              @click=${() => (this.activeResearchView = 'nasa_data')}
            >
              NASA Resources
            </button>
            <button
              class=${classMap({active: this.activeResearchView === 'jwst'})}
              @click=${() => (this.activeResearchView = 'jwst')}
            >
              JWST Deep Field
            </button>
          </nav>
        </div>
        <div class="research-hub-content">
          ${this.activeResearchView === 'catalog'
            ? this.renderStarCatalogPanel()
            : this.activeResearchView === 'ml'
            ? this.renderMlLabPanel()
            : this.activeResearchView === 't2'
            ? this.renderT2ApiPanel()
            : this.activeResearchView === 'spaceweather'
            ? this.renderSpaceWeatherPanel()
            : this.activeResearchView === 'video'
            ? this.renderVideoLabPanel()
            : this.activeResearchView === 'nasa_data'
            ? this.renderNasaDataPanel()
            : this.renderJwstPanel()}
        </div>
      </div>
    `;
  }

  private renderComparisonTray() {
    return html`
      <div class="comparison-tray">
        <div class="comparison-tray-items">
          ${this.comparisonList.map((planetId) => {
            const planet = this.getPlanetDataById(planetId);
            return planet
              ? html`
                  <div class="comparison-item">
                    <span>${planet.planetName}</span>
                    <button
                      @click=${() =>
                        this.handleToggleComparisonPlanet({
                          detail: {planetId},
                        } as CustomEvent)}
                    >
                      &times;
                    </button>
                  </div>
                `
              : nothing;
          })}
        </div>
        <button
          class="compare-btn"
          ?disabled=${this.comparisonList.length < 2}
          @click=${() => (this.showComparisonPanel = true)}
        >
          Compare (${this.comparisonList.length})
        </button>
        <button class="compare-btn" @click=${this.toggleComparisonMode}>
          Exit
        </button>
      </div>
    `;
  }

  private renderComparisonPanel() {
    const planetsToCompare = this.comparisonList
      .map((id) => this.getPlanetDataById(id))
      .filter((p): p is PlanetData => p !== null);

    const attributes = [
      {label: 'Planet Type', key: 'planetType'},
      {label: 'Host Star', key: 'hostStar'},
      {label: 'Distance (LY)', key: 'distanceLightYears'},
      {label: 'Rotational Period', key: 'rotationalPeriod'},
      {label: 'Orbital Period', key: 'orbitalPeriod'},
      {label: 'Moon Count', key: 'moons'},
      {label: 'Life Potential', key: 'potentialForLife'},
      {label: 'Atmosphere', key: 'atmosphericComposition'},
      {label: 'Key Features', key: 'keyFeatures'},
    ];

    return html`
      <div
        class="comparison-panel-overlay"
        @click=${() => (this.showComparisonPanel = false)}
      >
        <div
          class="holographic-panel comparison-panel"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="comparison-header">
            <h2>Exoplanet Comparison</h2>
            <button @click=${() => (this.showComparisonPanel = false)}>
              &times;
            </button>
          </div>
          <div class="comparison-content">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>Attribute</th>
                  ${planetsToCompare.map(
                    (p) => html`<th>${p.planetName}</th>`,
                  )}
                </tr>
              </thead>
              <tbody>
                ${attributes.map(
                  (attr) => html`
                    <tr>
                      <td>${attr.label}</td>
                      ${planetsToCompare.map((p) => {
                        let value = p[attr.key as keyof PlanetData];
                        if (attr.key === 'hostStar') {
                          value = `${p.hostStar.name} (${p.hostStar.type})`;
                        } else if (attr.key === 'moons') {
                          value = p.moons.count;
                        } else if (attr.key === 'potentialForLife') {
                          value = p.potentialForLife.assessment;
                        } else if (attr.key === 'keyFeatures') {
                          return html`<td>
                            <ul>
                              ${p.keyFeatures.map((f) => html`<li>${f}</li>`)}
                            </ul>
                          </td>`;
                        }
                        return html`<td>${value}</td>`;
                      })}
                    </tr>
                  `,
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  private renderGalaxyCustomizationPanel() {
    const isSpiral =
      this.galaxyCustomization.type === 'Spiral' ||
      this.galaxyCustomization.type === 'Barred Spiral';

    return html`
      <div
        class="holographic-panel galaxy-customization-panel"
        @change=${this.handleGalaxyCustomizationChange}
      >
        <h3>Galaxy Customization</h3>
        <div class="customization-group full-width">
          <div class="toggle-group">
            <input
              type="checkbox"
              id="useCustom"
              name="useCustom"
              .checked=${this.galaxyCustomization.useCustom}
            />
            <label for="useCustom">Use Custom Parameters</label>
          </div>
        </div>
        <div class="customization-group">
          <label for="type">Galaxy Type</label>
          <select
            id="type"
            name="type"
            .value=${this.galaxyCustomization.type}
            ?disabled=${!this.galaxyCustomization.useCustom}
          >
            <option value="auto">Auto-Detect</option>
            <option value="Spiral">Spiral</option>
            <option value="Barred Spiral">Barred Spiral</option>
            <option value="Elliptical">Elliptical</option>
            <option value="Irregular">Irregular</option>
          </select>
        </div>
        <div class="customization-group">
          <label for="insideColor">Core Color</label>
          <input
            type="color"
            id="insideColor"
            name="insideColor"
            .value=${this.galaxyCustomization.insideColor}
            ?disabled=${!this.galaxyCustomization.useCustom}
          />
        </div>
        <div
          class="customization-group"
          style=${styleMap({opacity: isSpiral ? 1 : 0.5})}
        >
          <label for="bulgeSize"
            >Bulge Size:
            <span>${this.galaxyCustomization.bulgeSize.toFixed(2)}</span></label
          >
          <input
            type="range"
            id="bulgeSize"
            name="bulgeSize"
            min="0.1"
            max="0.6"
            step="0.05"
            .value=${String(this.galaxyCustomization.bulgeSize)}
            ?disabled=${!this.galaxyCustomization.useCustom || !isSpiral}
          />
        </div>
        <div class="customization-group">
          <label for="outsideColor">Outer Color</label>
          <input
            type="color"
            id="outsideColor"
            name="outsideColor"
            .value=${this.galaxyCustomization.outsideColor}
            ?disabled=${!this.galaxyCustomization.useCustom}
          />
        </div>
        <div
          class="customization-group"
          style=${styleMap({opacity: isSpiral ? 1 : 0.5})}
        >
          <label for="armTightness"
            >Arm Tightness:
            <span>${this.galaxyCustomization.armTightness.toFixed(
              2,
            )}</span></label
          >
          <input
            type="range"
            id="armTightness"
            name="armTightness"
            min="0.5"
            max="1.5"
            step="0.05"
            .value=${String(this.galaxyCustomization.armTightness)}
            ?disabled=${!this.galaxyCustomization.useCustom || !isSpiral}
          />
        </div>
      </div>
    `;
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
    switch (this.currentFocus.type) {
      case 'solar_system':
        trackingText = 'SOLAR SYSTEM';
        break;
      case 'solar_system_planet':
        trackingText = `SOLAR SYSTEM // TRACKING: ${this.currentFocus.id!.toUpperCase()}`;
        break;
      case 'earth':
        trackingText = 'EARTH ORBIT';
        break;
      case 'nebula':
        trackingText = 'DEEP SPACE // NGC 3324';
        break;
      case 'research':
        trackingText = `AXEE RESEARCH HUB // ${
          this.activeResearchView === 'catalog'
            ? 'STAR CATALOG'
            : this.activeResearchView === 'ml'
            ? this.mlLabState.isLiveMode
              ? 'TRACKING: AURELION CORE'
              : 'ML CLASSIFICATION LAB'
            : this.activeResearchView === 't2'
            ? 'NASA TECH TRANSFER'
            : this.activeResearchView === 'spaceweather'
            ? 'SPACE WEATHER DATABASE'
            : this.activeResearchView === 'video'
            ? 'VIDEO SYNTHESIS LAB'
            : this.activeResearchView === 'nasa_data'
            ? 'NASA DATA & RESOURCES'
            : 'JWST DEEP FIELD'
        }`;
        break;
      case 'imap':
        trackingText = 'IMAP L1 DATAPOINT';
        break;
      case 'galaxy':
        trackingText = `GALAXY: ${this.galaxies
          .get(this.currentFocus.id!)
          ?.name.toUpperCase()}`;
        if (this.isComparisonModeActive) {
          trackingText += ' // COMPARISON MODE';
        }
        break;
      case 'planet':
        if (selectedPlanet && currentGalaxy) {
          trackingText = `TRACKING: ${selectedPlanet.planetName.toUpperCase()} (${currentGalaxy.name.toUpperCase()})`;
        }
        break;
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
    const zoomOutIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"
      />
    </svg>`;
    const researchIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"
      />
    </svg>`;
    const homeIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>`;

    const expandIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 8V4h4V2H2v6h2zm16 0V2h-6v2h4v4h2zM4 16v4h4v2H2v-6h2zm16 0v6h-6v-2h4v-4h2z"
      />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="17" cy="7" r="1.5" />
      <circle cx="7" cy="17" r="1.5" />
    </svg>`;

    const helpIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"
      />
    </svg>`;

    const compareIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M10 3H5c-1.1 0-2 .9-2 2v5h7V3zm11 0h-5v7h7V5c0-1.1-.9-2-2-2zm-11 18h5v-7H3v5c0 1.1.9 2 2 2zm11 0h5c1.1 0 2-.9 2-2v-5h-7v7z"
      />
    </svg>`;

    const settingsIcon = html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path
        d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38 2.65c.61-.25 1.17-.59-1.69.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22.07.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"
      />
    </svg>`;

    return html`
      ${this.renderTutorial()}
      ${this.showComparisonPanel ? this.renderComparisonPanel() : nothing}

      <axee-visuals-3d
        .galaxiesData=${Array.from(this.galaxies.values())}
        .currentFocus=${this.currentFocus}
        .isScanning=${this.isLoading}
        .groundingChunks=${this.groundingChunks}
        .annotations=${this.annotations}
        .activeAnnotationId=${this.activeAnnotationId}
        .isDrawingAnnotation=${this.isDrawingAnnotation}
        .mlLabState=${this.mlLabState}
        .isComparisonModeActive=${this.isComparisonModeActive}
        .comparisonList=${this.comparisonList}
        @focus-changed=${this.handleFocusChanged}
      ></axee-visuals-3d>

      <axee-audio-engine .mood=${this.currentMood} ?muted=${this.isMuted}>
      </axee-audio-engine>

      ${this.showWelcome
        ? html` <div class="welcome-overlay">
            <h1>AURELION EXOPLANET SYNTHESIS ENGINE</h1>
            <p>
              Welcome, Observer. AXEE is a generative AI interface for celestial
              discovery. Input a directive to synthesize new galaxies and
              worlds, or explore known cosmic landmarks.
            </p>
            <div class="welcome-overlay-buttons">
              <button @click=${() => (this.showWelcome = false)}>
                INITIALIZE INTERFACE
              </button>
              <button class="secondary" @click=${this.startTutorial}>
                TAKE A TOUR
              </button>
            </div>
          </div>`
        : nothing}

      <div class="overlay">
        <header class="top-hud">
          <div class="tracking-info">TRACKING: ${trackingText}</div>
        </header>

        ${this.currentFocus.type === 'intergalactic' ||
        this.currentFocus.type === 'galaxy' ||
        this.currentFocus.type === 'planet' ||
        this.currentFocus.type === 'solar_system_planet'
          ? html`
              <div class="bottom-left-hud">
                <div class="hud-item">
                  <span>VOICE COMMS</span>
                  <span>${this.isSpeaking ? 'ACTIVE' : 'IDLE'}</span>
                </div>
                <div class="hud-item">
                  <span>AUDIO</span>
                  <span>${this.isMuted ? 'MUTED' : 'ONLINE'}</span>
                </div>
                <div class="hud-item">
                  <span>SYSTEM</span>
                  <span
                    >${this.isLoading ? 'SYNTHESIZING' : 'OPERATIONAL'}</span
                  >
                </div>
                <div class="hud-controls">
                  <button
                    class="hud-button"
                    title="Help / Tutorial"
                    @click=${this.startTutorial}
                  >
                    ${helpIcon}
                  </button>
                  ${this.currentFocus.type === 'intergalactic'
                    ? html`<button
                        class="hud-button"
                        title="Synthesize New Cluster"
                        @click=${this.synthesizeGalaxyCluster}
                      >
                        ${expandIcon}
                      </button>`
                    : nothing}
                  ${this.currentFocus.type === 'galaxy'
                    ? html`
                        <button
                          class="hud-button ${classMap({
                            active: this.isComparisonModeActive,
                          })}"
                          title="Compare Planets"
                          @click=${this.toggleComparisonMode}
                        >
                          ${compareIcon}
                        </button>
                        <button
                          class="hud-button"
                          title="Return to Intergalactic View"
                          @click=${this.handleReturnToIntergalactic}
                        >
                          ${zoomOutIcon}
                        </button>
                      `
                    : nothing}
                  ${this.currentFocus.type === 'planet'
                    ? html`<button
                        class="hud-button"
                        title="Return to Galaxy View"
                        @click=${this.handleReturnToGalaxy}
                      >
                        ${zoomOutIcon}
                      </button>`
                    : nothing}
                  ${this.currentFocus.type === 'solar_system_planet'
                    ? html`<button
                        class="hud-button"
                        title="Return to Solar System View"
                        @click=${this.handleReturnToSolarSystem}
                      >
                        ${zoomOutIcon}
                      </button>`
                    : nothing}
                  <button
                    class="hud-button"
                    title="Solar System"
                    @click=${() => (this.currentFocus = {type: 'solar_system'})}
                  >
                    ${homeIcon}
                  </button>
                  <button
                    class="hud-button"
                    title="Data & Research"
                    @click=${() => {
                      this.currentFocus = {type: 'research'};
                      this.activeResearchView = 'catalog';
                    }}
                  >
                    ${researchIcon}
                  </button>
                  <button
                    class="hud-button"
                    title=${this.isMuted ? 'Unmute' : 'Mute'}
                    @click=${this.toggleMute}
                  >
                    ${this.isMuted ? speakerOffIcon : speakerOnIcon}
                  </button>
                </div>
              </div>
            `
          : nothing}
        ${this.currentFocus.type === 'nebula' && this.annotations.length > 0
          ? html`<div
              class="holographic-panel annotations-panel"
              @mouseenter=${() => {
                this.isDrawingAnnotation = false;
              }}
            >
              <h3>IMAGERY ANALYSIS</h3>
              ${this.annotations.map(
                (ann) => html`
                  <div
                    class="annotation-item ${classMap({
                      active: this.activeAnnotationId === ann.id,
                    })}"
                    @click=${() => (this.activeAnnotationId = ann.id)}
                  >
                    <div class="annotation-label-text">
                      ${ann.label}
                      ${!ann.analysis
                        ? html`<button
                            @click=${() =>
                              this.requestAnnotationAnalysis(ann.id)}
                            ?disabled=${ann.isAnalyzing}
                          >
                            ${ann.isAnalyzing ? 'Analyzing...' : 'Analyze'}
                          </button>`
                        : nothing}
                    </div>
                    ${ann.analysis
                      ? html`<div class="analysis-result">
                          ${unsafeHTML(this.parseMarkdown(ann.analysis))}
                        </div>`
                      : nothing}
                    ${ann.isAnalyzing
                      ? html`<div class="loader">
                          <div></div>
                          <div></div>
                          <div></div>
                        </div>`
                      : nothing}
                  </div>
                `,
              )}
            </div>`
          : nothing}
        ${this.currentFocus.type === 'earth'
          ? html`
              <div
                class="holographic-panel earth-observation-panel"
                style="position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%)"
              >
                <div class="form-group">
                  <label for="protocols">Protocols</label>
                  <select
                    id="protocols"
                    name="protocols"
                    multiple
                    .value=${this.globeQuery.protocols}
                    @change=${this.handleGlobeQueryChange}
                  >
                    ${AVAILABLE_PROTOCOLS.map(
                      (p) => html`<option value=${p}>${p}</option>`,
                    )}
                  </select>
                </div>
                <div class="form-group">
                  <label for="startDate">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    .value=${this.globeQuery.startDate}
                    @change=${this.handleGlobeQueryChange}
                  />
                </div>
                <div class="form-group">
                  <label for="endDate">End Date</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    .value=${this.globeQuery.endDate}
                    @change=${this.handleGlobeQueryChange}
                  />
                </div>
                <div class="form-group">
                  <label for="countryCode">Country Code</label>
                  <input
                    type="text"
                    id="countryCode"
                    name="countryCode"
                    .value=${this.globeQuery.countryCode}
                    @change=${this.handleGlobeQueryChange}
                    maxlength="3"
                  />
                </div>
                <button
                  class="hud-button"
                  @click=${this.fetchGlobeData}
                  ?disabled=${this.isFetchingGlobeData}
                >
                  QUERY
                </button>
              </div>
            `
          : nothing}
        ${this.currentFocus.type === 'research'
          ? this.renderResearchHub()
          : nothing}
        ${this.currentFocus.type === 'imap'
          ? html`
              <div class="holographic-panel imap-panel">
                <div class="imap-column-1">
                  <h2>IMAP Mission Control</h2>
                  <div class="mission-summary">
                    ${this.imapState.isFetchingSummary
                      ? html`<div class="loader">
                          <div></div>
                          <div></div>
                          <div></div>
                        </div>`
                      : unsafeHTML(this.parseMarkdown(this.imapState.summary!))}
                  </div>
                  <h3>Heliosphere Schematic</h3>
                  <div class="heliosphere-schematic">
                    <svg
                      viewBox="0 0 200 120"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <radialGradient id="sunGradient">
                          <stop offset="0%" stop-color="#FFD700" />
                          <stop offset="100%" stop-color="#FFA500" />
                        </radialGradient>
                      </defs>
                      <path
                        d="M 198,20 A 100 80 0 0 0 198,100"
                        fill="none"
                        stroke="#0f0"
                        stroke-width="0.5"
                        stroke-dasharray="2 2"
                      />
                      <text x="180" y="15">Bow Shock</text>
                      <ellipse
                        cx="100"
                        cy="60"
                        rx="80"
                        ry="50"
                        fill="none"
                        stroke="#0f0"
                        stroke-width="0.5"
                      />
                      <text x="140" y="25">Heliopause</text>
                      <ellipse
                        cx="100"
                        cy="60"
                        rx="60"
                        ry="35"
                        fill="none"
                        stroke="#0f0"
                        stroke-width="0.5"
                        stroke-dasharray="1 1"
                      />
                      <text x="120" y="40">Termination Shock</text>
                      <circle cx="20" cy="60" r="5" fill="url(#sunGradient)" />
                      <text x="15" y="72">Sun</text>
                      <circle cx="35" cy="60" r="1" fill="#0f0" />
                      <line
                        x1="35"
                        y1="60"
                        x2="40"
                        y2="50"
                        class="label-line"
                      />
                      <text x="42" y="48">IMAP @ L1</text>
                    </svg>
                  </div>
                </div>
                <div class="imap-column-2">
                  <h3>Live Data Stream</h3>
                  <button
                    @click=${this.toggleImapStream}
                    class=${classMap({active: this.imapState.isStreaming})}
                    ?disabled=${this.isLoading && !this.imapState.isStreaming}
                  >
                    ${this.imapState.isStreaming
                      ? 'Stop Data Stream'
                      : 'Initiate Data Stream'}
                  </button>
                  <div class="data-log-container">
                    ${this.imapState.dataLog.map(
                      (entry) =>
                        html`<div class="data-log-entry">> ${entry}</div>`,
                    )}
                  </div>
                </div>
              </div>
            `
          : nothing}

        <footer
          style="z-index: 10; /* Ensure footer is above visuals */"
        >
          <div class="status-bar">
            ${this.isLoading
              ? html`<div class="loader">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>`
              : nothing}
            ${this.error || this.statusMessage}
          </div>

          ${this.showGalaxyCustomization &&
          this.currentFocus.type === 'intergalactic'
            ? this.renderGalaxyCustomizationPanel()
            : nothing}
          ${this.currentFocus.type === 'nebula'
            ? html`
                <div class="imagery-controls">
                  <button
                    @click=${() =>
                      (this.isDrawingAnnotation = !this.isDrawingAnnotation)}
                  >
                    ${this.isDrawingAnnotation
                      ? 'Cancel Annotation'
                      : 'Start Annotation'}
                  </button>
                </div>
              `
            : this.isComparisonModeActive
            ? this.renderComparisonTray()
            : html`
                <div class="command-bar">
                  <input
                    id="synthesis-prompt"
                    name="synthesis-prompt"
                    type="text"
                    placeholder="Enter synthesis directive..."
                    .value=${this.userPrompt}
                    @input=${(e: Event) =>
                      (this.userPrompt = (e.target as HTMLInputElement).value)}
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') this.handleSynthesis();
                    }}
                    ?disabled=${this.isLoading}
                  />
                  ${this.currentFocus.type === 'intergalactic'
                    ? html`
                        <button
                          class="settings-button ${classMap({
                            active: this.showGalaxyCustomization,
                          })}"
                          title="Galaxy Customization"
                          @click=${() =>
                            (this.showGalaxyCustomization =
                              !this.showGalaxyCustomization)}
                        >
                          ${settingsIcon}
                        </button>
                      `
                    : nothing}
                  <button
                    class="send-button"
                    @click=${this.handleSynthesis}
                    ?disabled=${this.isLoading}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24"
                    >
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              `}
        </footer>
      </div>
    `;
  }
}
