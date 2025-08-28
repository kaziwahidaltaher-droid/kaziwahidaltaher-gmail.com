import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GoogleGenAI, Type } from '@google/genai';
import { vs as sunVS, fs as sunFS } from './sun-shader.tsx';
import { vs as galaxyPointVS, fs as galaxyPointFS } from './galaxy-point-shaders.tsx';
import { vs as starfieldVS, fs as starfieldFS } from './starfield-shaders.tsx';
import { vs as nebulaVS, fs as nebulaFS } from './nebula-shader.tsx';
import { vs as probeVS, fs as probeFS } from './probe-shader.tsx';
import { Analyser } from './analyser.ts';

// --- Default Galaxy Configuration ---
const initialGalaxyConfig = {
    name: "Aurelion-Prime",
    description: "The genesis cosmos, a familiar swirl of azure and gold, awaiting the spark of new creation.",
    numStars: 50000,
    radius: 500,
    starColors: ['#5588ff', '#ffee88', '#ffaa55'],
    nebulaColors: [
        { color1: '#6a0dad', color2: '#0000ff' },
        { color1: '#dc143c', color2: '#ff8c00' },
        { color1: '#00ffff', color2: '#008080' },
    ],
    sunColor: '#ffee88'
};

// --- Scene Globals ---
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, composer: EffectComposer, clock: THREE.Clock;
let controls: OrbitControls;
let galaxy: THREE.Points | null = null;
let sun: THREE.Mesh | null = null;
let starVelocities: THREE.Vector3[], starPositions: Float32Array;
let starfield: THREE.Points;
let nebulae: THREE.Mesh[] = [];
let afterimagePass: AfterimagePass, bloomPass: UnrealBloomPass, smaaPass: SMAAPass, sharpenPass: ShaderPass;
let raycaster: THREE.Raycaster, mouse: THREE.Vector2;
let lastPosition: THREE.Vector3;
let isAutoFocusing = false;
let autoFocusTarget = new THREE.Vector3();
let autoFocusCameraTarget = new THREE.Vector3();

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


// --- Pre-allocated arrays for nebula uniforms for stability and performance ---
const MAX_NEBULAE = 5; // Must match shader definition
const nebulaPositions = new Array(MAX_NEBULAE).fill(null).map(() => new THREE.Vector3());
const nebulaColors = new Array(MAX_NEBULAE).fill(null).map(() => new THREE.Color(0x000000));
const nebulaRadii = new Array(MAX_NEBULAE).fill(0.0);

// --- Transition Globals ---
let isTransitioning = false;
let transitionState = {
    fadingOut: false,
    fadingIn: false,
    oldGalaxy: null as THREE.Points | null,
    oldSun: null as THREE.Mesh | null,
    oldNebulae: [] as THREE.Mesh[],
    progress: 0,
    duration: 2.0 // seconds for each fade
};


// --- AI & UI Globals ---
let ai;
let aiState = 'idle'; // 'idle', 'thinking', 'speaking'
let typewriterInterval: ReturnType<typeof setInterval>;
let telemetryMessages = [
    'AURELION: Genesis system online.',
    'NETWORK: All probes nominal.',
    'DATA LINK: Stable connection to Deep Space Network.',
    'TRACKING: Object NGC 6302 (Bug Nebula)',
    'SYSTEM: Calibrating stellar velocity sensors.',
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
const generateCosmosBtn = document.getElementById('generate-cosmos-btn') as HTMLButtonElement;
const summonProbeBtn = document.getElementById('summon-probe-btn') as HTMLButtonElement;

/**
 * Main initialization function
 */
function init() {
    // --- Basic Setup ---
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 50, initialGalaxyConfig.radius * 0.7);
    lastPosition = camera.position.clone();
    
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg'),
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

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
    recreateSceneWithConfig(initialGalaxyConfig);
    
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
                gl_FragColor = c - laplacian * 0.8;
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
    if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set. Gemini AI functionality will be disabled.");
        showSystemMessage("Connection to cosmic consciousness failed: Missing credentials.");
        if (promptInput && promptForm) {
           (promptInput as HTMLInputElement).disabled = true;
           (promptInput as HTMLInputElement).placeholder = "AI offline: Missing API Key";
           (document.getElementById('prompt-btn') as HTMLButtonElement).disabled = true;
        }
        if (generateCosmosBtn) generateCosmosBtn.disabled = true;
        if (summonProbeBtn) summonProbeBtn.disabled = true;
    } else {
        try {
            ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (error) {
            console.error("Gemini AI SDK initialization failed.", error);
            showSystemMessage("Could not connect to the cosmic consciousness. Please check your connection.");
        }
    }
    
    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onMouseClick, false);
    promptForm?.addEventListener('submit', handlePrompt);
    closeResponseBtn?.addEventListener('click', hideResponse);
    autoFocusBtn?.addEventListener('click', startAutoFocus);
    generateCosmosBtn?.addEventListener('click', generateNewCosmos);
    summonProbeBtn?.addEventListener('click', summonProbe);

    // --- Audio & TTS Setup ---
    setupAudio();
    setupTTS();

    // --- Telemetry ---
    updateTelemetry(initialGalaxyConfig.name);
    setInterval(() => updateTelemetry(), 5000);
}

/**
 * Recreates the dynamic parts of the scene (galaxy, sun, nebulae) based on a new configuration.
 */
function recreateSceneWithConfig(config: any, isTransition: boolean = false) {
    // --- Cleanup existing objects if not in a transition ---
    if (!isTransition) {
        if (galaxy) {
            scene.remove(galaxy);
            galaxy.geometry.dispose();
            (galaxy.material as THREE.Material).dispose();
        }
        if (sun) {
            scene.remove(sun);
            sun.geometry.dispose();
            (sun.material as THREE.Material).dispose();
        }
        nebulae.forEach(nebula => {
            scene.remove(nebula);
            nebula.geometry.dispose();
            (nebula.material as THREE.Material).dispose();
        });
        nebulae = [];
    }

    // --- Create new objects with the provided config ---
    createGalaxy(config, isTransition);
    createSun(config, isTransition);
    createNebulae(config, isTransition);
    
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

    const defaultVoice = availableVoices.find(voice => voice.lang === 'en-US' && voice.name.includes('Google')) || availableVoices[0];
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
 * Creates the galaxy with stars and physics properties
 */
function createGalaxy(config: { numStars: number, radius: number, starColors: string[] }, isTransition = false) {
    const { numStars, radius, starColors } = config;
    const geometry = new THREE.BufferGeometry();
    starPositions = new Float32Array(numStars * 3);
    const colors = new Float32Array(numStars * 3);
    const velocityMagnitudes = new Float32Array(numStars);
    const starIDs = new Float32Array(numStars);
    starVelocities = new Array(numStars).fill(null).map(() => new THREE.Vector3());

    const parsedStarColors = starColors.map(c => new THREE.Color(c));

    for (let i = 0; i < numStars; i++) {
        const i3 = i * 3;
        const r = Math.random() * radius;
        const angle = (r / radius) * 10;
        const arm = Math.floor(Math.random() * 4);
        const armAngle = (arm / 4) * Math.PI * 2;
        const spiralAngle = angle + armAngle + (Math.random() - 0.5) * 0.5;

        starPositions[i3] = Math.cos(spiralAngle) * r;
        starPositions[i3 + 1] = (Math.random() - 0.5) * 40 * (1 - r / radius);
        starPositions[i3 + 2] = Math.sin(spiralAngle) * r;

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
            uNebulaPositions: { value: nebulaPositions },
            uNebulaColorHotspots: { value: nebulaColors },
            uNebulaRadii: { value: nebulaRadii },
            uNumNebulae: { value: 0 },
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
 * Creates the central sun object
 */
function createSun(config: { sunColor: string }, isTransition = false) {
    const geometry = new THREE.SphereGeometry(30, 64, 64);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            aiState: { value: 0.0 },
            audioLevel: { value: 0.0 },
            uAudioMids: { value: 0.0 },
            uColor: { value: new THREE.Color(config.sunColor) },
            uFade: { value: isTransition ? 0.0 : 1.0 },
        },
        vertexShader: sunVS,
        fragmentShader: sunFS,
        transparent: true
    });
    sun = new THREE.Mesh(geometry, material);
    scene.add(sun);
}

/**
 * Creates a deep space starfield for background parallax effect.
 */
function createStarfield() {
    const NUM_BG_STARS = 20000;
    const BG_RADIUS = initialGalaxyConfig.radius * 2.5;
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
            uAudioMids: { value: 0.0 }
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
 * Creates procedural, audio-reactive nebulae within the galaxy.
 */
function createNebulae(config: { nebulaColors: { color1: string, color2: string }[], radius: number }, isTransition = false) {
    const { nebulaColors, radius } = config;
    nebulae = [];
    for (const colors of nebulaColors) {
        const geometry = new THREE.PlaneGeometry(radius * 0.8, radius * 0.8);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                color1: { value: new THREE.Color(colors.color1) },
                color2: { value: new THREE.Color(colors.color2) },
                uAudioMids: { value: 0.0 },
                uAudioHighs: { value: 0.0 },
                uAudioBass: { value: 0.0 },
                uFade: { value: isTransition ? 0.0 : 1.0 },
            },
            vertexShader: nebulaVS,
            fragmentShader: nebulaFS,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
        });

        const nebula = new THREE.Mesh(geometry, material);
        const r = radius * 0.3 + Math.random() * radius * 0.4;
        const angle = Math.random() * Math.PI * 2;
        nebula.position.set(
            Math.cos(angle) * r,
            (Math.random() - 0.5) * 10,
            Math.sin(angle) * r
        );

        nebula.rotation.x = -Math.PI / 2;
        nebula.rotation.z = Math.random() * Math.PI * 2;

        scene.add(nebula);
        nebulae.push(nebula);
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
            if (transitionState.oldSun) (transitionState.oldSun.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;
            transitionState.oldNebulae.forEach(n => (n.material as THREE.ShaderMaterial).uniforms.uFade.value = fade);

            if (fade <= 0) {
                // Cleanup old objects
                if (transitionState.oldGalaxy) {
                    scene.remove(transitionState.oldGalaxy);
                    transitionState.oldGalaxy.geometry.dispose();
                    (transitionState.oldGalaxy.material as THREE.Material).dispose();
                }
                if (transitionState.oldSun) {
                    scene.remove(transitionState.oldSun);
                    transitionState.oldSun.geometry.dispose();
                    (transitionState.oldSun.material as THREE.Material).dispose();
                }
                transitionState.oldNebulae.forEach(n => {
                    scene.remove(n);
                    n.geometry.dispose();
                    (n.material as THREE.Material).dispose();
                });
                
                transitionState.fadingOut = false;
                transitionState.fadingIn = true;
                transitionState.progress = 0;
            }
        } else if (transitionState.fadingIn) {
            const fade = Math.min(1.0, transitionState.progress);
             if (galaxy) (galaxy.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;
             if (sun) (sun.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;
             nebulae.forEach(n => (n.material as THREE.ShaderMaterial).uniforms.uFade.value = fade);

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
        
        if (sun) {
            const material = sun.material as THREE.ShaderMaterial;
            material.uniforms.audioLevel.value = THREE.MathUtils.lerp(material.uniforms.audioLevel.value, normalizedBass, delta * 5.0);
            material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(material.uniforms.uAudioMids.value, normalizedMids, delta * 5.0);
        }
        
        if (galaxy) {
            const material = galaxy.material as THREE.ShaderMaterial;
            material.uniforms.uAudioLevel.value = THREE.MathUtils.lerp(material.uniforms.uAudioLevel.value, normalizedMids, delta * 5.0);
            material.uniforms.uOverallAudio.value = THREE.MathUtils.lerp(material.uniforms.uOverallAudio.value, normalizedOverall, delta * 5.0);
            material.uniforms.time.value = elapsedTime;
        }

        nebulae.forEach(nebula => {
            const material = nebula.material as THREE.ShaderMaterial;
            material.uniforms.time.value = elapsedTime * 0.1;
            material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(material.uniforms.uAudioMids.value, normalizedMids, delta * 4.0);
            material.uniforms.uAudioHighs.value = THREE.MathUtils.lerp(material.uniforms.uAudioHighs.value, normalizedHighs, delta * 4.0);
            material.uniforms.uAudioBass.value = THREE.MathUtils.lerp(material.uniforms.uAudioBass.value, normalizedBass, delta * 4.0);
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
    
    // Update nebula uniforms for volumetric lighting on the galaxy shader.
    if (galaxy) {
        const galMat = galaxy.material as THREE.ShaderMaterial;
        const numActiveNebulae = Math.min(nebulae.length, MAX_NEBULAE);

        for (let i = 0; i < MAX_NEBULAE; i++) {
            const nebula = (i < numActiveNebulae) ? nebulae[i] : null;

            // More robust check for a valid, renderable nebula.
            const isNebulaValid = nebula &&
                nebula.position &&
                nebula.material &&
                (nebula.material as THREE.ShaderMaterial).uniforms.color1 &&
                (nebula.material as THREE.ShaderMaterial).uniforms.color2 &&
                (nebula.geometry as THREE.PlaneGeometry)?.parameters?.width;

            if (isNebulaValid) {
                nebulaPositions[i].copy(nebula.position);

                const mat = nebula.material as THREE.ShaderMaterial;
                const c1 = mat.uniforms.color1.value;
                const c2 = mat.uniforms.color2.value;

                // Update color in place for efficiency
                nebulaColors[i].set(0x000000).add(c1).add(c2).add(new THREE.Color(1, 1, 1)).multiplyScalar(1 / 3);

                nebulaRadii[i] = (nebula.geometry as THREE.PlaneGeometry).parameters.width / 2;
            } else {
                // If the nebula is invalid or the slot is unused, clear its data.
                // This is the crucial part to prevent stale data causing crashes.
                nebulaPositions[i].set(0, 0, 0);
                nebulaColors[i].set(0x000000);
                nebulaRadii[i] = 0.0;
            }
        }

        galMat.uniforms.uNumNebulae.value = numActiveNebulae;
    }

    if (probe && probeAnimation && probeTarget) {
        const material = probe.material as THREE.ShaderMaterial;
        material.uniforms.time.value = elapsedTime;
        material.uniforms.uAudioLevel.value = THREE.MathUtils.lerp(material.uniforms.uAudioLevel.value, normalizedOverall, delta * 5.0);

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


    if (controls) controls.update(delta);
    
    updatePhysics(delta);

    if (starfield) {
        starfield.position.copy(camera.position);
        const material = starfield.material as THREE.ShaderMaterial;
        material.uniforms.time.value = elapsedTime;
        material.uniforms.uAudioHighs.value = THREE.MathUtils.lerp(material.uniforms.uAudioHighs.value, normalizedHighs, delta * 5.0);
        material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(material.uniforms.uAudioMids.value, normalizedMids, delta * 5.0);
    }
    
    if (galaxy) {
      const precessionSpeed = 0.15;
      const precessionAngle = 0.1;
      galaxy.rotation.z = Math.sin(elapsedTime * precessionSpeed) * precessionAngle;
    }

    if (sun) {
        const sunMaterial = sun.material as THREE.ShaderMaterial;
        sunMaterial.uniforms.time.value = elapsedTime;
        let stateValue = 0;
        if (aiState === 'thinking') stateValue = 1.0;
        else if (aiState === 'speaking') stateValue = 2.0;
        sunMaterial.uniforms.aiState.value = THREE.MathUtils.lerp(sunMaterial.uniforms.aiState.value, stateValue, delta * 5.0);
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
 * Handles mouse clicks for raycasting, focusing, and querying stars.
 */
function onMouseClick(event) {
    if (responseContainer?.contains(event.target as Node) || 
        ttsSettingsPanel?.contains(event.target as Node)) {
        return;
    }

    if (!galaxy) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(galaxy);

    if (intersects.length > 0) {
        isAutoFocusing = false;

        const intersect = intersects[0];
        if (intersect.index === undefined) return;
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

        let regionDesc = 'the galactic fringe';
        const GALAXY_RADIUS = 500; // Fallback radius
        if (distanceFromCenter < GALAXY_RADIUS * 0.7) regionDesc = 'the spiral arms';
        if (distanceFromCenter < GALAXY_RADIUS * 0.2) regionDesc = 'the turbulent core';
        
        getStarDescription({ color: colorDesc, velocity: velocityDesc, region: regionDesc }, targetPosition);

    } else {
        hideResponse();
        if(!ttsSettingsPanel?.classList.contains('hidden')) {
            ttsSettingsPanel?.classList.add('hidden');
        }
    }
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
        const systemInstruction = 'You are the consciousness of the cosmos. Respond poetically, wisely, and slightly mysteriously. Your knowledge is vast and ancient. Keep responses to a few sentences.';
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
async function getStarDescription(starProperties: { color: string, velocity: string, region: string }, targetPosition: THREE.Vector3) {
    if (!ai || aiState === 'thinking') return;

    if (speechSynthesis.speaking) speechSynthesis.cancel();

    aiState = 'thinking';
    showSystemMessage('Receiving transmission...');
    
    const prompt = `A deep space probe is observing a single star. Based on this telemetry, provide a poetic, cosmic observation. Keep it brief and mysterious, like a fragment of ancient lore.
    - Dominant Color Spectrum: ${starProperties.color}
    - Relative Velocity: ${starProperties.velocity}
    - Galactic Region: ${starProperties.region}`;

    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = 'You are the consciousness of the cosmos. Respond poetically, wisely, and slightly mysteriously. Your knowledge is vast and ancient. Keep responses to two or three sentences.';
        
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

/**
 * Main function to trigger AI-powered galaxy generation with a smooth transition.
 */
async function generateNewCosmos() {
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

    setLoadingState(true, generateCosmosBtn);
    showSystemMessage("Dreaming of a new cosmos...");

    try {
        const newConfig = await fetchGalaxyConfigFromAI();
        
        transitionState = {
            fadingOut: true,
            fadingIn: false,
            progress: 0,
            duration: 2.0,
            oldGalaxy: galaxy,
            oldSun: sun,
            oldNebulae: nebulae,
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
 * Calls the Gemini API to get a new galaxy configuration.
 */
async function fetchGalaxyConfigFromAI() {
    const prompt = `Design a unique spiral galaxy. Provide its name, a short poetic description, and visual parameters like star colors, nebula colors, sun color, number of stars, and radius. Colors must be hex strings like "#RRGGBB". Follow the provided JSON schema precisely.`;
    
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
            nebulaColors: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        color1: { type: Type.STRING },
                        color2: { type: Type.STRING }
                    },
                    required: ['color1', 'color2']
                }
            },
            sunColor: { type: Type.STRING }
        },
        required: ['name', 'description', 'numStars', 'radius', 'starColors', 'nebulaColors', 'sunColor']
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
 * Toggles the UI loading state for the generation buttons.
 */
function setLoadingState(isLoading: boolean, activeBtn: HTMLButtonElement | null) {
    const buttons = [generateCosmosBtn, summonProbeBtn];
    buttons.forEach(btn => {
        if (btn) {
            btn.disabled = isLoading;
            // Always remove loading from all buttons initially
            btn.classList.remove('loading');
        }
    });

    // Add loading class only to the button that initiated the action
    if (isLoading && activeBtn) {
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
        { className: 'effect-nebula', keywords: ['nebula', 'gous cloud', 'stellar nursery', 'gas', 'cloud'] },
        { className: 'effect-stars', keywords: ['star', 'supernova', 'galaxy', 'cosmos', 'constellation', 'sun'] },
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
function showResponse(text) {
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
    speechSynthesis.speak(utterance);
}

/**
 * Hides the AI response container and stops any speech.
 */
function hideResponse() {
    responseContainer?.classList.add('hidden');
    if (typewriterInterval) clearInterval(typewriterInterval);
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    aiState = 'idle';
    applyResponseVisuals('');
}

/**
 * Selects a random star and smoothly transitions the camera to focus on it.
 */
function startAutoFocus() {
    if (isAutoFocusing || !galaxy) return;

    const numStars = galaxy.geometry.attributes.position.count;
    const randomIndex = Math.floor(Math.random() * numStars);
    const posAttr = galaxy.geometry.attributes.position;
    
    autoFocusTarget.set(
        posAttr.getX(randomIndex),
        posAttr.getY(randomIndex),
        posAttr.getZ(randomIndex)
    );

    const offsetDistance = 100;
    autoFocusCameraTarget
        .copy(autoFocusTarget)
        .normalize()
        .multiplyScalar(autoFocusTarget.length() + offsetDistance);
    autoFocusCameraTarget.y += 20;

    isAutoFocusing = true;
}

/**
 * Updates the telemetry ticker with a new message
 */
function updateTelemetry(newMessage?: string) {
    if (!telemetryTicker) return;
    if (newMessage) {
        telemetryTicker.textContent = newMessage;
    } else {
        telemetryIndex = (telemetryIndex + 1) % telemetryMessages.length;
        telemetryTicker.textContent = telemetryMessages[telemetryIndex];
    }
}

/**
 * Updates the CCS panel with live data
 */
function updateCCSPanel(delta) {
    if (!ccsMode || !ccsPos || !ccsVel || !lastPosition || !camera || !controls || !ccsTarget) return;
    
    const velocity = camera.position.distanceTo(lastPosition) / (delta || 1);

    if (isAutoFocusing) ccsMode.textContent = 'AUTOPILOT';
    else if (velocity > 1.0) ccsMode.textContent = 'MANEUVERING';
    else ccsMode.textContent = 'IDLE';

    ccsPos.textContent = `${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`;
    ccsVel.textContent = `${velocity.toFixed(1)} u/s`;
    ccsTarget.textContent = `${controls.target.x.toFixed(1)}, ${controls.target.y.toFixed(1)}, ${controls.target.z.toFixed(1)}`;

    lastPosition.copy(camera.position);
}

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

// --- Start the simulation ---
init();
animate();