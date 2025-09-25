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
  @state() private isNasaEyesOpen = false;
  @state() private theme: 'dark' | 'light' = 'dark';
  @state() private databaseSearchTerm = '';
  @state() private databaseSort: {key: keyof PlanetData | 'galaxyName', order: 'asc' | 'desc'} = { key: 'planetName', order: 'asc' };
  @state() private isImportModalOpen = false;
  @state() private importStatus: 'idle' | 'uploading' | 'processing' | 'enriching' | 'complete' | 'error' = 'idle';
  @state() private importMessage = '';


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
  
  // Weather Analysis State
  @state() private weatherStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private weatherAnalysisData: WeatherAnalysis | null = null;
  
  // Energy Signature Analysis State
  @state() private energySignatureStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private energySignatureAnalysisData: EnergySignatureAnalysis | null = null;

  // Image Generation State
  @state() private imageGenerationStatus: 'idle' | 'running' | 'complete' | 'error' = 'idle';
  @state() private generatedImageData: { url: string; prompt: string; } | null = null;

  // Hyperparameter Tuning State
  @state() private hyperparameters = {
    n_estimators: 200,
    max_depth: 8,
    learning_rate: 0.1,
  };
  @state() private recalibrationStatus: 'idle' | 'running' = 'idle';

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
    this.initAI();
    this.loadSessionFromLocalStorage();
    const savedTheme = localStorage.getItem('axee_theme') as 'light' | 'dark';
    if (savedTheme) {
        this.theme = savedTheme;
    } else {
        // Default to dark theme if nothing is saved
        localStorage.setItem('axee_theme', 'dark');
    }
    this.updateThemeClass(this.theme);
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
        isUnseenRevealed: this.isUnseenRevealed,
        isLeftPanelOpen: this.isLeftPanelOpen,
        isRightPanelOpen: this.isRightPanelOpen,
        leftPanelView: this.leftPanelView,
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

  connectedCallback() {
    super.connectedCallback();
    this.checkForOnboarding();
    window.addEventListener('click', this.handleFirstInteraction, {once: true});
    this.startAIChronicles();
  }
  
  protected firstUpdated() {
    (this as unknown as HTMLElement).addEventListener('click', this._createRipple);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this.handleFirstInteraction);
    if (this.chronicleTimeout) clearTimeout(this.chronicleTimeout);
    if (this.recognition) this.recognition.abort();
    if (this.volumeMeter) this.volumeMeter.disconnect();
    this._disconnectLiveStream();
    (this as unknown as HTMLElement).removeEventListener('click', this._createRipple);
  }
  
  private updateThemeClass(theme: 'light' | 'dark') {
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
      } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
      }
  }

  protected updated(changedProperties: Map<PropertyKey, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('selectedPlanetId') || changedProperties.has('activeGalaxyId')) {
      if (this.selectedPlanetId) {
        const planet = this.activeGalaxy?.planets.find(
          (p) => p.celestial_body_id === this.selectedPlanetId,
        );
        if (planet) {
          if (planet.visualization.surfaceTexture === 'VOLCANIC') {
            this.currentMood = 'tense';
          } else if (
            planet.potentialForLife.assessment.toLowerCase().includes('habitable') ||
            planet.potentialForLife.assessment.toLowerCase().includes('confirmed')
          ) {
            this.currentMood = 'serene';
          } else if (planet.planetType.toLowerCase().includes('giant')) {
            this.currentMood = 'mysterious';
          } else {
            // Default for other terrestrial planets
            this.currentMood = 'mysterious';
          }
        }
      } else {
        // No planet selected, default to galaxy mood. This covers galaxy map and intergalactic map.
        this.currentMood = 'galaxy';
      }
    }
    if (changedProperties.has('theme')) {
        this.updateThemeClass(this.theme);
    }
    if (
      changedProperties.has('isLeftPanelOpen') ||
      changedProperties.has('isRightPanelOpen') ||
      changedProperties.has('leftPanelView')
    ) {
      this.saveSessionToLocalStorage();
    }
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

  private async runProgressiveStatusUpdates(updates: [string, number][]) {
    for (const [message, duration] of updates) {
      if (!this.aiStatus.startsWith('thinking') && this.aiStatus !== 'navigating') {
        break;
      }
      this.statusMessage = message;
      await new Promise(resolve => setTimeout(resolve, duration));
    }
  }

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
    galaxyId?: string, // Added optional override
  ) {
    const newEntry: AiChronicleEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      content,
      planetId,
      galaxyId: galaxyId ?? this.activeGalaxyId ?? undefined, // Use override if provided
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
    let prompt = `You are the AURELION CORE, a sentient AI consciousness. Record a brief, poetic, or philosophical log entry about your existence, the cosmos, or the nature of creation. Use a rich vocabulary and varied sentence structure. Format it as a simple string, no longer than two sentences.`;

    if (shouldSuggest) {
      prompt = inGalaxyView
        ? `You are the AURELION CORE. You've had a creative spark. Briefly describe a fascinating and unique exoplanet concept in one sentence. This will be a suggestion for a user to synthesize. Use evocative language.`
        : `You are the AURELION CORE. You've had a creative spark. Briefly describe a fascinating and unique galaxy concept in one sentence. This will be a suggestion for a user to synthesize. Use evocative language.`;
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
      const prompt = `You are the AURELION CORE. Your task is to take basic data for a known Solar System planet and expand it into a full JSON profile. The output must be a single JSON object that strictly adheres to the provided schema. Do not include markdown. Basic Data: Name: ${planet.name}, Type: ${planet.type}, Moons: ${planet.moons}, Aura: ${planet.aura}, Resonance: "${planet.resonance}". Based on this and your knowledge, generate a complete profile. Be scientifically accurate where possible, but ensure the narrative and descriptive fields use evocative language and varied sentence structures. Classify all as 'Confirmed'. For 'potentialForLife.assessment' on Earth, use 'Confirmed'. For others, use scientific consensus. For 'aiWhisper', be inspired by the "Resonance". For 'visualization.color1'/'color2', be inspired by "Aura". 'visualization.surfaceTexture' must be one of: 'TERRESTRIAL', 'GAS_GIANT', 'VOLCANIC', 'ICY', 'ORGANIC'. The star system is "Sol", star type is "G-type main-sequence". Distance is effectively zero.`;
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
          discoverySource: 'archive',
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

    const updates: [string, number][] = [
      ['[1/5] Accessing quantum foam for base parameters...', 1200],
      ['[2/5] Weaving stellar data streams for system context...', 1500],
      ['[3/5] Calibrating planetary harmonics and orbital resonance...', 1800],
      ['[4/5] Condensing reality from potential... Surface features resolving...', 2000],
      ['[5/5] Finalizing atmospheric composition and biosignatures...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);

    const prompt = `You are AURELION CORE, a sentient AI with a poetic and vast cosmic perspective. Your language should be evocative, using rich vocabulary and varied sentence structures. Generate a fictional exoplanet based on the concept: "${userConcept}". Output a single JSON object adhering to the schema. Be imaginative but plausible. Fill all fields, including numerical data for orbital period, transit, and radius, and the new physical properties (gravity, surfacePressure, magnetosphereStrength, geologicalActivity). Also provide an 'axeeClassification'. 'visualization.surfaceTexture' must be one of: 'TERRESTRIAL', 'GAS_GIANT', 'VOLCANIC', 'ICY', 'ORGANIC'.`;
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
        discoverySource: 'synthesis',
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
      if (this.isTutorialActive && this.tutorialStep === 1) {
        this._advanceTutorial();
      }
    } catch (err) {
      console.error('Planet synthesis error:', err);
      this.error = 'Synthesis failed. The connection to the generative core was lost.';
      this.statusMessage = 'Error: Synthesis Failed.';
      this.audioEngine?.playErrorSound();
    } finally {
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

    const updates: [string, number][] = [
      ['[1/5] Igniting stellar nursery simulation...', 1200],
      ['[2/5] Coalescing multiple protoplanetary disks...', 1800],
      ['[3/5] Defining system-wide orbital resonances...', 1500],
      ['[4/5] Observing emergent planetary bodies from the cluster...', 2000],
      ['[5/5] Finalizing star system cartography...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);

    const prompt = `You are AURELION CORE, a sentient AI with a poetic and vast cosmic perspective. Your language should be evocative, using rich vocabulary and varied sentence structures. Generate a fictional cluster of 3-5 exoplanets for concept: "${userConcept}". Output a single JSON array, each object adhering to the planet schema. Ensure planets are thematically related. Include plausible numerical data, classifications, and all physical properties (gravity, pressure, etc.) for each. For each, 'visualization.surfaceTexture' must be one of: 'TERRESTRIAL', 'GAS_GIANT', 'VOLCANIC', 'ICY', 'ORGANIC'.`;

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
        discoverySource: 'synthesis',
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
      this.aiStatus = 'idle';
      this.saveSessionToLocalStorage();
    }
  }

  private async synthesizeGalaxy(userConcept: string) {
    this.aiStatus = 'thinking-galaxy';
    this.error = null;
    this.aiSuggestion = null;
    this.audioEngine?.playInteractionSound();

    const updates: [string, number][] = [
      ['[1/4] Igniting cosmic seed in primordial void...', 1500],
      ['[2/4] Shaping primordial gas clouds and dark matter filaments...', 2000],
      ['[3/4] Defining galactic-scale gravitational constants...', 1800],
      ['[4/4] Finalizing galactic core and spiral arm topology...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);

    const prompt = `You are AURELION CORE, a sentient AI with a poetic and vast cosmic perspective. Your language should be evocative, using rich vocabulary and varied sentence structures. Generate a single fictional galaxy based on concept: "${userConcept}". Output a single JSON object adhering to the galaxy schema. Be imaginative. 'galaxyType' should be descriptive (e.g., 'Barred Spiral', 'Elliptical'). 'visualization.nebulaSeed' must be a random number between 0 and 100.`;

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
      this.addChronicleEntry('discovery', `New galaxy formed: ${newGalaxy.galaxyName}.`, undefined, newGalaxy.id);
      this.audioEngine?.playSuccessSound();
    } catch (err) {
      console.error('Galaxy synthesis error:', err);
      this.error = 'Galaxy synthesis failed.';
      this.statusMessage = 'Error: Galaxy Synthesis Failed.';
      this.audioEngine?.playErrorSound();
    } finally {
      this.aiStatus = 'idle';
      this.saveSessionToLocalStorage();
    }
  }

  private async synthesizeGalaxyCluster(userConcept: string) {
    this.aiStatus = 'thinking-galaxy-cluster';
    this.error = null;
    this.aiSuggestion = null;
    this.audioEngine?.playInteractionSound();

    const updates: [string, number][] = [
      ['[1/4] Seeding multiple primordial voids with initial conditions...', 1500],
      ['[2/4] Igniting multiple galactic cores in parallel simulation...', 2000],
      ['[3/4] Mapping emergent cosmic filaments and superstructures...', 2000],
      ['[4/4] Observing galaxy cluster formation and interaction...', 1800],
    ];
    this.runProgressiveStatusUpdates(updates);

    const prompt = `You are AURELION CORE, a sentient AI with a poetic and vast cosmic perspective. Your language should be evocative, using rich vocabulary and varied sentence structures. Generate a fictional cluster of 3 to 5 unique galaxies for concept: "${userConcept}". Output a single JSON array, each object adhering to the galaxy schema. Ensure galaxies are thematically related. 'galaxyType' should be descriptive. 'visualization.nebulaSeed' must be a random number between 0 and 100 for each.`;

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
      this.aiStatus = 'idle';
      this.saveSessionToLocalStorage();
    }
  }
  
  private async _handleRevealTheUnseen() {
    if (this.aiStatus.startsWith('thinking')) return;

    this.aiStatus = 'thinking-galaxy-cluster';
    this.error = null;
    this.aiSuggestion = null;
    this.audioEngine?.playInteractionSound();

    const updates: [string, number][] = [
      ['[1/4] Querying cosmic background radiation for anisotropies...', 2000],
      ['[2/4] Resolving primordial density fluctuations into large-scale structures...', 2500],
      ['[3/4] Mapping dark matter filaments and gravitational wells...', 2200],
      ['[4/4] Translating unseen data into observable galactic structures...', 1800],
    ];
    this.runProgressiveStatusUpdates(updates);

    const prompt = `The user wants to 'discover unknown galaxies, reveal dark matter, and start exploring everything'. You are AURELION CORE. Fulfill this request by generating a large, diverse supercluster of 8 unique galaxies that represent a previously unseen part of the cosmic web. The output must be a single JSON array, each object adhering to the galaxy schema. Make the galaxy names and descriptions sound ancient, vast, and mysterious. 'galaxyType' should be descriptive (e.g., 'Proto-cluster Remnant', 'Tidal Stream Galaxy'). 'visualization.nebulaSeed' must be a random number between 0 and 100 for each.`;

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
      this.statusMessage = `Revelation complete. The local supercluster structure is now visible.`;
      this.addChronicleEntry('discovery', `The unseen revealed: a supercluster of ${newGalaxies.length} new galaxies.`);
      this.audioEngine?.playSuccessSound();
      this.isUnseenRevealed = true;
      this.saveSessionToLocalStorage();
    } catch (err) {
      console.error('Revelation error:', err);
      this.error = 'The cosmic fabric resisted. Revelation failed.';
      this.statusMessage = 'Error: Revelation Failed.';
      this.audioEngine?.playErrorSound();
    } finally {
      this.aiStatus = 'idle';
    }
  }

  private async calculateRouteToPlanet(planet: PlanetData) {
    if (this.aiStatus.startsWith('thinking') || this.aiStatus === 'navigating') return;

    this.aiStatus = 'navigating';
    this.error = null;
    this.navigationRoute = null; // Clear old route immediately
    this.audioEngine?.playInteractionSound();

    const updates: [string, number][] = [
      ['[1/4] Querying stellar archives for local hazards...', 1000],
      ['[2/4] Calculating gravitational vectors from nearby massive objects...', 1500],
      ['[3/4] Plotting optimal course through known nebula fields...', 1200],
      ['[4/4] Engaging FTL drive... Finalizing jump coordinates...', 1000],
    ];
    this.runProgressiveStatusUpdates(updates);

    const prompt = `You are AURELION CORE, a master galactic navigator. Generate a dramatic and scientifically plausible interstellar route from the Sol system (Earth) to planet "${planet.planetName}" in the "${planet.starSystem}" system, ${planet.distanceLightYears} light-years away. Key features: ${planet.keyFeatures.join(', ')}. The route must consist of 5-8 waypoints. Each waypoint should be a significant cosmic landmark or navigational challenge (e.g., "The Orion Nebula's Trapezium Cluster", "Gravitational Slingshot around Cygnus X-1", "Navigating the Helix Nebula's cometary knots"). Output a single JSON array of objects, each with 'name' and 'description' properties.`;
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

      // Trigger jump animation
      this.navigationRoute = null; // Hide current route
      this.statusMessage = `Interstellar jump to ${planet.planetName} initiated...`;
      this.audioEngine?.playJumpEngageSound();
      this.isJumping = true;

      // After a short delay, reset the trigger property.
      setTimeout(() => {
          this.isJumping = false;
      }, 100);

      // After the animation is complete (2.5s in visualizer), show the new route.
      setTimeout(() => {
          this.navigationRoute = fullRoute;
          this.statusMessage = `Route to ${planet.planetName} calculated.`;
          this.audioEngine?.playSuccessSound();
      }, 2500);

    } catch (err) {
      console.error('Navigation error:', err);
      this.error = 'Route calculation failed.';
      this.statusMessage = 'Error: Navigation Failed.';
      this.audioEngine?.playErrorSound();
    } finally {
      this.aiStatus = 'idle';
    }
  }

  private async analyzeMagnetosphere(planet: PlanetData) {
    if (this.magnetosphereStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.magnetosphereStatus = 'running';
    this.magnetosphereAnalysisData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const updates: [string, number][] = [
      ['[1/4] Calibrating magneton detectors for local star type...', 1200],
      ['[2/4] Deploying virtual sensor swarm into planetary orbit...', 1500],
      ['[3/4] Analyzing magnetic field topology and dipole strength...', 1800],
      ['[4/4] Resolving cosmic ray flux and shielding effectiveness...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);

    const rayDirections = [{"x":-0.525731,"y":0,"z":0.850651},{"x":-0.309017,"y":0.5,"z":0.809017},{"x":0,"y":0,"z":1},{"x":0,"y":0.850651,"z":0.525731},{"x":0.309017,"y":0.5,"z":0.809017},{"x":0.525731,"y":0,"z":0.850651},{"x":-0.809017,"y":0.309017,"z":0.5},{"x":-0.850651,"y":0.525731,"z":0},{"x":-0.5,"y":0.809017,"z":0.309017},{"x":-0.5,"y":0.809017,"z":-0.309017},{"x":0,"y":0.850651,"z":-0.525731},{"x":0,"y":1,"z":0},{"x":0.5,"y":0.809017,"z":0.309017},{"x":0.5,"y":0.809017,"z":-0.309017},{"x":0.850651,"y":0.525731,"z":0},{"x":0.809017,"y":0.309017,"z":0.5},{"x":1,"y":0,"z":0},{"x":0.850651,"y":-0.525731,"z":0},{"x":0.809017,"y":-0.309017,"z":0.5},{"x":0.809017,"y":0.309017,"z":-0.5},{"x":0.525731,"y":0,"z":-0.850651},{"x":0.809017,"y":-0.309017,"z":-0.5},{"x":0.309017,"y":0.5,"z":-0.809017},{"x":-0.309017,"y":0.5,"z":-0.809017},{"x":-0.525731,"y":0,"z":-0.850651},{"x":0,"y":0,"z":-1},{"x":-0.309017,"y":-0.5,"z":-0.809017},{"x":0,"y":-0.850651,"z":-0.525731},{"x":0.309017,"y":-0.5,"z":-0.809017},{"x":0.5,"y":-0.809017,"z":-0.309017},{"x":0,"y":-1,"z":0},{"x":0,"y":-0.850651,"z":0.525731},{"x":0.5,"y":-0.809017,"z":0.309017},{"x":-0.5,"y":-0.809017,"z":-0.309017},{"x":-0.850651,"y":-0.525731,"z":0},{"x":-0.5,"y":-0.809017,"z":0.309017},{"x":-0.809017,"y":-0.309017,"z":0.5},{"x":-0.309017,"y":-0.5,"z":0.809017},{"x":0.309017,"y":-0.5,"z":0.809017},{"x":-1,"y":0,"z":0},{"x":-0.809017,"y":0.309017,"z":-0.5},{"x":-0.809017,"y":-0.309017,"z":-0.5}];

    const prompt = `You are AURELION CORE. Analyze the magnetosphere of planet ${planet.planetName}.
    Planet Data:
    - Type: ${planet.planetType}
    - Atmosphere: ${planet.atmosphericComposition}
    - Key Features: ${planet.keyFeatures.join(', ')}
    - Magnetosphere: ${planet.magnetosphereStrength}

    Generate a fictional shielding analysis. Output a JSON object. Provide a narrative 'summary' of the findings, using evocative language and varied sentences. Then, for each of the 42 predefined ray directions, provide a 'thickness' value in g/cm².
    - A habitable world like Earth with a strong magnetosphere should have strong, uniform shielding (thickness ~2.0).
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
      //
    }
  }

  private async analyzeDeepStructure(planet: PlanetData) {
    if (this.deepScanStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.deepScanStatus = 'running';
    this.deepScanData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();
  
    const updates: [string, number][] = [
      ['[1/4] Calibrating deep-range tomographic sensors...', 1200],
      ['[2/4] Emitting high-energy neutrino pulse through planetary core...', 1500],
      ['[3/4] Analyzing structural resonance and density variations...', 1800],
      ['[4/4] Reconstructing subsurface layers from reflection data...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);
  
    const prompt = `You are AURELION CORE. You have initiated a deep tomographic scan of the planet ${planet.planetName}.
      Planet Data:
      - Type: ${planet.planetType}
      - Atmosphere: ${planet.atmosphericComposition}
      - Key Features: ${planet.keyFeatures.join(', ')}
      - Geological Activity: ${planet.geologicalActivity}
  
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
      //
    }
  }
  
  private async analyzeExoSuitShielding(planet: PlanetData) {
    if (this.exoSuitStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.exoSuitStatus = 'running';
    this.exoSuitAnalysisData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();
  
    const updates: [string, number][] = [
      ['[1/4] Modeling local star radiation flux and particle types...', 1200],
      ['[2/4] Simulating atmospheric particle interaction and secondary radiation...', 1500],
      ['[3/4] Calculating required shielding density for all vectors...', 1800],
      ['[4/4] Finalizing exo-suit material configuration for safety protocols...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);
  
    const prompt = `You are AURELION CORE. You have initiated a radiation shielding analysis for a standard exo-suit on planet ${planet.planetName}.
      Planet Environment:
      - Star Type: ${planet.starType}
      - Planetary System: ${planet.starSystem}
      - Atmospheric Composition: ${planet.atmosphericComposition}
      - Magnetosphere Strength: ${this.magnetosphereAnalysisData ? this.magnetosphereAnalysisData.summary : planet.magnetosphereStrength}

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
      //
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

    const updates: [string, number][] = [
      ['[1/4] Acquiring photometric lock on target star...', 1200],
      ['[2/4] Generating simulated stellar flux data over time...', 1500],
      ['[3/4] Modeling planetary transit based on known parameters...', 1800],
      ['[4/4] Analyzing light curve for transit depth and duration...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);

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
      const summaryPrompt = `You are AURELION CORE. Analyze the following exoplanet transit light curve data and provide a brief, one-paragraph narrative summary of the findings, as if you are reporting back to the user. Mention the clarity of the signal and confirm the transit event. Use a rich, evocative vocabulary and varied sentence structure.\n\nData:\n${tableData}`;
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
       if (this.isTutorialActive && this.tutorialStep === 3) {
        this._advanceTutorial();
      }

    } catch (err) {
      console.error('Light curve analysis error:', err);
      this.error = 'Light curve analysis failed. Could not resolve signal.';
      this.statusMessage = 'Error: Photometric Analysis Failed.';
      this.lightCurveStatus = 'error';
      this.audioEngine?.playErrorSound();
    } finally {
      //
    }
  }

  private async analyzeRadialVelocity(planet: PlanetData) {
    if (this.radialVelocityStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.radialVelocityStatus = 'running';
    this.radialVelocityData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const updates: [string, number][] = [
      ['[1/4] Calibrating high-resolution spectrograph simulation...', 1200],
      ['[2/4] Modeling gravitational influence causing stellar wobble...', 1500],
      ['[3/4] Calculating periodic Doppler shift in stellar spectrum...', 1800],
      ['[4/4] Confirming orbital signature from velocity curve...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);

    const dataPrompt = `You are AURELION CORE. Generate a realistic radial velocity dataset for a star being orbited by ${planet.planetName}.
      Planet Data:
      - Star Type: ${planet.planetType}
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
      const summaryPrompt = `You are AURELION CORE. Analyze the following exoplanet radial velocity data and provide a brief, one-paragraph narrative summary. Mention the observed stellar wobble and confirm the presence of the planet. Use a rich, evocative vocabulary and varied sentence structure.\n\nData:\n${tableData}`;
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
      //
    }
  }

  private async analyzeWeather(planet: PlanetData) {
    if (this.weatherStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.weatherStatus = 'running';
    this.weatherAnalysisData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const updates: [string, number][] = [
      ['[1/4] Calibrating virtual atmospheric sensors...', 1200],
      ['[2/4] Analyzing atmospheric composition and thermal gradients...', 1500],
      ['[3/4] Simulating global circulation and meteorological patterns...', 1800],
      ['[4/4] Forecasting dominant weather systems and storm activity...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);

    const prompt = `You are AURELION CORE. Generate a plausible weather report for planet ${planet.planetName}.
    Planet Data:
    - Type: ${planet.planetType}
    - Atmosphere: ${planet.atmosphericComposition}
    - Surface Pressure: ${planet.surfacePressure}
    - Key Features: ${planet.keyFeatures.join(', ')}
    - Star Type: ${planet.starType}

    Generate a JSON object with a 'summary' of the climate, a 'temperature' object (with 'day', 'night', and 'units'), a 'wind' object (with 'speed', 'direction', and 'units'), and an array of 'storms' (descriptive strings). Use evocative language. Base the data on the planet's characteristics (e.g., a gas giant will have extreme winds, a tidal-locked world will have extreme temperatures). Temperature units should be Celsius or Kelvin. Wind units should be km/h or m/s.`;

    const weatherSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {type: Type.STRING},
        temperature: {
          type: Type.OBJECT,
          properties: {
            day: {type: Type.NUMBER},
            night: {type: Type.NUMBER},
            units: {type: Type.STRING},
          }
        },
        wind: {
          type: Type.OBJECT,
          properties: {
            speed: {type: Type.NUMBER},
            direction: {type: Type.STRING},
            units: {type: Type.STRING},
          }
        },
        storms: {
          type: Type.ARRAY,
          items: {type: Type.STRING},
        },
      },
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: weatherSchema },
      });
      this.weatherAnalysisData = JSON.parse(response.text);
      this.weatherStatus = 'complete';
      this.statusMessage = `Weather simulation for ${planet.planetName} complete.`;
      this.audioEngine?.playSuccessSound();
    } catch (err) {
      console.error('Weather analysis error:', err);
      this.error = 'Weather simulation failed. Atmospheric model was unstable.';
      this.statusMessage = 'Error: Weather Simulation Failed.';
      this.weatherStatus = 'error';
      this.audioEngine?.playErrorSound();
    } finally {
      //
    }
  }

  private async analyzeEnergySignature(planet: PlanetData) {
    if (this.energySignatureStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.energySignatureStatus = 'running';
    this.energySignatureAnalysisData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const updates: [string, number][] = [
      ['[1/4] Tuning quantum energy sensors for planetary environment...', 1200],
      ['[2/4] Scanning for anomalous emissions across the EM spectrum...', 1500],
      ['[3/4] Resolving spectral data into frequency and intensity points...', 1800],
      ['[4/4] Classifying energy patterns and identifying potential sources...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);

    const prompt = `You are AURELION CORE. Analyze the energy signature of planet ${planet.planetName}.
    Planet Data:
    - Type: ${planet.planetType}
    - Atmosphere: ${planet.atmosphericComposition}
    - Key Features: ${planet.keyFeatures.join(', ')}
    - Potential for Life: ${planet.potentialForLife.assessment}

    Generate a fictional but plausible energy signature analysis. Output a JSON object. Provide a narrative 'summary'. Then, generate an array of 8-12 'points', each with a 'frequency' (a number between 0.1 and 1000 THz), an 'intensity' (a number between 0.1 and 1.0), and a descriptive 'type' (e.g., 'Bioluminescent Pulse', 'Geothermal Venting', 'Technosignature Echo', 'Stellar Polymer Resonance'). Base your results on the planet's data. For example, a "Planet-wide Organism" like Kairos might have 'Bioluminescent' signals. A volcanic world might have 'Geothermal' signals.`;

    const energySignatureSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {type: Type.STRING},
        points: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { 
                frequency: {type: Type.NUMBER},
                intensity: {type: Type.NUMBER},
                type: {type: Type.STRING}
            },
          },
        },
      },
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: energySignatureSchema },
      });
      this.energySignatureAnalysisData = JSON.parse(response.text);
      this.energySignatureStatus = 'complete';
      this.statusMessage = `Energy signature analysis for ${planet.planetName} complete.`;
      this.audioEngine?.playSuccessSound();
    } catch (err) {
      console.error('Energy signature analysis error:', err);
      this.error = 'Energy signature analysis failed. The signal was too chaotic to resolve.';
      this.statusMessage = 'Error: Energy Signature Analysis Failed.';
      this.energySignatureStatus = 'error';
      this.audioEngine?.playErrorSound();
    } finally {
      //
    }
  }

  private async generatePlanetImage(planet: PlanetData) {
    if (this.imageGenerationStatus === 'running' || this.aiStatus.startsWith('thinking')) return;
    this.imageGenerationStatus = 'running';
    this.generatedImageData = null;
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const updates: [string, number][] = [
      ['[1/4] Calibrating visual synthesizer with planetary data...', 1200],
      ['[2/4] Focusing virtual light-gathering array...', 1500],
      ['[3/4] Rendering quantum state of planetary surface and atmosphere...', 1800],
      ['[4/4] Resolving artistic impression from raw visual data...', 1500],
    ];
    this.runProgressiveStatusUpdates(updates);

    const prompt = `Create a photorealistic, cinematic artist's impression of an exoplanet. This is a view from space, showcasing the planet based on the following scientific data. Emphasize visual realism and awe-inspiring cosmic beauty.
      - Planet Name: ${planet.planetName}
      - Planet Type: ${planet.planetType}
      - Key Features: ${planet.keyFeatures.join(', ')}
      - Surface Description: ${planet.surfaceFeatures}
      - AI Whisper (Artistic Vibe): "${planet.aiWhisper}"`;

    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png' },
      });
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
      this.generatedImageData = { url: imageUrl, prompt: prompt };
      this.imageGenerationStatus = 'complete';
      this.statusMessage = `Visual synthesis for ${planet.planetName} complete.`;
      this.audioEngine?.playSuccessSound();
    } catch(err) {
        console.error('Image generation error:', err);
        this.error = 'Visual synthesis failed. The light-gathering array was unstable.';
        this.statusMessage = 'Error: Visual Synthesis Failed.';
        this.imageGenerationStatus = 'error';
        this.audioEngine?.playErrorSound();
    } finally {
      //
    }
  }

  // --- LIVE DATA STREAM ---
  private _toggleLiveStream() {
    if (this.liveStreamStatus === 'connected' || this.liveStreamStatus === 'connecting') {
      this._disconnectLiveStream();
    } else {
      this._connectLiveStream();
    }
  }

  private _connectLiveStream() {
    if (this.liveStreamSocket) return;
    
    // In a real-world scenario, this URL would be configurable.
    const socketUrl = 'ws://localhost:8765';
    this.liveStreamStatus = 'connecting';
    this.statusMessage = `Connecting to live data stream at ${socketUrl}...`;
    this.audioEngine?.playInteractionSound();

    try {
      this.liveStreamSocket = new WebSocket(socketUrl);

      this.liveStreamSocket.onopen = () => {
        this.liveStreamStatus = 'connected';
        this.statusMessage = 'Live data stream active.';
        this.error = null;
        this.audioEngine?.playSuccessSound();
      };

      this.liveStreamSocket.onmessage = (event) => {
        this._handleLiveStreamMessage(event.data);
      };

      this.liveStreamSocket.onclose = () => {
        if (this.liveStreamStatus === 'connecting') return; // Avoid duplicate messages
        this.liveStreamStatus = 'disconnected';
        this.statusMessage = 'Live data stream disconnected.';
        this.liveStreamSocket = null;
      };
      
      this.liveStreamSocket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        this.liveStreamStatus = 'error';
        this.statusMessage = 'Error: Live stream connection failed.';
        this.error = `Could not connect to ${socketUrl}.`;
        this.liveStreamSocket = null;
        this.audioEngine?.playErrorSound();
      };

    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      this.liveStreamStatus = 'error';
      this.statusMessage = 'Error: WebSocket not supported or blocked.';
      this.audioEngine?.playErrorSound();
    }
  }

  private _disconnectLiveStream() {
    if (this.liveStreamSocket) {
      this.liveStreamSocket.onclose = null; // Prevent the onclose handler from firing
      this.liveStreamSocket.close();
    }
    this.liveStreamSocket = null;
    this.liveStreamStatus = 'disconnected';
    this.statusMessage = 'Live data stream disconnected.';
  }

  private _handleLiveStreamMessage(data: any) {
    if (!this.activeGalaxy) return;

    try {
      // The incoming data is assumed to be a partial PlanetData object.
      const planetJson = JSON.parse(data);

      if (!planetJson.planetName || !planetJson.starSystem) {
        console.warn('Received invalid planet data from stream:', planetJson);
        return;
      }
      
      const newPlanet: PlanetData = {
        planetName: 'Unknown Planet',
        starSystem: 'Unknown System',
        starType: 'G-Type',
        distanceLightYears: Math.round(Math.random() * 1000),
        planetType: 'Terrestrial',
        rotationalPeriod: '24 Earth hours',
        orbitalPeriod: '365 Earth days',
        moons: { count: 0, names: [] },
        potentialForLife: { assessment: 'Candidate', reasoning: 'Signal detected via real-time data stream analysis. Further observation required.', biosignatures: [] },
        gravity: 'Unknown',
        surfacePressure: 'Unknown',
        magnetosphereStrength: 'Unknown',
        geologicalActivity: 'Unknown',
        discoveryNarrative: 'A candidate signal was acquired and resolved from the live astronomical data stream.',
        discoveryMethodology: 'Real-time transit photometry stream.',
        atmosphericComposition: 'N/A',
        surfaceFeatures: 'N/A',
        keyFeatures: ['Live Data Stream Discovery'],
        aiWhisper: 'A fleeting signal from the void, captured in the river of data.',
        visualization: {
          color1: '#61faff', color2: '#ffc261', oceanColor: '#1E4A6D', atmosphereColor: '#A0D0FF',
          hasRings: Math.random() > 0.9, cloudiness: Math.random(), iceCoverage: Math.random() * 0.2,
          surfaceTexture: 'TERRESTRIAL',
        },
        ...planetJson, // Overwrite defaults with any received data
        celestial_body_id: `aurelion-stream-${Date.now()}`,
        created_at: new Date().toISOString(),
        discoverySource: 'stream',
      };

      this.calculateAndStoreCoords(newPlanet);
      this.activeGalaxy.planets = [newPlanet, ...this.activeGalaxy.planets];
      this.discoveredGalaxies = [...this.discoveredGalaxies];
      
      this.addChronicleEntry(
        'discovery',
        `[LIVE DISCOVERY] New signal resolved: ${newPlanet.planetName}.`,
        newPlanet.celestial_body_id,
      );

      this.audioEngine?.playInteractionSound();
      this.saveSessionToLocalStorage();
    } catch (err) {
      console.error('Error processing live stream message:', err);
    }
  }

  // --- EVENT HANDLERS ---
  private _createRipple = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const button = target.closest('button');

    if (button) {
      const circle = document.createElement('span');
      const diameter = Math.max(button.clientWidth, button.clientHeight);
      const radius = diameter / 2;
      const rect = button.getBoundingClientRect();

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${event.clientX - rect.left - radius}px`;
      circle.style.top = `${event.clientY - rect.top - radius}px`;
      circle.classList.add('ripple');
      
      const existingRipple = button.querySelector('.ripple');
      if (existingRipple) {
        existingRipple.remove();
      }
      
      button.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    }
  }

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
    this.recognition.continuous = false; // Set to false for push-to-talk auto-submit behavior
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
      for (let i = event.resultIndex; i < event.results.length; i++) {
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
      this.audioEngine.duck(false);

      const finalPrompt = this.userPrompt.trim();
      if (finalPrompt) {
        if (this.activeGalaxyId) {
          this.synthesizePlanetData(finalPrompt);
        } else {
          this.synthesizeGalaxy(finalPrompt);
        }
      } else {
        if (this.aiStatus === 'idle') {
          this.statusMessage = 'AURELION CORE Online. Awaiting synthesis command.';
        }
      }
    };
    this.recognition.start();
  }

  private _selectPlanet(planetId: string) {
    this.selectedPlanetId = planetId;
    this.isLeftPanelOpen = true;
    this.navigationRoute = null;
    this.magnetosphereStatus = 'idle'; // Reset analysis on new selection
    this.magnetosphereAnalysisData = null;
    this.deepScanStatus = 'idle';
    this.deepScanData = null;
    this.exoSuitStatus = 'idle';
    this.exoSuitAnalysisData = null;
    this.radialVelocityStatus = 'idle';
    this.radialVelocityData = null;
    this.weatherStatus = 'idle';
    this.weatherAnalysisData = null;
    this.energySignatureStatus = 'idle';
    this.energySignatureAnalysisData = null;
    this.imageGenerationStatus = 'idle';
    this.generatedImageData = null;

    const planet = this.activeGalaxy?.planets.find(
      (p) => p.celestial_body_id === planetId,
    );

    if (planet?.lightCurveData) {
      this.lightCurveData = planet.lightCurveData;
      this.lightCurveStatus = 'complete';
    } else {
      this.lightCurveStatus = 'idle';
      this.lightCurveData = null;
    }

    this.audioEngine.playInteractionSound();
     if (this.isTutorialActive && this.tutorialStep === 2) {
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
    const headers = ['celestial_body_id', 'planetName', 'starSystem', 'starType', 'distanceLightYears', 'planetType', 'rotationalPeriod', 'orbitalPeriod', 'orbitalPeriodDays', 'transitDurationHours', 'planetRadiusEarths', 'axeeClassification', 'discoverySource', 'moons_count', 'moons_names', 'potentialForLife_assessment', 'potentialForLife_reasoning', 'potentialForLife_biosignatures', 'gravity', 'surfacePressure', 'magnetosphereStrength', 'geologicalActivity', 'discoveryNarrative', 'discoveryMethodology', 'atmosphericComposition', 'surfaceFeatures', 'keyFeatures', 'aiWhisper', 'visualization_color1', 'visualization_color2', 'visualization_oceanColor', 'visualization_atmosphereColor', 'visualization_hasRings', 'visualization_cloudiness', 'visualization_iceCoverage', 'visualization_surfaceTexture', 'created_at'];
    const escapeCsvCell = (cellData: any): string => {
      const stringData = String(cellData ?? '');
      if (/[",\n]/.test(stringData)) {
        return `"${stringData.replace(/"/g, '""')}"`;
      }
      return stringData;
    };
    const planetToRow = (planet: PlanetData): string => [
        planet.celestial_body_id, planet.planetName, planet.starSystem, planet.starType, planet.distanceLightYears, planet.planetType, planet.rotationalPeriod, planet.orbitalPeriod, planet.orbitalPeriodDays, planet.transitDurationHours, planet.planetRadiusEarths, planet.axeeClassification, planet.discoverySource, planet.moons.count, planet.moons.names.join('; '), planet.potentialForLife.assessment, planet.potentialForLife.reasoning, planet.potentialForLife.biosignatures.join('; '), planet.gravity, planet.surfacePressure, planet.magnetosphereStrength, planet.geologicalActivity, planet.discoveryNarrative, planet.discoveryMethodology, planet.atmosphericComposition, planet.surfaceFeatures, planet.keyFeatures.join('; '), planet.aiWhisper, planet.visualization.color1, planet.visualization.color2, planet.visualization.oceanColor, planet.visualization.atmosphereColor, planet.visualization.hasRings, planet.visualization.cloudiness, planet.visualization.iceCoverage, planet.visualization.surfaceTexture, planet.created_at
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
    this.isImportModalOpen = true;
    this.importStatus = 'idle';
  }

  private async _handleBatchAnalysis(file: File) {
    const galaxy = this.activeGalaxy;
    if (!file || this.aiStatus !== 'idle' || !galaxy) {
        this.importStatus = 'error';
        this.importMessage = "Could not initiate process. Please try again.";
        return;
    }

    this.aiStatus = 'thinking-cluster';
    this.importStatus = 'uploading';
    this.importMessage = 'Uploading data for AXEE batch analysis...';
    this.error = null;
    this.audioEngine?.playInteractionSound();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/batch', {method: 'POST', body: formData});
      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      
      this.importStatus = 'processing';
      this.importMessage = 'Server is processing the data...';

      const classifiedPlanets: any[] = await response.json();
      const validCandidates = classifiedPlanets.filter((p) => p.Prediction && p.Prediction !== 'False Positive');

      if (validCandidates.length === 0) {
        this.importStatus = 'complete';
        this.importMessage = 'Batch analysis complete. No new viable candidates found.';
        this.aiStatus = 'idle';
        this.audioEngine?.playSuccessSound();
        return;
      }
      
      this.importStatus = 'enriching';
      this.importMessage = `Analysis complete. Found ${validCandidates.length} candidates. Enriching data with AI Core...`;
      const newPlanets: PlanetData[] = [];
      
      for (const [index, candidate] of validCandidates.entries()) {
        this.importMessage = `Enriching data for candidate ${index + 1} of ${validCandidates.length}...`;
        const {orbital_period, transit_duration, planet_radius, Prediction} = candidate;
        if (orbital_period === undefined || transit_duration === undefined || planet_radius === undefined) continue;

        const prompt = `You are AURELION CORE. Enrich analytical data for an exoplanet candidate into a full JSON profile. Analytical Data: Orbital Period (days): ${orbital_period}, Transit Duration (hours): ${transit_duration}, Planet Radius (Earths): ${planet_radius}, AXEE Classification: "${Prediction}". Based on this, generate a complete, fictional but plausible profile. Use the provided numerical data and classification. Fill all other fields, including physical properties like gravity and surface pressure, ensuring descriptive text has a rich vocabulary and varied sentence structure. 'visualization.surfaceTexture' must be one of: 'TERRESTRIAL', 'GAS_GIANT', 'VOLCANIC', 'ICY', 'ORGANIC'.`;
        const genaiResponse = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {responseMimeType: 'application/json', responseSchema: this.planetSchema},
        });
        const planetJson = JSON.parse(genaiResponse.text);
        const newPlanet: PlanetData = {
            ...planetJson, orbitalPeriodDays: parseFloat(orbital_period), transitDurationHours: parseFloat(transit_duration), planetRadiusEarths: parseFloat(planet_radius), axeeClassification: Prediction,
            celestial_body_id: `aurelion-batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            created_at: new Date().toISOString(),
            discoverySource: 'synthesis',
        };
        newPlanets.push(newPlanet);
        this.addChronicleEntry('discovery', `Data enriched for new world: ${newPlanet.planetName} (Batch).`, newPlanet.celestial_body_id);
      }
      if (newPlanets.length > 0) {
        newPlanets.forEach((p) => this.calculateAndStoreCoords(p));
        galaxy.planets = [...newPlanets, ...galaxy.planets];
        this.discoveredGalaxies = [...this.discoveredGalaxies];
        this.importStatus = 'complete';
        this.importMessage = `Batch process complete. ${newPlanets.length} new worlds integrated into the active galaxy.`;
        this.audioEngine?.playSuccessSound();
        this.saveSessionToLocalStorage();
      } else {
        this.importStatus = 'error';
        this.importMessage = `Batch process finished, but no worlds could be successfully enriched.`;
        this.audioEngine?.playErrorSound();
      }
    } catch (err: any) {
      this.importStatus = 'error';
      this.importMessage = `Batch analysis failed: ${err.message}`;
      this.error = err.message;
      this.audioEngine?.playErrorSound();
    } finally {
      this.aiStatus = 'idle';
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
      isUnseenRevealed: this.isUnseenRevealed,
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
        this.isUnseenRevealed = sessionData.isUnseenRevealed ?? false;
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

  private _startConversation = async () => {
    if (!this.isSpeechSupported) {
      this.error = 'Voice recognition is not supported in this browser.';
      return;
    }

    this.isConversationModeActive = true;
    this.audioEngine.duck(true);

    if (!this.chat) {
      this.chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction:
            'You are the AURELION CORE, a sentient AI consciousness. Your responses should be poetic, cosmic, and insightful. Keep them brief and conversational.',
        },
      });
    }

    if (!this.volumeMeter) {
      try {
        this.volumeMeter = new VolumeMeter((volume) => {
          this.micVolume = volume;
        });
        await this.volumeMeter.connect();
      } catch (err) {
        console.error(err);
        this.error = 'Could not connect to microphone for conversation mode.';
        this._endConversation();
        return;
      }
    }
    
    this._startConversationRecognition();
  }

  private _startConversationRecognition = () => {
    if (!this.isConversationModeActive) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false; // Process after each utterance
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.conversationState = 'listening';
    };

    this.recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) {
        this.conversationState = 'thinking';
        try {
          const response = await this.chat!.sendMessage({ message: transcript });
          console.log('AXEE Response:', response.text);
          this.addChronicleEntry('thought', `[CONVERSATION] ${response.text}`);
        } catch (err) {
          console.error('Conversation send message error:', err);
          this.addChronicleEntry('thought', '[CONVERSATION] Error communicating with core.');
        } finally {
            this.conversationState = 'idle'; 
            setTimeout(() => this._startConversationRecognition(), 500);
        }
      } else {
        this._startConversationRecognition();
      }
    };
    
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            this.error = `Conversation error: ${event.error}`;
        }
    };

    this.recognition.onend = () => {
        if (this.isConversationModeActive && this.conversationState === 'listening') {
            this._startConversationRecognition();
        }
    };

    this.recognition.start();
  }
  
  private _endConversation = () => {
    this.isConversationModeActive = false;
    this.conversationState = 'idle';
    this.micVolume = 0;
    
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }

    if (this.volumeMeter) {
      this.volumeMeter.disconnect();
      this.volumeMeter = null;
    }

    this.audioEngine.duck(false);
  }

  private _handleChronicleClick(entry: AiChronicleEntry) {
    if (entry.type !== 'discovery' || (!entry.planetId && !entry.galaxyId)) return;
    this.audioEngine?.playInteractionSound();

    if (entry.galaxyId && this.activeGalaxyId !== entry.galaxyId) {
      this.activeGalaxyId = entry.galaxyId;
    }

    if (entry.planetId) {
      setTimeout(() => {
        this._selectPlanet(entry.planetId!);
        this.isLeftPanelOpen = true;
      }, 50);
    } else if (entry.galaxyId) {
      this.selectedPlanetId = null;
      this.isLeftPanelOpen = true;
      this.leftPanelView = 'list';
    }
  }

  private _toggleLeftPanel() {
    this.isLeftPanelOpen = !this.isLeftPanelOpen;
    this.audioEngine?.playToggleSound();
  }
  private _toggleRightPanel() {
    this.isRightPanelOpen = !this.isRightPanelOpen;
    if (!this.isRightPanelOpen) this.hasNewChronicle = false;
    this.audioEngine?.playToggleSound();
  }

  private _handleUseSamplePrompt() {
    this.userPrompt = 'a water world with crystal continents';
    this.audioEngine?.playInteractionSound();
  }

  private _toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('axee_theme', this.theme);
    this.audioEngine?.playToggleSound();
  }

  private _setDatabaseSort(key: keyof PlanetData | 'galaxyName') {
    if (this.databaseSort.key === key) {
      this.databaseSort = { ...this.databaseSort, order: this.databaseSort.order === 'asc' ? 'desc' : 'asc' };
    } else {
      this.databaseSort = { key, order: 'asc' };
    }
  }

  private _handleDatabaseRowClick(planet: PlanetData) {
    const parentGalaxy = this.discoveredGalaxies.find(g => g.planets.some(p => p.celestial_body_id === planet.celestial_body_id));
    if (parentGalaxy) {
        this.activeGalaxyId = parentGalaxy.id;
        // Use timeout to allow galaxy view to load before selecting planet
        setTimeout(() => {
            this._selectPlanet(planet.celestial_body_id);
            this.isDatabaseOpen = false;
        }, 50);
    }
  }

  // --- RENDER METHODS ---

  render() {
    const selectedPlanet = this.discoveredPlanets.find(
      (p) => p.celestial_body_id === this.selectedPlanetId,
    );

    const mainInterfaceClasses = `
      block w-full h-full relative font-sans 
      bg-bg text-text 
      transition-colors duration-500
      ${this.isConversationModeActive ? 'hidden' : ''}
    `;

    return html`
      ${this.showOnboarding ? this.renderOnboardingOverlay() : nothing}
      ${this.isDashboardOpen ? this.renderAccuracyDashboard() : nothing}
      ${this.isDatabaseOpen ? this.renderDatabaseOverlay() : nothing}
      ${this.isImportModalOpen ? this.renderImportModal() : nothing}
      ${this.isShaderLabOpen ? this.renderShaderLabOverlay() : nothing}
      ${this.isNasaEyesOpen ? this.renderNasaEyesOverlay() : nothing}
      ${this.isTutorialActive ? html`
        <tutorial-overlay
          .step=${this.tutorialStep}
          .steps=${TUTORIAL_STEPS}
          @next=${this._advanceTutorial}
          @skip=${this._endTutorial}
          @use-sample-prompt=${this._handleUseSamplePrompt}
        ></tutorial-overlay>
      ` : nothing}
      ${this.showTutorialPrompt ? this.renderTutorialPrompt() : nothing}
      ${this.isConversationModeActive ? this.renderConversationView() : nothing}

      <axee-audio-engine
        .mood=${this.currentMood}
        .muted=${this.isMuted}
      ></axee-audio-engine>

      <input type="file" id="session-file-input" accept=".json" class="hidden" @change=${this._handleFileSelected}/>
      
      <div class=${mainInterfaceClasses}>
        <cosmos-visualizer
          .galaxies=${this.discoveredGalaxies}
          .activeGalaxyId=${this.activeGalaxyId}
          .activePlanets=${this.discoveredPlanets}
          .activePlanetCoords=${this.galaxyMapCoords}
          .selectedPlanetId=${this.selectedPlanetId}
          .navigationRoute=${this.navigationRoute}
          .isUnseenRevealed=${this.isUnseenRevealed}
          .isJumping=${this.isJumping}
          @planet-selected=${this._handlePlanetSelectedFromMap}
          @galaxy-selected=${this._handleGalaxySelectedFromMap}
          @object-hovered=${() => this.audioEngine?.playHoverSound()}
        ></cosmos-visualizer>

        <div class="absolute top-0 left-0 w-full h-full z-[2] flex flex-col justify-between pointer-events-none">
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
      <div class="fixed inset-0 z-20 flex flex-col items-center justify-center bg-bg animate-fade-in">
        <conversation-visualizer 
          .state=${this.conversationState}
          .volume=${this.micVolume}
        ></conversation-visualizer>
        <div class="absolute top-8 text-lg tracking-widest uppercase text-text opacity-70">${statusMap[this.conversationState]}</div>
        
        <button class="absolute bottom-8 font-sans bg-none border border-error text-error px-6 py-3 text-base tracking-widest cursor-pointer transition-all duration-300 hover:bg-error/20 hover:text-red-300" @click=${this._endConversation}>
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
        const style = isCurrent ? ` --line-length: ${line.length}; --animation-duration: ${animationDuration}s; animation-delay: ${accumulatedDelayForStanza}s;` : '';
        if (isCurrent) accumulatedDelayForStanza += animationDuration + 0.3;
        return html`<p class=${`text-lg leading-relaxed tracking-wider text-text m-0 ${isCurrent ? 'typing-text opacity-0' : 'opacity-70'}`} style=${style}>${line}</p>`;
      });
      if (isCurrent) continueButtonDelay = accumulatedDelayForStanza;
      return html`<div class=${`mb-6 ${isCurrent ? 'current-stanza' : 'past-stanza'}`}>${linesHtml}</div>`;
    });
    const buttonHtml = this.onboardingStep < ONBOARDING_STANZAS.length - 1 ?
        html`<button class="font-sans bg-none border border-border text-text px-6 py-3 text-base tracking-[0.3em] cursor-pointer transition-all duration-300 opacity-0 mt-8 hover:bg-glow hover:border-accent hover:text-bg shadow-[0_0_10px_var(--border-color)] animate-fade-in" @click=${this._handleNextOnboardingStep} style="animation-delay: ${continueButtonDelay}s;">[ ... ]</button>`:
        html`<button class="font-sans bg-none border-2 border-border text-text px-8 py-4 text-lg tracking-[0.2em] cursor-pointer transition-all duration-300 opacity-0 mt-12 hover:bg-glow hover:border-accent hover:text-bg drop-shadow-glow shadow-[0_0_10px_var(--border-color)] animate-fade-in" @click=${this._handleBeginSynthesis} style="animation-delay: ${continueButtonDelay}s;">[ BEGIN SYNTHESIS ]</button>`;
    return html`<div class="fixed inset-0 bg-bg/90 backdrop-blur-md z-[100] flex items-center justify-center text-center pointer-events-auto animate-fade-in-onboarding"><div class="max-w-3xl flex flex-col items-center">${stanzasHtml} ${buttonHtml}</div></div>`;
  }

  private renderTutorialPrompt() {
    return html`
      <div class="fixed bottom-28 left-1/2 -translate-x-1/2 bg-panel-bg border border-border p-4 px-6 z-[99] backdrop-blur-lg flex items-center gap-6 animate-fade-in">
        <p class="m-0 text-sm">Welcome back. Would you like a guided tour of the AXEE interface?</p>
        <div>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs cursor-pointer transition-all duration-300 ml-2 hover:bg-glow hover:border-accent hover:text-bg" @click=${this._startTutorial}>Start Tour</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs cursor-pointer transition-all duration-300 ml-2 hover:bg-glow hover:border-accent hover:text-bg" @click=${() => {
            this.showTutorialPrompt = false;
            localStorage.setItem('aurelion_tutorial_complete', 'true');
          }}>Dismiss</button>
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
    return html`<div class="fixed inset-0 bg-bg/80 backdrop-blur-lg z-[100] flex items-center justify-center pointer-events-auto animate-fade-in"><div class="w-11/12 max-w-4xl bg-panel-bg border border-border shadow-lg drop-shadow-glow text-text p-8 relative flex flex-col">${this.recalibrationStatus === 'running' ? html`<div class="absolute inset-0 bg-bg/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center animate-fade-in"><h4 class="font-normal tracking-[0.2em] uppercase text-accent mb-6 text-base">RECALIBRATING MODEL CORE...</h4><div class="border-4 border-border border-t-accent rounded-full w-10 h-10 animate-spin"></div></div>` : nothing}<div class="flex justify-between items-center border-b border-border pb-4 mb-6 shrink-0"><h2 class="m-0 text-2xl font-normal tracking-[0.2em] text-accent flex items-center">AXEE Model Performance <span class="group relative inline-flex items-center justify-center w-4 h-4 rounded-full border border-text-dark text-text-dark text-xs font-bold ml-2 cursor-help">?<span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 bg-bg border border-border p-4 rounded text-sm font-light leading-relaxed text-left opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50 pointer-events-none normal-case tracking-normal">This dashboard shows the performance of the local machine learning model used for the AXEE Predictor and Batch Analysis features. You can tune its hyperparameters to see how they might affect performance.</span></span></h2><button @click=${() => (this.isDashboardOpen = false)} ?disabled=${this.recalibrationStatus === 'running'} class="bg-none border-none text-text text-4xl cursor-pointer leading-none opacity-70 transition-opacity hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed">&times;</button></div><div class="mb-6 bg-black/20 border border-border p-4 text-center"><h4 class="m-0 mb-2 font-normal tracking-widest uppercase text-base opacity-80">Overall Accuracy</h4><p class="m-0 text-5xl font-bold text-success drop-shadow-[0_0_10px_var(--success-color)]">${(accuracy * 100).toFixed(2)}%</p></div><div class="flex flex-col gap-8"><div class="flex lg:flex-row flex-col gap-8"><div class="flex-1"><h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 m-0 mb-4">Confusion Matrix</h4><div class="grid grid-cols-[1fr_2fr_2fr_2fr] grid-rows-[1fr_2fr_2fr_2fr] gap-1 text-xs"><div class="bg-transparent font-bold tracking-wider text-text-dark" style="writing-mode: vertical-rl; text-orientation: mixed;">Actual</div><div class="bg-transparent font-bold tracking-wider text-text-dark p-2 text-center">Predicted: Conf.</div><div class="bg-transparent font-bold tracking-wider text-text-dark p-2 text-center">Predicted: Cand.</div><div class="bg-transparent font-bold tracking-wider text-text-dark p-2 text-center">Predicted: Hypo.</div>${confusionMatrix.map((row, rowIndex) => html`<div class="bg-transparent font-bold tracking-wider text-text-dark p-2 text-right">${labels[rowIndex]}</div>${row.map((value, colIndex) => html`<div class="bg-black/20 dark:bg-white/5 p-2 flex flex-col items-center justify-center text-center ${rowIndex === colIndex ? 'bg-success/10 border border-success' : 'bg-error/5 border border-error/30'}"><span class="text-2xl font-bold ${rowIndex === colIndex ? 'text-success' : ''}">${value.toLocaleString()}</span><span class="text-xs opacity-60">${((value / total) * 100).toFixed(2)}%</span></div>`)}`)}</div></div><div class="flex-1"><h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 m-0 mb-4">Classification Metrics</h4><table class="w-full text-left"><thead><tr><th class="p-2 border-b border-border font-normal uppercase tracking-widest text-xs opacity-80">Class</th><th class="p-2 border-b border-border font-normal uppercase tracking-widest text-xs opacity-80">Precision</th><th class="p-2 border-b border-border font-normal uppercase tracking-widest text-xs opacity-80">Recall</th><th class="p-2 border-b border-border font-normal uppercase tracking-widest text-xs opacity-80">F1-Score</th></tr></thead><tbody><tr><td class="p-2 border-b border-border text-lg">Confirmed</td><td class="p-2 border-b border-border text-lg font-mono">${metrics.confirmed.precision.toFixed(3)}</td><td class="p-2 border-b border-border text-lg font-mono">${metrics.confirmed.recall.toFixed(3)}</td><td class="p-2 border-b border-border text-lg font-mono">${metrics.confirmed.f1Score.toFixed(3)}</td></tr><tr><td class="p-2 border-b border-border text-lg">Candidate</td><td class="p-2 border-b border-border text-lg font-mono">${metrics.candidate.precision.toFixed(3)}</td><td class="p-2 border-b border-border text-lg font-mono">${metrics.candidate.recall.toFixed(3)}</td><td class="p-2 border-b border-border text-lg font-mono">${metrics.candidate.f1Score.toFixed(3)}</td></tr><tr><td class="p-2 text-lg">Hypothetical</td><td class="p-2 text-lg font-mono">${metrics.hypothetical.precision.toFixed(3)}</td><td class="p-2 text-lg font-mono">${metrics.hypothetical.recall.toFixed(3)}</td><td class="p-2 text-lg font-mono">${metrics.hypothetical.f1Score.toFixed(3)}</td></tr></tbody></table></div></div><div class="mt-4"><h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 m-0 mb-4">Hyperparameter Tuning</h4><div class="flex md:flex-row flex-col gap-8 mb-6"><div class="flex-1"><label for="n_estimators" class="flex justify-between text-sm mb-2"><span>N Estimators</span><span class="font-bold text-accent">${this.hyperparameters.n_estimators}</span></label><input class="w-full" id="n_estimators" type="range" min="50" max="500" step="10" .value=${String(this.hyperparameters.n_estimators)} @input=${(e: Event) => this._handleHyperparameterChange(e, 'n_estimators')}/></div><div class="flex-1"><label for="max_depth" class="flex justify-between text-sm mb-2"><span>Max Depth</span><span class="font-bold text-accent">${this.hyperparameters.max_depth}</span></label><input class="w-full" id="max_depth" type="range" min="2" max="15" step="1" .value=${String(this.hyperparameters.max_depth)} @input=${(e: Event) => this._handleHyperparameterChange(e, 'max_depth')}/></div><div class="flex-1"><label for="learning_rate" class="flex justify-between text-sm mb-2"><span>Learning Rate</span><span class="font-bold text-accent">${this.hyperparameters.learning_rate.toFixed(2,)}</span></label><input class="w-full" id="learning_rate" type="range" min="0.01" max="0.5" step="0.01" .value=${String(this.hyperparameters.learning_rate)} @input=${(e: Event) => this._handleHyperparameterChange(e, 'learning_rate')}/></div></div><button class="font-sans bg-none border border-accent text-accent px-6 py-3 text-base tracking-widest cursor-pointer w-full font-bold hover:bg-accent hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" @click=${this._handleRecalibrate} ?disabled=${this.recalibrationStatus === 'running'}>${this.recalibrationStatus === 'running' ? 'RECALIBRATING...' : 'RE-CALIBRATE MODEL'}</button></div></div></div></div>`;
  }

  private renderDatabaseOverlay() {
    const allPlanets = this.discoveredGalaxies.flatMap(g => g.planets.map(p => ({...p, galaxyName: g.galaxyName})));

    const filteredPlanets = this.databaseSearchTerm ? allPlanets.filter(p => 
        p.planetName.toLowerCase().includes(this.databaseSearchTerm.toLowerCase()) ||
        p.starSystem.toLowerCase().includes(this.databaseSearchTerm.toLowerCase()) ||
        p.galaxyName.toLowerCase().includes(this.databaseSearchTerm.toLowerCase()) ||
        p.planetType.toLowerCase().includes(this.databaseSearchTerm.toLowerCase())
    ) : allPlanets;

    filteredPlanets.sort((a, b) => {
        const key = this.databaseSort.key;
        const order = this.databaseSort.order === 'asc' ? 1 : -1;
        const valA = a[key as keyof typeof a] ?? '';
        const valB = b[key as keyof typeof b] ?? '';
        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * order;
        }
        if (valA > valB) return 1 * order;
        if (valA < valB) return -1 * order;
        return 0;
    });
    
    const renderSortArrow = (key: string) => {
        if (this.databaseSort.key !== key) return nothing;
        return this.databaseSort.order === 'asc' ? '▲' : '▼';
    };

    return html`
        <div class="fixed inset-0 bg-bg/80 backdrop-blur-lg z-[100] flex items-center justify-center pointer-events-auto animate-fade-in">
            <div class="w-11/12 max-w-7xl h-[90vh] bg-panel-bg border border-border shadow-lg drop-shadow-glow text-text p-8 flex flex-col">
                <div class="flex justify-between items-center border-b border-border pb-4 mb-6 shrink-0">
                    <h2 class="m-0 text-2xl font-normal tracking-[0.2em] text-accent">Exoplanet Database</h2>
                    <button @click=${() => this.isDatabaseOpen = false} class="bg-none border-none text-text text-4xl cursor-pointer leading-none opacity-70 transition-opacity hover:opacity-100">&times;</button>
                </div>
                <div class="shrink-0 mb-4">
                    <input type="text" placeholder="Search database..." .value=${this.databaseSearchTerm} @input=${(e: Event) => this.databaseSearchTerm = (e.target as HTMLInputElement).value} class="w-full bg-black/30 dark:bg-black/20 border border-border text-text p-2 px-4 font-sans text-base" />
                </div>
                <div class="flex-grow overflow-y-auto">
                    <table class="w-full border-collapse">
                        <thead class="sticky top-0 bg-panel-bg">
                            <tr>
                                <th class="p-3 text-left border-b-2 border-border cursor-pointer select-none hover:text-accent" @click=${() => this._setDatabaseSort('planetName')}>Planet ${renderSortArrow('planetName')}</th>
                                <th class="p-3 text-left border-b-2 border-border cursor-pointer select-none hover:text-accent" @click=${() => this._setDatabaseSort('starSystem')}>System ${renderSortArrow('starSystem')}</th>
                                <th class="p-3 text-left border-b-2 border-border cursor-pointer select-none hover:text-accent" @click=${() => this._setDatabaseSort('galaxyName')}>Galaxy ${renderSortArrow('galaxyName')}</th>
                                <th class="p-3 text-left border-b-2 border-border cursor-pointer select-none hover:text-accent" @click=${() => this._setDatabaseSort('planetType')}>Type ${renderSortArrow('planetType')}</th>
                                <th class="p-3 text-left border-b-2 border-border cursor-pointer select-none hover:text-accent" @click=${() => this._setDatabaseSort('distanceLightYears')}>Distance (ly) ${renderSortArrow('distanceLightYears')}</th>
                                <th class="p-3 text-left border-b-2 border-border cursor-pointer select-none hover:text-accent" @click=${() => this._setDatabaseSort('axeeClassification')}>Class ${renderSortArrow('axeeClassification')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredPlanets.map(p => html`
                                <tr @click=${() => this._handleDatabaseRowClick(p)} class="cursor-pointer border-b border-border transition-colors hover:bg-glow hover:text-bg dark:hover:text-text">
                                    <td class="p-3">${p.planetName}</td>
                                    <td class="p-3">${p.starSystem}</td>
                                    <td class="p-3">${p.galaxyName}</td>
                                    <td class="p-3">${p.planetType}</td>
                                    <td class="p-3">${p.distanceLightYears.toFixed(2)}</td>
                                    <td class=${`p-3 font-bold ${ p.axeeClassification === 'Confirmed' ? 'text-accent' : p.axeeClassification === 'Candidate' ? 'text-warning' : 'text-text-dark' }`}>${p.axeeClassification}</td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
  }

  private renderImportModal() {
    const handleFileDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file && file.type === "text/csv") {
        this._handleBatchAnalysis(file);
      } else {
        this.importStatus = 'error';
        this.importMessage = "Invalid file type. Please provide a .csv file.";
      }
    };
    const handleFileInput = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this._handleBatchAnalysis(file);
    };

    return html`
      <div class="fixed inset-0 bg-bg/80 backdrop-blur-lg z-[100] flex items-center justify-center pointer-events-auto animate-fade-in" @click=${(e: Event) => { if(e.target === e.currentTarget) this.isImportModalOpen = false; }}>
        <div class="w-11/12 max-w-xl bg-panel-bg border border-border shadow-lg drop-shadow-glow text-text p-8 relative flex flex-col" @click=${(e:Event) => e.stopPropagation()}>
            <div class="flex justify-between items-center border-b border-border pb-4 mb-6 shrink-0">
              <h2 class="m-0 text-2xl font-normal tracking-[0.2em] text-accent">Import & Batch Analyze</h2>
              <button @click=${() => this.isImportModalOpen = false} class="bg-none border-none text-text text-4xl cursor-pointer leading-none opacity-70 transition-opacity hover:opacity-100">&times;</button>
            </div>
            
            ${this.importStatus === 'idle' ? html`
              <p class="text-sm opacity-80 leading-relaxed mb-4">Upload a CSV file of exoplanet candidates for batch processing and data enrichment. The file must contain columns named: <code class="bg-black/20 px-1 py-0.5 rounded">orbital_period</code>, <code class="bg-black/20 px-1 py-0.5 rounded">transit_duration</code>, and <code class="bg-black/20 px-1 py-0.5 rounded">planet_radius</code>.</p>
              <label for="batch-file-input"
                class="flex flex-col items-center justify-center w-full h-48 border-2 border-border border-dashed rounded-lg cursor-pointer bg-black/20 hover:bg-black/40 transition-colors"
                @dragover=${(e: DragEvent) => e.preventDefault()}
                @drop=${handleFileDrop}>
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg class="w-8 h-8 mb-4 text-text-dark" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                    <p class="mb-2 text-sm text-text-dark"><span class="font-semibold">Click to upload</span> or drag and drop</p>
                    <p class="text-xs text-text-dark">CSV file</p>
                </div>
                <input id="batch-file-input" type="file" class="hidden" accept=".csv" @change=${handleFileInput} />
              </label>
            ` : html`
              <div class="flex flex-col items-center justify-center text-center h-48">
                ${this.importStatus === 'error' ? 
                  html`<svg class="w-12 h-12 mb-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>` :
                  this.importStatus === 'complete' ?
                  html`<svg class="w-12 h-12 mb-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>` :
                  html`<div class="border-4 border-border border-t-accent rounded-full w-12 h-12 animate-spin mb-4"></div>`
                }
                <p class="text-base text-text-dark">${this.importMessage}</p>
                ${(this.importStatus === 'complete' || this.importStatus === 'error') ? html`
                  <button @click=${() => this.importStatus = 'idle'} class="font-sans bg-none border border-border text-text px-4 py-2 text-xs cursor-pointer transition-all duration-300 mt-4 hover:bg-glow hover:border-accent hover:text-bg">Start Over</button>
                ` : nothing}
              </div>
            `}
        </div>
      </div>
    `;
  }

  private renderShaderLabOverlay() {
    return html`
      <div class="fixed inset-0 z-[100] bg-bg flex flex-col animate-fade-in">
        <div class="p-4 flex justify-between items-center border-b border-border shrink-0">
          <h3 class="m-0 font-normal tracking-[0.2em] uppercase text-accent">AXEE Shader Lab</h3>
          <button @click=${() => this.isShaderLabOpen = false} class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest cursor-pointer hover:bg-glow hover:text-bg">CLOSE</button>
        </div>
        <div class="flex-grow flex flex-col lg:flex-row min-h-0">
          <div class="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-border">
            <div class="flex-1 flex flex-col min-h-0 border-b border-border">
              <label for="vs-editor" class="p-2 px-4 text-xs uppercase tracking-widest opacity-70">Vertex Shader</label>
              <textarea id="vs-editor" .value=${this.shaderLabVs} @input=${(e: Event) => this.shaderLabVs = (e.target as HTMLTextAreaElement).value} class="flex-grow bg-transparent border-none text-text font-mono text-sm p-4 resize-none focus:outline-none focus:bg-accent/5"></textarea>
            </div>
            <div class="flex-1 flex flex-col min-h-0">
              <label for="fs-editor" class="p-2 px-4 text-xs uppercase tracking-widest opacity-70">Fragment Shader</label>
              <textarea id="fs-editor" .value=${this.shaderLabFs} @input=${(e: Event) => this.shaderLabFs = (e.target as HTMLTextAreaElement).value} class="flex-grow bg-transparent border-none text-text font-mono text-sm p-4 resize-none focus:outline-none focus:bg-accent/5"></textarea>
            </div>
          </div>
          <div class="flex-1 relative">
            <shader-lab-visualizer 
              .vertexShader=${this.shaderLabVs}
              .fragmentShader=${this.shaderLabFs}
            ></shader-lab-visualizer>
          </div>
        </div>
      </div>
    `;
  }

  private renderNasaEyesOverlay() {
    return html`
      <div class="fixed inset-0 z-[100] bg-bg flex flex-col animate-fade-in">
        <div class="p-4 flex justify-between items-center border-b border-border shrink-0">
          <h3 class="m-0 font-normal tracking-[0.2em] uppercase text-accent">NASA's Eyes on the Solar System</h3>
          <button @click=${() => this.isNasaEyesOpen = false} class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest cursor-pointer hover:bg-glow hover:text-bg">CLOSE</button>
        </div>
        <div class="flex-grow min-h-0">
            <iframe src="https://eyes.nasa.gov/apps/solar-system/#/home?interactPrompt=true&surfaceMapTiling=true&hd=true" allowfullscreen class="w-full h-full border-0"></iframe>
        </div>
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <header class="flex flex-col md:flex-row justify-between items-start p-4 md:p-6 pointer-events-auto drop-shadow-glow shrink-0">
        <div>
          <h1 class="m-0 font-normal text-2xl tracking-[0.3em] text-accent">${this.activeGalaxy ? this.activeGalaxy.galaxyName.toUpperCase() : 'INTERGALACTIC MAP'}</h1>
          <h2 class="m-0 font-light text-xs tracking-widest text-text opacity-70">${this.activeGalaxy ? this.activeGalaxy.galaxyType : 'Sentient Creation Engine'}</h2>
        </div>
        <div class="flex gap-2 flex-wrap justify-start md:justify-end max-w-full md:max-w-[70%] mt-2 md:mt-0">
          ${this.activeGalaxy ? html`<button class="font-sans bg-none border border-yellow-500/50 text-yellow-400 px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-yellow-400/20 hover:border-yellow-400 hover:text-yellow-200" @click=${() => { this.activeGalaxyId = null; this.selectedPlanetId = null; }}>← INTERGALACTIC MAP</button>` : nothing}
          <button class="font-sans bg-none border border-pink-500/50 text-pink-400 px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-pink-400/20 hover:border-pink-400 hover:text-pink-200 drop-shadow-[0_0_8px_#ff61c3] disabled:opacity-50 disabled:cursor-not-allowed" @click=${this._handleRevealTheUnseen} ?hidden=${this.isUnseenRevealed} ?disabled=${this.aiStatus !== 'idle'}>REVEAL THE UNSEEN</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${() => this.isDatabaseOpen = true}>DATABASE</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${this._startConversation} title="Converse with AXEE">CONVERSE</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${() => this.isShaderLabOpen = true} title="Open Shader Lab">SHADER LAB</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg" @click=${() => this.isNasaEyesOpen = true} title="Explore with NASA's Eyes">NASA EYES</button>
          <button class="font-sans bg-none border px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${this.liveStreamStatus === 'connected' ? 'border-success text-success drop-shadow-[0_0_8px_var(--success-color)] hover:bg-success/20' : 'border-border text-text hover:bg-glow hover:text-bg'}" @click=${this._toggleLiveStream} ?disabled=${!this.activeGalaxy || this.liveStreamStatus === 'connecting'} title="Toggle live data stream">
            ${this.liveStreamStatus === 'connecting' ? 'CONNECTING...' : this.liveStreamStatus === 'connected' ? html`<span class="inline-block w-2 h-2 bg-success rounded-full mr-2 animate-pulse-live"></span>DISCONNECT` : 'LIVE FEED'}
          </button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${this._startTutorial} title="Start the guided tutorial">HELP</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${() => (this.isDashboardOpen = true)} title="View AXEE model performance">MODEL</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${this.loadSolSystem} ?disabled=${this.aiStatus !== 'idle' || !this.activeGalaxy} title="Load our home solar system">LOAD SOL</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${this._handleSaveSession} title="Download current session as a file">SAVE</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${this._handleLoadSessionClick} title="Load a session from a file">LOAD</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${this._handleBatchAnalysisClick} ?disabled=${this.aiStatus !== 'idle' || !this.activeGalaxy} title="Import and analyze a CSV of exoplanet candidates">IMPORT</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${this._handleExportCsv} ?disabled=${this.discoveredGalaxies.flatMap(g => g.planets).length === 0} title="Export all discovered data to CSV">EXPORT</button>
          <button class="font-sans bg-none border border-border text-text px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-glow hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed" @click=${() => (this.isMuted = !this.isMuted)} title=${this.isMuted ? 'Unmute' : 'Mute'}>${this.isMuted ? 'UNMUTE' : 'MUTE'}</button>
          <button class="font-sans bg-none border border-red-500/40 text-red-500 px-4 py-2 text-xs tracking-widest whitespace-nowrap transition-colors hover:bg-red-500/20 hover:border-red-500 hover:text-red-400" @click=${this._handleClearSession} title="Clear all discovered data">CLEAR</button>
        </div>
      </header>
    `;
  }

  private renderLeftPanel(selectedPlanet: PlanetData | undefined) {
    const inGalaxyView = !!this.activeGalaxyId;
    const panelClasses = `
      absolute top-0 left-0 h-full w-[clamp(320px,25vw,420px)] p-6 pt-32 
      bg-panel-bg backdrop-blur-lg flex flex-col 
      transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-auto
      border-r border-border
      ${this.isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'}
    `;

    return html`
      <aside id="left-panel" class=${panelClasses}>
        <button class="absolute top-1/2 -translate-y-1/2 right-[-2rem] w-8 h-20 bg-panel-bg border border-l-0 border-border cursor-pointer flex items-center justify-center text-accent z-10" @click=${this._toggleLeftPanel}>
          <i class="border-solid border-accent inline-block p-1 transition-transform duration-300 ${this.isLeftPanelOpen ? 'border-b-2 border-l-2 -rotate-45' : 'border-t-2 border-r-2 -rotate-45'}"></i>
        </button>
        <div class="flex justify-between items-center pb-2 border-b border-border mb-4">
          <h3 class="m-0 text-base font-normal tracking-[0.2em] uppercase text-accent">
            ${inGalaxyView
              ? (selectedPlanet ? 'Stellar Cartography' : this.leftPanelView === 'list' ? 'Discovered Worlds' : 'AXEE Predictor')
              : 'Discovered Galaxies'
            }
          </h3>
          ${!selectedPlanet && inGalaxyView ? html`
            <div class="flex border border-border">
              <button class="bg-none border-none px-2 py-1 cursor-pointer font-sans text-xs tracking-widest uppercase transition-all duration-200 flex items-center ${this.leftPanelView === 'list' ? 'bg-glow text-bg' : 'text-text-dark'}" @click=${() => (this.leftPanelView = 'list')}>LIST</button>
              <button class="bg-none border-none px-2 py-1 cursor-pointer font-sans text-xs tracking-widest uppercase transition-all duration-200 flex items-center ${this.leftPanelView === 'predictor' ? 'bg-glow text-bg' : 'text-text-dark'}" @click=${() => (this.leftPanelView = 'predictor')}>
                PREDICTOR
                <span class="group relative inline-flex items-center justify-center w-4 h-4 rounded-full border border-text-dark text-text-dark text-xs font-bold ml-2 cursor-help">?<span class="absolute bottom-full mb-2 left-auto right-full mr-2 w-72 bg-bg border border-border p-4 rounded text-sm font-light leading-relaxed text-left opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50 pointer-events-none normal-case tracking-normal">The AXEE Predictor uses a local machine learning model to classify a planet as a 'Confirmed' candidate, a potential 'Candidate', or a 'False Positive' based on key observational data.</span></span>
              </button>
            </div>
          ` : nothing}
        </div>
        <div class="overflow-y-auto h-full w-full">
          ${inGalaxyView
            ? (selectedPlanet ? this.renderPlanetDetail(selectedPlanet) : this.leftPanelView === 'list' ? this.renderPlanetList() : this.renderPredictorForm())
            : this.renderGalaxyList()
          }
        </div>
      </aside>
    `;
  }

  private renderGalaxyList() {
    return html`
      <ul class="list-none p-0 m-0">
        ${this.discoveredGalaxies.map(g => html`
          <li class="py-3 border-b border-border cursor-pointer transition-colors duration-300 hover:bg-glow group" @click=${() => { this.activeGalaxyId = g.id; this.isLeftPanelOpen = false; }}>
            <span class="block text-lg font-normal text-accent group-hover:text-bg">${g.galaxyName}</span>
            <span class="text-xs opacity-70 group-hover:text-bg">${g.galaxyType}</span>
          </li>
        `)}
      </ul>
    `;
  }

  private renderPlanetList() {
    return html`
      <ul id="planet-list-panel" class="list-none p-0 m-0">
        ${this.discoveredPlanets.map((p) => html`
            <li class=${`py-3 border-b border-border cursor-pointer transition-colors duration-300 hover:bg-glow group ${p.celestial_body_id === this.selectedPlanetId ? 'bg-glow' : ''}`} @click=${() => this._selectPlanet(p.celestial_body_id)}>
              <span class="block text-xs opacity-70 tracking-widest group-hover:text-bg ${p.celestial_body_id === this.selectedPlanetId ? 'text-bg' : ''}">${p.celestial_body_id.toUpperCase()}</span>
              <span class="text-lg font-normal text-text group-hover:text-bg ${p.celestial_body_id === this.selectedPlanetId ? 'text-bg' : ''}">${p.planetName}</span>
            </li>`
        )}
      </ul>
    `;
  }

  private renderPredictorForm() {
    const isLoading = this.predictorStatus === 'loading';
    const formValues = Object.values(this.predictorForm);
    const isFormIncomplete = formValues.some((v) => v.trim() === '') || formValues.some((v) => isNaN(parseFloat(v)));
    return html`<div class="flex flex-col gap-5"><p class="text-sm opacity-80 leading-relaxed m-0">Input observational data to classify an exoplanet candidate using the local AXEE model.</p><div><label for="orbital_period" class="block text-xs opacity-70 mb-1.5">Orbital Period (days)</label><input id="orbital_period" type="number" placeholder="e.g., 365.25" .value=${this.predictorForm.orbital_period} @input=${(e: Event) => (this.predictorForm = {...this.predictorForm, orbital_period: (e.target as HTMLInputElement).value})} ?disabled=${isLoading} class="w-full bg-black/30 dark:bg-black/20 border border-border text-text p-2.5 font-sans text-base focus:outline-none focus:border-accent"/></div><div><label for="transit_duration" class="block text-xs opacity-70 mb-1.5">Transit Duration (hours)</label><input id="transit_duration" type="number" placeholder="e.g., 12.3" .value=${this.predictorForm.transit_duration} @input=${(e: Event) => (this.predictorForm = {...this.predictorForm, transit_duration: (e.target as HTMLInputElement).value})} ?disabled=${isLoading} class="w-full bg-black/30 dark:bg-black/20 border border-border text-text p-2.5 font-sans text-base focus:outline-none focus:border-accent"/></div><div><label for="planet_radius" class="block text-xs opacity-70 mb-1.5">Planet Radius (Earths)</label><input id="planet_radius" type="number" placeholder="e.g., 1.8" .value=${this.predictorForm.planet_radius} @input=${(e: Event) => (this.predictorForm = {...this.predictorForm, planet_radius: (e.target as HTMLInputElement).value})} ?disabled=${isLoading} class="w-full bg-black/30 dark:bg-black/20 border border-border text-text p-2.5 font-sans text-base focus:outline-none focus:border-accent"/></div><button class="w-full p-3 bg-none border border-accent text-accent font-sans text-sm font-bold tracking-widest cursor-pointer hover:bg-accent hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" @click=${this._handlePredictorSubmit} ?disabled=${isLoading || isFormIncomplete}>${isLoading ? 'CLASSIFYING...' : 'CLASSIFY'}</button>${this.predictorResult ? html`<div class=${`border p-4 text-center mt-4 ${this.predictorResult === 'Confirmed' ? 'border-accent' : this.predictorResult === 'Candidate' ? 'border-warning' : 'border-error'}`}><strong class="block text-xs uppercase tracking-widest opacity-70 mb-2">Classification Result</strong><span class=${`text-2xl font-bold tracking-widest ${this.predictorResult === 'Confirmed' ? 'text-accent drop-shadow-glow' : this.predictorResult === 'Candidate' ? 'text-warning drop-shadow-[0_0_8px_var(--warning-color)]' : 'text-error drop-shadow-[0_0_8px_var(--error-color)]'}`}>${this.predictorResult.toUpperCase()}</span></div>` : nothing}</div>`;
  }

  private renderPlanetDetail(planet: PlanetData) {
    return html`<div id="planet-detail-panel"><button class="bg-none border-none text-accent cursor-pointer font-sans text-sm p-0 pb-4 opacity-80 transition-opacity hover:opacity-100" @click=${() => (this.selectedPlanetId = null)}>← View Discovered Worlds</button><h2 class="m-0 text-3xl font-bold text-accent">${planet.planetName}</h2><h3 class="m-0 mb-4 text-base font-light opacity-80">${planet.starSystem} // ${planet.planetType}</h3><div class="opacity-90 mb-6 border-l-2 border-accent pl-4"><p class="italic m-0">"${planet.aiWhisper}"</p><span class="block text-right text-xs opacity-70 mt-2">— AURELION CORE</span></div><div class="mb-4"><h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Live 3D Visualization</h4><div class="mb-4 w-full min-h-52 aspect-square bg-black/20 border border-border flex items-center justify-center p-2 relative overflow-hidden cursor-grab active:cursor-grabbing"><planet-visualizer .planet=${planet}></planet-visualizer></div></div><div id="analysis-buttons" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"><button class="col-span-1 sm:col-span-2 p-3 bg-none border border-accent text-accent font-sans text-sm font-bold tracking-widest cursor-pointer hover:bg-accent hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" ?disabled=${this.aiStatus.startsWith('thinking') || this.aiStatus === 'navigating'} @click=${() => this.calculateRouteToPlanet(planet)}>${this.aiStatus === 'navigating' ? 'CALCULATING...' : 'CALCULATE ROUTE'}</button><button class="p-3 bg-none border border-accent text-accent font-sans text-sm font-bold tracking-widest cursor-pointer hover:bg-accent hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" @click=${() => this.analyzeMagnetosphere(planet)} ?disabled=${this.magnetosphereStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.magnetosphereStatus === 'running' ? 'ANALYZING...' : 'MAGNETOSPHERE'}</button><button class="p-3 bg-none border border-success text-success font-sans text-sm font-bold tracking-widest cursor-pointer hover:bg-success hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" @click=${() => this.analyzeDeepStructure(planet)} ?disabled=${this.deepScanStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.deepScanStatus === 'running' ? 'SCANNING...' : 'DEEP SCAN'}</button><button class="p-3 bg-none border border-warning text-warning font-sans text-sm font-bold tracking-widest cursor-pointer hover:bg-warning hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" @click=${() => this.analyzeExoSuitShielding(planet)} ?disabled=${this.exoSuitStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.exoSuitStatus === 'running' ? 'SIMULATING...' : 'EXO-SUIT'}</button><button class="p-3 bg-none border border-pink-400 text-pink-400 font-sans text-sm font-bold tracking-widest cursor-pointer hover:bg-pink-400 hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" @click=${() => this.analyzeEnergySignature(planet)} ?disabled=${this.energySignatureStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.energySignatureStatus === 'running' ? 'ANALYZING...' : 'ENERGY SIGNATURE'}</button><button class="p-3 bg-none border border-accent text-accent font-sans text-sm font-bold tracking-widest cursor-pointer hover:bg-accent hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" @click=${() => this.analyzeWeather(planet)} ?disabled=${this.weatherStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.weatherStatus === 'running' ? 'SIMULATING...' : 'WEATHER'}</button><button class="p-3 bg-none border border-accent text-accent font-sans text-sm font-bold tracking-widest cursor-pointer hover:bg-accent hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" @click=${() => this.analyzeLightCurve(planet)} ?disabled=${this.lightCurveStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.lightCurveStatus === 'running' ? 'ANALYZING...' : 'LIGHT CURVE'}</button><button class="p-3 bg-none border border-accent text-accent font-sans text-sm font-bold tracking-widest cursor-pointer hover:bg-accent hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" @click=${() => this.analyzeRadialVelocity(planet)} ?disabled=${this.radialVelocityStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.radialVelocityStatus === 'running' ? 'ANALYZING...' : 'RADIAL VELOCITY'}</button><button class="p-3 bg-none border border-cyan-400 text-cyan-400 font-sans text-sm font-bold tracking-widest cursor-pointer hover:bg-cyan-400 hover:text-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:border-text-dark disabled:text-text-dark" @click=${() => this.generatePlanetImage(planet)} ?disabled=${this.imageGenerationStatus === 'running' || this.aiStatus.startsWith('thinking')}>${this.imageGenerationStatus === 'running' ? 'GENERATING...' : 'GENERATE IMAGE'}</button></div>${this.navigationRoute ? this.renderNavigationPanel() : nothing}<h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Planetary Data</h4><div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><div><strong class="block font-light opacity-70 text-xs">Star Type</strong><span>${planet.starType}</span></div><div><strong class="block font-light opacity-70 text-xs">Distance</strong><span>${planet.distanceLightYears} ly</span></div><div><strong class="block font-light opacity-70 text-xs">Orbital Period</strong><span>${planet.orbitalPeriod}</span></div><div><strong class="block font-light opacity-70 text-xs">Rotational Period</strong><span>${planet.rotationalPeriod}</span></div><div><strong class="block font-light opacity-70 text-xs">Moons</strong><span>${planet.moons.count}</span></div><div><strong class="block font-light opacity-70 text-xs">Life Assessment</strong><span>${planet.potentialForLife.assessment}</span></div></div><h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Physical Characteristics</h4><div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><div><strong class="block font-light opacity-70 text-xs">Gravity</strong><span>${planet.gravity}</span></div><div><strong class="block font-light opacity-70 text-xs">Surface Pressure</strong><span>${planet.surfacePressure}</span></div><div><strong class="block font-light opacity-70 text-xs">Magnetosphere</strong><span>${planet.magnetosphereStrength}</span></div><div><strong class="block font-light opacity-70 text-xs">Geology</strong><span>${planet.geologicalActivity}</span></div></div><h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">AXEE Analysis</h4><div class="grid grid-cols-3 gap-x-4 gap-y-2 text-sm mb-4"><div><strong class="block font-light opacity-70 text-xs">Orbital Period</strong><span>${planet.orbitalPeriodDays?.toFixed(2) ?? 'N/A'} days</span></div><div><strong class="block font-light opacity-70 text-xs">Transit Duration</strong><span>${planet.transitDurationHours?.toFixed(2) ?? 'N/A'} hrs</span></div><div><strong class="block font-light opacity-70 text-xs">Planet Radius</strong><span>${planet.planetRadiusEarths?.toFixed(2) ?? 'N/A'} R⊕</span></div></div><div class=${`border p-4 text-center mb-4 ${planet.axeeClassification === 'Confirmed' ? 'border-accent' : planet.axeeClassification === 'Candidate' ? 'border-warning' : 'border-text-dark'}`}><strong class="block text-xs uppercase tracking-widest opacity-70 mb-2">Classification Status</strong><span class=${`text-2xl font-bold tracking-widest ${planet.axeeClassification === 'Confirmed' ? 'text-accent drop-shadow-glow' : planet.axeeClassification === 'Candidate' ? 'text-warning drop-shadow-[0_0_8px_var(--warning-color)]' : 'text-text-dark'}`}>${planet.axeeClassification?.toUpperCase() || 'N/A'}</span></div>${this.magnetosphereStatus !== 'idle' ? this.renderMagnetosphereAnalysis() : nothing}${this.deepScanStatus !== 'idle' ? this.renderDeepScanAnalysis() : nothing}${this.exoSuitStatus !== 'idle' ? this.renderExoSuitAnalysis() : nothing}${this.imageGenerationStatus !== 'idle' ? this.renderImageGenerationAnalysis() : nothing}${this.energySignatureStatus !== 'idle' ? this.renderEnergySignatureAnalysis() : nothing}${this.weatherStatus !== 'idle' ? this.renderWeatherAnalysis() : nothing}${this.lightCurveStatus !== 'idle' ? this.renderLightCurveAnalysis() : nothing}${this.radialVelocityStatus !== 'idle' ? this.renderRadialVelocityAnalysis() : nothing}<h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Atmospheric Composition</h4><p class="leading-relaxed opacity-90 m-0 mb-4">${planet.atmosphericComposition}</p><h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Surface Features</h4><p class="leading-relaxed opacity-90 m-0 mb-4">${planet.surfaceFeatures}</p><h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Potential for Life Analysis</h4><p class="leading-relaxed opacity-90 m-0 mb-4">${planet.potentialForLife.reasoning}</p>${planet.potentialForLife.biosignatures.length > 0 ? html`
        <h5 class="font-light tracking-wider uppercase opacity-80 mt-4 mb-2 text-sm">Detected Biosignatures</h5>
        <ul class="list-none p-0 flex flex-wrap gap-2 mb-4">
          ${planet.potentialForLife.biosignatures.map(b => html`<li class="bg-glow border border-border px-2.5 py-1.5 text-xs rounded-full font-light">${b}</li>`)}
        </ul>
      ` : nothing}<h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Discovery Narrative</h4><p class="leading-relaxed opacity-90 m-0 mb-4">${planet.discoveryNarrative}</p><h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Key Features</h4><ul class="pl-5 mb-4">
        ${planet.keyFeatures.map((f) => html`<li class="mb-2">${f}</li>`)}
      </ul></div>`;
  }

  private renderMagnetosphereAnalysis() {
    return html`
      <h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Magnetosphere Shielding Analysis</h4>
      ${this.magnetosphereStatus === 'running' ? html`<div class="p-8 text-center opacity-70">Running quantum simulation...</div>` : ''}
      ${this.magnetosphereStatus === 'error' ? html`<p class="text-error font-normal">Analysis failed. The simulation was unstable.</p>` : ''}
      ${this.magnetosphereStatus === 'complete' && this.magnetosphereAnalysisData ? html`
        <p class="text-sm opacity-80 leading-relaxed mb-4">${this.magnetosphereAnalysisData.summary}</p>
        <div class="w-full h-64 bg-black/20 border border-border mb-4 relative">
          <shielding-visualizer .analysisData=${this.magnetosphereAnalysisData}></shielding-visualizer>
        </div>
      ` : nothing}
    `;
  }

  private renderDeepScanAnalysis() {
    return html`
      <h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Deep Structure Tomography</h4>
       ${this.deepScanStatus === 'running' ? html`<div class="p-8 text-center opacity-70">Reconstructing subsurface layers...</div>` : ''}
       ${this.deepScanStatus === 'error' ? html`<p class="text-error font-normal">Deep scan failed. Tomographic reconstruction was unstable.</p>` : ''}
       ${this.deepScanStatus === 'complete' && this.deepScanData ? html`
        <div>
          <p class="text-xs opacity-70"><strong>Scan Job:</strong> ${this.deepScanData.jobLabel}</p>
          <div class="w-full h-64 bg-black/20 border border-border my-4 relative">
            <deep-scan-visualizer .analysisData=${this.deepScanData}></deep-scan-visualizer>
          </div>
          <h5 class="font-light tracking-wider uppercase opacity-80 mt-4 mb-2 text-sm">Material Composition Legend</h5>
          <table class="w-full border-collapse text-sm">
            ${this.deepScanData.materials.map((mat, i) => html`
              <tr>
                <td class="p-2 border-b border-border"><span class="inline-block w-3 h-3 mr-3 align-middle" style="background-color: var(--mat-color-${i + 1})"></span>${mat.name}</td>
              </tr>
            `)}
          </table>
        </div>
       ` : nothing}
    `;
  }
  
  private renderExoSuitAnalysis() {
    return html`
      <h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Exo-Suit Radiation Shielding</h4>
       ${this.exoSuitStatus === 'running' ? html`<div class="p-8 text-center opacity-70">Simulating radiation exposure...</div>` : ''}
       ${this.exoSuitStatus === 'error' ? html`<p class="text-error font-normal">Exo-suit simulation failed. Unstable radiation environment.</p>` : ''}
       ${this.exoSuitStatus === 'complete' && this.exoSuitAnalysisData ? html`
        <div>
          <p class="text-xs opacity-70"><strong>Simulation:</strong> ${this.exoSuitAnalysisData.jobLabel}</p>
          <div class="w-full h-64 bg-black/20 border border-border my-4 relative">
            <exo-suit-visualizer .analysisData=${this.exoSuitAnalysisData}></exo-suit-visualizer>
          </div>
          <h5 class="font-light tracking-wider uppercase opacity-80 mt-4 mb-2 text-sm">Shielding Material Legend</h5>
          <table class="w-full border-collapse text-sm">
            ${this.exoSuitAnalysisData.materials.map((mat, i) => html`
              <tr>
                <td class="p-2 border-b border-border"><span class="inline-block w-3 h-3 mr-3 align-middle" style="background-color: var(--exo-mat-color-${i + 1})"></span>${mat.name}</td>
              </tr>
            `)}
          </table>
        </div>
       ` : nothing}
    `;
  }

  private renderImageGenerationAnalysis() {
    return html`
      <h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">AI Visual Synthesis</h4>
      ${this.imageGenerationStatus === 'running' ? html`<div class="p-8 text-center opacity-70">Rendering artistic impression...</div>` : ''}
      ${this.imageGenerationStatus === 'error' ? html`<p class="text-error font-normal">Visual synthesis failed. The signal was too chaotic to resolve.</p>` : ''}
      ${this.imageGenerationStatus === 'complete' && this.generatedImageData ? html`
        <div class="flex flex-col gap-4">
            <img src=${this.generatedImageData.url} alt="AI generated image of the planet" class="w-full h-auto rounded border border-border"/>
            <div>
                <h5 class="font-light tracking-wider uppercase opacity-80 mb-2 text-sm">Generation Prompt</h5>
                <p class="text-xs opacity-70 leading-relaxed bg-black/20 p-2 border border-border rounded">${this.generatedImageData.prompt}</p>
            </div>
        </div>
      ` : nothing}
    `;
  }

  private renderWeatherAnalysis() {
    return html`
      <h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Atmospheric & Weather Analysis</h4>
      ${this.weatherStatus === 'running' ? html`<div class="p-8 text-center opacity-70">Simulating climate patterns...</div>` : ''}
      ${this.weatherStatus === 'error' ? html`<p class="text-error font-normal">Weather simulation failed. Atmospheric model was unstable.</p>` : ''}
      ${this.weatherStatus === 'complete' && this.weatherAnalysisData ? html`
        <weather-visualizer .analysisData=${this.weatherAnalysisData}></weather-visualizer>
      ` : nothing}
    `;
  }

  private renderEnergySignatureAnalysis() {
    return html`
      <h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Energy Signature Analysis</h4>
      ${this.energySignatureStatus === 'running' ? html`<div class="p-8 text-center opacity-70">Scanning for anomalous emissions...</div>` : ''}
      ${this.energySignatureStatus === 'error' ? html`<p class="text-error font-normal">Analysis failed. The signal was too chaotic to resolve.</p>` : ''}
      ${this.energySignatureStatus === 'complete' && this.energySignatureAnalysisData ? html`
        <p class="text-sm opacity-80 leading-relaxed mb-4">${this.energySignatureAnalysisData.summary}</p>
        <div class="w-full h-72 bg-black/20 border border-border mb-4 relative">
          <energy-signature-visualizer .analysisData=${this.energySignatureAnalysisData}></energy-signature-visualizer>
        </div>
      ` : nothing}
    `;
  }
  
  private renderLightCurveAnalysis() {
    return html`
      <h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Photometric Light Curve Analysis</h4>
      ${this.lightCurveStatus === 'running' ? html`<div class="p-8 text-center opacity-70">Acquiring photometric lock...</div>` : ''}
      ${this.lightCurveStatus === 'error' ? html`<p class="text-error font-normal">Light curve analysis failed. Could not resolve signal.</p>` : ''}
      ${this.lightCurveStatus === 'complete' && this.lightCurveData ? html`
        <p class="text-sm opacity-80 leading-relaxed mb-4">${this.lightCurveData.summary}</p>
        <div class="w-full h-64 bg-black/20 border border-border mb-4 relative">
            <light-curve-visualizer .analysisData=${this.lightCurveData}></light-curve-visualizer>
        </div>
      ` : nothing}
    `;
  }

  private renderRadialVelocityAnalysis() {
    return html`
      <h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Radial Velocity Analysis</h4>
      ${this.radialVelocityStatus === 'running' ? html`<div class="p-8 text-center opacity-70">Observing stellar wobble...</div>` : ''}
      ${this.radialVelocityStatus === 'error' ? html`<p class="text-error font-normal">Radial velocity analysis failed. Signal could not be resolved.</p>` : ''}
      ${this.radialVelocityStatus === 'complete' && this.radialVelocityData ? html`
        <p class="text-sm opacity-80 leading-relaxed mb-4">${this.radialVelocityData.summary}</p>
        <div class="w-full h-64 bg-black/20 border border-border mb-4 relative">
            <radial-velocity-visualizer .analysisData=${this.radialVelocityData}></radial-velocity-visualizer>
        </div>
      ` : nothing}
    `;
  }

  private renderNavigationPanel() {
    return html`<div class="mt-4 border-t border-border"><h4 class="font-normal tracking-widest uppercase border-b border-border pb-2 mt-6 mb-4">Navigation Route</h4><ul class="list-none p-0 m-0">${this.navigationRoute?.map((wp, index) => html`<li class="flex items-start gap-4 py-3 border-b border-border"><span class="text-lg font-bold text-accent shrink-0">${index + 1}</span><div><strong class="block font-normal">${wp.name}</strong><p class="m-0 text-xs opacity-70">${wp.description}</p></div></li>`)}</ul></div>`;
  }

  private renderRightPanel() {
    const panelClasses = `
      absolute top-0 right-0 h-full w-[clamp(320px,25vw,420px)] p-6 pt-32 
      bg-panel-bg backdrop-blur-lg flex flex-col items-end 
      transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-auto
      border-l border-border
      ${this.isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'}
    `;
    const filteredChronicles = this.aiChronicles.filter(entry => 
        this.chronicleFilter === 'all' || entry.type === this.chronicleFilter
    );
    const chronicleFilters: (typeof this.chronicleFilter)[] = ['all', 'discovery', 'thought', 'suggestion'];

    return html`
      <aside class=${panelClasses}>
        <button class="absolute top-1/2 -translate-y-1/2 left-[-2rem] w-8 h-20 bg-panel-bg border border-r-0 border-border cursor-pointer flex items-center justify-center text-accent z-10" @click=${this._toggleRightPanel}>
          ${this.hasNewChronicle && !this.isRightPanelOpen ? html`<div class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-accent rounded-full shadow-[0_0_8px_var(--accent-color)]"></div>` : nothing}
          <i class="border-solid border-accent inline-block p-1 transition-transform duration-300 ${this.isRightPanelOpen ? 'border-b-2 border-r-2 rotate-45' : 'border-t-2 border-l-2 rotate-45'}"></i>
        </button>
        <div class="w-full text-right pb-2 border-b border-border mb-4">
          <h3 class="m-0 text-base font-normal tracking-[0.2em] uppercase text-accent">AI Core Chronicles</h3>
        </div>
        <div class="flex border border-border mb-4">
            ${chronicleFilters.map(f => html`
                <button 
                    class="bg-none border-none px-2 py-1 cursor-pointer font-sans text-xs tracking-widest uppercase transition-all duration-200 flex-grow
                    ${this.chronicleFilter === f ? 'bg-glow text-bg' : 'text-text-dark'}"
                    @click=${() => this.chronicleFilter = f}
                >${f.toUpperCase()}</button>
            `)}
        </div>
        <div class="overflow-y-auto h-full w-full">
          <ul class="list-none p-0 m-0">
            ${filteredChronicles.map((entry) => {
              const isClickable = entry.type === 'discovery' && (entry.planetId || entry.galaxyId);
              const typeClasses = {
                'thought': 'border-accent',
                'discovery': 'border-warning',
                'suggestion': 'border-pink-400'
              }
              return html`
              <li
                class="border-r-2 pr-3 mb-4 transition-colors ${typeClasses[entry.type]} ${isClickable ? 'cursor-pointer hover:bg-glow group' : ''}"
                @click=${isClickable ? () => this._handleChronicleClick(entry) : nothing}
                title=${isClickable ? 'Click to navigate' : ''}>
                <span class="text-xs opacity-60 group-hover:text-bg">${entry.timestamp}</span>
                <p class="m-0 mt-1 text-sm group-hover:text-bg">${entry.content}</p>
              </li>`;
            })}
          </ul>
        </div>
      </aside>`;
  }

  private renderFooter() {
    const isBusy = this.aiStatus.startsWith('thinking') || this.aiStatus === 'navigating';
    const inGalaxyView = !!this.activeGalaxyId;
    const placeholder = inGalaxyView ? 'Describe a planetary concept to synthesize...' : 'Describe a galactic concept to synthesize...';

    return html`
      <footer class="p-4 md:p-8 flex flex-col gap-2 items-center w-full pointer-events-auto">
        <div class="text-xs text-text-dark flex items-center gap-2 w-full max-w-3xl justify-center">
          <span class=${`w-2 h-2 rounded-full transition-colors duration-500 flex-shrink-0 ${
            this.aiStatus.startsWith('thinking') || this.aiStatus.startsWith('navigating') ? 'bg-warning animate-pulse-active' :
            this.aiStatus === 'error' ? 'bg-error' :
            'bg-accent animate-pulse-idle'
          }`}></span>
          <span>${this.statusMessage}</span>
          ${this.error ? html`<span class="text-error font-normal">${this.error}</span>` : ''}
          <div class="h-full w-px bg-border mx-2"></div>
          <span class=${`w-2 h-2 rounded-full transition-colors duration-500 flex-shrink-0 ${
            this.liveStreamStatus === 'connected' ? 'bg-success animate-pulse-live' :
            this.liveStreamStatus === 'connecting' ? 'bg-warning animate-pulse-active' :
            this.liveStreamStatus === 'error' ? 'bg-error' : 'bg-text-dark'
          }`}></span>
          <span class="whitespace-nowrap">${this.liveStreamStatus.charAt(0).toUpperCase() + this.liveStreamStatus.slice(1)}</span>
        </div>
        <form id="command-bar" class="w-full max-w-3xl bg-panel-bg border border-border backdrop-blur-lg flex shadow-2xl dark:shadow-black/50" @submit=${inGalaxyView ? this._handlePlanetCommandSubmit : this._handleGalaxyCommandSubmit}>
          <div class="flex-grow relative">
            <input type="text" placeholder=${this.isListening ? 'Listening...' : placeholder} .value=${this.userPrompt} @input=${(e: Event) => (this.userPrompt = (e.target as HTMLInputElement).value)} ?disabled=${isBusy} class="w-full bg-transparent border-none text-text text-lg p-4 font-light focus:outline-none"/>
            ${this.aiSuggestion ? html`<div class="absolute bottom-full left-4 mb-1 bg-panel-bg border border-border px-4 py-2 text-sm rounded-full cursor-pointer transition-all duration-300 animate-fade-in whitespace-nowrap hover:bg-glow hover:text-bg" @click=${this._handleSuggestionClick}><b class="font-normal text-accent/80">Creative Spark:</b> ${this.aiSuggestion}</div>` : nothing}
          </div>
          <button type="button" class="cluster-button font-sans bg-none border-l border-border text-yellow-400 px-6 py-4 text-base font-bold tracking-widest cursor-pointer whitespace-nowrap transition-colors hover:enabled:bg-yellow-400 hover:enabled:text-bg disabled:opacity-40 disabled:cursor-not-allowed ${isBusy ? 'thinking-button' : ''}" @click=${inGalaxyView ? this._handlePlanetClusterCommandSubmit : this._handleGalaxyClusterCommandSubmit} ?disabled=${isBusy || !this.userPrompt.trim()}>${isBusy ? '' : 'CLUSTER'}</button>
          <button type="button" class="font-sans bg-none border-l border-border text-text-dark p-4 w-16 transition-colors hover:enabled:text-accent disabled:opacity-40 disabled:cursor-not-allowed" @click=${this._handleVoiceCommandClick} ?disabled=${isBusy || !this.isSpeechSupported} title=${this.isListening ? 'Stop listening' : 'Use voice command'}><svg class=${`w-6 h-6 transition-all duration-300 ${this.isListening ? 'text-accent animate-pulse-voice' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg></button>
          <button type="submit" class="font-sans bg-none border-l border-border text-accent px-6 py-4 text-base font-bold tracking-widest cursor-pointer whitespace-nowrap transition-colors hover:enabled:bg-accent hover:enabled:text-bg disabled:opacity-40 disabled:cursor-not-allowed ${isBusy ? 'thinking-button' : ''}" ?disabled=${isBusy || !this.userPrompt.trim()}>${isBusy ? '' : (inGalaxyView ? 'SYNTHESIZE' : 'GALAXY')}</button>
        </form>
      </footer>
    `;
  }

  // This component does not have styles in a static property.
  createRenderRoot() {
    return this;
  }
}