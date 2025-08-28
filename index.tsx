
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GoogleGenAI, Type } from '@google/genai';
import { vs as oltarisVS, fs as oltarisFS } from './oltaris-shader.tsx';
import { vs as galaxyPointVS, fs as galaxyPointFS } from './galaxy-point-shaders.tsx';
import { vs as starfieldVS, fs as starfieldFS } from './starfield-shaders.tsx';
import { vs as probeVS, fs as probeFS } from './probe-shader.tsx';
import { vs as phantomVS, fs as phantomFS } from './phantom-glow-shader.tsx';
import { vs as shieldingVS, fs as shieldingFS } from './shielding-shader.tsx';
import { Analyser } from './analyser.ts';
import React, { useState, useEffect } from 'react';
// FIX: Updated to use 'react-dom/client' for React 18 compatibility.
import ReactDOM from 'react-dom/client';

// --- Default Cosmic Web Configuration ---
const initialCosmicWebConfig = {
    name: "The First Web",
    description: "An ancient, vast structure of glowing filaments separated by deep voids, representing the large-scale distribution of matter in the universe.",
    numStars: 100000, // Reduced from 150k to prevent potential memory issues on lower-end devices
    radius: 1000, // This is now the half-size of the generation cube
    starColors: ['#6c70ff', '#a7c5ff', '#ffee88'],
};

// --- Scene Globals ---
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, composer: EffectComposer, clock: THREE.Clock;
let controls: OrbitControls;
let galaxy: THREE.Points | null = null;
let oltarisPhantom: THREE.Group | null = null;
let starVelocities: THREE.Vector3[], starPositions: Float32Array;
let starfield: THREE.Points;
let afterimagePass: AfterimagePass, bloomPass: UnrealBloomPass, smaaPass: SMAAPass, sharpenPass: ShaderPass;
let raycaster: THREE.Raycaster, mouse: THREE.Vector2;
let lastPosition: THREE.Vector3;
let isAutoFocusing = false;
let autoFocusTarget = new THREE.Vector3();
let autoFocusCameraTarget = new THREE.Vector3();
let currentGalaxyConfig = { ...initialCosmicWebConfig };

// --- Phantom Globals ---
let phantomModel: THREE.Group | null = null;
let isPhantomVisible = false;
let phantomAnimation: { state: 'fading-in' | 'fading-out', progress: number } | null = null;
let phantomScanAnimation: { active: boolean, progress: number, duration: number, onComplete?: (report: any) => void, reportData?: any } | null = null;
let isSimulatingMission = false;
const PHANTOM_FADE_DURATION = 0.5; // seconds
const PHANTOM_SCAN_DURATION = 2.0; // seconds

// --- Shielding Globals ---
let shieldingSpheres: THREE.Group | null = null;
let shieldingAnimation: { state: 'fading-in' | 'fading-out', progress: number } | null = null;
const SHIELDING_FADE_DURATION = 1.0; // seconds


// --- Probe Globals ---
let probe: THREE.Mesh | null = null;
let probeTarget: THREE.Vector3 | null = null;
let probeAnimation: {
    state: 'fading-in' | 'traveling' | 'fading-out';
    progress: number;
    duration: number; // total duration of travel
    startTime: number;
    startPosition: THREE.Vector3;
} | null = null;


// --- Transition Globals ---
let isTransitioning = false;
let transitionState = {
    fadingOut: false,
    fadingIn: false,
    oldGalaxy: null as THREE.Points | null,
    progress: 0,
    duration: 2.0 // seconds for each fade
};

// --- AI & UI Globals ---
let ai;
let aiState = 'idle'; // 'idle', 'thinking', 'speaking'
let typewriterInterval: ReturnType<typeof setInterval>;
let telemetryMessages = [
    'SYSTEM: Cosmic Web simulation online.',
    'NETWORK: All probes nominal.',
    'DATA LINK: Stable connection to Deep Space Network.',
    'TRACKING: Large Quasar Group (LQG)',
    'SYSTEM: Calibrating filament density sensors.',
];
let telemetryIndex = 0;

// --- Audio & TTS Globals ---
let audioAnalyser: Analyser;
let speechSettings = {
    voice: null as SpeechSynthesisVoice | null,
    pitch: 1.0,
    rate: 1.0
};
let availableVoices: SpeechSynthesisVoice[] = [];

// --- Local Storage ---
const LOCAL_STORAGE_KEY = 'aurelion-saved-cosmos';


// --- DOM Elements ---
const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const responseContainer = document.getElementById('response-container');
const responseText = document.getElementById('response-text');
const closeResponseBtn = document.getElementById('close-response-btn');
const telemetryTicker = document.getElementById('telemetry-ticker');
const ccsMode = document.getElementById('ccs-mode');
const ccsPos = document.getElementById('ccs-pos');
const ccsVel = document.getElementById('ccs-vel');
const ccsTarget = document.getElementById('ccs-target');
const autoFocusBtn = document.getElementById('auto-focus-btn');
const ttsSettingsBtn = document.getElementById('tts-settings-btn');
const ttsSettingsPanel = document.getElementById('tts-settings-panel');
const closeTtsSettingsBtn = document.getElementById('close-tts-settings-btn');
const voiceSelect = document.getElementById('voice-select') as HTMLSelectElement;
const pitchSlider = document.getElementById('pitch-slider') as HTMLInputElement;
const rateSlider = document.getElementById('rate-slider') as HTMLInputElement;
const pitchValue = document.getElementById('pitch-value');
const rateValue = document.getElementById('rate-value');
const summonProbeBtn = document.getElementById('summon-probe-btn') as HTMLButtonElement;
const togglePhantomBtn = document.getElementById('toggle-phantom-btn') as HTMLButtonElement;

// Mission Modal
const missionModal = document.getElementById('mission-modal');
const closeMissionModalBtn = document.getElementById('close-mission-modal-btn');
const runMissionNominalBtn = document.getElementById('run-mission-nominal');
const runMissionWorstDayBtn = document.getElementById('run-mission-worst-day');
const runMissionWorstWeekBtn = document.getElementById('run-mission-worst-week');
const runMissionPeakFluxBtn = document.getElementById('run-mission-peak-flux');

// Save Modal
const saveCosmosBtn = document.getElementById('save-cosmos-btn') as HTMLButtonElement;
const savedCosmosContainer = document.getElementById('saved-cosmos-container');
const saveModal = document.getElementById('save-modal');
const saveForm = document.getElementById('save-form');
const saveNameInput = document.getElementById('save-name-input') as HTMLInputElement;
const cancelSaveBtn = document.getElementById('cancel-save-btn');


// Environment Generation Buttons
let generationButtons: HTMLButtonElement[] = [];
let generateCosmosStandardBtn: HTMLButtonElement, generateCosmosSpeBtn: HTMLButtonElement, generateCosmosLunarBtn: HTMLButtonElement, generateCosmosMartianBtn: HTMLButtonElement;


/**
 * Main initialization function
 */
function init() {
    // --- Basic Setup ---
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 150, initialCosmicWebConfig.radius * 1.5);
    lastPosition = camera.position.clone();
    
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg'),
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // --- Controls (Initialized before they are accessed) ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI;
    controls.addEventListener('start', () => { isAutoFocusing = false; });

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x607090, 0.25);
    scene.add(ambientLight);

    // --- Create Celestial Objects ---
    createStarfield();
    oltarisPhantom = createOltarisPhantom();
    scene.add(oltarisPhantom);
    recreateSceneWithConfig(initialCosmicWebConfig);
    phantomModel = createPhantom();
    shieldingSpheres = createShieldingSpheres();
    if (phantomModel && shieldingSpheres) {
        phantomModel.add(shieldingSpheres);
    }
    scene.add(phantomModel);
    
    // --- Post-processing ---
    const renderPass = new RenderPass(scene, camera);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.08, 0.8);
    afterimagePass = new AfterimagePass(0.98); // Start with a high damp value (less blur)
    
    const SharpenShader = {
        uniforms: {
            "tDiffuse": { value: null },
            "resolution": { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }`,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform vec2 resolution;
            varying vec2 vUv;
            void main() {
                vec2 texelSize = 1.0 / resolution;
                vec4 c = texture2D(tDiffuse, vUv);
                vec4 laplacian = texture2D(tDiffuse, vUv + vec2(0.0, 1.0) * texelSize) +
                                 texture2D(tDiffuse, vUv - vec2(0.0, 1.0) * texelSize) +
                                 texture2D(tDiffuse, vUv + vec2(1.0, 0.0) * texelSize) +
                                 texture2D(tDiffuse, vUv - vec2(1.0, 0.0) * texelSize) - 4.0 * c;
                gl_FragColor = c - laplacian * 0.5;
            }`
    };
    sharpenPass = new ShaderPass(SharpenShader);
    
    smaaPass = new SMAAPass( window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio() );

    composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(afterimagePass);
    composer.addPass(sharpenPass);
    composer.addPass(smaaPass);

    // --- Raycasting for Click-to-Focus ---
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 5;
    mouse = new THREE.Vector2();

    // --- AI Setup ---
    if (typeof process !== 'undefined' && process.env.API_KEY) {
        try {
            ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (error) {
            console.error("Gemini AI SDK initialization failed.", error);
            showSystemMessage("Could not connect to the cosmic consciousness. Please check your connection.");
        }
    } else {
        console.error("API_KEY environment variable not set. Gemini AI functionality will be disabled.");
        showSystemMessage("Connection to cosmic consciousness failed: Missing credentials.");
        if (promptInput && promptForm) {
           (promptInput as HTMLInputElement).disabled = true;
           (promptInput as HTMLInputElement).placeholder = "AI offline: Missing API Key";
           (document.getElementById('prompt-btn') as HTMLButtonElement).disabled = true;
        }
        if (summonProbeBtn) summonProbeBtn.disabled = true;
    }
    
    // --- Event Listeners ---
    generateCosmosStandardBtn = document.getElementById('generate-cosmos-standard-btn') as HTMLButtonElement;
    generateCosmosSpeBtn = document.getElementById('generate-cosmos-spe-btn') as HTMLButtonElement;
    generateCosmosLunarBtn = document.getElementById('generate-cosmos-lunar-btn') as HTMLButtonElement;
    generateCosmosMartianBtn = document.getElementById('generate-cosmos-martian-btn') as HTMLButtonElement;
    generationButtons = [generateCosmosStandardBtn, generateCosmosSpeBtn, generateCosmosLunarBtn, generateCosmosMartianBtn];
    
    // Disable generation buttons if AI is offline
    if (!ai) {
        generationButtons.forEach(btn => { if(btn) btn.disabled = true; });
    }

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onMouseClick, false);
    promptForm?.addEventListener('submit', handlePrompt);
    closeResponseBtn?.addEventListener('click', hideResponse);
    autoFocusBtn?.addEventListener('click', startAutoFocus);
    summonProbeBtn?.addEventListener('click', summonProbe);
    togglePhantomBtn?.addEventListener('click', togglePhantom);
    saveCosmosBtn?.addEventListener('click', showSaveModal);
    cancelSaveBtn?.addEventListener('click', hideSaveModal);
    saveForm?.addEventListener('submit', handleSaveCosmos);
    
    generateCosmosStandardBtn?.addEventListener('click', (e) => generateNewCosmos('standard', e.currentTarget as HTMLButtonElement));
    generateCosmosSpeBtn?.addEventListener('click', (e) => generateNewCosmos('spe', e.currentTarget as HTMLButtonElement));
    generateCosmosLunarBtn?.addEventListener('click', (e) => generateNewCosmos('lunar', e.currentTarget as HTMLButtonElement));
    generateCosmosMartianBtn?.addEventListener('click', (e) => generateNewCosmos('martian', e.currentTarget as HTMLButtonElement));

    // Mission Modal Listeners
    closeMissionModalBtn?.addEventListener('click', () => missionModal?.classList.add('hidden'));
    runMissionNominalBtn?.addEventListener('click', () => runMissionSimulation('Nominal Transit'));
    runMissionWorstDayBtn?.addEventListener('click', () => runMissionSimulation('Worst-Day SEP Hazard'));
    runMissionWorstWeekBtn?.addEventListener('click', () => runMissionSimulation('Worst-Week SEP Hazard'));
    runMissionPeakFluxBtn?.addEventListener('click', () => runMissionSimulation('Peak Flux SEP Hazard'));


    // --- Audio & TTS Setup ---
    setupAudio();
    setupTTS();

    // --- Telemetry ---
    updateTelemetry(initialCosmicWebConfig.name);
    setInterval(() => updateTelemetry(), 5000);
    
    // --- Load Saved Content ---
    loadAndDisplaySavedCosmos();
}

/**
 * Recreates the dynamic parts of the scene (galaxy) based on a new configuration.
 */
function recreateSceneWithConfig(config: any, isTransition: boolean = false) {
    // FIX: Cap the number of stars to prevent "Array buffer allocation failed" error.
    config.numStars = Math.min(config.numStars || initialCosmicWebConfig.numStars, 250000);
    currentGalaxyConfig = { ...config };

    // --- Cleanup existing objects if not in a transition ---
    if (!isTransition) {
        if (galaxy) {
            scene.remove(galaxy);
            galaxy.geometry.dispose();
            (galaxy.material as THREE.Material).dispose();
        }
    }

    // --- Create new objects with the provided config ---
    createCosmicWeb(config, isTransition);
    
    // Update controls with new radius
    if (controls) {
        controls.maxDistance = config.radius * 2;
    }
}


/**
 * Sets up the microphone and audio analyser for audio-reactivity
 */
async function setupAudio() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            audioAnalyser = new Analyser(source);
            console.log("Audio analyser initialized.");
        } catch (err) {
            console.error("Error accessing microphone:", err);
            showSystemMessage("Microphone access denied. Audio reactivity disabled.");
        }
    } else {
        console.error("getUserMedia not supported on this browser.");
        showSystemMessage("Audio input not supported. Audio reactivity disabled.");
    }
}


/**
 * Populates the voice dropdown and sets initial TTS settings.
 */
function populateVoiceList() {
    if (!voiceSelect) return;
    availableVoices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';

    availableVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-lang', voice.lang);
        option.setAttribute('data-name', voice.name);
        option.value = index.toString();
        voiceSelect.appendChild(option);
    });

    const maleVoice = availableVoices.find(voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('male'));
    const defaultVoice = maleVoice || availableVoices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Google')) || availableVoices[0];
    
    if (defaultVoice) {
        speechSettings.voice = defaultVoice;
        const defaultIndex = availableVoices.indexOf(defaultVoice);
        if (voiceSelect.options[defaultIndex]) {
            voiceSelect.selectedIndex = defaultIndex;
        }
    }
}

/**
 * Sets up Text-to-Speech functionality and UI controls.
 */
function setupTTS() {
    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    ttsSettingsBtn?.addEventListener('click', () => {
        ttsSettingsPanel?.classList.toggle('hidden');
    });

    closeTtsSettingsBtn?.addEventListener('click', () => {
        ttsSettingsPanel?.classList.add('hidden');
    });

    voiceSelect?.addEventListener('change', () => {
        speechSettings.voice = availableVoices[parseInt(voiceSelect.value)];
    });

    pitchSlider?.addEventListener('input', () => {
        speechSettings.pitch = parseFloat(pitchSlider.value);
        if (pitchValue) pitchValue.textContent = speechSettings.pitch.toFixed(1);
    });

    rateSlider?.addEventListener('input', () => {
        speechSettings.rate = parseFloat(rateSlider.value);
        if (rateValue) rateValue.textContent = speechSettings.rate.toFixed(1);
    });
}

/**
 * Creates the cosmic web structure.
 */
function createCosmicWeb(config: { numStars: number, radius: number, starColors: string[] }, isTransition = false) {
    const { numStars, radius, starColors } = config;
    const geometry = new THREE.BufferGeometry();
    starPositions = new Float32Array(numStars * 3);
    const colors = new Float32Array(numStars * 3);
    const velocityMagnitudes = new Float32Array(numStars);
    const starIDs = new Float32Array(numStars);
    starVelocities = new Array(numStars).fill(null).map(() => new THREE.Vector3());

    const parsedStarColors = starColors.map(c => new THREE.Color(c));
    const halfRadius = radius;

    for (let i = 0; i < numStars; i++) {
        const i3 = i * 3;
        
        // Distribute stars randomly within a cube
        starPositions[i3] = (Math.random() - 0.5) * halfRadius * 2;
        starPositions[i3 + 1] = (Math.random() - 0.5) * halfRadius * 2;
        starPositions[i3 + 2] = (Math.random() - 0.5) * halfRadius * 2;

        const color = parsedStarColors[Math.floor(Math.random() * parsedStarColors.length)];
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        starIDs[i] = i;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aVelocityMagnitude', new THREE.BufferAttribute(velocityMagnitudes, 1));
    geometry.setAttribute('aStarId', new THREE.BufferAttribute(starIDs, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            size: { value: 1.5 },
            uAudioLevel: { value: 0.0 },
            uOverallAudio: { value: 0.0 },
            time: { value: 0.0 },
            uFade: { value: isTransition ? 0.0 : 1.0 },
            uCameraFarPlane: { value: camera.far },
            uHeartbeat: { value: new THREE.Vector2(0.0, 150.0) }, // x: radius, y: thickness
        },
        vertexShader: galaxyPointVS,
        fragmentShader: galaxyPointFS,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
    });

    galaxy = new THREE.Points(geometry, material);
    scene.add(galaxy);
}

/**
 * Creates the central, majestic OLTARIS phantom.
 */
function createOltarisPhantom() {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            aiState: { value: 0.0 }, // 0: idle, 1: thinking, 2: speaking
            audioLevel: { value: 0.0 }, // Bass
            uAudioMids: { value: 0.0 }, // Mids
            uFade: { value: 1.0 },
        },
        vertexShader: oltarisVS,
        fragmentShader: oltarisFS,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const head = new THREE.SphereGeometry(12, 32, 32);
    head.translate(0, 45, 0);

    const torso = new THREE.CapsuleGeometry(10, 35, 4, 16);
    torso.translate(0, 20, 0);
    
    const phantom = new THREE.Group();
    phantom.add(new THREE.Mesh(head, material));
    phantom.add(new THREE.Mesh(torso, material));
    
    const createLimb = (isArm: boolean) => {
        const limb = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(isArm ? 4 : 5, 20, 4, 8), material);
        const lower = new THREE.Mesh(new THREE.CapsuleGeometry(isArm ? 3 : 4, 20, 4, 8), material);
        
        upper.position.y = 10;
        lower.position.y = -10;
        
        limb.add(upper, lower);
        return limb;
    };

    const leftArm = createLimb(true);
    leftArm.position.set(-20, 28, 0);
    leftArm.rotation.z = 0.4;
    
    const rightArm = createLimb(true);
    rightArm.position.set(20, 28, 0);
    rightArm.rotation.z = -0.4;

    const leftLeg = createLimb(false);
    leftLeg.position.set(-8, -15, 0);

    const rightLeg = createLimb(false);
    rightLeg.position.set(8, -15, 0);
    
    phantom.add(leftArm, rightArm, leftLeg, rightLeg);
    
    return phantom;
}


/**
 * Creates a deep space starfield for background parallax effect.
 */
function createStarfield() {
    const NUM_BG_STARS = 20000;
    const BG_RADIUS = initialCosmicWebConfig.radius * 2.5;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(NUM_BG_STARS * 3);
    const starIDs = new Float32Array(NUM_BG_STARS);

    for (let i = 0; i < NUM_BG_STARS; i++) {
        const i3 = i * 3;
        
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = BG_RADIUS + Math.random() * BG_RADIUS;

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        starIDs[i] = i;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aStarId', new THREE.BufferAttribute(starIDs, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 },
            uAudioHighs: { value: 0.0 },
            uAudioMids: { value: 0.0 },
            uMaxStarfieldRadius: { value: BG_RADIUS * 2.0 }
        },
        vertexShader: starfieldVS,
        fragmentShader: starfieldFS,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
    });

    starfield = new THREE.Points(geometry, material);
    scene.add(starfield);
}

/**
 * Creates a stylized human phantom model for interaction.
 */
function createPhantom() {
    const phantom = new THREE.Group();

    // --- Create a single, powerful shader for all phantom parts ---
    const phantomMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 },
            uGlowColor: { value: new THREE.Color(0x00ffff) },
            uOpacity: { value: 0.0 },
            uIsGlow: { value: 0.0 }, // Default to core mesh
            
            // Feature Uniforms
            aiState: { value: 0.0 },
            uAudioBass: { value: 0.0 },
            uAudioMids: { value: 0.0 },
            uAudioHighs: { value: 0.0 },
            uHeartbeat: { value: new THREE.Vector2(0.0, 150.0) },

            // Mission Uniforms
            uScanActive: { value: 0.0 },
            uScanLinePosition: { value: 0.0 },
            uScanLineWidth: { value: 2.0 },
            uFlickerIntensity: { value: 0.0 },
        },
        vertexShader: phantomVS,
        fragmentShader: phantomFS,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    // Create the core phantom structure
    const head = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), phantomMaterial);
    head.position.y = 35;
    head.name = "Head";

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(6, 4, 25, 8), phantomMaterial);
    torso.position.y = 20;
    torso.name = "Torso";
    
    const hips = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 6, 8), phantomMaterial);
    hips.position.y = 7;
    hips.name = "Hips";

    const createLimb = (isArm: boolean, partName: string) => {
        const limb = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(isArm ? 1.5 : 2, isArm ? 1.2 : 1.8, 15, 6), phantomMaterial);
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(isArm ? 1.2 : 1.8, isArm ? 1 : 1.5, 14, 6), phantomMaterial);
        const joint = new THREE.Mesh(new THREE.SphereGeometry(isArm ? 1.8 : 2.2, 6, 6), phantomMaterial);
        
        upper.position.y = 7.5;
        lower.position.y = -7.5;
        
        limb.name = partName;
        upper.name = partName;
        lower.name = partName;
        joint.name = partName;

        limb.add(upper, lower, joint);
        return limb;
    };
    
    const leftArm = createLimb(true, "Left Arm");
    leftArm.position.set(-10, 28, 0);
    
    const rightArm = createLimb(true, "Right Arm");
    rightArm.position.set(10, 28, 0);

    const leftLeg = createLimb(false, "Left Leg");
    leftLeg.position.set(-4, -8, 0);

    const rightLeg = createLimb(false, "Right Leg");
    rightLeg.position.set(4, -8, 0);

    phantom.add(head, torso, hips, leftArm, rightArm, leftLeg, rightLeg);
    
    // Traverse the phantom and add a glow shell to each mesh part
    const coreMeshes: THREE.Mesh[] = [];
    phantom.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            coreMeshes.push(child);
        }
    });

    coreMeshes.forEach(coreMesh => {
        const glowMaterial = phantomMaterial.clone();
        glowMaterial.uniforms.uIsGlow.value = 1.0;
        
        const glowMesh = new THREE.Mesh(coreMesh.geometry, glowMaterial);
        glowMesh.scale.setScalar(1.2); 
        glowMesh.name = `${coreMesh.name}_glow`;
        coreMesh.add(glowMesh); 
    });

    phantom.scale.setScalar(0.75);
    phantom.visible = false;
    return phantom;
}

/**
 * Creates the visual representation of the shielding layers.
 */
function createShieldingSpheres(): THREE.Group {
    const group = new THREE.Group();
    group.name = "ShieldingLayers";

    const layers = [
        { name: 'Aluminum', color: new THREE.Color(0xaaaaaa), radius: 45 },
        { name: 'Polyethylene', color: new THREE.Color(0xeeeeee), radius: 40 },
        { name: 'Tissue', color: new THREE.Color(0xff8080), radius: 35 },
    ];

    layers.forEach(layer => {
        const geometry = new THREE.SphereGeometry(layer.radius, 48, 48);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                uColor: { value: layer.color },
                uOpacity: { value: 0.0 },
            },
            vertexShader: shieldingVS,
            fragmentShader: shieldingFS,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.FrontSide,
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.name = layer.name;
        group.add(sphere);
    });

    group.visible = false;
    return group;
}


/**
 * Toggles phantom visibility with a confirmation and fade animation.
 */
function togglePhantom() {
    if (phantomAnimation) return; // Prevent re-toggling during animation

    if (!isPhantomVisible) {
        showConfirmationModal(
            'Activate Human Phantom for interaction? This enables contextual analysis of the cosmos through the human form.',
            'Activate',
            () => {
                isPhantomVisible = true;
                phantomAnimation = {
                    state: 'fading-in',
                    progress: 0,
                };
                if (phantomModel) {
                    phantomModel.visible = true;
                }
                togglePhantomBtn?.classList.add('active');
            }
        );
    } else {
        isPhantomVisible = false;
        phantomAnimation = {
            state: 'fading-out',
            progress: 0,
        };
        togglePhantomBtn?.classList.remove('active');
    }
}


/**
 * Updates star positions based on gravity
 */
function updatePhysics(delta) {
    if (!galaxy) return;
    const positions = galaxy.geometry.attributes.position.array as Float32Array;
    const velocities = galaxy.geometry.attributes.aVelocityMagnitude.array as Float32Array;
    const starCount = positions.length / 3;
    let maxVelocitySq = 0;
    const GRAVITATIONAL_CONSTANT = 0.5;

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const pos = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
        
        const distanceSq = pos.lengthSq();
        if (distanceSq < 10) continue;
        
        const forceDirection = pos.clone().multiplyScalar(-1).normalize();
        const forceMagnitude = GRAVITATIONAL_CONSTANT / distanceSq;
        
        starVelocities[i].add(forceDirection.multiplyScalar(forceMagnitude * delta));
        pos.add(starVelocities[i].clone().multiplyScalar(delta));

        positions[i3] = pos.x;
        positions[i3 + 1] = pos.y;
        positions[i3 + 2] = pos.z;
        
        const velSq = starVelocities[i].lengthSq();
        velocities[i] = velSq;
        if (velSq > maxVelocitySq) maxVelocitySq = velSq;
    }

    if (maxVelocitySq > 0) {
        for (let i = 0; i < starCount; i++) {
            velocities[i] = Math.sqrt(velocities[i]) / Math.sqrt(maxVelocitySq);
        }
    }

    galaxy.geometry.attributes.position.needsUpdate = true;
    galaxy.geometry.attributes.aVelocityMagnitude.needsUpdate = true;
}

/**
 * The main animation loop
 */
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (isTransitioning) {
        transitionState.progress += delta / transitionState.duration;

        if (transitionState.fadingOut) {
            const fade = Math.max(0, 1.0 - transitionState.progress);
            if (transitionState.oldGalaxy) (transitionState.oldGalaxy.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;

            if (fade <= 0) {
                // Cleanup old objects
                if (transitionState.oldGalaxy) {
                    scene.remove(transitionState.oldGalaxy);
                    transitionState.oldGalaxy.geometry.dispose();
                    (transitionState.oldGalaxy.material as THREE.Material).dispose();
                }
                
                transitionState.fadingOut = false;
                transitionState.fadingIn = true;
                transitionState.progress = 0;
            }
        } else if (transitionState.fadingIn) {
            const fade = Math.min(1.0, transitionState.progress);
             if (galaxy) (galaxy.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;

            if (fade >= 1.0) {
                isTransitioning = false;
                setLoadingState(false, null);
            }
        }
    }

    const velocity = camera.position.distanceTo(lastPosition) / (delta || 1);

    if (isAutoFocusing) {
        const focusSpeed = 2.0;
        const lerpAlpha = Math.min(focusSpeed * delta, 1.0);
        
        controls.target.lerp(autoFocusTarget, lerpAlpha);
        camera.position.lerp(autoFocusCameraTarget, lerpAlpha);

        if (camera.position.distanceTo(autoFocusCameraTarget) < 1 && controls.target.distanceTo(autoFocusTarget) < 1) {
            isAutoFocusing = false;
            controls.target.copy(autoFocusTarget);
        }
    }

    let normalizedOverall = 0.0, normalizedBass = 0.0, normalizedMids = 0.0, normalizedHighs = 0.0;
    if (audioAnalyser) {
        audioAnalyser.update();
        const data = audioAnalyser.data;
        const bufferLength = data.length;

        const bassBand = { start: 1, end: 10 };
        const midBand = { start: 11, end: 100 };
        const highBand = { start: 101, end: bufferLength - 1 };

        const getBandAverage = (band) => {
            const size = band.end - band.start + 1;
            if (size <= 0) return 0;
            let sum = 0;
            for (let i = band.start; i <= band.end; i++) sum += data[i];
            return sum / size;
        };

        const bassAvg = getBandAverage(bassBand);
        const midAvg = getBandAverage(midBand);
        const highAvg = getBandAverage(highBand);
        const overallAvg = data.reduce((sum, value) => sum + value, 0) / bufferLength;

        normalizedBass = Math.min(bassAvg / 140, 1.0);
        normalizedMids = Math.min(midAvg / 150, 1.0);
        normalizedHighs = Math.min(highAvg / 120, 1.0);
        normalizedOverall = Math.min(overallAvg / 140, 1.0);

        if (bloomPass) {
            const targetStrength = 0.9 + normalizedHighs * 0.5;
            bloomPass.strength = THREE.MathUtils.lerp(bloomPass.strength, targetStrength, delta * 6.0);
        }
        
        if (galaxy) {
            const material = galaxy.material as THREE.ShaderMaterial;
            material.uniforms.uAudioLevel.value = THREE.MathUtils.lerp(material.uniforms.uAudioLevel.value, normalizedMids, delta * 5.0);
            material.uniforms.uOverallAudio.value = THREE.MathUtils.lerp(material.uniforms.uOverallAudio.value, normalizedOverall, delta * 5.0);
            material.uniforms.time.value = elapsedTime;
        }
    }
    
    // --- Galactic Heartbeat ---
    const heartbeatCycleDuration = 12.0;
    const elapsedTimeInCycle = clock.getElapsedTime() % heartbeatCycleDuration;
    const waveTravelDistance = currentGalaxyConfig.radius * 2.5; 
    const waveRadius = (elapsedTimeInCycle / heartbeatCycleDuration) * waveTravelDistance;
    const waveThickness = 150.0; 

    const updateHeartbeat = (obj) => {
        if (obj) {
            const material = obj.material as THREE.ShaderMaterial;
            if (material.uniforms.uHeartbeat) {
                material.uniforms.uHeartbeat.value.set(waveRadius, waveThickness);
            }
        }
    };
    updateHeartbeat(galaxy);
    if (isTransitioning) updateHeartbeat(transitionState.oldGalaxy);

    if (oltarisPhantom) {
        oltarisPhantom.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                const material = child.material;
                material.uniforms.time.value = elapsedTime;
                const state = aiState === 'thinking' ? 1.0 : (aiState === 'speaking' ? 2.0 : 0.0);
                material.uniforms.aiState.value = THREE.MathUtils.lerp(material.uniforms.aiState.value, state, delta * 5.0);
                material.uniforms.audioLevel.value = THREE.MathUtils.lerp(material.uniforms.audioLevel.value, normalizedBass, delta * 5.0);
                material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(material.uniforms.uAudioMids.value, normalizedMids, delta * 5.0);
            }
        });
    }


    if (afterimagePass) {
        // Define ranges for velocity and the 'damp' factor for motion blur
        const minVelocity = 20.0;
        const maxVelocity = 400.0;
        const minDamp = 0.6; // More blur at high velocity
        const maxDamp = 0.98; // Less blur when stationary

        // Calculate a 0-1 factor based on current camera velocity
        const velocityFactor = THREE.MathUtils.smoothstep(velocity, minVelocity, maxVelocity);
        
        // Interpolate the damp factor: low velocity -> high damp (clear image), high velocity -> low damp (blurry image)
        let targetDamp = THREE.MathUtils.lerp(maxDamp, minDamp, velocityFactor);
        
        // Audio can make the scene slightly clearer, adding a reactive effect
        targetDamp -= normalizedOverall * 0.05;

        // Smoothly transition to the target damp value
        afterimagePass.uniforms.damp.value = THREE.MathUtils.lerp(
            afterimagePass.uniforms.damp.value,
            targetDamp,
            delta * 4.0
        );
    }
    
    if (probe && probeAnimation && probeTarget) {
        const material = probe.material as THREE.ShaderMaterial;
        material.uniforms.time.value = elapsedTime;
        material.uniforms.uAudioLevel.value = THREE.MathUtils.lerp(material.uniforms.uAudioLevel.value, normalizedOverall, delta * 5.0);
        
        // Audio-reactive rotation
        const baseRotationSpeed = 0.5; // radians per second
        const midFrequencyBoost = normalizedMids * 2.0;
        probe.rotation.y += (baseRotationSpeed + midFrequencyBoost) * delta;


        const FADE_DURATION = 2.0;

        if (probeAnimation.state === 'fading-in') {
            probeAnimation.progress += delta / FADE_DURATION;
            material.uniforms.uFade.value = Math.min(probeAnimation.progress, 1.0);
            if (probeAnimation.progress >= 1.0) {
                probeAnimation.state = 'traveling';
                probeAnimation.progress = 0;
                probeAnimation.startTime = elapsedTime; // Reset timer for travel
            }
        } else if (probeAnimation.state === 'traveling') {
            const journeyProgress = (elapsedTime - probeAnimation.startTime) / probeAnimation.duration;
            if (journeyProgress < 1.0) {
                probe.position.lerpVectors(probeAnimation.startPosition, probeTarget, journeyProgress);
            } else {
                probe.position.copy(probeTarget);
                probeAnimation.state = 'fading-out';
                probeAnimation.progress = 0;
                showSystemMessage(`PROBE: Mission complete. Telemetry received.`);
            }
        } else if (probeAnimation.state === 'fading-out') {
            probeAnimation.progress += delta / FADE_DURATION;
            material.uniforms.uFade.value = Math.max(0, 1.0 - probeAnimation.progress);
            if (probeAnimation.progress >= 1.0) {
                scene.remove(probe);
                probe.geometry.dispose();
                (probe.material as THREE.Material).dispose();
                probe = null;
                probeTarget = null;
                probeAnimation = null;
            }
        }
    }

    if (phantomAnimation && phantomModel) {
        phantomAnimation.progress += delta / PHANTOM_FADE_DURATION;
        const isDone = phantomAnimation.progress >= 1.0;
        let opacity = 0;

        if (phantomAnimation.state === 'fading-in') {
            opacity = isDone ? 1.0 : phantomAnimation.progress;
        } else { // fading-out
            opacity = isDone ? 0.0 : 1.0 - phantomAnimation.progress;
        }

        phantomModel.traverse((child) => {
            if (child instanceof THREE.Mesh && child.name !== 'ShieldingLayers') {
                const material = child.material as THREE.ShaderMaterial;
                if (material.isShaderMaterial && material.uniforms.uOpacity) {
                    material.uniforms.uOpacity.value = opacity;
                }
            }
        });

        if (isDone) {
            if (phantomAnimation.state === 'fading-out') {
                phantomModel.visible = false;
            }
            phantomAnimation = null; // End the animation
        }
    }

    // --- Phantom All-Features Animation ---
    if (isPhantomVisible && !phantomAnimation && phantomModel) {
        const state = aiState === 'thinking' ? 1.0 : (aiState === 'speaking' ? 2.0 : 0.0);
        
        phantomModel.traverse((child) => {
            if (child instanceof THREE.Mesh && child.name !== 'ShieldingLayers') {
                const material = child.material as THREE.ShaderMaterial;
                if (material.isShaderMaterial && material.uniforms) {
                    // The glow meshes have their own cloned materials, so we update them all
                    if (material.uniforms.time !== undefined) material.uniforms.time.value = elapsedTime;
                    if (material.uniforms.aiState !== undefined) material.uniforms.aiState.value = THREE.MathUtils.lerp(material.uniforms.aiState.value || 0, state, delta * 5.0);
                    if (material.uniforms.uAudioBass !== undefined) material.uniforms.uAudioBass.value = THREE.MathUtils.lerp(material.uniforms.uAudioBass.value || 0, normalizedBass, delta * 5.0);
                    if (material.uniforms.uAudioMids !== undefined) material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(material.uniforms.uAudioMids.value || 0, normalizedMids, delta * 5.0);
                    if (material.uniforms.uAudioHighs !== undefined) material.uniforms.uAudioHighs.value = THREE.MathUtils.lerp(material.uniforms.uAudioHighs.value || 0, normalizedHighs, delta * 5.0);
                    if (material.uniforms.uHeartbeat) {
                         material.uniforms.uHeartbeat.value.set(waveRadius, waveThickness);
                    }
                }
            }
        });
    }


    // --- Phantom Scan Animation ---
    if (phantomScanAnimation && phantomScanAnimation.active) {
        phantomScanAnimation.progress += delta / phantomScanAnimation.duration;
        const isScanDone = phantomScanAnimation.progress >= 1.0;
        
        // Phantom is approx from Y=-25 to Y=40. Total height ~65. Scaled by 0.75.
        const phantomHeight = 65 * 0.75;
        const phantomBottom = -25 * 0.75;
        const scanPosition = phantomBottom + (phantomHeight * phantomScanAnimation.progress);
    
        phantomModel?.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const material = child.material as THREE.ShaderMaterial;
                if (material.isShaderMaterial && material.uniforms.uScanActive) {
                    material.uniforms.uScanActive.value = isScanDone ? 0.0 : 1.0;
                    material.uniforms.uScanLinePosition.value = scanPosition;
                }
            }
        });
    
        if (isScanDone) {
            phantomScanAnimation.active = false;
            if (phantomScanAnimation.onComplete) {
                phantomScanAnimation.onComplete(phantomScanAnimation.reportData);
            }
            phantomScanAnimation = null;
        }
    }

    // --- Phantom Mission Simulation Flicker ---
    if (isSimulatingMission && phantomModel) {
        phantomModel.traverse((child) => {
             if (child instanceof THREE.Mesh) {
                const material = child.material as THREE.ShaderMaterial;
                if (material.isShaderMaterial && material.uniforms.uFlickerIntensity) {
                    const flickerIntensity = 0.5 + Math.sin(elapsedTime * 50) * 0.5; // Fast flicker
                    material.uniforms.uFlickerIntensity.value = flickerIntensity;
                }
            }
        });
    }

    // --- Shielding Animation ---
    if (shieldingAnimation && shieldingSpheres) {
        shieldingAnimation.progress += delta / SHIELDING_FADE_DURATION;
        const isDone = shieldingAnimation.progress >= 1.0;
        let opacity = 0;

        if (shieldingAnimation.state === 'fading-in') {
            opacity = isDone ? 1.0 : shieldingAnimation.progress;
        } else { // fading-out
            opacity = isDone ? 0.0 : 1.0 - shieldingAnimation.progress;
        }

        shieldingSpheres.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const material = child.material as THREE.ShaderMaterial;
                if (material.isShaderMaterial && material.uniforms.uOpacity) {
                    material.uniforms.uOpacity.value = opacity;
                }
            }
        });

        if (isDone) {
            if (shieldingAnimation.state === 'fading-out') {
                shieldingSpheres.visible = false;
            }
            shieldingAnimation = null; // End the animation
        }
    }


    if (controls) controls.update(delta);
    
    updatePhysics(delta);

    if (starfield) {
        starfield.position.copy(camera.position);
        const material = starfield.material as THREE.ShaderMaterial;
        material.uniforms.time.value = elapsedTime;
        material.uniforms.uAudioHighs.value = THREE.MathUtils.lerp(material.uniforms.uAudioHighs.value, normalizedHighs, delta * 5.0);
        material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(material.uniforms.uAudioMids.value, normalizedMids, delta * 5.0);
    }
    
    updateCCSPanel(delta);

    composer.render();
}


/**
 * Handles window resize events
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    if (sharpenPass) {
        sharpenPass.uniforms.resolution.value.set(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
    }
}

/**
 * Handles mouse clicks for raycasting to stars and the phantom.
 */
function onMouseClick(event: MouseEvent) {
    const reactRoot = document.getElementById('react-app-root');
    // Ignore clicks on UI elements
    if (responseContainer?.contains(event.target as Node) || 
        ttsSettingsPanel?.contains(event.target as Node) ||
        missionModal?.contains(event.target as Node) ||
        saveModal?.contains(event.target as Node) ||
        reactRoot?.contains(event.target as Node)) {
        return;
    }
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Priority 1: Check for phantom clicks
    if (isPhantomVisible && phantomModel && !phantomAnimation) {
        const phantomIntersects = raycaster.intersectObject(phantomModel, true);
        if (phantomIntersects.length > 0) {
            handlePhantomClick(phantomIntersects[0]);
            return;
        }
    }
    
    // Priority 2: Check for galaxy clicks
    if (galaxy) {
        const galaxyIntersects = raycaster.intersectObject(galaxy);
        if (galaxyIntersects.length > 0) {
            handleGalaxyClick(galaxyIntersects[0]);
            return;
        }
    }

    // If nothing was clicked, hide panels
    hideResponse();
    hideOltarisReport();
    missionModal?.classList.add('hidden');
    if (!ttsSettingsPanel?.classList.contains('hidden')) {
        ttsSettingsPanel?.classList.add('hidden');
    }
    hideSaveModal();
}

/**
 * Handles clicks on the phantom model.
 */
function handlePhantomClick(intersect: THREE.Intersection) {
    if (phantomScanAnimation?.active || isSimulatingMission) return; // Don't interact if busy
    missionModal?.classList.remove('hidden');
}


/**
 * Handles clicks on stars in the galaxy.
 */
function handleGalaxyClick(intersect: THREE.Intersection, context?: string) {
    if (intersect.index === undefined || !galaxy) return;
    
    isAutoFocusing = false;
    const index = intersect.index;

    const posAttr = galaxy.geometry.attributes.position;
    const targetPosition = new THREE.Vector3(posAttr.getX(index), posAttr.getY(index), posAttr.getZ(index));
    
    controls.target.copy(targetPosition);

    const colorAttr = galaxy.geometry.attributes.color;
    const starColor = new THREE.Color(colorAttr.getX(index), colorAttr.getY(index), colorAttr.getZ(index));
    const velocity = starVelocities[index].length();
    const distanceFromCenter = targetPosition.length();

    let colorDesc = 'a spectral white';
    if (starColor.b > 0.8 && starColor.r < 0.6) colorDesc = 'a brilliant blue-white';
    else if (starColor.r > 0.8 && starColor.g > 0.8) colorDesc = 'a glowing yellow';
    else if (starColor.r > 0.8) colorDesc = 'a deep orange';

    let velocityDesc = 'serene';
    if (velocity > 0.1) velocityDesc = 'swift';
    if (velocity > 0.3) velocityDesc = 'fierce';

    let regionDesc = 'the edge of a great void';
    if (distanceFromCenter < currentGalaxyConfig.radius * 0.8) regionDesc = 'a glowing filament';
    if (distanceFromCenter < currentGalaxyConfig.radius * 0.3) regionDesc = 'a dense cluster within the web';
    
    getStarDescription({ color: colorDesc, velocity: velocityDesc, region: regionDesc, context: context || '' }, targetPosition);
}

/**
 * Handles AI prompt submission
 */
async function handlePrompt(e) {
    e.preventDefault();
    if (!ai || aiState === 'thinking') return;
    
    const prompt = (promptInput as HTMLInputElement).value;
    if (!prompt) return;
    
    if (speechSynthesis.speaking) speechSynthesis.cancel();

    (promptInput as HTMLInputElement).value = '';
    aiState = 'thinking';
    
    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = 'You are OLTARIS, a majestic and ancient cosmic entity. Speak with a humble and wise male voice. Your tone is profound yet gentle, offering guidance and cosmic perspective. Keep your responses concise and poetic.';
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { systemInstruction }
        });

        showResponse(response.text);

    } catch (error) {
        console.error("Gemini API error:", error);
        showSystemMessage("A cosmic disturbance has interrupted our connection. Please try again.");
    }
}

/**
 * Fetches and displays a poetic description of a star from the AI.
 */
async function getStarDescription(starProperties: { color: string, velocity: string, region: string, context: string }, targetPosition: THREE.Vector3) {
    if (!ai || aiState === 'thinking') return;

    if (speechSynthesis.speaking) speechSynthesis.cancel();

    aiState = 'thinking';
    showSystemMessage('Receiving transmission...');
    
    const prompt = `A deep space probe is observing a single point of light within the cosmic web. Based on this telemetry, provide a poetic, cosmic observation. Keep it brief and mysterious, like a fragment of ancient lore.
    - Dominant Color Spectrum: ${starProperties.color}
    - Relative Velocity: ${starProperties.velocity}
    - Galactic Region: ${starProperties.region}
    - Query Context: ${starProperties.context}`;

    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = 'You are OLTARIS, a majestic and ancient cosmic entity. Speak with a humble and wise male voice. Your tone is profound yet gentle. Provide a poetic observation based on the telemetry data provided, subtly incorporating the user\'s query context if provided.';
        
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { systemInstruction }
        });

        showResponse(response.text);

    } catch (error) {
        console.error("Gemini API error during star query:", error);
        showSystemMessage("The star's song is lost in cosmic static. Please try another.");
    }
}

async function runMissionSimulation(missionType: string) {
    if (!ai || aiState === 'thinking' || isSimulatingMission) return;

    missionModal?.classList.add('hidden');
    isSimulatingMission = true;
    aiState = 'thinking';
    showSystemMessage(`Running mission simulation: ${missionType}...`);

    if (shieldingSpheres) {
        shieldingSpheres.visible = true;
        shieldingAnimation = { state: 'fading-in', progress: 0 };
    }

    try {
        // First, get the standard OLTARIS radiation assessment
        const assessmentReport = await fetchPhantomAssessmentFromAI('Full Body');

        // Then, run the mission simulation based on that environment
        const missionReport = await fetchMissionSimulationFromAI(missionType);

        // Combine the reports
        const finalReport = { ...assessmentReport, ...missionReport };

        // The simulation "runs" for a visual effect
        setTimeout(() => {
            isSimulatingMission = false;
             phantomModel?.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const material = child.material as THREE.ShaderMaterial;
                    if (material.isShaderMaterial && material.uniforms.uFlickerIntensity) {
                        material.uniforms.uFlickerIntensity.value = 0.0;
                    }
                }
            });

            // Start the visual scan animation, which will display the report on completion
            phantomScanAnimation = {
                active: true,
                progress: 0,
                duration: PHANTOM_SCAN_DURATION,
                reportData: finalReport,
                onComplete: (reportData) => {
                    displayAssessmentReport(reportData);
                    aiState = 'idle';
                },
            };

        }, 3000); // 3-second simulation time

    } catch (error) {
        console.error("Gemini API error during mission simulation:", error);
        showSystemMessage(`Mission simulation failed for ${missionType}. Catastrophic failure.`);
        isSimulatingMission = false;
        aiState = 'idle';
    }
}

/**
 * Calls Gemini to generate a simulated radiation assessment report.
 */
async function fetchPhantomAssessmentFromAI(bodyPartName: string) {
    const prompt = `You are the bio-telemetry computer for OLTARIS, a NASA tool for assessing radiation in space. A human phantom is being scanned within a cosmic web simulation. 
    Current Environment: A dense filament within the '${currentGalaxyConfig.name}' cosmic structure.
    Scan Target: Phantom's ${bodyPartName}.
    
    Generate a plausible, simulated radiation exposure assessment. The values should be scientifically-inspired but fictional. The summary should be concise and sound like an official, futuristic report. Respond with a JSON object following the specified schema.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            bodyPart: { type: Type.STRING, description: "The scanned body part." },
            environment: { type: Type.STRING, description: "Description of the cosmic environment." },
            dose: {
                type: Type.OBJECT,
                properties: {
                    value: { type: Type.NUMBER },
                    unit: { type: Type.STRING }
                },
                 required: ["value", "unit"]
            },
            doseEquivalent: {
                type: Type.OBJECT,
                properties: {
                    value: { type: Type.NUMBER },
                    unit: { type: Type.STRING }
                },
                 required: ["value", "unit"]
            },
            REID: {
                type: Type.OBJECT,
                properties: {
                    value: { type: Type.NUMBER },
                    unit: { type: Type.STRING, description: "Risk of Exposure-Induced Death, as a percentage." }
                },
                 required: ["value", "unit"]
            }
        },
        required: ["bodyPart", "environment", "dose", "doseEquivalent", "REID"]
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
        }
    });

    return JSON.parse(response.text);
}


/**
 * Calls Gemini to get a mission simulation result.
 */
async function fetchMissionSimulationFromAI(missionType: string) {
    const prompt = `You are a mission simulation computer. A human phantom is being subjected to a simulated space environment based on the '${currentGalaxyConfig.name}' cosmic web.
    The mission profile is: ${missionType}.
    Based on this hazard level, calculate a mission outcome. A "Peak Flux" event should be extremely dangerous, while a "Nominal" transit should be very safe.
    Provide a mission status ('Success', 'Partial Loss', 'Critical Failure'), a success rate (%), a loss rate (%), and a brief, technical mission log explaining the outcome.
    Respond with a JSON object following the schema.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            missionStatus: { type: Type.STRING },
            successRate: { type: Type.NUMBER },
            lossRate: { type: Type.NUMBER },
            missionLog: { type: Type.STRING }
        },
        required: ["missionStatus", "successRate", "lossRate", "missionLog"]
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
        }
    });

    return JSON.parse(response.text);
}


/**
 * Main function to trigger AI-powered galaxy generation with a smooth transition.
 */
async function generateNewCosmos(theme: string, clickedButton: HTMLButtonElement) {
    if (!ai || aiState === 'thinking' || isTransitioning) return;
    
    // Clean up existing probe if it exists
    if (probe) {
        scene.remove(probe);
        probe.geometry.dispose();
        (probe.material as THREE.Material).dispose();
        probe = null;
        probeTarget = null;
        probeAnimation = null;
    }

    setLoadingState(true, clickedButton);
    showSystemMessage("Dreaming of a new cosmos...");

    try {
        const newConfig = await fetchGalaxyConfigFromAI(theme);
        
        transitionState = {
            fadingOut: true,
            fadingIn: false,
            progress: 0,
            duration: 2.0,
            oldGalaxy: galaxy,
        };
        isTransitioning = true;
        
        recreateSceneWithConfig(newConfig, true); // Create new scene invisibly

        updateTelemetry(`SYSTEM: Genesis of ${newConfig.name} complete.`);
        showResponse(`Behold: ${newConfig.name}. ${newConfig.description}`);

    } catch(error) {
        console.error("Failed to generate new cosmos:", error);
        showSystemMessage("The cosmic creation failed. The void remains unchanged.");
        setLoadingState(false, null);
    }
}

/**
 * Dispatches an AI-guided probe to a random star in the galaxy.
 */
async function summonProbe() {
    if (!ai || aiState === 'thinking' || isTransitioning || probe || !galaxy) return;

    setLoadingState(true, summonProbeBtn);
    showSystemMessage("Dispatching AI probe...");

    try {
        const probeData = await fetchProbeDataFromAI();
        const responseMessage = `PROBE ${probeData.designation} DISPATCHED.\nTARGET: ${probeData.target}\nOBJECTIVE: ${probeData.objective}`;
        showResponse(responseMessage);

        const geometry = new THREE.ConeGeometry(1.5, 6, 8);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                uAudioLevel: { value: 0.0 },
                uFade: { value: 0.0 },
                uSunPosition: { value: new THREE.Vector3(0, 20, 0) }, // OLTARIS is the new light source at the center
                uSunColor: { value: new THREE.Color(0xaaccff) }, // Ethereal blue-white light
            },
            vertexShader: probeVS,
            fragmentShader: probeFS,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        probe = new THREE.Mesh(geometry, material);

        const numStars = galaxy.geometry.attributes.position.count;
        const randomIndex = Math.floor(Math.random() * numStars);
        const posAttr = galaxy.geometry.attributes.position;
        probeTarget = new THREE.Vector3(
            posAttr.getX(randomIndex),
            posAttr.getY(randomIndex),
            posAttr.getZ(randomIndex)
        );

        const startPosition = camera.position.clone().add(new THREE.Vector3(0, -10, -20).applyQuaternion(camera.quaternion));
        probe.position.copy(startPosition);
        probe.lookAt(probeTarget);
        
        scene.add(probe);

        probeAnimation = {
            state: 'fading-in',
            progress: 0,
            duration: 20, // 20 second travel time
            startTime: clock.getElapsedTime(),
            startPosition: startPosition.clone()
        };

    } catch (error) {
        console.error("Failed to summon probe:", error);
        showSystemMessage("Probe dispatch failed. Comms offline.");
    } finally {
        setLoadingState(false, null);
        aiState = 'idle';
    }
}

/**
 * Calls Gemini for a creative probe mission profile.
 */
async function fetchProbeDataFromAI() {
    const prompt = `You are the mission controller for an AI-guided deep space probe. Create a mission profile.
    - Probe Designation: A cool alphanumeric name (e.g., "Stelladrift-X9", "Void-Chaser 7").
    - Target Description: A poetic, mysterious description of the anomaly the probe is investigating (e.g., "a nascent star whispering in gravitational hymns," "the ghost of a supernova," "a region of folded spacetime").
    - Mission Objective: A short, cryptic objective (e.g., "Record the star's solar flares," "Analyze temporal distortions," "Listen for echoes of the Big Bang.").
    Provide a JSON object with keys: "designation", "target", "objective".`;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            designation: { type: Type.STRING },
            target: { type: Type.STRING },
            objective: { type: Type.STRING }
        },
        required: ['designation', 'target', 'objective']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
        }
    });
    return JSON.parse(response.text);
}


/**
 * Calls the Gemini API to get a new galaxy configuration based on a theme.
 */
async function fetchGalaxyConfigFromAI(theme: string) {
    let prompt = `Design a unique cosmic web structure. Provide its name, a short poetic description, and visual parameters for the star/galaxy colors. Colors must be hex strings like "#RRGGBB". Follow the provided JSON schema precisely.`;
    
    switch (theme) {
        case 'spe':
            prompt = `Design a cosmic web representing a solar particle event (SPE). It should feel chaotic and dangerously energetic. The name should reflect this. Use a palette of fiery, energetic colors like intense reds, oranges, and bright whites. Follow the provided JSON schema.`;
            break;
        case 'lunar':
            prompt = `Design a cosmic web as if viewed from deep space near a moon. It should be sparse, vast, and silent. The name should evoke a sense of lunar desolation or serenity. Use a palette of cool, pale colors like silvery whites, soft blues, and deep greys. Follow the provided JSON schema.`;
            break;
        case 'martian':
            prompt = `Design a cosmic web with a Martian theme. It should feel ancient, dusty, and tinged with red. The name should be inspired by Mars. Use a palette of terracotta reds, dusty oranges, pale yellows, and dark, iron-rich browns. Follow the provided JSON schema.`;
            break;
    }

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            numStars: { type: Type.INTEGER },
            radius: { type: Type.INTEGER },
            starColors: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            },
        },
        required: ['name', 'description', 'numStars', 'radius', 'starColors']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
        }
    });

    const config = JSON.parse(response.text);
    // FIX: Cap the number of stars from AI to prevent "Array buffer allocation failed" error.
    config.numStars = Math.min(config.numStars || initialCosmicWebConfig.numStars, 250000);
    return config;
}

/**
 * Shows the modal for saving the current cosmos configuration.
 */
function showSaveModal() {
    if (isTransitioning) return;
    saveModal?.classList.remove('hidden');
    saveNameInput?.focus();
}

/**
 * Hides the save cosmos modal.
 */
function hideSaveModal() {
    saveModal?.classList.add('hidden');
    if(saveNameInput) saveNameInput.value = '';
}

/**
 * Handles the submission of the save cosmos form.
 */
function handleSaveCosmos(event: Event) {
    event.preventDefault();
    const name = saveNameInput?.value.trim();
    if (!name) {
        showSystemMessage("Please provide a name for your cosmos.");
        return;
    }

    const savedCosmos = getSavedCosmos();
    // Prevent duplicate names
    if (savedCosmos.some(c => c.name === name)) {
        showSystemMessage(`A cosmos named "${name}" already exists.`);
        return;
    }

    const newConfig = {
        ...currentGalaxyConfig,
        name: name,
        id: Date.now().toString() // Use string ID for consistency
    };

    savedCosmos.push(newConfig);
    saveCosmosToStorage(savedCosmos);
    
    loadAndDisplaySavedCosmos(); // Refresh the whole list to keep order
    hideSaveModal();
    showSystemMessage(`Cosmos "${name}" has been saved.`);
}

/**
 * Retrieves saved cosmos configurations from localStorage.
 */
function getSavedCosmos(): any[] {
    try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Could not read saved cosmos from localStorage", e);
        return [];
    }
}

/**
 * Saves an array of cosmos configurations to localStorage.
 */
function saveCosmosToStorage(configs: any[]) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configs));
    } catch (e) {
        console.error("Could not save cosmos to localStorage", e);
    }
}

/**
 * Loads and populates the UI with saved cosmos configurations from localStorage.
 */
function loadAndDisplaySavedCosmos() {
    if (!savedCosmosContainer) return;
    const savedCosmos = getSavedCosmos();
    savedCosmosContainer.innerHTML = ''; // Clear existing

    if (savedCosmos.length > 0) {
        const heading = document.createElement('h4');
        heading.textContent = 'Saved Presets';
        savedCosmosContainer.appendChild(heading);
        savedCosmos.forEach(createSavedCosmosButton);
    }
}

/**
 * Creates and appends a button for a saved cosmos configuration to the UI.
 */
function createSavedCosmosButton(config: any) {
    if (!savedCosmosContainer) return;

    const button = document.createElement('button');
    button.className = 'saved-cosmos-btn';
    button.textContent = config.name;
    button.setAttribute('aria-label', `Load ${config.name}`);
    button.onclick = (e) => {
        // Prevent delete button from also triggering this
        if ((e.target as HTMLElement).classList.contains('delete-cosmos-btn')) return;
        loadSavedCosmos(config);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-cosmos-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.setAttribute('aria-label', `Delete ${config.name}`);
    deleteBtn.onclick = () => deleteCosmos(config.id);
    
    button.appendChild(deleteBtn);
    savedCosmosContainer.appendChild(button);
}

/**
 * Loads a cosmos from a saved configuration object.
 */
function loadSavedCosmos(config: any) {
    if (isTransitioning) return;
    
    // Clean up existing probe if it exists
    if (probe) {
        scene.remove(probe);
        probe.geometry.dispose();
        (probe.material as THREE.Material).dispose();
        probe = null;
        probeTarget = null;
        probeAnimation = null;
    }

    setLoadingState(true, null); // Generic loading state
    showSystemMessage(`Loading cosmos: ${config.name}...`);

    transitionState = {
        fadingOut: true,
        fadingIn: false,
        progress: 0,
        duration: 2.0,
        oldGalaxy: galaxy,
    };
    isTransitioning = true;
    
    recreateSceneWithConfig(config, true); // Create new scene invisibly

    updateTelemetry(`SYSTEM: Recalling saved cosmos ${config.name}.`);
    showResponse(`Returning to: ${config.name}. ${config.description}`);
}

/**
 * Deletes a saved cosmos configuration by its ID.
 */
function deleteCosmos(id: string) {
    let savedCosmos = getSavedCosmos();
    savedCosmos = savedCosmos.filter(c => c.id !== id);
    saveCosmosToStorage(savedCosmos);
    loadAndDisplaySavedCosmos(); // Refresh the UI
}

/**
 * Toggles the UI loading state for the generation buttons.
 */
function setLoadingState(isLoading: boolean, activeBtn: HTMLButtonElement | null) {
    const buttonsToManage = [...generationButtons, summonProbeBtn];
    buttonsToManage.forEach(btn => {
        if (btn) {
            btn.disabled = isLoading;
            btn.classList.remove('loading');
        }
    });

    if (isLoading && activeBtn && buttonsToManage.includes(activeBtn)) {
        activeBtn.classList.add('loading');
    }

    aiState = isLoading ? 'thinking' : 'idle';
}

/**
 * Analyzes response text for keywords and applies a corresponding visual effect
 */
function applyResponseVisuals(text: string) {
    if (!responseContainer) return;
    const lowerCaseText = text.toLowerCase();
    
    const keywordEffectMap = [
        { className: 'effect-vortex', keywords: ['black hole', 'singularity', 'vortex', 'spacetime', 'gravity well', 'warp']},
        { className: 'effect-nebula', keywords: ['nebula', 'gous cloud', 'stellar nursery', 'gas', 'cloud', 'void', 'filament'] },
        { className: 'effect-stars', keywords: ['star', 'supernova', 'galaxy', 'cosmos', 'constellation', 'sun', 'web', 'structure'] },
    ];

    const allEffects = keywordEffectMap.map(e => e.className);
    responseContainer.classList.remove(...allEffects);
    if (!text) return;

    for (const effect of keywordEffectMap) {
        if (effect.keywords.some(keyword => lowerCaseText.includes(keyword))) {
            responseContainer.classList.add(effect.className);
            return;
        }
    }
}

/**
 * Displays a system message or error instantly without the typewriter effect.
 */
function showSystemMessage(message: string) {
    if (typewriterInterval) clearInterval(typewriterInterval);
    applyResponseVisuals('');
    if (responseText) responseText.innerHTML = message;
    responseContainer?.classList.remove('hidden');
    aiState = 'idle';
}

/**
 * Displays the AI response with a typewriter effect and speaks it.
 */
function showResponse(text: string) {
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    if (typewriterInterval) clearInterval(typewriterInterval);
    if (responseText) responseText.innerHTML = '';

    applyResponseVisuals(text);
    responseContainer?.classList.remove('hidden');
    aiState = 'speaking';
    
    let i = 0;
    typewriterInterval = setInterval(() => {
        if (i < text.length) {
            if (responseText) responseText.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typewriterInterval);
            aiState = 'idle';
        }
    }, 20);

    const utterance = new SpeechSynthesisUtterance(text);
    if (speechSettings.voice) utterance.voice = speechSettings.voice;
    utterance.pitch = speechSettings.pitch;
    utterance.rate = speechSettings.rate;
    speechSynthesis.