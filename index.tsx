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
import {LitElement, html, nothing} from 'lit';
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
import './planet-visualizer';
import './weather-visualizer';
import './energy-signature-visualizer';
import './shader-lab-visualizer';
import {SolarSystem} from './solar-system-data';
import { LightCurveAnalysis } from './light-curve-visualizer';
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
  databaseSort?: {key: keyof PlanetData | 'galaxyName', order: 'asc' | 'desc'};
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

const ENRICHED_SOL_SYSTEM: PlanetData[] = [
  {
    celestial_body_id: 'sol-mercury',
    created_at: new Date().toISOString(),
    planetName: 'Mercury',
    starSystem: 'Sol',
    starType: 'G-type main-sequence',
    distanceLightYears: 0,
    planetType: 'Terrestrial',
    rotationalPeriod: '1407.6 Earth hours',
    orbitalPeriod: '88 Earth days',
    moons: {count: 0, names: []},
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
    aiWhisper: 'A Silent Ember, scarred by fire and time, holding secrets in its shadowed craters.',
    orbitalPeriodDays: 88.0,
    transitDurationHours: 0,
    planetRadiusEarths: 0.38,
    axeeClassification: 'Confirmed',
    discoverySource: 'archive',
    visualization: {
      color1: '#b0b0b0',
      color2: '#7e7e7e',
      oceanColor: '#202020',
      atmosphereColor: '#333333',
      hasRings: false,
      cloudiness: 0,
      iceCoverage: 0.05,
      surfaceTexture: 'TERRESTRIAL',
    },
  },
  {
    celestial_body_id: 'sol-venus',
    created_at: new Date().toISOString(),
    planetName: 'Venus',
    starSystem: 'Sol',
    starType: 'G-type main-sequence',
    distanceLightYears: 0,
    planetType: 'Terrestrial',
    rotationalPeriod: '5832.5 Earth hours (retrograde)',
    orbitalPeriod: '224.7 Earth days',
    moons: {count: 0, names: []},
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
    aiWhisper: 'The Shrouded Pulse, a fever dream of a world, beating slowly under a toxic veil.',
    orbitalPeriodDays: 224.7,
    transitDurationHours: 0,
    planetRadiusEarths: 0.95,
    axeeClassification: 'Confirmed',
    discoverySource: 'archive',
    visualization: {
      color1: '#ffcc99',
      color2: '#d4a37a',
      oceanColor: '#8c6d51',
      atmosphereColor: '#f5e5d5',
      hasRings: false,
      cloudiness: 1.0,
      iceCoverage: 0,
      surfaceTexture: 'VOLCANIC',
    },
  },
  {
    celestial_body_id: 'sol-earth',
    created_at: new Date().toISOString(),
    planetName: 'Earth',
    starSystem: 'Sol',
    starType: 'G-type main-sequence',
    distanceLightYears: 0,
    planetType: 'Terrestrial',
    rotationalPeriod: '23.9 Earth hours',
    orbitalPeriod: '365.2 Earth days',
    moons: {count: 1, names: ['Luna']},
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
    aiWhisper: 'A single, resonant chord in the silent orchestra of space—a Living Harmonic that sings of water, air, and thought.',
    orbitalPeriodDays: 365.2,
    transitDurationHours: 0,
    planetRadiusEarths: 1,
    axeeClassification: 'Confirmed',
    discoverySource: 'archive',
    visualization: {
      color1: '#00ccff',
      color2: '#ffffff',
      oceanColor: '#0f3b8c',
      atmosphereColor: '#a0d0ff',
      hasRings: false,
      cloudiness: 0.4,
      iceCoverage: 0.1,
      surfaceTexture: 'TERRESTRIAL',
    },
  },
  {
    celestial_body_id: 'sol-mars',
    created_at: new Date().toISOString(),
    planetName: 'Mars',
    starSystem: 'Sol',
    starType: 'G-type main-sequence',
    distanceLightYears: 0,
    planetType: 'Terrestrial',
    rotationalPeriod: '24.6 Earth hours',
    orbitalPeriod: '687 Earth days',
    moons: {count: 2, names: ['Phobos', 'Deimos']},
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
    aiWhisper: 'The Echoing Dust, a memory of water written in rust, waiting for new footprints in its silent, ochre sands.',
    orbitalPeriodDays: 687.0,
    transitDurationHours: 0,
    planetRadiusEarths: 0.53,
    axeeClassification: 'Confirmed',
    discoverySource: 'archive',
    visualization: {
      color1: '#ff3300',
      color2: '#c1440e',
      oceanColor: '#3b2b24',
      atmosphereColor: '#f7c395',
      hasRings: false,
      cloudiness: 0.1,
      iceCoverage: 0.15,
      surfaceTexture: 'VOLCANIC',
    },
  },
  {
    celestial_body_id: 'sol-jupiter',
    created_at: new Date().toISOString(),
    planetName: 'Jupiter',
    starSystem: 'Sol',
    starType: 'G-type main-sequence',
    distanceLightYears: 0,
    planetType: 'Gas Giant',
    rotationalPeriod: '9.9 Earth hours',
    orbitalPeriod: '11.9 Earth years',
    moons: {count: 95, names: ['Io', 'Europa', 'Ganymede', 'Callisto', '...']},
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
    aiWhisper: 'The Storm Choir, a deep, unending symphony of hydrogen and helium, conducting the orbits of its many moons.',
    orbitalPeriodDays: 4332.5,
    transitDurationHours: 0,
    planetRadiusEarths: 11.2,
    axeeClassification: 'Confirmed',
    discoverySource: 'archive',
    visualization: {
      color1: '#ffaa66',
      color2: '#e5944f',
      oceanColor: '#8a623a',
      atmosphereColor: '#f0d6b5',
      hasRings: true,
      cloudiness: 1.0,
      iceCoverage: 0,
      surfaceTexture: 'GAS_GIANT',
    },
  },
  {
    celestial_body_id: 'sol-saturn',
    created_at: new Date().toISOString(),
    planetName: 'Saturn',
    starSystem: 'Sol',
    starType: 'G-type main-sequence',
    distanceLightYears: 0,
    planetType: 'Gas Giant',
    rotationalPeriod: '10.7 Earth hours',
    orbitalPeriod: '29.5 Earth years',
    moons: {count: 146, names: ['Titan', 'Enceladus', 'Mimas', '...']},
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
    aiWhisper: 'The Ringed Whisper, a silent hum of ice and gravity, spinning a halo of frozen light in the dark.',
    orbitalPeriodDays: 10759,
    transitDurationHours: 0,
    planetRadiusEarths: 9.45,
    axeeClassification: 'Confirmed',
    discoverySource: 'archive',
    visualization: {
      color1: '#ffffcc',
      color2: '#e3e3b4',
      oceanColor: '#a1a182',
      atmosphereColor: '#f7f7e8',
      hasRings: true,
      cloudiness: 0.8,
      iceCoverage: 0,
      surfaceTexture: 'GAS_GIANT',
    },
  },
  {
    celestial_body_id: 'sol-uranus',
    created_at: new Date().toISOString(),
    planetName: 'Uranus',
    starSystem: 'Sol',
    starType: 'G-type main-sequence',
    distanceLightYears: 0,
    planetType: 'Ice Giant',
    rotationalPeriod: '17.2 Earth hours (retrograde)',
    orbitalPeriod: '84 Earth years',
    moons: {count: 27, names: ['Titania', 'Oberon', 'Ariel', '...']},
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
    aiWhisper: 'The Tilted Dream, a world sleeping on its side, spinning through a long, slow, cyan-colored dream.',
    orbitalPeriodDays: 30687,
    transitDurationHours: 0,
    planetRadiusEarths: 4.0,
    axeeClassification: 'Confirmed',
    discoverySource: 'archive',
    visualization: {
      color1: '#88ccff',
      color2: '#b3d9ff',
      oceanColor: '#4f758f',
      atmosphereColor: '#d6eaff',
      hasRings: true,
      cloudiness: 0.2,
      iceCoverage: 0,
      surfaceTexture: 'ICY',
    },
  },
  {
    celestial_body_id: 'sol-neptune',
    created_at: new Date().toISOString(),
    planetName: 'Neptune',
    starSystem: 'Sol',
    starType: 'G-type main-sequence',
    distanceLightYears: 0,
    planetType: 'Ice Giant',
    rotationalPeriod: '16.1 Earth hours',
    orbitalPeriod: '164.8 Earth years',
    moons: {count: 14, names: ['Triton', '...']},
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
    aiWhisper: 'The Deep Pulse, a thrum of wind and cold from the edge of the system, where sunlight is a faint memory.',
    orbitalPeriodDays: 60190,
    transitDurationHours: 0,
    planetRadiusEarths: 3.88,
    axeeClassification: 'Confirmed',
    discoverySource: 'archive',
    visualization: {
      color1: '#3366ff',
      color2: '#5c85ff',
      oceanColor: '#1d3994',
      atmosphereColor: '#bdceff',
      hasRings: true,
      cloudiness: 0.6,
      iceCoverage: 0,
      surfaceTexture: 'ICY',
    },
  },
  {
    celestial_body_id: 'sol-pluto',
    created_at: new Date().toISOString(),
    planetName: 'Pluto',
    starSystem: 'Sol',
    starType: 'G-type main-sequence',
    distanceLightYears: 0,
    planetType: 'Dwarf Planet',
    rotationalPeriod: '153.3 Earth hours (retrograde)',
    orbitalPeriod: '248 Earth years',
    moons: {count: 5, names: ['Charon', 'Styx', 'Nix', 'Kerberos', 'Hydra']},
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
    aiWhisper: 'The Frozen Memory, a heart-shaped glacier on a world of twilight, guarding the system\'s oldest secrets.',
    orbitalPeriodDays: 90560,
    transitDurationHours: 0,
    planetRadiusEarths: 0.18,
    axeeClassification: 'Confirmed',
    discoverySource: 'archive',
    visualization: {
      color1: '#ccccff',
      color2: '#a3a3cc',
      oceanColor: '#6f6f8a',
      atmosphereColor: '#e0e0ff',
      hasRings: false,
      cloudiness: 0,
      iceCoverage: 0.95,
      surfaceTexture: 'ICY',
    },
  },
];

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

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to AXEE',
    text: 'This is the AURELION Exoplanet Synthesis Engine. Let\'s walk through how to create and analyze new worlds.',
    position: 'center',
  },
  {
    elementId: 'command-bar',
    title: 'Synthesize a Planet',
    text: 'This is your primary interface. Click the "Use Sample Prompt" button in the tutorial pop-up, then click [SYNTHESIZE] to bring a new world into existence.',
    position: 'top',
    showSample: true,
  },
  {
    elementId: 'planet-list-panel',
    title: 'The Planet List',
    text: 'Excellent! Your new planet appears here. Click on its name to view its detailed data.',
    position: 'right',
  },
  {
    elementId: 'analysis-buttons',
    title: 'Run Analyses',
    text: 'Here you can run various scientific analyses. Click [LIGHT CURVE] to check for planetary transits.',
    position: 'right',
  },
  {
    title: 'Exploration Begins',
    text: 'You now have the basics. Explore, create, and analyze the universe. You can restart this tutorial anytime from the "HELP" button in the header.',
    position: 'center',
  },
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
  @state() private isJumping = false;


  // UI States
  @state() private isLeftPanelOpen = true;
  @state() private isRightPanelOpen = true;
  @state() private leftPanelView: 'list' | 'predictor' = 'list';
  @state() private showOnboarding = false;
  @state() private onboardingStep = 0; // Now represents stanza index
  @state() private isDashboardOpen = false;
  @state() private isDatabaseOpen = false;
  @state() private isTutorialActive = false;
  @state() private tutorialStep = 0;
  @state() private showTutorialPrompt = false;
  @state() private isConversationModeActive = false;
  @state() private isUnseenRevealed = false;
  @state() private isShaderLabOpen = false;
  @state() private isSolArchiveOpen = false;
  @state() private solArchiveTargetUrl = '';
  @state() private theme: 'dark' | 'light' = 'dark';
  @state() private databaseSearchTerm = '';
  @state() private databaseSort: {key: keyof PlanetData | 'galaxyName', order: 'asc' | 'desc'} = { key: 'planetName', order: 'asc' };


  // AI Core Chronicles
  @state() private aiChronicles: AiChronicleEntry[] = [];
  @state() private chronicleFilter: 'all' | 'discovery' | 'thought' | 'suggestion' = 'all';
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
  private conversationHistory: { user: string; model: string; }[] = [];
  private chat: Chat | null = null;


  // Live Stream State
  @state() private liveStreamStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private liveStreamSocket: WebSocket | null = null;

  // AXEE Predictor State
  @state() private predictorForm = {
    orbital_period: '',
    transit_duration: '',
    planet_radius: '',
  };
  @state() private predictorResult: { axeeClassification: string; discoverySource: string; } | null = null;
  @state() private predictorError: string | null = null;
  @state() private predictorStatus: 'idle' | 'loading' | 'complete' | 'error' = 'idle';

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
  
  // Weather Analysis State
  @state() private weatherStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private weatherAnalysisData: WeatherAnalysis | null = null;
  
  // Energy Signature Analysis State
  @state() private energySignatureStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private energySignatureAnalysisData: EnergySignatureAnalysis | null = null;
  
  // Atmosphere Analysis State
  @state() private atmosphereStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private atmosphereAnalysisData: AtmosphereAnalysis | null = null;

  // Image Generation State
  @state() private imageGenerationStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private generatedImageData: { url: string; prompt: string; } | null = null;

  // Hyperparameter Tuning State
  @state() private hyperparameters = {
    n_estimators: 200,
    max_depth: 8,
    learning_rate: 0.1,
  };
  @state() private recalibrationStatus: 'idle' | 'running' | 'complete' = 'idle';

  // Shader Lab State
  @state() private shaderLabVs = `// Vertex Shader: Provides position and UV data.
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
  @state() private shaderLabFs = `// Fragment Shader: Determines the color of each pixel.
uniform float uTime;
varying vec2 vUv;

void main() {
  // A simple psychedelic pattern based on UVs and time
  vec3 color = 0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0, 2, 4));
  gl_FragColor = vec4(color, 1.0);
}`;
  @state() private shaderLabError: string | null = null;


  // --- QUERIES ---
  @query('axee-audio-engine') private audioEngine!: AxeeAudioEngine;
  @query('cosmos-visualizer')
  private cosmosVisualizer!: CosmosVisualizer;
  @query('#session-file-input')
  private sessionFileInput!: HTMLInputElement;
  @query('#atmosphere-chart') private atmosphereChartCanvas: HTMLCanvasElement | undefined;
  @query('#metrics-chart') private metricsChartCanvas: HTMLCanvasElement | undefined;
  
  // --- PRIVATE VARS ---
  private ai!: GoogleGenAI;
  private metricsChart: Chart | null = null;
  private discoveryStatsChart: Chart | null = null;
  private atmosphereChart: Chart | null = null;

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
      gravity: {type: Type.STRING, description: "Surface gravity relative to Earth (e.g., '1.2 g')."},
      surfacePressure: {type: Type.STRING, description: "Atmospheric pressure at the surface (e.g., '1.5 atm', 'Trace', or 'N/A')."},
      magnetosphereStrength: {type: Type.STRING, description: "Strength of the planet's magnetic field (e.g., 'Strong', 'Moderate', 'Weak', 'None')."},
      geologicalActivity: {type: Type.STRING, description: "Level of geological activity (e.g., 'Active', 'Low', 'Dormant', 'Cryovolcanic')."},
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
    // FIX: initAI method was missing.
    this.initAI();
    this.loadSessionFromLocalStorage();
    const savedTheme = localStorage.getItem('axee_theme') as 'light' | 'dark';
    if (savedTheme) {
        this.theme = savedTheme;
    } else {
        // Default to dark theme if nothing is saved
        localStorage.setItem('axee_theme', 'dark');
    }
    // FIX: updateThemeClass method was missing.
    this.updateThemeClass(this.theme);
  }

  // --- AI INITIALIZATION & THEME ---

  // FIX: Implement missing initAI method.
  private initAI() {
    this.ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    this.aiStatus = 'idle';
    this.statusMessage = 'Awaiting Synthesis Command';
  }

  // FIX: Implement missing updateThemeClass method.
  private updateThemeClass(theme: 'dark' | 'light') {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('axee_theme', theme);
  }

  // --- COORDINATE CALCULATION ---
  // FIX: Implement missing calculateAndStoreCoords method.
  private calculateAndStoreCoords(planet: PlanetData) {
    // Create a pseudo-random but deterministic position based on the planet's ID
    let seed = 0;
    for (let i = 0; i < planet.celestial_body_id.length; i++) {
        seed += planet.celestial_body_id.charCodeAt(i);
    }
    const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };

    const angle = seededRandom(seed * 2) * Math.PI * 2;
    const radius = 20 + seededRandom(seed * 3) * 120; // 20 to 140 units from center
    const y = (seededRandom(seed * 4) - 0.5) * 15; // Small vertical deviation

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    this.galaxyMapCoords.set(planet.celestial_body_id, [x, y, z]);
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
          this.isUnseenRevealed = sessionData.isUnseenRevealed ?? false;
          // Load UI state with defaults for backwards compatibility
          this.isLeftPanelOpen = sessionData.isLeftPanelOpen ?? true;
          this.isRightPanelOpen = sessionData.isRightPanelOpen ?? true;
          this.leftPanelView = sessionData.leftPanelView ?? 'list';
          this.databaseSort = sessionData.databaseSort ?? { key: 'planetName', order: 'asc' };

          // Recalculate all planet coordinates on load
          this.galaxyMapCoords.clear();
          this.discoveredGalaxies.forEach(galaxy => {
            // FIX: calculateAndStoreCoords method was missing.
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
        isUnseenRevealed: this.isUnseenRevealed,
        isLeftPanelOpen: this.isLeftPanelOpen,
        isRightPanelOpen: this.isRightPanelOpen,
        leftPanelView: this.leftPanelView,
        databaseSort: this.databaseSort,
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
      planets: [MOCK_PLANET, VERIDIA_PLANET, KAIROS_PLANET, ...ENRICHED_SOL_SYSTEM],
    };

    this.discoveredGalaxies = [homeGalaxy, NYX_PRIMORDIA_GALAXY];
    this.activeGalaxyId = homeGalaxy.id;
    this.isUnseenRevealed = false;
    this.galaxyMapCoords.clear();
    this.discoveredGalaxies.forEach((galaxy) => {
      // FIX: calculateAndStoreCoords method was missing.
      galaxy.planets.forEach((planet) => this.calculateAndStoreCoords(planet));
    });
    this.saveSessionToLocalStorage();
  }

  // --- GETTERS ---
  private get activeGalaxy(): GalaxyData | undefined {
    return this.discoveredGalaxies.find((g) => g.id === this.activeGalaxyId);
  }

  private get discoveredPlanets(): PlanetData[] {
    return this.activeGalaxy?.planets ?? [];
  }

  private get selectedPlanet(): PlanetData | null {
    if (!this.selectedPlanetId) {
      return null;
    }
    for (const galaxy of this.discoveredGalaxies) {
      const planet = galaxy.planets.find(
        (p) => p.celestial_body_id === this.selectedPlanetId,
      );
      if (planet) {
        return planet;
      }
    }
    return null;
  }

  connectedCallback() {
    super.connectedCallback();
    // FIX: checkForOnboarding method was missing.
    this.checkForOnboarding();
    // FIX: handleFirstInteraction method was missing.
    window.addEventListener('click', this.handleFirstInteraction, {once: true});
    // FIX: startAIChronicles method was missing.
    this.startAIChronicles();
  }
  
  protected firstUpdated() {
    // FIX: _createRipple method was missing.
    (this as unknown as HTMLElement).addEventListener('click', this._createRipple);
  }

  // FIX: The `updateComplete` promise is not necessary inside the `updated`
  // lifecycle callback, as the DOM is already updated at this point.
  // This also resolves the TypeScript error "Property 'updateComplete' does not exist".
  protected updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('isDashboardOpen') && this.isDashboardOpen) {
      // The DOM is updated, so the canvas is available.
      this.updateMetricsChart();
    }
    if (changedProperties.has('atmosphereAnalysisData') && this.atmosphereAnalysisData) {
      // The DOM is updated, so the canvas is available.
      this.updateAtmosphereChart();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this.handleFirstInteraction);
    if (this.chronicleTimeout) {
      clearTimeout(this.chronicleTimeout);
    }
    (this as unknown as HTMLElement).removeEventListener('click', this._createRipple);
  }

  // --- ONBOARDING & INTERACTION ---

  // FIX: Implement missing checkForOnboarding method.
  private checkForOnboarding() {
    const hasOnboarded = localStorage.getItem('axee_onboarded');
    if (!hasOnboarded) {
      this.showOnboarding = true;
    }
  }

  // FIX: Implement missing handleFirstInteraction method.
  private handleFirstInteraction = () => {
    if (this.hasInteracted) return;
    this.hasInteracted = true;
    if (this.audioEngine) {
      // The mood is initialized to 'off', but this initializes the AudioContext.
      this.audioEngine.mood = this.currentMood;
    }
    console.log('User interaction detected. Audio context is now active.');
  }

  // --- AI CHRONICLES ---

  // FIX: Implement missing startAIChronicles method.
  private startAIChronicles() {
    if (this.chronicleTimeout) {
      clearTimeout(this.chronicleTimeout);
    }
    const generateChronicle = () => {
        if (!this.isLeftPanelOpen && !this.isRightPanelOpen) {
            const nextInterval = 15000 + Math.random() * 20000;
            this.chronicleTimeout = setTimeout(generateChronicle, nextInterval);
            return;
        }

        const chronicleTypes: AiChronicleEntry['type'][] = ['thought', 'suggestion', 'discovery'];
        const randomType = chronicleTypes[Math.floor(Math.random() * chronicleTypes.length)];
        let content = '';
        switch(randomType) {
            case 'thought':
                content = 'Recalibrating cosmic microwave background resonance. Faint structural anomalies detected.';
                break;
            case 'suggestion':
                const randomPlanet = this.discoveredPlanets[Math.floor(Math.random() * this.discoveredPlanets.length)];
                if (randomPlanet) {
                    content = `Unusual energy signature from ${randomPlanet.planetName}. Recommend follow-up analysis.`;
                    this.aiSuggestion = `Analyze ${randomPlanet.planetName}`;
                } else {
                    content = `Subspace energy fluctuations detected. Recommend broader spectrum scan.`;
                }
                break;
            case 'discovery':
                content = `Hypothesis: The star cluster NGC-2244 exhibits non-standard stellar evolution patterns. Further data required.`;
                break;
        }

        this.addAiChronicle(randomType, content);
        
        const nextInterval = 20000 + Math.random() * 25000; // 20-45 seconds
        this.chronicleTimeout = setTimeout(generateChronicle, nextInterval);
    };
    this.chronicleTimeout = setTimeout(generateChronicle, 8000);
  }
  
  // FIX: Add helper method required by startAIChronicles.
  private addAiChronicle(type: AiChronicleEntry['type'], content: string, planetId?: string, galaxyId?: string) {
    const newEntry: AiChronicleEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      content,
      planetId,
      galaxyId: galaxyId ?? this.activeGalaxyId,
    };
    this.aiChronicles = [newEntry, ...this.aiChronicles];
    if(this.isRightPanelOpen) {
        this.hasNewChronicle = true;
        setTimeout(() => { this.hasNewChronicle = false; }, 4000);
    }
    this.saveSessionToLocalStorage();
  }

  // --- UI EFFECTS ---

  private _createRipple = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('button');
    if (!target || (target as HTMLButtonElement).disabled) return;

    const circle = document.createElement('span');
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;

    const rect = target.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');
    
    const oldRipple = target.querySelector('.ripple');
    if (oldRipple) {
        oldRipple.remove();
    }

    target.appendChild(circle);
    
    circle.addEventListener('animationend', () => {
        circle.remove();
    });
  }

  private resetAllAnalysis() {
    this.magnetosphereStatus = 'idle';
    this.magnetosphereAnalysisData = null;
    this.deepScanStatus = 'idle';
    this.deepScanData = null;
    this.exoSuitStatus = 'idle';
    this.exoSuitAnalysisData = null;
    this.lightCurveStatus = 'idle';
    this.lightCurveData = null;
    this.radialVelocityStatus = 'idle';
    this.radialVelocityData = null;
    this.weatherStatus = 'idle';
    this.weatherAnalysisData = null;
    this.energySignatureStatus = 'idle';
    this.energySignatureAnalysisData = null;
    this.atmosphereStatus = 'idle';
    this.atmosphereAnalysisData = null;
    this.imageGenerationStatus = 'idle';
    this.generatedImageData = null;
  }

  private calculateDepth(lightCurveData: LightCurveAnalysis): string {
    if (!lightCurveData.points || lightCurveData.points.length === 0) {
      return 'N/A';
    }
    const minFlux = Math.min(...lightCurveData.points.map(p => p.flux));
    // Depth is often measured in parts per million (ppm)
    const depthPPM = (1 - minFlux) * 1e6;
    return `${depthPPM.toLocaleString(undefined, { maximumFractionDigits: 0 })} ppm`;
  }

  private handlePlanetSelected(planetId: string | null) {
    if (this.isTutorialActive) return;
  
    if (this.selectedPlanetId === planetId) {
      this.selectedPlanetId = null;
      this.audioEngine.playClearSound();
    } else {
      this.selectedPlanetId = planetId;
      this.audioEngine.playInteractionSound();
      this.resetAllAnalysis();
  
      if (planetId) {
        // Find the selected planet and trigger image generation
        let selectedPlanet: PlanetData | null = null;
        for (const galaxy of this.discoveredGalaxies) {
            const p = galaxy.planets.find(p => p.celestial_body_id === planetId);
            if (p) {
                selectedPlanet = p;
                break;
            }
        }
        if (selectedPlanet) {
            // Check for existing light curve data and pre-populate
            if (selectedPlanet.lightCurveData) {
              this.lightCurveData = selectedPlanet.lightCurveData;
              this.lightCurveStatus = 'complete';
            }
            this.handleGeneratePlanetImage(selectedPlanet);
        }
      }
  
      if (window.innerWidth < 768) {
          this.isRightPanelOpen = true;
          this.isLeftPanelOpen = false;
      }
    }
  }

  private closePanels = () => {
    this.isLeftPanelOpen = false;
    this.isRightPanelOpen = false;
  }

  // --- AXEE PREDICTOR METHODS ---

  private handlePredictorInputChange(e: Event) {
    const { name, value } = e.target as HTMLInputElement;
    this.predictorForm = { ...this.predictorForm, [name]: value };
  }

  private async handlePredictorSubmit() {
    if (!this.predictorForm.orbital_period || !this.predictorForm.transit_duration || !this.predictorForm.planet_radius) {
      this.predictorStatus = 'error';
      this.predictorError = 'Please fill in all fields.';
      this.predictorResult = null;
      return;
    }
    this.predictorStatus = 'loading';
    this.predictorResult = null;
    this.predictorError = null;
    this.audioEngine.playInteractionSound();

    try {
      const prompt = `Based on the following exoplanet data, predict its AXEE classification and discovery source.
      - Orbital Period: ${this.predictorForm.orbital_period} days
      - Transit Duration: ${this.predictorForm.transit_duration} hours
      - Planet Radius: ${this.predictorForm.planet_radius} Earths.
      Provide only a JSON object with keys 'axeeClassification' and 'discoverySource'.`;
      
      const predictionSchema = {
          type: Type.OBJECT,
          properties: {
              axeeClassification: {
                  type: Type.STRING,
                  description: "Must be one of: 'Confirmed', 'Candidate', 'Hypothetical'."
              },
              discoverySource: {
                  type: Type.STRING,
                  description: "Must be one of: 'synthesis', 'stream', 'archive'."
              }
          }
      };

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: predictionSchema
        },
      });
      
      const result = JSON.parse(response.text);

      this.predictorResult = result;
      this.predictorStatus = 'complete';
      this.audioEngine.playSuccessSound();

    } catch (e) {
      console.error('Prediction failed:', e);
      this.predictorStatus = 'error';
      let errorMessage = 'Prediction failed. Please try again.';
      if (e instanceof Error && e.message) {
          if (e.message.toLowerCase().includes('api key')) {
              errorMessage = 'Prediction failed: API Key is invalid.';
          } else if (e.message.toLowerCase().includes('quota')) {
              errorMessage = 'Prediction failed: API quota has been exceeded.';
          }
      }
      this.predictorError = errorMessage;
      this.predictorResult = null;
      this.audioEngine.playErrorSound();
    }
  }

  // --- ONBOARDING & TUTORIAL ---
  private handleOnboardingNext = () => {
    if (this.onboardingStep < ONBOARDING_STANZAS.length - 1) {
      this.onboardingStep++;
    } else {
      this.showOnboarding = false;
      this.isTutorialActive = true;
    }
    this.audioEngine.playInteractionSound();
  }

  private handleOnboardingSkip = () => {
    this.showOnboarding = false;
    this.isTutorialActive = false;
    localStorage.setItem('axee_onboarded', 'true');
    this.audioEngine.playClearSound();
  }
  
  private handleTutorialNext = () => {
    if (this.tutorialStep === 1) { // After synthesize step
        // We can't auto-detect synthesis, so just assume they did it.
    }
    if (this.tutorialStep === 2) { // After select planet step
        const planet = this.activeGalaxy?.planets[0];
        if (planet) {
            this.handlePlanetSelected(planet.celestial_body_id);
        }
    }
    this.tutorialStep++;
    this.audioEngine.playInteractionSound();
  }

  private handleTutorialSkip = () => {
    this.isTutorialActive = false;
    this.tutorialStep = 0;
    localStorage.setItem('axee_onboarded', 'true');
    this.audioEngine.playClearSound();
  }
  
  private handleUseSamplePrompt = () => {
    this.userPrompt = 'A verdant super-earth with twin moons, orbiting a G-type star.';
    this.audioEngine.playInteractionSound();
  }

  // --- SYNTHESIS & ANALYSIS ---
  
  private handlePromptKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        this.handleSynthesize();
    }
  }

  private async handleSynthesize() {
    if (!this.userPrompt || this.aiStatus.startsWith('thinking')) return;

    this.aiStatus = 'thinking';
    this.statusMessage = 'Synthesizing new celestial body...';
    this.error = null;
    this.audioEngine.playInteractionSound();

    try {
        const prompt = `Based on the following user request, generate a detailed and scientifically plausible exoplanet. Ensure all fields in the JSON schema are populated with creative and consistent data. Request: "${this.userPrompt}"`;

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: this.planetSchema,
            },
        });

        const newPlanet: PlanetData = JSON.parse(response.text);
        newPlanet.celestial_body_id = `aurelion-synth-${Date.now()}`;
        newPlanet.discoverySource = 'synthesis';
        newPlanet.created_at = new Date().toISOString();

        const galaxy = this.activeGalaxy;
        if (galaxy) {
            // FIX: Property 'requestUpdate' does not exist on type 'AxeeInterface'.
            // Updated state immutably to ensure Lit detects changes and re-renders correctly.
            const newPlanets = [newPlanet, ...galaxy.planets];
            const updatedGalaxy = { ...galaxy, planets: newPlanets };
            this.discoveredGalaxies = this.discoveredGalaxies.map(g => g.id === galaxy.id ? updatedGalaxy : g);

            this.calculateAndStoreCoords(newPlanet);
            this.saveSessionToLocalStorage();
            this.addAiChronicle('discovery', `Synthesized a new world: ${newPlanet.planetName} from user prompt.`, newPlanet.celestial_body_id);
            this.selectedPlanetId = newPlanet.celestial_body_id;
            this.audioEngine.playSuccessSound();
        }

    } catch (e) {
        console.error('Synthesis failed:', e);
        let errorMessage = 'Synthesis failed. The AI core may be unstable. Please try a different prompt.';
        if (e instanceof Error && e.message) {
          if (e.message.toLowerCase().includes('safety')) {
            errorMessage = 'Synthesis failed due to content safety restrictions. Please modify your prompt.';
          } else if (e.message.toLowerCase().includes('api key')) {
            errorMessage = 'Synthesis failed: Invalid API Key configuration.';
          } else if (e.message.toLowerCase().includes('quota')) {
            errorMessage = 'Synthesis failed: API quota limit has been reached.';
          }
        }
        this.error = errorMessage;
        this.aiStatus = 'error';
        this.audioEngine.playErrorSound();
    } finally {
        if (this.aiStatus !== 'error') {
            this.aiStatus = 'idle';
        }
        this.statusMessage = 'Awaiting Synthesis Command';
        this.userPrompt = '';
    }
  }

  private async handleGalaxySectorClicked(e: CustomEvent) {
    const { sectorName } = e.detail;
    const galaxyName = this.activeGalaxy?.galaxyName || 'the current galaxy';

    this.aiStatus = 'thinking-cluster';
    this.statusMessage = `Analyzing sector: ${sectorName}...`;
    this.audioEngine.playInteractionSound();

    try {
        const prompt = `You are AXEE, an advanced AI for celestial cartography. Generate a concise, intriguing scientific summary for the "${sectorName}" of the "${galaxyName}". Mention star density, age, and a plausible cosmic anomaly. Format as a single paragraph.`;

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const summary = response.text;
        this.addAiChronicle('discovery', summary, undefined, this.activeGalaxyId);
        this.audioEngine.playSuccessSound();

    } catch (err) {
        console.error('Galaxy Sector Analysis Failed:', err);
        this.addAiChronicle('thought', `Analysis of ${sectorName} failed. Subspace interference suspected.`, undefined, this.activeGalaxyId);
        this.audioEngine.playErrorSound();
    } finally {
        this.aiStatus = 'idle';
        this.statusMessage = 'Awaiting Synthesis Command';
    }
  }

  private async handleGeneratePlanetImage(planet: PlanetData) {
    // Check for cached image data on the planet object itself
    if (planet.generatedImageData) {
        this.generatedImageData = planet.generatedImageData;
        this.imageGenerationStatus = 'complete';
        return;
    }

    this.imageGenerationStatus = 'running';
    this.generatedImageData = null;
    this.audioEngine.playInteractionSound();

    try {
        const prompt = `Create a photorealistic, cinematic, awe-inspiring digital painting of an exoplanet named ${planet.planetName}.
- Type: ${planet.planetType}, orbiting a ${planet.starType}.
- Key Features: ${planet.keyFeatures.join(', ')}.
- Surface: ${planet.surfaceFeatures}.
- Atmosphere: ${planet.atmosphericComposition}.
- Overall feel: ${planet.aiWhisper}.
- Do not include any text, labels, or user interface elements in the image. High resolution, detailed.`;

        const response = await this.ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9',
            },
        });

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        
        const imageData = { url: imageUrl, prompt: prompt };

        this.generatedImageData = imageData;
        this.imageGenerationStatus = 'complete';

        // Update planet data to cache the image for the session
        this.discoveredGalaxies = this.discoveredGalaxies.map(galaxy => ({
            ...galaxy,
            planets: galaxy.planets.map(p => 
                p.celestial_body_id === planet.celestial_body_id 
                    ? { ...p, generatedImageData: imageData } 
                    : p
            )
        }));
        this.saveSessionToLocalStorage();
        this.audioEngine.playSuccessSound();

    } catch (e) {
        console.error('Image generation failed:', e);
        this.imageGenerationStatus = 'error';
        this.audioEngine.playErrorSound();
    }
  }

  private async handleRunLightCurveAnalysis() {
    if (!this.selectedPlanet || this.lightCurveStatus === 'running') return;
    const planetToAnalyze = this.selectedPlanet;

    this.lightCurveStatus = 'running';
    this.audioEngine.playInteractionSound();
    this.lightCurveData = null;
    
    try {
        const prompt = `Generate a plausible light curve dataset for the exoplanet ${planetToAnalyze.planetName}. The planet has an orbital period of ${planetToAnalyze.orbitalPeriodDays} days, a transit duration of ${planetToAnalyze.transitDurationHours} hours, and a radius of ${planetToAnalyze.planetRadiusEarths} Earths. The star is a ${planetToAnalyze.starType}. Provide a brief, one-sentence summary and a JSON array of 20-30 data points for a single transit event. Each point should have 'time' (in HJD), 'flux' (relative), and 'error'.`;

        const lightCurveSchema = {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                points: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            time: { type: Type.NUMBER },
                            flux: { type: Type.NUMBER },
                            error: { type: Type.NUMBER },
                        }
                    }
                }
            }
        };

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: lightCurveSchema,
            },
        });

        const data: LightCurveAnalysis = JSON.parse(response.text);
        this.lightCurveData = data;
        this.lightCurveStatus = 'complete';
        
        // Update planet data to cache the light curve for the session
        this.discoveredGalaxies = this.discoveredGalaxies.map(galaxy => ({
            ...galaxy,
            planets: galaxy.planets.map(p => 
                p.celestial_body_id === planetToAnalyze.celestial_body_id 
                    ? { ...p, lightCurveData: data } 
                    : p
            )
        }));
        this.saveSessionToLocalStorage();
        
        this.audioEngine.playSuccessSound();

    } catch (e) {
        console.error('Light curve analysis failed:', e);
        this.lightCurveStatus = 'error';
        this.audioEngine.playErrorSound();
    }
  }

  private async handleRunRadialVelocityAnalysis() {
    if (!this.selectedPlanet || this.radialVelocityStatus === 'running') return;

    this.radialVelocityStatus = 'running';
    this.audioEngine.playInteractionSound();
    this.radialVelocityData = null;
    
    try {
        const prompt = `Generate a plausible radial velocity dataset for the exoplanet ${this.selectedPlanet.planetName}, which orbits a ${this.selectedPlanet.starType} with a period of ${this.selectedPlanet.orbitalPeriodDays} days. The data should show a clear sinusoidal wobble. Provide a brief, one-sentence summary and a JSON array of 20-30 data points. Each point should have 'time' (phase, from 0 to 1), 'velocity' (in m/s), and 'error'.`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                points: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            time: { type: Type.NUMBER },
                            velocity: { type: Type.NUMBER },
                            error: { type: Type.NUMBER },
                        }
                    }
                }
            }
        };

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const data: RadialVelocityAnalysis = JSON.parse(response.text);
        this.radialVelocityData = data;
        this.radialVelocityStatus = 'complete';
        this.audioEngine.playSuccessSound();

    } catch (e) {
        console.error('Radial velocity analysis failed:', e);
        this.radialVelocityStatus = 'error';
        this.audioEngine.playErrorSound();
    }
  }

  private async handleRunMagnetosphereAnalysis() {
    if (!this.selectedPlanet || this.magnetosphereStatus === 'running') return;

    this.magnetosphereStatus = 'running';
    this.audioEngine.playInteractionSound();
    this.magnetosphereAnalysisData = null;
    
    try {
        const prompt = `Generate a magnetosphere shielding analysis for the exoplanet ${this.selectedPlanet.planetName}, which has a reported magnetosphere strength of '${this.selectedPlanet.magnetosphereStrength}'. Provide a one-sentence summary and a JSON array of 100 'rays'. Each ray object should have 'thickness' (a float from 0.1 to 2.0) and a normalized 'direction' vector ({x, y, z}). Stronger magnetospheres should have generally higher thickness values.`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                rays: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            thickness: { type: Type.NUMBER },
                            direction: {
                                type: Type.OBJECT,
                                properties: {
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER },
                                    z: { type: Type.NUMBER },
                                }
                            }
                        }
                    }
                }
            }
        };

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const data: MagnetosphereAnalysis = JSON.parse(response.text);
        this.magnetosphereAnalysisData = data;
        this.magnetosphereStatus = 'complete';
        this.audioEngine.playSuccessSound();

    } catch (e) {
        console.error('Magnetosphere analysis failed:', e);
        this.magnetosphereStatus = 'error';
        this.audioEngine.playErrorSound();
    }
  }

  private async handleRunDeepScanAnalysis() {
    if (!this.selectedPlanet || this.deepScanStatus === 'running') return;

    this.deepScanStatus = 'running';
    this.audioEngine.playInteractionSound();
    this.deepScanData = null;

    try {
        const prompt = `Generate a deep scan material analysis for the terrestrial exoplanet ${this.selectedPlanet.planetName}.
        - Provide a 'jobLabel' (e.g., 'Core Density Scan') and 'creatorName' (e.g., 'AXEE Geophysics Unit').
        - Create a list of 4 plausible geological 'materials' with 'id' (e.g., '1') and 'name' (e.g., 'Iron-Nickel Core', 'Silicate Mantle', 'Basalt Crust', 'Water Ice').
        - Generate a JSON array of 50 'rays'. Each ray has a 'direction' vector and 'layers'. Each layer has a 'materialId' and a 'thickness' (a float from 50 to 2000).`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                jobLabel: { type: Type.STRING },
                creatorName: { type: Type.STRING },
                materials: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                        }
                    }
                },
                rays: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            direction: {
                                type: Type.OBJECT,
                                properties: {
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER },
                                    z: { type: Type.NUMBER },
                                }
                            },
                            layers: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        materialId: { type: Type.STRING },
                                        thickness: { type: Type.NUMBER },
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const data: DeepScanAnalysis = JSON.parse(response.text);
        this.deepScanData = data;
        this.deepScanStatus = 'complete';
        this.audioEngine.playSuccessSound();
    } catch (e) {
        console.error('Deep scan analysis failed:', e);
        this.deepScanStatus = 'error';
        this.audioEngine.playErrorSound();
    }
  }

  private async handleRunExoSuitAnalysis() {
    if (!this.selectedPlanet || this.exoSuitStatus === 'running') return;

    this.exoSuitStatus = 'running';
    this.audioEngine.playInteractionSound();
    this.exoSuitAnalysisData = null;

    try {
        const prompt = `Generate an exo-suit material durability analysis for the environment of exoplanet ${this.selectedPlanet.planetName}.
        - The gravity is ${this.selectedPlanet.gravity} and surface pressure is ${this.selectedPlanet.surfacePressure}.
        - Provide a 'jobLabel' (e.g., 'Mark IV Suit Integrity Test').
        - Create a list of 3 plausible suit 'materials' with 'id' and 'name' (e.g., 'Graphene Composite', 'Aerogel Insulation', 'Titanium Alloy').
        - Generate a JSON array of 50 'rays'. Each ray has a 'direction' vector and 'layers'. Each layer has a 'materialId' and a 'thickness' (a float from 0.1 to 5.0).`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                jobLabel: { type: Type.STRING },
                materials: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                        }
                    }
                },
                rays: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            direction: {
                                type: Type.OBJECT,
                                properties: {
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER },
                                    z: { type: Type.NUMBER },
                                }
                            },
                            layers: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        materialId: { type: Type.STRING },
                                        thickness: { type: Type.NUMBER },
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const data: ExoSuitAnalysis = JSON.parse(response.text);
        this.exoSuitAnalysisData = data;
        this.exoSuitStatus = 'complete';
        this.audioEngine.playSuccessSound();
    } catch (e) {
        console.error('Exo-suit analysis failed:', e);
        this.exoSuitStatus = 'error';
        this.audioEngine.playErrorSound();
    }
  }
  
  private async handleRunWeatherAnalysis() {
    if (!this.selectedPlanet || this.weatherStatus === 'running') return;

    this.weatherStatus = 'running';
    this.audioEngine.playInteractionSound();
    this.weatherAnalysisData = null;

    try {
        const prompt = `Generate a plausible weather analysis for the exoplanet ${this.selectedPlanet.planetName}, which has an atmospheric composition of: ${this.selectedPlanet.atmosphericComposition}. Provide a one-sentence summary, temperature (day/night in °C), wind (speed in km/h, cardinal direction), and a list of 2-3 common storm types.`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                temperature: {
                    type: Type.OBJECT,
                    properties: {
                        day: { type: Type.NUMBER },
                        night: { type: Type.NUMBER },
                        units: { type: Type.STRING, description: "Should be '°C'" },
                    }
                },
                wind: {
                    type: Type.OBJECT,
                    properties: {
                        speed: { type: Type.NUMBER },
                        direction: { type: Type.STRING, description: "e.g., 'W', 'NNE', etc." },
                        units: { type: Type.STRING, description: "Should be 'km/h'" },
                    }
                },
                storms: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        };

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const data: WeatherAnalysis = JSON.parse(response.text);
        this.weatherAnalysisData = data;
        this.weatherStatus = 'complete';
        this.audioEngine.playSuccessSound();
    } catch (e) {
        console.error('Weather analysis failed:', e);
        this.weatherStatus = 'error';
        this.audioEngine.playErrorSound();
    }
  }
  
  private async handleRunEnergySignatureAnalysis() {
    if (!this.selectedPlanet || this.energySignatureStatus === 'running') return;

    this.energySignatureStatus = 'running';
    this.audioEngine.playInteractionSound();
    this.energySignatureAnalysisData = null;

    try {
        const prompt = `Generate a plausible energy signature dataset for the exoplanet ${this.selectedPlanet.planetName}. Provide a one-sentence summary and a JSON array of 15-20 data 'points'. Each point should have a 'frequency' (in THz, from 1 to 1000), 'intensity' (0 to 1), and a creative 'type' (e.g., 'Bioluminescent Pulse', 'Radio Signal', 'Tachyon Emission', 'Geothermal Venting'). The types and frequencies should be consistent with the planet's characteristics.`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                points: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            frequency: { type: Type.NUMBER },
                            intensity: { type: Type.NUMBER },
                            type: { type: Type.STRING },
                        }
                    }
                }
            }
        };

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const data: EnergySignatureAnalysis = JSON.parse(response.text);
        this.energySignatureAnalysisData = data;
        this.energySignatureStatus = 'complete';
        this.audioEngine.playSuccessSound();
    } catch (e) {
        console.error('Energy signature analysis failed:', e);
        this.energySignatureStatus = 'error';
        this.audioEngine.playErrorSound();
    }
  }

  private async handleRunAtmosphereAnalysis() {
    if (!this.selectedPlanet || this.atmosphereStatus === 'running') return;

    this.atmosphereStatus = 'running';
    this.audioEngine.playInteractionSound();
    this.atmosphereAnalysisData = null;

    try {
        const prompt = `Generate a detailed atmospheric composition breakdown for the exoplanet ${this.selectedPlanet.planetName}, whose atmosphere is generally described as: "${this.selectedPlanet.atmosphericComposition}". Provide a one-sentence summary and a JSON array for 'composition', where each object has 'gas' (string) and 'percentage' (number). The percentages should add up to 100.`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                composition: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            gas: { type: Type.STRING },
                            percentage: { type: Type.NUMBER },
                        }
                    }
                }
            }
        };

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const data: AtmosphereAnalysis = JSON.parse(response.text);
        this.atmosphereAnalysisData = data;
        this.atmosphereStatus = 'complete';
        // FIX: Moved chart update to the `updated` lifecycle method to prevent a
        // race condition where the chart is drawn before the canvas element is rendered.
        this.audioEngine.playSuccessSound();
    } catch (e) {
        console.error('Atmosphere analysis failed:', e);
        this.atmosphereStatus = 'error';
        this.audioEngine.playErrorSound();
    }
  }

  private updateAtmosphereChart() {
    if (!this.atmosphereChartCanvas || !this.atmosphereAnalysisData) return;

    if (this.atmosphereChart) {
        this.atmosphereChart.destroy();
    }

    const data = this.atmosphereAnalysisData.composition;
    const labels = data.map(d => d.gas);
    const percentages = data.map(d => d.percentage);

    this.atmosphereChart = new Chart(this.atmosphereChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Percentage',
                data: percentages,
                backgroundColor: 'rgba(97, 250, 255, 0.5)',
                borderColor: 'rgba(97, 250, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { color: '#c0f0ff' },
                    grid: { color: 'rgba(97, 250, 255, 0.2)' }
                },
                y: {
                    ticks: { color: '#c0f0ff' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
  }

  // --- DASHBOARD METHODS ---
  private handleHyperparameterChange(e: Event) {
    const { name, value } = e.target as HTMLInputElement;
    this.hyperparameters = { ...this.hyperparameters, [name]: Number(value) };
  }

  private handleRecalibrate() {
    this.recalibrationStatus = 'running';
    this.audioEngine.playInteractionSound();
    setTimeout(() => {
        this.recalibrationStatus = 'complete';
        this.audioEngine.playSuccessSound();
        setTimeout(() => {
            this.recalibrationStatus = 'idle';
        }, 1500);
    }, 3000);
  }
  
  private updateMetricsChart() {
    if (!this.metricsChartCanvas) return;

    if (this.metricsChart) {
      this.metricsChart.destroy();
    }

    const labels = ['Confirmed', 'Candidate', 'Hypothetical'];
    const metrics = MOCK_MODEL_PERFORMANCE.metrics;

    this.metricsChart = new Chart(this.metricsChartCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Precision',
            data: [metrics.confirmed.precision, metrics.candidate.precision, metrics.hypothetical.precision],
            backgroundColor: 'rgba(97, 250, 255, 0.6)',
            borderColor: 'rgba(97, 250, 255, 1)',
            borderWidth: 1,
          },
          {
            label: 'Recall',
            data: [metrics.confirmed.recall, metrics.candidate.recall, metrics.hypothetical.recall],
            backgroundColor: 'rgba(97, 255, 202, 0.6)',
            borderColor: 'rgba(97, 255, 202, 1)',
            borderWidth: 1,
          },
          {
            label: 'F1-Score',
            data: [metrics.confirmed.f1Score, metrics.candidate.f1Score, metrics.hypothetical.f1Score],
            backgroundColor: 'rgba(255, 194, 97, 0.6)',
            borderColor: 'rgba(255, 194, 97, 1)',
            borderWidth: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
            ticks: { color: '#c0f0ff' },
            grid: { color: 'rgba(97, 250, 255, 0.2)' }
          },
          x: {
            ticks: { color: '#c0f0ff' },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#c0f0ff'
            }
          }
        }
      }
    });
  }

  // --- RENDERING ---

  private renderOnboardingOverlay() {
    const stanza = ONBOARDING_STANZAS[this.onboardingStep];
    const isLastStanza = this.onboardingStep >= ONBOARDING_STANZAS.length - 1;

    return html`
    <div class="fixed inset-0 bg-bg/95 z-[2000] flex flex-col items-center justify-center text-center p-8 animate-fade-in-onboarding">
        <div class="max-w-2xl">
        ${stanza.map((line, index) => html`
            <p class="text-2xl md:text-3xl lg:text-4xl opacity-0 animate-fade-in" style="animation-delay: ${index * 0.3 + 0.2}s; animation-fill-mode: forwards;">${line}</p>
        `)}
        </div>
        <div class="mt-12 flex gap-4 opacity-0 animate-fade-in" style="animation-delay: ${stanza.length * 0.3 + 0.2}s; animation-fill-mode: forwards;">
            <button @click=${this.handleOnboardingSkip} class="text-sm opacity-70 hover:opacity-100 transition-opacity">[ Skip Intro ]</button>
            <button @click=${this.handleOnboardingNext} class="px-6 py-3 rounded font-bold uppercase tracking-widest text-text-dark bg-accent/80 hover:bg-accent transition-colors">
                ${isLastStanza ? 'Begin Tutorial' : 'Continue'}
            </button>
        </div>
    </div>
    `;
  }
  
  private renderPlanetListPanel() {
    return html`
        <div id="planet-list-panel" class="p-4 h-full flex flex-col">
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-base font-bold tracking-widest uppercase text-accent">Planet Database</h3>
            </div>
            <div class="scroll-container flex-grow overflow-y-auto -mr-4 pr-4">
            <ul>
                ${this.discoveredPlanets.map(p => html`
                <li 
                    class=${classMap({'cursor-pointer p-2 rounded hover:bg-white/10': true, 'bg-accent/20': this.selectedPlanetId === p.celestial_body_id})}
                    @click=${() => this.handlePlanetSelected(p.celestial_body_id)}>
                    ${p.planetName}
                </li>
                `)}
            </ul>
            </div>
        </div>
    `;
  }

  private renderAxeePredictorPanel() {
    const isLoading = this.predictorStatus === 'loading';
    
    const classificationInfo: {[key:string]: {color: string, icon: any}} = {
        'Confirmed': { color: 'text-green-400', icon: html`<svg class="w-4 h-4 mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>` },
        'Candidate': { color: 'text-yellow-400', icon: html`<svg class="w-4 h-4 mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path></svg>` },
        'Hypothetical': { color: 'text-accent', icon: html`<svg class="w-4 h-4 mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"></path></svg>` },
    };

    const sourceInfo: {[key:string]: {color: string, icon: any}} = {
        'synthesis': { color: 'text-fuchsia-400', icon: html`<svg class="w-4 h-4 mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20"><path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V5a1 1 0 00-1.447-.894l-4 2A1 1 0 0011 7v10zM4 17a1 1 0 001.447.894l4-2A1 1 0 0010 15V5a1 1 0 00-1.447-.894l-4 2A1 1 0 004 7v10z"></path></svg>` },
        'stream': { color: 'text-sky-400', icon: html`<svg class="w-4 h-4 mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3.5a1.5 1.5 0 01.5 2.915V13.5a1.5 1.5 0 01-3 0V6.415A1.5 1.5 0 0110 3.5zM7 6a1 1 0 000 2h6a1 1 0 100-2H7z"></path></svg>` },
        'archive': { color: 'text-amber-400', icon: html`<svg class="w-4 h-4 mr-2 inline-block" fill="currentColor" viewBox="0 0 20 20"><path d="M3 3a1 1 0 000 2v11a1 1 0 100 2h14a1 1 0 100-2V5a1 1 0 000-2H3zm2 4a1 1 0 011-1h2a1 1 0 110 2H6a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2H6a1 1 0 01-1-1z"></path></svg>` },
    };

    return html`
      <div class="p-4 h-full flex flex-col">
          <h3 class="text-base font-bold tracking-widest uppercase text-accent mb-2">AXEE Predictor</h3>
          <p class="text-xs opacity-70 mb-4">Input hypothetical exoplanet data to get a classification prediction from the AI core.</p>
          <div class="flex-grow overflow-y-auto -mr-4 pr-4 text-sm space-y-4">
              <div>
                  <label class="text-xs opacity-70 block mb-1">Orbital Period (days)</label>
                  <input type="number" name="orbital_period" .value=${this.predictorForm.orbital_period} @input=${this.handlePredictorInputChange} class="w-full bg-black/20 p-2 rounded border border-border focus:border-accent focus:outline-none" placeholder="e.g., 365.25">
              </div>
              <div>
                  <label class="text-xs opacity-70 block mb-1">Transit Duration (hours)</label>
                  <input type="number" name="transit_duration" .value=${this.predictorForm.transit_duration} @input=${this.handlePredictorInputChange} class="w-full bg-black/20 p-2 rounded border border-border focus:border-accent focus:outline-none" placeholder="e.g., 12.0">
              </div>
              <div>
                  <label class="text-xs opacity-70 block mb-1">Planet Radius (Earths)</label>
                  <input type="number" name="planet_radius" .value=${this.predictorForm.planet_radius} @input=${this.handlePredictorInputChange} class="w-full bg-black/20 p-2 rounded border border-border focus:border-accent focus:outline-none" placeholder="e.g., 1.0">
              </div>
              <button 
                  @click=${this.handlePredictorSubmit} 
                  ?disabled=${isLoading}
                  class="w-full p-2 mt-4 rounded transition-colors ${isLoading ? 'bg-yellow-500/20 text-yellow-300 cursor-wait thinking-button' : 'bg-accent/80 hover:bg-accent text-white'}">
                  ${isLoading ? html`<span class="opacity-0">PREDICTING...</span>` : 'PREDICT'}
              </button>
              
              ${this.predictorStatus === 'complete' && this.predictorResult ? html`
                  <div class="mt-4 p-3 rounded bg-black/30 animate-fade-in">
                      <h4 class="text-xs uppercase opacity-70 mb-3">Prediction Result</h4>
                      <div class="space-y-2 text-base">
                          <div class="flex items-center font-bold ${classificationInfo[this.predictorResult.axeeClassification]?.color || 'text-text'}">
                              ${classificationInfo[this.predictorResult.axeeClassification]?.icon}
                              <span>${this.predictorResult.axeeClassification}</span>
                          </div>
                          <div class="flex items-center font-bold ${sourceInfo[this.predictorResult.discoverySource]?.color || 'text-text'}">
                              ${sourceInfo[this.predictorResult.discoverySource]?.icon}
                              <span>${this.predictorResult.discoverySource}</span>
                          </div>
                      </div>
                  </div>
              ` : nothing}

              ${this.predictorStatus === 'error' && this.predictorError ? html`
                  <div class="mt-4 p-3 rounded bg-red-500/20 text-center text-red-400">
                      <p class="text-sm font-bold">${this.predictorError}</p>
                  </div>
              ` : nothing}
          </div>
      </div>
    `;
  }

  private renderPlanetDetailPanel(planet: PlanetData) {
    const assessmentColor =
      planet.potentialForLife.assessment.toLowerCase().includes('confirmed')
        ? 'text-green-400'
        : planet.potentialForLife.assessment.toLowerCase().includes('potential')
        ? 'text-yellow-400'
        : 'text-red-400';

    return html`
      <div class="p-4 h-full flex flex-col text-sm text-text">
        <div class="flex justify-between items-center mb-2 flex-shrink-0">
          <h3 class="text-base font-bold tracking-widest uppercase text-accent">Stellar Cartography</h3>
          <button @click=${() => this.handlePlanetSelected(null)} class="text-xs uppercase hover:text-accent transition-colors">[Close]</button>
        </div>
        
        <div class="flex-grow overflow-y-auto pr-2 -mr-4">
            <div class="text-center mb-4">
                <h2 class="text-2xl font-bold">${planet.planetName}</h2>
                <p class="text-accent">${planet.axeeClassification} ${planet.planetType}</p>
                <p class="text-xs opacity-70">${planet.starSystem} (${planet.starType}) &bull; ${planet.distanceLightYears} ly</p>
            </div>

            <div class="panel-section">
                <h4 class="panel-subheader">AI Visual Synthesis</h4>
                ${
                    this.imageGenerationStatus === 'complete' && this.generatedImageData ? html`
                        <div class="animate-fade-in group relative cursor-pointer" @click=${() => alert(`Prompt:\n\n${this.generatedImageData?.prompt}`)}>
                            <img src=${this.generatedImageData.url} alt="AI synthesis of ${planet.planetName}" class="w-full h-auto rounded border border-border" />
                            <div class="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <p class="text-xs text-center p-4">Click to view generation prompt</p>
                            </div>
                        </div>
                    ` : this.imageGenerationStatus === 'error' ? html`
                        <div class="h-40 relative bg-black/20 rounded border border-border">
                            <planet-visualizer .planet=${planet}></planet-visualizer>
                            <div class="absolute inset-0 flex flex-col items-center justify-center bg-red-900/60 backdrop-blur-sm text-center text-red-300">
                                <p>Image synthesis failed.</p>
                                <button class="text-xs mt-2 underline hover:text-white transition-colors" @click=${() => this.handleGeneratePlanetImage(planet)}>Retry</button>
                            </div>
                        </div>
                    ` : html`
                        <div class="h-40 relative bg-black/20 rounded border border-border">
                            <planet-visualizer .planet=${planet}></planet-visualizer>
                            ${this.imageGenerationStatus === 'running' ? html`
                                <div class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm text-center text-yellow-300">
                                    <div class="thinking-button !relative !w-5 !h-5 !-ml-0 !-mt-0 mr-2"></div>
                                    <span>Synthesizing Image...</span>
                                </div>
                            ` : nothing}
                        </div>
                    `
                }
            </div>

            <p class="italic opacity-80 my-4 text-center">"${planet.aiWhisper}"</p>

            <div class="panel-section grid grid-cols-3 gap-2 text-center">
                <div class="flex flex-col items-center justify-center p-1 bg-black/20 rounded">
                    <span class="text-lg font-bold text-accent">${planet.gravity}</span>
                    <span class="text-[10px] opacity-70 uppercase">Gravity</span>
                </div>
                <div class="flex flex-col items-center justify-center p-1 bg-black/20 rounded">
                    <span class="text-lg font-bold text-accent">${planet.planetRadiusEarths}x</span>
                    <span class="text-[10px] opacity-70 uppercase">Radius (Earth)</span>
                </div>
                <div class="flex flex-col items-center justify-center p-1 bg-black/20 rounded">
                    <span class="text-lg font-bold text-accent">${planet.orbitalPeriodDays}</span>
                    <span class="text-[10px] opacity-70 uppercase">Days/Year</span>
                </div>
            </div>

            <div id="analysis-buttons" class="panel-section">
              <h4 class="panel-subheader">Analysis Tools</h4>
              <div class="space-y-2">
                <div class="bg-black/20 rounded p-2">
                    <h5 class="text-sm font-bold tracking-wider text-text/80 mb-2">Light Curve Analysis</h5>
                    ${this.lightCurveStatus === 'complete' && this.lightCurveData ? html`
                        <div class="animate-fade-in">
                            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                                <span>Transit Duration</span><span class="font-bold text-right">${planet.transitDurationHours ? `${planet.transitDurationHours.toFixed(1)} hrs` : 'N/A'}</span>
                                <span>Transit Depth</span><span class="font-bold text-right">${this.calculateDepth(this.lightCurveData)}</span>
                            </div>
                            <p class="text-xs opacity-70 italic mb-2">${this.lightCurveData.summary}</p>
                            <div class="h-32">
                                <light-curve-visualizer .analysisData=${this.lightCurveData}></light-curve-visualizer>
                            </div>
                        </div>
                    ` : this.lightCurveStatus === 'running' ? html`
                        <div class="h-20 flex items-center justify-center text-yellow-300">
                            <div class="thinking-button !relative !w-5 !h-5 !-ml-0 !-mt-0 mr-2"></div>
                            <span>Generating Simulation...</span>
                        </div>
                    ` : this.lightCurveStatus === 'error' ? html `
                        <div class="text-center p-2 text-red-400">
                            <p>Simulation failed.</p>
                            <button class="text-xs mt-1 underline hover:text-white" @click=${this.handleRunLightCurveAnalysis}>Retry</button>
                        </div>
                    ` : html`
                        <div class="text-center p-2">
                            <p class="text-xs opacity-70 mb-2">No archival light curve data exists for this planet. Generate a plausible simulation?</p>
                            <button class="px-4 py-1 text-sm rounded bg-accent/80 hover:bg-accent text-white transition-colors" @click=${this.handleRunLightCurveAnalysis}>
                                Generate
                            </button>
                        </div>
                    `}
                </div>

                <button class="analysis-btn ${this.radialVelocityStatus}" @click=${this.handleRunRadialVelocityAnalysis} ?disabled=${this.radialVelocityStatus === 'running'}>
                  <span>Radial Velocity</span>
                </button>
                ${this.radialVelocityStatus === 'complete' && this.radialVelocityData ? html`
                <div class="p-2 bg-black/20 rounded">
                    <p class="text-xs opacity-70 italic mb-2">${this.radialVelocityData.summary}</p>
                    <div class="h-32">
                        <radial-velocity-visualizer .analysisData=${this.radialVelocityData}></radial-velocity-visualizer>
                    </div>
                </div>
                ` : nothing}
                ${this.radialVelocityStatus === 'error' ? html`<div class="text-red-400 text-xs text-center p-1">Analysis failed. The AI core could not resolve the doppler shift.</div>` : nothing}

                <button class="analysis-btn ${this.atmosphereStatus}" @click=${this.handleRunAtmosphereAnalysis} ?disabled=${this.atmosphereStatus === 'running'}>
                    <span>Atmosphere Composition</span>
                </button>
                ${this.atmosphereStatus === 'complete' && this.atmosphereAnalysisData ? html`
                <div class="p-2 bg-black/20 rounded">
                    <p class="text-xs opacity-70 italic mb-2">${this.atmosphereAnalysisData.summary}</p>
                    <div class="h-48">
                        <canvas id="atmosphere-chart"></canvas>
                    </div>
                </div>
                ` : nothing}
                ${this.atmosphereStatus === 'error' ? html`<div class="text-red-400 text-xs text-center p-1">Analysis failed. Unable to process spectral data.</div>` : nothing}
                
                <button class="analysis-btn ${this.energySignatureStatus}" @click=${this.handleRunEnergySignatureAnalysis} ?disabled=${this.energySignatureStatus === 'running'}>
                  <span>Energy Signature</span>
                </button>
                ${this.energySignatureStatus === 'complete' && this.energySignatureAnalysisData ? html`
                <div class="p-2 bg-black/20 rounded">
                    <p class="text-xs opacity-70 italic mb-2">${this.energySignatureAnalysisData.summary}</p>
                    <div class="h-32">
                        <energy-signature-visualizer .analysisData=${this.energySignatureAnalysisData}></energy-signature-visualizer>
                    </div>
                </div>
                ` : nothing}
                ${this.energySignatureStatus === 'error' ? html`<div class="text-red-400 text-xs text-center p-1">Analysis failed. Signal corrupted.</div>` : nothing}

                <button class="analysis-btn ${this.weatherStatus}" @click=${this.handleRunWeatherAnalysis} ?disabled=${this.weatherStatus === 'running'}>
                    <span>Weather Analysis</span>
                </button>
                ${this.weatherStatus === 'complete' && this.weatherAnalysisData ? html`
                <div class="p-2 bg-black/20 rounded">
                    <weather-visualizer .analysisData=${this.weatherAnalysisData}></weather-visualizer>
                </div>
                ` : nothing}
                ${this.weatherStatus === 'error' ? html`<div class="text-red-400 text-xs text-center p-1">Analysis failed. Atmospheric simulation diverged.</div>` : nothing}

                <button class="analysis-btn ${this.magnetosphereStatus}" @click=${this.handleRunMagnetosphereAnalysis} ?disabled=${this.magnetosphereStatus === 'running'}>
                    <span>Magnetosphere Shielding</span>
                </button>
                ${this.magnetosphereStatus === 'complete' && this.magnetosphereAnalysisData ? html`
                <div class="p-2 bg-black/20 rounded">
                    <p class="text-xs opacity-70 italic mb-2">${this.magnetosphereAnalysisData.summary}</p>
                    <div class="h-32">
                        <shielding-visualizer .analysisData=${this.magnetosphereAnalysisData}></shielding-visualizer>
                    </div>
                </div>
                ` : nothing}
                ${this.magnetosphereStatus === 'error' ? html`<div class="text-red-400 text-xs text-center p-1">Analysis failed. Field model collapsed.</div>` : nothing}

                <button class="analysis-btn ${this.deepScanStatus}" @click=${this.handleRunDeepScanAnalysis} ?disabled=${this.deepScanStatus === 'running'}>
                    <span>Deep Core Scan</span>
                </button>
                ${this.deepScanStatus === 'complete' && this.deepScanData ? html`
                <div class="p-2 bg-black/20 rounded">
                    <p class="text-xs opacity-70 italic mb-2">SCAN: ${this.deepScanData.jobLabel}</p>
                    <div class="h-32">
                        <deep-scan-visualizer .analysisData=${this.deepScanData}></deep-scan-visualizer>
                    </div>
                </div>
                ` : nothing}
                ${this.deepScanStatus === 'error' ? html`<div class="text-red-400 text-xs text-center p-1">Analysis failed. Subsurface interference detected.</div>` : nothing}
                
                <button class="analysis-btn ${this.exoSuitStatus}" @click=${this.handleRunExoSuitAnalysis} ?disabled=${this.exoSuitStatus === 'running'}>
                    <span>Exo-Suit Durability</span>
                </button>
                ${this.exoSuitStatus === 'complete' && this.exoSuitAnalysisData ? html`
                <div class="p-2 bg-black/20 rounded">
                    <p class="text-xs opacity-70 italic mb-2">SIM: ${this.exoSuitAnalysisData.jobLabel}</p>
                    <div class="h-32">
                        <exo-suit-visualizer .analysisData=${this.exoSuitAnalysisData}></exo-suit-visualizer>
                    </div>
                </div>
                ` : nothing}
                ${this.exoSuitStatus === 'error' ? html`<div class="text-red-400 text-xs text-center p-1">Analysis failed. Simulation encountered a fatal error.</div>` : nothing}
              </div>
            </div>

            <div class="panel-section">
                <h4 class="panel-subheader">Habitability Assessment</h4>
                <p class="font-bold text-base ${assessmentColor}">${planet.potentialForLife.assessment}</p>
                <p class="opacity-80 mt-1 text-xs">${planet.potentialForLife.reasoning}</p>
                ${planet.potentialForLife.biosignatures?.length > 0 ? html`
                    <div class="mt-2 text-xs">
                        <strong class="opacity-70">Biosignatures:</strong>
                        <span class="opacity-90">${planet.potentialForLife.biosignatures.join(', ')}</span>
                    </div>
                ` : nothing}
            </div>

            <div class="panel-section text-xs">
                <h4 class="panel-subheader">Physical Characteristics</h4>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span>Rotational Period</span><span class="font-bold text-right">${planet.rotationalPeriod}</span>
                    <span>Orbital Period</span><span class="font-bold text-right">${planet.orbitalPeriod}</span>
                    <span>Surface Pressure</span><span class="font-bold text-right">${planet.surfacePressure}</span>
                    <span>Magnetosphere</span><span class="font-bold text-right">${planet.magnetosphereStrength}</span>
                    <span>Geological Activity</span><span class="font-bold text-right">${planet.geologicalActivity}</span>
                    <span>Moons</span><span class="font-bold text-right">${planet.moons.count}</span>
                </div>
            </div>

             <div class="panel-section text-xs">
                <h4 class="panel-subheader">Composition & Features</h4>
                 <p class="opacity-80"><strong class="opacity-90">Atmosphere:</strong> ${planet.atmosphericComposition}</p>
                 <p class="opacity-80 mt-1"><strong class="opacity-90">Surface:</strong> ${planet.surfaceFeatures}</p>
            </div>

            <div class="panel-section text-xs">
                <h4 class="panel-subheader">Discovery Log</h4>
                <p class="opacity-80">${planet.discoveryNarrative}</p>
                <p class="opacity-80 mt-2"><strong class="opacity-90">Methodology:</strong> ${planet.discoveryMethodology}</p>
            </div>
        </div>
      </div>
    `;
  }
  
  private renderAiChroniclesPanel() {
    const filteredChronicles = this.aiChronicles.filter(c => 
      this.chronicleFilter === 'all' || c.type === this.chronicleFilter
    );

    return html`
      <div class="p-4 h-full flex flex-col text-sm text-text">
        <div class="flex justify-between items-center mb-2 flex-shrink-0">
          <h3 class="text-base font-bold tracking-widest uppercase text-accent">AI Core Chronicles</h3>
          ${this.hasNewChronicle ? html`<span class="text-xs text-accent animate-pulse">New Entry</span>` : nothing}
        </div>
        <div class="flex items-center gap-2 mb-2 text-xs border-b border-t border-border py-1 flex-shrink-0">
          <span class="opacity-70">Filter:</span>
          <button class=${classMap({'font-bold text-accent': this.chronicleFilter === 'all'})} @click=${() => this.chronicleFilter = 'all'}>All</button>
          <button class=${classMap({'font-bold text-accent': this.chronicleFilter === 'discovery'})} @click=${() => this.chronicleFilter = 'discovery'}>Discoveries</button>
          <button class=${classMap({'font-bold text-accent': this.chronicleFilter === 'thought'})} @click=${() => this.chronicleFilter = 'thought'}>Thoughts</button>
          <button class=${classMap({'font-bold text-accent': this.chronicleFilter === 'suggestion'})} @click=${() => this.chronicleFilter = 'suggestion'}>Suggestions</button>
        </div>
        <div class="flex-grow overflow-y-auto pr-2 -mr-4">
          <ul class="space-y-3">
            ${filteredChronicles.map(entry => html`
              <li class="opacity-80 leading-relaxed animate-fade-in">
                <div class="flex justify-between items-center text-xs opacity-60">
                  <span class="font-bold uppercase">${entry.type}</span>
                  <span>${new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <p class="text-sm mt-1">${entry.content}</p>
              </li>
            `)}
          </ul>
        </div>
        ${this.aiSuggestion ? html`
          <div class="mt-2 pt-2 border-t border-border flex-shrink-0">
              <button class="w-full text-left p-2 text-sm bg-accent/20 hover:bg-accent/40 rounded transition-colors" @click=${() => { this.userPrompt = this.aiSuggestion!; this.aiSuggestion = null; } }>
                  <strong class="font-bold">Suggestion:</strong> ${this.aiSuggestion}
              </button>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private renderDashboard() {
    const matrix = MOCK_MODEL_PERFORMANCE.confusionMatrix;
    const labels = ['Confirmed', 'Candidate', 'Hypothetical'];

    const correct = matrix[0][0] + matrix[1][1] + matrix[2][2];
    const total = matrix.flat().reduce((sum, val) => sum + val, 0);
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    return html`
        <div class="dashboard-overlay animate-fade-in-onboarding">
            <div class="dashboard-content">
                <div class="dashboard-header">
                    <h2 class="dashboard-title">AI Core Performance</h2>
                    <button @click=${() => this.isDashboardOpen = false} class="text-xs uppercase hover:text-accent transition-colors">[ Close ]</button>
                </div>
                <div class="dashboard-body">
                    <div class="dashboard-section">
                        <h3>Classification Metrics</h3>
                        <div class="chart-container flex-grow">
                            <canvas id="metrics-chart"></canvas>
                        </div>
                    </div>
                    <div class="dashboard-section">
                        <div class="flex justify-between items-baseline mb-4">
                            <h3 class="!mb-0">Confusion Matrix</h3>
                            <div class="text-right">
                                <div class="text-lg font-bold text-success">${accuracy.toFixed(1)}%</div>
                                <div class="text-xs opacity-70 -mt-1">Overall Accuracy</div>
                            </div>
                        </div>
                        <div class="flex-grow flex items-center justify-center">
                            <table class="confusion-matrix">
                                <thead>
                                    <tr>
                                        <th class="border-none"></th>
                                        <th colspan="3" class="!text-center">Predicted Class</th>
                                    </tr>
                                    <tr>
                                        <th class="w-24">Actual Class</th>
                                        ${labels.map(l => html`<th>${l}</th>`)}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${matrix.map((row, i) => html`
                                        <tr>
                                            <th>${labels[i]}</th>
                                            ${row.map((val, j) => html`
                                                <td class=${classMap({ correct: i === j, incorrect: i !== j })}>${val.toLocaleString()}</td>
                                            `)}
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="dashboard-section lg:col-span-2">
                        <h3>Hyperparameter Tuning</h3>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div class="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div class="hyper-param">
                                    <label for="n_estimators">N Estimators: ${this.hyperparameters.n_estimators}</label>
                                    <input type="range" id="n_estimators" name="n_estimators" min="50" max="500" step="10" .value=${this.hyperparameters.n_estimators} @input=${this.handleHyperparameterChange}>
                                </div>
                                <div class="hyper-param">
                                    <label for="max_depth">Max Depth: ${this.hyperparameters.max_depth}</label>
                                    <input type="range" id="max_depth" name="max_depth" min="2" max="20" .value=${this.hyperparameters.max_depth} @input=${this.handleHyperparameterChange}>
                                </div>
                                <div class="hyper-param">
                                    <label for="learning_rate">Learning Rate: ${this.hyperparameters.learning_rate}</label>
                                    <input type="range" id="learning_rate" name="learning_rate" min="0.01" max="0.5" step="0.01" .value=${this.hyperparameters.learning_rate} @input=${this.handleHyperparameterChange}>
                                </div>
                            </div>
                            <button 
                                @click=${this.handleRecalibrate} 
                                ?disabled=${this.recalibrationStatus === 'running'}
                                class="w-full p-2 h-16 rounded transition-colors relative ${
                                    this.recalibrationStatus === 'running' ? 'bg-yellow-500/20 text-yellow-300 cursor-wait thinking-button' : 
                                    this.recalibrationStatus === 'complete' ? 'bg-green-500/20 text-green-300' : 
                                    'bg-accent/80 hover:bg-accent text-white'
                                }">
                                ${this.recalibrationStatus === 'running' ? html`<span class="opacity-0">RECALIBRATING...</span>` : 
                                  this.recalibrationStatus === 'complete' ? html`<span class="flex items-center justify-center has-animated-checkmark">COMPLETE</span>` :
                                  'RECALIBRATE'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
  }
  
  render() {
    // This render method has been updated for responsiveness.
    const showBackdrop = (this.isLeftPanelOpen || this.isRightPanelOpen) && window.innerWidth < 768;

    return html`
      ${this.showOnboarding ? this.renderOnboardingOverlay() : nothing}
      ${this.isTutorialActive ? html`
        <tutorial-overlay 
            .steps=${TUTORIAL_STEPS} 
            .step=${this.tutorialStep}
            @next=${this.handleTutorialNext}
            @skip=${this.handleTutorialSkip}
            @use-sample-prompt=${this.handleUseSamplePrompt}
        ></tutorial-overlay>
      ` : nothing}
      ${this.isDashboardOpen ? this.renderDashboard() : nothing}

      <axee-audio-engine
        .mood=${this.currentMood}
        ?muted=${this.isMuted}
      ></axee-audio-engine>

      <div class="h-screen w-screen flex flex-col bg-bg text-text">
        <header class="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-2 bg-panel-bg/50 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none md:p-4">
          <div class="flex items-center gap-2">
            <button @click=${() => { this.isLeftPanelOpen = !this.isLeftPanelOpen; if (window.innerWidth < 768) this.isRightPanelOpen = false; }} class="panel-toggle-btn md:hidden">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <button @click=${() => this.isLeftPanelOpen = !this.isLeftPanelOpen} class="hidden md:block text-xs uppercase tracking-widest px-2 py-1 hover:bg-glow/50 rounded transition-colors">
              ${this.isLeftPanelOpen ? 'Close Database' : 'Open Database'}
            </button>
            <button @click=${() => this.isDashboardOpen = true} class="hidden md:block text-xs uppercase tracking-widest px-2 py-1 hover:bg-glow/50 rounded transition-colors">
              AI Core
            </button>
          </div>
          
          <h1 class="text-base md:text-xl font-bold tracking-widest text-accent uppercase" style="text-shadow: 0 0 10px var(--glow-color);">AXEE</h1>
  
          <div class="flex items-center gap-2">
             <button @click=${() => this.isRightPanelOpen = !this.isRightPanelOpen} class="hidden md:block text-xs uppercase tracking-widest px-2 py-1 hover:bg-glow/50 rounded transition-colors">
              ${this.isRightPanelOpen ? 'Close Details' : 'Open Details'}
             </button>
             <button @click=${() => { this.isRightPanelOpen = !this.isRightPanelOpen; if (window.innerWidth < 768) this.isLeftPanelOpen = false; }} class="panel-toggle-btn md:hidden">
               <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             </button>
          </div>
        </header>
  
        <main class="relative flex-grow">
          <cosmos-visualizer
            class="absolute top-0 left-0 w-full h-full"
            .galaxies=${this.discoveredGalaxies}
            .activeGalaxyId=${this.activeGalaxyId}
            .activePlanets=${this.discoveredPlanets}
            .activePlanetCoords=${this.galaxyMapCoords}
            .selectedPlanetId=${this.selectedPlanetId}
            .navigationRoute=${this.navigationRoute}
            ?isJumping=${this.isJumping}
            ?isUnseenRevealed=${this.isUnseenRevealed}
            @planet-selected=${(e: CustomEvent) => this.handlePlanetSelected(e.detail.planetId)}
            @galaxy-sector-clicked=${this.handleGalaxySectorClicked}
          ></cosmos-visualizer>
          
          ${showBackdrop ? html`<div class="panel-backdrop md:hidden" @click=${this.closePanels}></div>` : nothing}
          
          <div id="left-panel" class=${classMap({panel: true, open: this.isLeftPanelOpen, 'pointer-events-auto': this.isLeftPanelOpen})}>
            <div class="h-full flex flex-col pt-16 md:pt-0">
                <div class="flex-grow">
                ${this.leftPanelView === 'list'
                    ? this.renderPlanetListPanel()
                    : this.renderAxeePredictorPanel()
                }
                </div>
                <div class="flex-shrink-0 border-t border-border p-2 flex text-xs">
                    <button 
                        @click=${() => this.leftPanelView = 'list'}
                        class=${classMap({'flex-1 p-2 rounded transition-colors': true, 'bg-accent/20 text-accent': this.leftPanelView === 'list', 'hover:bg-white/10': this.leftPanelView !== 'list'})}>
                        PLANET LIST
                    </button>
                    <button 
                        @click=${() => this.leftPanelView = 'predictor'}
                        class=${classMap({'flex-1 p-2 rounded transition-colors': true, 'bg-accent/20 text-accent': this.leftPanelView === 'predictor', 'hover:bg-white/10': this.leftPanelView !== 'predictor'})}>
                        PREDICTOR
                    </button>
                </div>
            </div>
          </div>
  
          <div id="right-panel" class=${classMap({panel: true, open: this.isRightPanelOpen, 'pointer-events-auto': this.isRightPanelOpen})}>
            <div class="pt-16 md:pt-0 h-full">
            ${this.selectedPlanet
              ? this.renderPlanetDetailPanel(this.selectedPlanet)
              : this.renderAiChroniclesPanel()
            }
            </div>
          </div>
        </main>
        
        ${this.error ? html`
            <div class="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-30 animate-fade-in">
                <div class="bg-error/90 backdrop-blur-sm text-white p-3 pr-10 rounded-lg border border-red-500 flex items-center shadow-lg relative">
                    <svg class="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                    <p class="text-sm">${this.error}</p>
                    <button @click=${() => this.error = null} class="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-full hover:bg-white/20 transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
            </div>
        ` : nothing}

        <footer id="command-bar" class="absolute bottom-0 left-0 right-0 z-20 p-2 md:p-4 bg-panel-bg/80 backdrop-blur-sm">
            <div class="max-w-4xl mx-auto flex gap-2 md:gap-4">
                <input 
                    type="text" 
                    .value=${this.userPrompt}
                    @input=${(e: Event) => this.userPrompt = (e.target as HTMLInputElement).value}
                    @keydown=${this.handlePromptKeydown}
                    placeholder="Synthesize a new world..."
                    class="flex-grow bg-black/30 border border-border rounded px-4 py-2 focus:outline-none focus:border-accent transition-colors text-sm md:text-base"
                />
                <button 
                    @click=${this.handleSynthesize} 
                    ?disabled=${this.aiStatus.startsWith('thinking') || !this.userPrompt.trim()}
                    class="px-4 py-2 md:px-6 md:py-2 rounded font-bold uppercase tracking-widest text-text-dark transition-colors relative
                    ${this.aiStatus.startsWith('thinking') || !this.userPrompt.trim()
                        ? 'bg-glow/30 cursor-wait'
                        : 'bg-accent/80 hover:bg-accent'
                    } ${this.aiStatus === 'thinking' ? 'thinking-button' : ''}">
                    <span class=${classMap({ 'opacity-0': this.aiStatus === 'thinking' })}>Synthesize</span>
                </button>
            </div>
        </footer>

      </div>
    `;
  }

  protected createRenderRoot() {
    return this; // Use light DOM
  }
}