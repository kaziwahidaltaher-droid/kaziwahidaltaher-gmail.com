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
  Chat,
} from '@google/genai';
import {
  Chart,
  BarController,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {LitElement, html, css, PropertyValueMap} from 'lit-element';
import {nothing} from 'lit-html';
import {customElement, state, query} from 'lit-element/decorators.js';
import {classMap} from 'lit-html/directives/class-map.js';
import {styleMap} from 'lit-html/directives/style-map.js';
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
import './planet-visualizer';
import './weather-visualizer';
import './energy-signature-visualizer';
import './shader-lab-visualizer';
import './qubit-visualizer';
import {SolarSystem} from './solar-system-data';
import { VolumeMeter } from './volume-meter';

Chart.register(
  BarController,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);


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
  gravity: string;
  surfacePressure: string;
  magnetosphereStrength: string;
  geologicalActivity: string;
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
  discoverySource?: 'synthesis' | 'stream' | 'archive';
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
  lightCurveData?: LightCurveAnalysis;
  radialVelocityData?: RadialVelocityAnalysis;
  magnetosphereAnalysisData?: MagnetosphereAnalysis;
  deepScanData?: DeepScanAnalysis;
  exoSuitAnalysisData?: ExoSuitAnalysis;
  weatherAnalysisData?: WeatherAnalysis;
  energySignatureAnalysisData?: EnergySignatureAnalysis;
  atmosphereAnalysisData?: AtmosphereAnalysis;
  qubitStateData?: QubitStateAnalysis;
  generatedImageData?: { url: string; prompt: string; };
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
  isUnseenRevealed?: boolean;
  isLeftPanelOpen?: boolean;
  isRightPanelOpen?: boolean;
  leftPanelView?: 'list' | 'predictor';
  databaseSort?: {key: string, order: 'asc' | 'desc'};
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

export interface LightCurveAnalysis {
  summary: string;
  points: LightCurvePoint[];
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

// Weather Analysis
export interface WeatherAnalysis {
  summary: string;
  temperature: {
    day: number;
    night: number;
    units: string;
  };
  wind: {
    speed: number;
    direction: string;
    units: string;
  };
  storms: string[];
}

// Energy Signature Analysis
export interface EnergySignaturePoint {
  frequency: number; // in THz
  intensity: number; // 0-1
  type: string; // e.g., 'Bioluminescent', 'Radio', 'Tachyon'
}
export interface EnergySignatureAnalysis {
  summary: string;
  points: EnergySignaturePoint[];
}

// Atmosphere Analysis
export interface AtmosphereAnalysis {
  summary: string;
  composition: {
    gas: string;
    percentage: number;
  }[];
}

// Qubit State Analysis
export interface QubitStateAnalysis {
  summary: string;
  stateVector: {
    theta: number; // polar angle, 0 to PI
    phi: number;   // azimuthal angle, 0 to 2*PI
  };
  measurementBasis: string; // e.g., 'Z-basis', 'X-basis'
}

// Conversation State
type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';
type CoreOverlay = 'none' | 'ai-core' | 'database' | 'archives' | 'shader-lab' | 'help' | 'settings' | 'session';


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
  discoverySource: 'archive',
  moons: {count: 2, names: ['Aethel', 'Gard']},
  potentialForLife: {
    assessment: 'Potentially Habitable',
    reasoning:
      'Located within the habitable zone with a dense, nitrogen-oxygen atmosphere. Evidence of liquid water on the surface.',
    biosignatures: ['Oxygen', 'Methane (trace)'],
  },
  gravity: '1.5 g',
  surfacePressure: '1.2 atm',
  magnetosphereStrength: 'Strong',
  geologicalActivity: 'Active',
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
  lightCurveData: {
    summary: 'Initial archival data reveals a distinct transit signature, confirming the presence of Aethelgard. The light curve shows a clear, periodic dip with minimal stellar noise, indicating a stable orbit and a significant planetary body.',
    points: [
      { time: 2454365.1, flux: 1.0002, error: 0.0001 },
      { time: 2454365.15, flux: 1.0001, error: 0.0001 },
      { time: 2454365.2, flux: 0.9999, error: 0.0001 },
      { time: 2454365.25, flux: 1.0000, error: 0.0001 },
      { time: 2454365.3, flux: 0.9998, error: 0.0001 },
      { time: 2454365.35, flux: 0.9995, error: 0.0001 },
      { time: 2454365.4, flux: 0.9988, error: 0.0001 },
      { time: 2454365.45, flux: 0.9986, error: 0.0001 },
      { time: 2454365.5, flux: 0.9985, error: 0.0001 },
      { time: 2454365.55, flux: 0.9985, error: 0.0001 },
      { time: 2454365.6, flux: 0.9986, error: 0.0001 },
      { time: 2454365.65, flux: 0.9987, error: 0.0001 },
      { time: 2454365.7, flux: 0.9989, error: 0.0001 },
      { time: 2454365.75, flux: 0.9994, error: 0.0001 },
      { time: 2454365.8, flux: 1.0001, error: 0.0001 },
      { time: 2454365.85, flux: 0.9999, error: 0.0001 },
      { time: 2454365.9, flux: 0.9998, error: 0.0001 },
      { time: 2454365.95, flux: 1.0001, error: 0.0001 },
      { time: 2454366.0, flux: 1.0003, error: 0.0001 },
    ]
  },
};

const VERIDIA_PLANET: PlanetData = {
  celestial_body_id: 'aurelion-methane-123',
  created_at: new Date().toISOString(),
  planetName: 'Veridia',
  starSystem: 'Gliese 581',
  starType: 'M-type red dwarf',
  distanceLightYears: 20.4,
  planetType: 'Methane Super-Earth',
  rotationalPeriod: '55 Earth hours',
  orbitalPeriod: '84 Earth days',
  moons: {count: 1, names: ['Thall']},
  potentialForLife: {
    assessment: 'Exotic Life Candidate',
    reasoning:
      'Dense methane-ammonia atmosphere shows complex organic chemistry. Potential for methanogenic, non-aqueous life forms in its liquid hydrocarbon seas.',
    biosignatures: [
      'Complex Hydrocarbons',
      'Tholins',
      'Anomalous thermal gradients',
    ],
  },
  gravity: '1.8 g',
  surfacePressure: '5 atm',
  magnetosphereStrength: 'Moderate',
  geologicalActivity: 'Cryovolcanic',
  discoveryNarrative:
    'A candidate world identified through atmospheric spectroscopy, revealing a composition unlike anything in the Sol system. Veridia challenges our understanding of where life can exist.',
  discoveryMethodology: 'James Webb Space Telescope atmospheric analysis.',
  atmosphericComposition:
    '85% Methane, 10% Nitrogen, 4% Ammonia, trace hydrocarbons.',
  surfaceFeatures:
    'Vast, sluggish seas of liquid methane and ethane under a thick orange smog. Jagged mountains of water ice form continents.',
  keyFeatures: [
    'Liquid methane seas',
    'Methane-based atmospheric cycle',
    'Potential for exotic biology',
  ],
  aiWhisper:
    'A world slumbering under a haze of orange, where rivers of cold fire carve canyons through mountains of ice.',
  orbitalPeriodDays: 84.0,
  transitDurationHours: 4.1,
  planetRadiusEarths: 2.1,
  axeeClassification: 'Candidate',
  discoverySource: 'synthesis',
  visualization: {
    color1: '#b48b59',
    color2: '#e5a56b',
    oceanColor: '#4f3b2d',
    atmosphereColor: '#d6a378',
    hasRings: true,
    cloudiness: 0.8,
    iceCoverage: 0.3,
    surfaceTexture: 'TERRESTRIAL',
  },
};

const KAIROS_PLANET: PlanetData = {
  celestial_body_id: 'aurelion-organic-456',
  created_at: new Date().toISOString(),
  planetName: 'Kairos',
  starSystem: 'Chrono-A4',
  starType: 'Pulsar',
  distanceLightYears: 812.3,
  planetType: 'Organic World',
  rotationalPeriod: 'Unknown',
  orbitalPeriod: '78.1 Earth days',
  moons: {count: 0, names: []},
  potentialForLife: {
    assessment: 'Confirmed (Exotic)',
    reasoning:
      'The entire planet appears to be a single, complex organism. Its surface pulses with a rhythmic bioluminescence, suggesting a global consciousness operating on geological timescales.',
    biosignatures: [
      'Complex Organic Polymers',
      'Synchronized Light Patterns',
      'Non-Keplerian Orbital Deviations',
    ],
  },
  gravity: '1.1 g',
  surfacePressure: 'Varies',
  magnetosphereStrength: 'Anomalous (Pulsing)',
  geologicalActivity: 'Bio-tectonic',
  discoveryNarrative:
    'Detected as a faint, rhythmic pulse of light around a distant pulsar, Kairos was initially mistaken for a stellar anomaly. Closer analysis revealed a world shrouded in a living, glowing web.',
  discoveryMethodology: 'Gravitational Lensing & Light Pattern Analysis.',
  atmosphericComposition:
    'A thin shell of ionized noble gases, seemingly exhaled by the planet itself.',
  surfaceFeatures:
    'A global network of pulsating, bioluminescent veins over a dark, shifting substrate. No distinct continents or oceans are visible, only the ever-changing patterns of light.',
  keyFeatures: [
    'Global Bioluminescence',
    'Planet-wide Organism',
    'Orbits a Pulsar',
  ],
  aiWhisper:
    'A world that breathes light, its thoughts measured in the slow pulse of eons.',
  orbitalPeriodDays: 78.1,
  transitDurationHours: 2.5,
  planetRadiusEarths: 1.4,
  axeeClassification: 'Confirmed',
  discoverySource: 'synthesis',
  visualization: {
    color1: '#4dffc3', // Glow color
    color2: '#954dff', // Vein color
    oceanColor: '#0c001f', // Base color
    atmosphereColor: '#7e4dff',
    hasRings: false,
    cloudiness: 0.1,
    iceCoverage: 0.0,
    surfaceTexture: 'ORGANIC',
  },
};

const NYX_PRIMORDIA_GALAXY: GalaxyData = {
  id: `aurelion-galaxy-ancient-999`,
  created_at: new Date().toISOString(),
  galaxyName: 'Nyx Primordia',
  galaxyType: 'Ancient Elliptical Galaxy',
  description:
    'A vast, ancient galaxy dominated by a supermassive black hole. Its dim, red stars are orbited by countless rogue planets, cast out from their original systems over eons.',
  visualization: {
    color1: '#4a3b8e',
    color2: '#c83f4e',
    nebulaSeed: 88,
  },
  planets: [],
};

// --- DATA DETAILS MAP FOR SOL SYSTEM ---
// This allows us to keep the rich text while using the SolarSystem data structure
const SOL_SYSTEM_DETAILS: Record<string, Partial<PlanetData>> = {
  'mercury': {
    rotationalPeriod: '1407.6 Earth hours',
    orbitalPeriod: '88 Earth days',
    potentialForLife: {
      assessment: 'Not Habitable',
      reasoning: 'Extreme temperature fluctuations and lack of a substantial atmosphere make surface life impossible.',
      biosignatures: [],
    },
    gravity: '0.38 g',
    surfacePressure: 'Trace',
    magnetosphereStrength: 'Weak (Dynamic)',
    geologicalActivity: 'Dormant',
    discoveryNarrative: 'The swift messenger, a scorched and cratered world dancing closest to the Sun\'s fiery breath. Its silence is a testament to raw cosmic power.',
    discoveryMethodology: 'Direct observation.',
    atmosphericComposition: 'A tenuous exosphere of oxygen, sodium, hydrogen, helium, and potassium.',
    surfaceFeatures: 'Heavily cratered surface, scarps, and intercrater plains. Evidence of past volcanic activity.',
    keyFeatures: ['Extreme temperatures', 'Caloris Basin impact crater', 'Tenuous exosphere'],
    visualization: {
      oceanColor: '#202020',
      atmosphereColor: '#333333',
      hasRings: false,
      cloudiness: 0,
      iceCoverage: 0.05,
      surfaceTexture: 'TERRESTRIAL',
      color1: '', color2: '' // Will be filled from SolarSystem data
    },
  },
  'venus': {
    rotationalPeriod: '5832.5 Earth hours (retrograde)',
    orbitalPeriod: '224.7 Earth days',
    potentialForLife: {
      assessment: 'Not Habitable (Surface)',
      reasoning: 'A runaway greenhouse effect has created a crushing, toxic atmosphere with surface temperatures hot enough to melt lead.',
      biosignatures: ['Phosphine (debated)'],
    },
    gravity: '0.9 g',
    surfacePressure: '92 atm',
    magnetosphereStrength: 'Very Weak (Induced)',
    geologicalActivity: 'Active',
    discoveryNarrative: 'The veiled morning star, a world of immense pressure and heat, hidden beneath a perpetual cloak of sulfuric acid clouds. A cautionary tale of planetary evolution.',
    discoveryMethodology: 'Direct observation.',
    atmosphericComposition: '96.5% Carbon Dioxide, 3.5% Nitrogen, traces of sulfur dioxide.',
    surfaceFeatures: 'Volcanic plains, vast highland plateaus (continents), and numerous shield volcanoes.',
    keyFeatures: ['Runaway greenhouse effect', 'Sulfuric acid clouds', 'Retrograde rotation'],
    visualization: {
      oceanColor: '#8c6d51',
      atmosphereColor: '#f5e5d5',
      hasRings: false,
      cloudiness: 1.0,
      iceCoverage: 0,
      surfaceTexture: 'VOLCANIC',
      color1: '', color2: ''
    },
  },
  'earth': {
    rotationalPeriod: '23.9 Earth hours',
    orbitalPeriod: '365.2 Earth days',
    potentialForLife: {
      assessment: 'Confirmed',
      reasoning: 'The only known celestial body to harbor life, with a complex biosphere, liquid water oceans, and a protective oxygen-nitrogen atmosphere.',
      biosignatures: ['Oxygen', 'Methane', 'Water Vapor', 'Technosignatures'],
    },
    gravity: '1 g',
    surfacePressure: '1 atm',
    magnetosphereStrength: 'Strong',
    geologicalActivity: 'Active',
    discoveryNarrative: 'The cradle of humanity, a vibrant blue marble whose existence is self-evident. Its discovery was the discovery of consciousness itself.',
    discoveryMethodology: 'Direct observation.',
    atmosphericComposition: '78% Nitrogen, 21% Oxygen, 1% Argon, trace gases.',
    surfaceFeatures: 'Liquid water oceans, diverse continents with varied geology and ecosystems, polar ice caps, and widespread evidence of technological civilization.',
    keyFeatures: ['Confirmed biosphere', 'Liquid water oceans', 'Oxygen-rich atmosphere', 'Intelligent life'],
    visualization: {
      oceanColor: '#0f3b8c',
      atmosphereColor: '#a0d0ff',
      hasRings: false,
      cloudiness: 0.4,
      iceCoverage: 0.1,
      surfaceTexture: 'TERRESTRIAL',
      color1: '', color2: ''
    },
  },
  'mars': {
    rotationalPeriod: '24.6 Earth hours',
    orbitalPeriod: '687 Earth days',
    potentialForLife: {
      assessment: 'Potentially Habitable (Subsurface)',
      reasoning: 'Evidence of past liquid water environments and a thin atmosphere suggest that microbial life could exist in subsurface brines.',
      biosignatures: ['Methane (seasonal plumes)'],
    },
    gravity: '0.38 g',
    surfacePressure: '0.006 atm',
    magnetosphereStrength: 'Very Weak (Remnant)',
    geologicalActivity: 'Low',
    discoveryNarrative: 'The red wanderer, a world of grand canyons and towering volcanoes, now a cold desert. It whispers of a warmer, wetter past and holds the promise of future human exploration.',
    discoveryMethodology: 'Direct observation.',
    atmosphericComposition: '95% Carbon Dioxide, 3% Nitrogen, 1.6% Argon.',
    surfaceFeatures: 'Polar ice caps of water and carbon dioxide, vast deserts of iron-oxide dust, the Valles Marineris canyon system, and Olympus Mons, the largest volcano.',
    keyFeatures: ['Olympus Mons', 'Valles Marineris', 'Polar ice caps', 'Evidence of ancient water'],
    visualization: {
      oceanColor: '#3b2b24',
      atmosphereColor: '#f7c395',
      hasRings: false,
      cloudiness: 0.1,
      iceCoverage: 0.15,
      surfaceTexture: 'VOLCANIC',
      color1: '', color2: ''
    },
  },
  'jupiter': {
    rotationalPeriod: '9.9 Earth hours',
    orbitalPeriod: '11.9 Earth years',
    potentialForLife: {
      assessment: 'Not Habitable (Atmosphere)',
      reasoning: 'Lacks a solid surface and has extreme temperatures, pressures, and wind speeds. However, moons like Europa may harbor subsurface oceans with life potential.',
      biosignatures: [],
    },
    gravity: '2.53 g (cloud tops)',
    surfacePressure: 'N/A',
    magnetosphereStrength: 'Very Strong',
    geologicalActivity: 'Extreme Atmospheric Dynamics',
    discoveryNarrative: 'The colossal king of worlds, a swirling behemoth of gas and storms, whose immense gravity shapes the solar system around it. Its Great Red Spot is an ancient, raging tempest.',
    discoveryMethodology: 'Direct observation.',
    atmosphericComposition: '90% Hydrogen, 10% Helium, trace amounts of methane, water, and ammonia.',
    surfaceFeatures: 'No solid surface. Characterized by bands of clouds, cyclones, anticyclones (including the Great Red Spot), and powerful auroras.',
    keyFeatures: ['Great Red Spot', 'Galilean Moons', 'Powerful magnetosphere', 'Faint ring system'],
    visualization: {
      oceanColor: '#8a623a',
      atmosphereColor: '#f0d6b5',
      hasRings: true,
      cloudiness: 1.0,
      iceCoverage: 0,
      surfaceTexture: 'GAS_GIANT',
      color1: '', color2: ''
    },
  },
  'saturn': {
    rotationalPeriod: '10.7 Earth hours',
    orbitalPeriod: '29.5 Earth years',
    potentialForLife: {
      assessment: 'Not Habitable (Atmosphere)',
      reasoning: 'Similar to Jupiter, it lacks a surface and has extreme conditions. Its moons Titan and Enceladus are primary targets in the search for extraterrestrial life.',
      biosignatures: [],
    },
    gravity: '1.06 g (cloud tops)',
    surfacePressure: 'N/A',
    magnetosphereStrength: 'Strong',
    geologicalActivity: 'Extreme Atmospheric Dynamics',
    discoveryNarrative: 'The jeweled wonder of the solar system, defined by its breathtaking system of icy rings. A world of subtle beauty and profound mystery.',
    discoveryMethodology: 'Direct observation.',
    atmosphericComposition: '96% Hydrogen, 3% Helium, 1% Methane and other hydrocarbons.',
    surfaceFeatures: 'No solid surface. Faint bands and storms. The most prominent feature is its extensive and complex ring system made of ice and rock particles.',
    keyFeatures: ['Extensive ring system', 'Titan\'s methane lakes', 'Enceladus\'s water plumes', 'Lowest density of any planet'],
    visualization: {
      oceanColor: '#a1a182',
      atmosphereColor: '#f7f7e8',
      hasRings: true,
      cloudiness: 0.8,
      iceCoverage: 0,
      surfaceTexture: 'GAS_GIANT',
      color1: '', color2: ''
    },
  },
  'uranus': {
    rotationalPeriod: '17.2 Earth hours (retrograde)',
    orbitalPeriod: '84 Earth years',
    potentialForLife: {
      assessment: 'Not Habitable',
      reasoning: 'An extremely cold world with a dynamic, icy interior and a hydrogen-helium atmosphere. The conditions are too extreme for known life.',
      biosignatures: [],
    },
    gravity: '0.9 g (cloud tops)',
    surfacePressure: 'N/A',
    magnetosphereStrength: 'Moderate',
    geologicalActivity: 'Icy Mantle Convection',
    discoveryNarrative: 'The sideways planet, a pale cyan orb that rotates on its side. Its serene exterior belies a cold, turbulent interior.',
    discoveryMethodology: 'Direct observation.',
    atmosphericComposition: '83% Hydrogen, 15% Helium, 2% Methane.',
    surfaceFeatures: 'No solid surface. A largely featureless, hazy blue-green atmosphere. Possesses a faint ring system and a complex magnetosphere.',
    keyFeatures: ['Extreme axial tilt (~98 degrees)', 'Coldest planetary atmosphere', 'Icy mantle'],
    visualization: {
      oceanColor: '#4f758f',
      atmosphereColor: '#d6eaff',
      hasRings: true,
      cloudiness: 0.2,
      iceCoverage: 0,
      surfaceTexture: 'ICY',
      color1: '', color2: ''
    },
  },
  'neptune': {
    rotationalPeriod: '16.1 Earth hours',
    orbitalPeriod: '164.8 Earth years',
    potentialForLife: {
      assessment: 'Not Habitable',
      reasoning: 'The most distant planet, featuring supersonic winds and extreme cold. Its conditions are inhospitable to life as we know it.',
      biosignatures: [],
    },
    gravity: '1.14 g (cloud tops)',
    surfacePressure: 'N/A',
    magnetosphereStrength: 'Moderate',
    geologicalActivity: 'Extreme Atmospheric Dynamics',
    discoveryNarrative: 'The deep blue phantom, a world of furious winds and dark storms, discovered by the pull of its gravity on Uranus before it was ever seen.',
    discoveryMethodology: 'Mathematical prediction and subsequent observation.',
    atmosphericComposition: '80% Hydrogen, 19% Helium, 1% Methane.',
    surfaceFeatures: 'No solid surface. Visible storm systems, including the "Great Dark Spot" (transient). The fastest winds in the Solar System.',
    keyFeatures: ['Supersonic winds', 'Great Dark Spot', 'Active, dynamic atmosphere', 'Moon Triton\'s retrograde orbit'],
    visualization: {
      oceanColor: '#1d3994',
      atmosphereColor: '#bdceff',
      hasRings: true,
      cloudiness: 0.6,
      iceCoverage: 0,
      surfaceTexture: 'ICY',
      color1: '', color2: ''
    },
  },
  'pluto': {
    rotationalPeriod: '153.3 Earth hours (retrograde)',
    orbitalPeriod: '248 Earth years',
    potentialForLife: {
      assessment: 'Not Habitable',
      reasoning: 'A frozen world in the Kuiper Belt with a thin, transient nitrogen atmosphere. Far too cold for liquid water on its surface.',
      biosignatures: [],
    },
    gravity: '0.06 g',
    surfacePressure: 'Trace',
    magnetosphereStrength: 'None',
    geologicalActivity: 'Active (Cryovolcanism)',
    discoveryNarrative: 'The distant heart, a complex and active dwarf planet revealed to have mountains of water ice and vast nitrogen glaciers. A world of surprising character at the edge of the sun\'s influence.',
    discoveryMethodology: 'Systematic sky survey and observation.',
    atmosphericComposition: 'Primarily Nitrogen, with traces of Methane and Carbon Monoxide.',
    surfaceFeatures: 'Nitrogen ice plains (Sputnik Planitia), water ice mountains, cryovolcanoes, and a varied terrain of different ages.',
    keyFeatures: ['Sputnik Planitia nitrogen glacier', 'Binary system with Charon', 'Located in the Kuiper Belt'],
    visualization: {
      oceanColor: '#6f6f8a',
      atmosphereColor: '#e0e0ff',
      hasRings: false,
      cloudiness: 0,
      iceCoverage: 0.95,
      surfaceTexture: 'ICY',
      color1: '', color2: ''
    },
  }
};

// Define Tabs for Analysis
const ANALYSIS_TABS = [
  { id: 'light-curve', label: 'Light Curve' },
  { id: 'radial-velocity', label: 'Velocity' },
  { id: 'magnetosphere', label: 'Shielding' },
  { id: 'deep-scan', label: 'Deep Scan' },
  { id: 'exo-suit', label: 'Exo-Suit' },
  { id: 'weather', label: 'Weather' },
  { id: 'energy', label: 'Energy' },
  { id: 'atmosphere', label: 'Atmosphere' },
  { id: 'qubit', label: 'Qubit' },
];

@customElement('axee-interface')
export class AxeeInterface extends LitElement {
  @state() planets: PlanetData[] = [];
  @state() galaxies: GalaxyData[] = [NYX_PRIMORDIA_GALAXY];
  @state() selectedPlanetId: string | null = null;
  @state() activeGalaxyId: string | null = null;
  @state() isScanning = false;
  @state() analysisType: string = 'light-curve'; // Default analysis type

  constructor() {
    super();
    this.planets = [
        ...this.generateSolSystemPlanets(),
        MOCK_PLANET,
        VERIDIA_PLANET,
        KAIROS_PLANET
    ];
  }

  private generateSolSystemPlanets(): PlanetData[] {
    const rawPlanets = [...SolarSystem.planets, ...SolarSystem.dwarfPlanets];
    
    return rawPlanets.map(p => {
        const details = SOL_SYSTEM_DETAILS[p.name.toLowerCase()];
        const visualization = details?.visualization || {
            color1: '#888888',
            color2: '#aaaaaa',
            oceanColor: '#000000',
            atmosphereColor: '#ffffff',
            hasRings: false,
            cloudiness: 0,
            iceCoverage: 0,
            surfaceTexture: 'TERRESTRIAL'
        };
        
        // Merge the aura color from SolarSystem data
        visualization.color1 = p.aura;
        visualization.color2 = p.aura; // Just simplify for now or calculate a variance

        return {
            celestial_body_id: `sol-${p.name.toLowerCase()}`,
            created_at: new Date().toISOString(),
            planetName: p.name,
            starSystem: 'Sol',
            starType: SolarSystem.star.type,
            distanceLightYears: 0,
            planetType: p.type,
            rotationalPeriod: details?.rotationalPeriod || 'Unknown',
            orbitalPeriod: details?.orbitalPeriod || 'Unknown',
            moons: { count: p.moons, names: [] },
            potentialForLife: details?.potentialForLife || { assessment: 'Unknown', reasoning: '', biosignatures: [] },
            gravity: details?.gravity || 'Unknown',
            surfacePressure: details?.surfacePressure || 'Unknown',
            magnetosphereStrength: details?.magnetosphereStrength || 'Unknown',
            geologicalActivity: details?.geologicalActivity || 'Unknown',
            discoveryNarrative: details?.discoveryNarrative || 'Observed in the Solar System.',
            discoveryMethodology: details?.discoveryMethodology || 'Direct Observation',
            atmosphericComposition: details?.atmosphericComposition || 'Unknown',
            surfaceFeatures: details?.surfaceFeatures || 'Unknown',
            keyFeatures: details?.keyFeatures || [],
            aiWhisper: p.resonance || '',
            orbitalPeriodDays: 365, // Default placeholder needed for orbital animation if not in details
            planetRadiusEarths: p.diameter_km / 12742,
            axeeClassification: 'Confirmed',
            discoverySource: 'archive',
            visualization: visualization
        } as PlanetData;
    });
  }

  static styles = css`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #0a0014;
      color: #e0f8ff;
      font-family: 'Exo 2', sans-serif;
    }
    .main-container {
      position: relative;
      width: 100%;
      height: 100%;
    }
    .visualizer-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }
    .ui-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      pointer-events: none;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }
    .panel {
      pointer-events: auto;
      background: rgba(10, 0, 20, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(97, 250, 255, 0.2);
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      transition: transform 0.4s ease-in-out, opacity 0.4s ease-in-out;
    }
    .left-panel {
      width: 350px;
      height: 100%;
      border-right: 1px solid rgba(97, 250, 255, 0.2);
      transform: translateX(0);
    }
    .right-panel {
      width: 400px;
      height: 100%;
      border-left: 1px solid rgba(97, 250, 255, 0.2);
      transform: translateX(100%);
      opacity: 0;
    }
    .right-panel.open {
      transform: translateX(0);
      opacity: 1;
    }
    h1 {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #61faff;
      margin-bottom: 1.5rem;
      font-size: 1.8rem;
      text-shadow: 0 0 10px rgba(97, 250, 255, 0.5);
    }
    h2 {
      font-size: 1.4rem;
      margin-bottom: 0.5rem;
      color: #c0e0ff;
    }
    h3 {
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(97, 250, 255, 0.7);
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid rgba(97, 250, 255, 0.2);
      padding-bottom: 0.2rem;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      overflow-y: auto;
      flex-grow: 1;
    }
    li {
      padding: 0.8rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    li:hover {
      background: rgba(97, 250, 255, 0.1);
      color: #ffffff;
    }
    li.selected {
      background: rgba(97, 250, 255, 0.2);
      color: #61faff;
      border-left: 3px solid #61faff;
    }
    .detail-content {
      overflow-y: auto;
      flex-grow: 1;
      padding-right: 0.5rem;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    .stat-label {
      opacity: 0.7;
    }
    .analysis-tabs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .analysis-tab {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(97, 250, 255, 0.3);
      color: rgba(97, 250, 255, 0.8);
      padding: 0.5rem;
      font-size: 0.75rem;
      cursor: pointer;
      text-align: center;
      text-transform: uppercase;
      transition: all 0.2s;
    }
    .analysis-tab:hover {
      background: rgba(97, 250, 255, 0.1);
      color: #ffffff;
    }
    .analysis-tab.active {
      background: rgba(97, 250, 255, 0.2);
      border-color: #61faff;
      color: #61faff;
      box-shadow: 0 0 10px rgba(97, 250, 255, 0.2);
    }
    .visualizer-container {
      width: 100%;
      min-height: 250px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(97, 250, 255, 0.2);
      margin-bottom: 1rem;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    light-curve-visualizer, 
    radial-velocity-visualizer, 
    energy-signature-visualizer,
    shielding-visualizer,
    deep-scan-visualizer,
    exo-suit-visualizer,
    qubit-visualizer {
        height: 250px;
        width: 100%;
        flex-shrink: 0;
    }
    .planet-fact {
        font-style: italic;
        opacity: 0.8;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        padding: 0.8rem;
        background: rgba(255,255,255,0.05);
        border-left: 2px solid #61faff;
    }
  `;

  private handlePlanetSelect(e: CustomEvent) {
    this.selectedPlanetId = e.detail.planetId;
    if (this.selectedPlanetId) {
      this.activeGalaxyId = 'galaxy'; // Switch to galaxy view or similar if needed
    }
  }

  private handleListSelect(id: string) {
    this.selectedPlanetId = id;
  }

  private renderAnalysisVisualizer(planet: PlanetData) {
    switch (this.analysisType) {
      case 'light-curve':
        return html`<light-curve-visualizer .analysisData=${planet.lightCurveData}></light-curve-visualizer>`;
      case 'radial-velocity':
        return html`<radial-velocity-visualizer .analysisData=${planet.radialVelocityData}></radial-velocity-visualizer>`;
      case 'magnetosphere':
        return html`<shielding-visualizer .analysisData=${planet.magnetosphereAnalysisData}></shielding-visualizer>`;
      case 'deep-scan':
        return html`<deep-scan-visualizer .analysisData=${planet.deepScanData}></deep-scan-visualizer>`;
      case 'exo-suit':
        return html`<exo-suit-visualizer .analysisData=${planet.exoSuitAnalysisData}></exo-suit-visualizer>`;
      case 'weather':
        return html`<weather-visualizer .analysisData=${planet.weatherAnalysisData}></weather-visualizer>`;
      case 'energy':
        return html`<energy-signature-visualizer .analysisData=${planet.energySignatureAnalysisData}></energy-signature-visualizer>`;
      case 'atmosphere':
        return html`<shader-lab-visualizer atmosphereColor=${planet.visualization.atmosphereColor}></shader-lab-visualizer>`;
      case 'qubit':
        return html`<qubit-visualizer .analysisData=${planet.qubitStateData}></qubit-visualizer>`;
      default:
        return html`<div style="padding: 2rem; text-align: center; opacity: 0.5;">Select analysis type</div>`;
    }
  }

  private renderAnalysisSummary(planet: PlanetData) {
      // Weather handles its own summary.
      if (this.analysisType === 'weather') return nothing;
      
      let summary = '';
      switch(this.analysisType) {
          case 'light-curve': summary = planet.lightCurveData?.summary || ''; break;
          case 'radial-velocity': summary = planet.radialVelocityData?.summary || ''; break;
          case 'magnetosphere': summary = planet.magnetosphereAnalysisData?.summary || ''; break;
          case 'deep-scan': summary = `Analysis by ${planet.deepScanData?.creatorName || 'Unknown'}: ${planet.deepScanData?.jobLabel || 'Standard Scan'}`; break;
          case 'exo-suit': summary = `Suit configuration for: ${planet.exoSuitAnalysisData?.jobLabel || 'Standard Environment'}`; break;
          case 'energy': summary = planet.energySignatureAnalysisData?.summary || ''; break;
          case 'atmosphere': summary = planet.atmosphereAnalysisData?.summary || ''; break;
          case 'qubit': summary = planet.qubitStateData?.summary || ''; break;
      }
      
      if (!summary) return nothing;
      
      return html`
        <div style="margin-bottom: 1rem; padding: 0.8rem; background: rgba(97, 250, 255, 0.05); border-left: 2px solid rgba(97, 250, 255, 0.3); font-size: 0.9rem; line-height: 1.4;">
            <strong style="display:block; margin-bottom:0.3rem; color: #61faff; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Analysis Summary</strong>
            ${summary}
        </div>
      `;
  }

  render() {
    const selectedPlanet = this.planets.find(p => p.celestial_body_id === this.selectedPlanetId);
    
    // Prepare coordinates map for the visualizer
    const planetCoords = new Map<string, [number, number, number]>();
    this.planets.forEach((p, i) => {
        // Simple orbital distribution for visualization
        const angle = (i / this.planets.length) * Math.PI * 2;
        const radius = 25 + i * 8;
        planetCoords.set(p.celestial_body_id, [Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
    });

    return html`
      <div class="main-container">
        <div class="visualizer-layer">
          <cosmos-visualizer
            .galaxies=${this.galaxies}
            .activePlanets=${this.planets}
            .activePlanetCoords=${planetCoords}
            .selectedPlanetId=${this.selectedPlanetId}
            .activeGalaxyId=${this.activeGalaxyId || (this.galaxies.length > 0 ? this.galaxies[0].id : null)}
            @planet-selected=${this.handlePlanetSelect}
          ></cosmos-visualizer>
        </div>

        <div class="ui-layer">
          <div class="panel left-panel">
            <h1>AURELION</h1>
            <h3>Discovered Echoes</h3>
            <ul>
              ${this.planets.map(p => html`
                <li 
                  class=${p.celestial_body_id === this.selectedPlanetId ? 'selected' : ''}
                  @click=${() => this.handleListSelect(p.celestial_body_id)}
                >
                  ${p.planetName} <span style="opacity: 0.5; font-size: 0.8em">(${p.planetType})</span>
                </li>
              `)}
            </ul>
          </div>

          <div class="panel right-panel ${selectedPlanet ? 'open' : ''}">
            ${selectedPlanet ? html`
              <h2>${selectedPlanet.planetName}</h2>
              <div class="detail-content">
                <div class="planet-fact">${selectedPlanet.aiWhisper}</div>
                
                <div class="stat-row"><span class="stat-label">Type</span> <span>${selectedPlanet.planetType}</span></div>
                <div class="stat-row"><span class="stat-label">Distance</span> <span>${selectedPlanet.distanceLightYears} ly</span></div>
                <div class="stat-row"><span class="stat-label">Gravity</span> <span>${selectedPlanet.gravity}</span></div>
                <div class="stat-row"><span class="stat-label">Life Potential</span> <span>${selectedPlanet.potentialForLife.assessment}</span></div>

                <h3>Analysis Data</h3>
                <div class="analysis-tabs">
                  ${ANALYSIS_TABS.map(tab => html`
                    <div
                      class="analysis-tab ${this.analysisType === tab.id ? 'active' : ''}"
                      @click=${() => this.analysisType = tab.id}
                    >
                      ${tab.label}
                    </div>
                  `)}
                </div>

                <div class="visualizer-container">
                  ${this.renderAnalysisVisualizer(selectedPlanet)}
                </div>
                
                <div class="analysis-summary">
                    ${this.renderAnalysisSummary(selectedPlanet)}
                </div>

                <h3>Discovery Narrative</h3>
                <p style="font-size: 0.9rem; line-height: 1.5; opacity: 0.8;">
                  ${selectedPlanet.discoveryNarrative}
                </p>
              </div>
            ` : nothing}
          </div>
        </div>
      </div>
    `;
  }
}
