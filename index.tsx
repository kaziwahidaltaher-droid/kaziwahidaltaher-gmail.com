import * as THREE from 'three';
import { GoogleGenAI } from "@google/genai";

// --- TYPE DEFINITIONS ---
interface VoiceProfile {
    pitch: number;
    rate: number;
    style: string;
    prompt: string;
}
interface VisualsProfile {
    ambientColor: string;
    color?: string;
    morphTargets?: { [key: string]: number };
    wireframe?: boolean;
    transparent?: boolean;
    opacity?: number;
    emissive?: string;
    emissiveIntensity?: number;
    scale?: number;
    particles: 'drift' | 'burst' | 'float' | null;
}
interface SyncProfile {
    intensity: number;
    targets: string[];
}
interface EmotionalModule {
    id: string;
    label: string;
    voice: VoiceProfile;
    visuals: VisualsProfile;
    sync: SyncProfile;
}
interface ModuleConfig {
    emotionalModules: EmotionalModule[];
}


// --- STATE ---
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let guideform: THREE.Mesh;
let audioCtx: AudioContext;
let analyser: AnalyserNode;
let dataArray: Uint8Array;
let isSpeaking = false;

// New State Management
let modulesConfig: ModuleConfig;
let activeModule: EmotionalModule | null = null;
let isMicEnabled = true;
let targetMorphInfluences: { [key: string]: number } = {};
let lastDetectedEmotion: string | null = null;


// Visual Effects State
let particleSystem: THREE.Points;
let particleVelocities: THREE.Vector3[] = [];
let ambientLight: THREE.AmbientLight;
const PARTICLE_COUNT = 500;
const defaultAmbientColor = new THREE.Color(0x333333);


// --- API INITIALIZATION ---
let ai: GoogleGenAI | null = null;
try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (e) {
    console.error("Could not initialize Google GenAI. AI voice features will be disabled. This is expected if an API key is not provided.", e);
}

// --- INITIALIZATION ---
async function init() {
    await loadConfig();
    initVisual();
    initControls();
    initMic();
    animate();
}

/**
 * Loads the emotional modules configuration from an external JSON file.
 */
async function loadConfig() {
    try {
        const response = await fetch('emotional-modules.json');
        modulesConfig = await response.json();
    } catch (error) {
        console.error("Failed to load emotional modules configuration:", error);
        // Fallback or error state
        modulesConfig = { emotionalModules: [] };
    }
}

/**
 * Procedurally generates the guideform's face with morph targets for expressions.
 */
function createGuideformFace(material: THREE.MeshStandardMaterial): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1.5, 64, 32);
    geometry.morphAttributes.position = [];
    const positions = geometry.attributes.position;

    const smileVerts = [];
    const frownVerts = [];
    const surpriseVerts = [];

    const tempVertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
        tempVertex.fromBufferAttribute(positions, i);
        const { x, y, z } = tempVertex;

        // --- Smile Morph ---
        const smileInfluence = Math.max(0, -y - 0.5) * Math.cos(z * 0.5 * Math.PI) * (1 - Math.abs(x / 1.5));
        smileVerts.push(x * smileInfluence * 0.3, smileInfluence * 0.8, z * smileInfluence * 0.1);

        // --- Frown Morph ---
        const frownInfluence = Math.max(0, -y - 0.5) * Math.cos(z * 0.5 * Math.PI) * (1 - Math.abs(x / 1.5));
        frownVerts.push(x * frownInfluence * -0.1, frownInfluence * -0.6, z * frownInfluence * 0.1);

        // --- Surprise Morph ---
        const surpriseInfluence = Math.max(0, y);
        surpriseVerts.push(x * surpriseInfluence * 0.1, y * surpriseInfluence * 0.5, z * surpriseInfluence * 0.1);
    }

    geometry.morphAttributes.position[0] = new THREE.Float32BufferAttribute(smileVerts, 3);
    geometry.morphAttributes.position[1] = new THREE.Float32BufferAttribute(frownVerts, 3);
    geometry.morphAttributes.position[2] = new THREE.Float32BufferAttribute(surpriseVerts, 3);

    const faceMesh = new THREE.Mesh(geometry, material);
    faceMesh.morphTargetDictionary = { 'smile': 0, 'frown': 1, 'surprise': 2 };
    faceMesh.morphTargetInfluences = [0, 0, 0];

    return faceMesh;
}


/**
 * Sets up the Three.js scene, camera, renderer, and objects.
 */
function initVisual() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 5, 15);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const material = new THREE.MeshStandardMaterial({ color: 0x44ccff, emissive: 0x000000, wireframe: true });
    
    guideform = createGuideformFace(material);
    scene.add(guideform);

    const light = new THREE.PointLight(0xffffff, 1.5, 100);
    light.position.set(5, 5, 5);
    scene.add(light);
    ambientLight = new THREE.AmbientLight(defaultAmbientColor);
    scene.add(ambientLight);

    initParticles();
    window.addEventListener('resize', onWindowResize);
}

/**
 * Creates the particle system for visual effects.
 */
function initParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        particleVelocities.push(new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    particleSystem = new THREE.Points(geometry, material);
    particleSystem.visible = false;
    scene.add(particleSystem);
}

/**
 * Initializes the UI controls for microphone and mood injection.
 */
function initControls() {
    const micButton = document.getElementById('mic-toggle');
    const injectorButton = document.getElementById('mood-injector');

    micButton?.addEventListener('click', () => {
        isMicEnabled = !isMicEnabled;
        micButton.classList.toggle('active', isMicEnabled);
        if (!isMicEnabled && activeModule) {
            activateEmotionModule(null); // Reset mood if mic is disabled
        }
    });

    injectorButton?.addEventListener('click', () => activateEmotionModule('sereneBloom'));
}

/**
 * Requests microphone access and sets up the audio analyser.
 */
function initMic() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(stream);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            source.connect(analyser);
        })
        .catch(err => {
            console.error("Microphone access was denied.", err);
            isMicEnabled = false;
            document.getElementById('mic-toggle')?.classList.remove('active');
        });
}

/**
 * Uses Gemini to generate a poetic phrase and the Web Speech API to speak it.
 */
async function speak(voiceProfile: VoiceProfile) {
    if (isSpeaking || speechSynthesis.speaking || !ai) return;
    isSpeaking = true;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: voiceProfile.prompt,
            config: {
                systemInstruction: `You are the voice of a cosmic, abstract guideform. Respond with a very short, poetic, metaphorical phrase (under 10 words) in a ${voiceProfile.style} tone. Do not use any introductory phrases.`,
            }
        });
        const text = response.text;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = voiceProfile.pitch;
        utterance.rate = voiceProfile.rate;
        utterance.lang = 'en-US';
        utterance.onend = () => { isSpeaking = false; };
        speechSynthesis.speak(utterance);
    } catch (error) {
        console.error("Error generating or speaking text:", error);
        isSpeaking = false;
    }
}


// --- EVENT HANDLERS ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Sends a sync packet to the console.
 */
function sendSyncPacket(syncProfile: SyncProfile | undefined) {
    if (!syncProfile) return;
    console.log(`[SYNC] Sending packet with intensity ${syncProfile.intensity} to targets: ${syncProfile.targets.join(', ')}`);
}

/**
 * Updates all visual elements in the scene based on a visuals profile.
 */
function updateVisuals(visuals: VisualsProfile | null) {
    const material = guideform.material as THREE.MeshStandardMaterial;

    // --- Reset to default visual state goals ---
    targetMorphInfluences = { smile: 0, frown: 0, surprise: 0 };
    material.wireframe = true;
    material.transparent = false;
    material.opacity = 1.0;
    material.color.set(0x44ccff);
    guideform.scale.set(1, 1, 1);
    material.emissive.set(0x000000);
    particleSystem.visible = false;

    // --- Apply New Mood Visuals ---
    if (visuals) {
        ambientLight.color.set(visuals.ambientColor);
        if (visuals.morphTargets) targetMorphInfluences = { ...targetMorphInfluences, ...visuals.morphTargets };
        if(visuals.color) material.color.set(visuals.color);
        material.wireframe = visuals.wireframe ?? true;
        material.transparent = visuals.transparent ?? false;
        material.opacity = visuals.opacity ?? 1.0;
        if (visuals.emissive) material.emissive.set(visuals.emissive);
        material.emissiveIntensity = visuals.emissiveIntensity ?? 0;
        if (visuals.scale) guideform.scale.setScalar(visuals.scale);
        
        if (visuals.particles) {
            particleSystem.visible = true;
            const positions = particleSystem.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                // Start all particles from the center for a fountain effect
                positions[i * 3] = positions[i * 3 + 1] = positions[i * 3 + 2] = 0;
                
                if (visuals.particles === 'burst') {
                    particleVelocities[i].set((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
                } else if (visuals.particles === 'drift') {
                    particleVelocities[i].set((Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03);
                } else if (visuals.particles === 'float') {
                    particleVelocities[i].set((Math.random() - 0.5) * 0.01, Math.random() * 0.03, (Math.random() - 0.5) * 0.01); // upward bias
                }
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;
        }
    }
}


/**
 * The central controller for changing the application's emotional state.
 */
function activateEmotionModule(id: string | null) {
    if (id === activeModule?.id) return;

    const module = id ? modulesConfig.emotionalModules.find(m => m.id === id) : null;
    if (!id && !activeModule) return; 
    
    activeModule = module;

    if (module) {
        speak(module.voice);
        sendSyncPacket(module.sync);
    }
    
    updateVisuals(module?.visuals ?? null);
}

// --- AUDIO ANALYSIS ---

function getEnergy(frequencyData: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        sum += frequencyData[i];
    }
    // Normalize to a 0-1 range
    return sum / (frequencyData.length * 255);
}

function getPitch(frequencyData: Uint8Array, sampleRate: number, fftSize: number): number {
    let maxVal = -1;
    let maxIndex = -1;
    // Find the bin with the highest energy
    for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] > maxVal) {
            maxVal = frequencyData[i];
            maxIndex = i;
        }
    }
    // If there's no significant signal, return 0
    if (maxVal < 20) return 0;
    // Convert the bin index to a frequency in Hz
    return maxIndex * (sampleRate / fftSize);
}

function detectEmotion(pitch: number, energy: number): string {
    if (pitch > 200 && pitch < 350 && energy > 0.05 && energy < 0.3) return 'tender';
    if (pitch > 300 && energy < 0.2) return 'calm';
    if (pitch < 200 && energy > 0.6) return 'urgent';
    if (pitch > 400 && energy > 0.7) return 'excited';
    return 'neutral';
}

/**
 * Detects the dominant audio emotion and triggers the corresponding mood.
 */
function analyzeAudio() {
    if (!isMicEnabled || !modulesConfig || !analyser || !dataArray) {
        if (activeModule) activateEmotionModule(null);
        return;
    }

    analyser.getByteFrequencyData(dataArray);

    const energy = getEnergy(dataArray);
    const pitch = getPitch(dataArray, audioCtx.sampleRate, analyser.fftSize);

    const detectedEmotion = detectEmotion(pitch, energy);

    // Only update if the emotion has changed
    if (detectedEmotion === lastDetectedEmotion) return;
    lastDetectedEmotion = detectedEmotion;

    console.log(`[Emotion Logic] Detected: ${detectedEmotion} (Pitch: ${pitch.toFixed(0)}Hz, Energy: ${energy.toFixed(2)})`);

    switch (detectedEmotion) {
        case 'calm':
            activateEmotionModule('sereneBloom');
            break;
        case 'urgent':
            activateEmotionModule('urgentStrike');
            break;
        case 'excited':
            activateEmotionModule('fierceRise');
            break;
        case 'tender':
            activateEmotionModule('tenderDrift');
            break;
        case 'neutral':
            activateEmotionModule(null);
            break;
        default:
            activateEmotionModule(null);
            break;
    }
}

/**
 * Animates particles based on the current active module.
 */
function animateParticles() {
    if (!particleSystem.visible || !activeModule?.visuals.particles) return;
    
    const particleMode = activeModule.visuals.particles;
    const positions = particleSystem.geometry.attributes.position.array as Float32Array;
    let lifeThreshold = particleMode === 'burst' ? 4 : 3;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        positions[i3] += particleVelocities[i].x;
        positions[i3 + 1] += particleVelocities[i].y;
        positions[i3 + 2] += particleVelocities[i].z;

        const distance = Math.sqrt(positions[i3]**2 + positions[i3+1]**2 + positions[i3+2]**2);
        
        if (distance > lifeThreshold) {
            if (particleMode === 'burst') {
                positions[i3] = 10000; 
            } else { // Drift and Float mode reset
                positions[i3] = positions[i3+1] = positions[i3+2] = 0;
            }
        }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
}

// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    if (analyser && dataArray) {
        analyzeAudio();
    }

    if (guideform) {
        // Smoothly interpolate morph targets
        if (guideform.morphTargetInfluences && guideform.morphTargetDictionary) {
            for (const [name, index] of Object.entries(guideform.morphTargetDictionary)) {
                const currentInfluence = guideform.morphTargetInfluences[index];
                const targetInfluence = targetMorphInfluences[name] || 0;
                guideform.morphTargetInfluences[index] = THREE.MathUtils.lerp(currentInfluence, targetInfluence, 0.08);
            }
        }
        
        guideform.rotation.x += 0.005;
        guideform.rotation.y += 0.003;
        
        const material = guideform.material as THREE.MeshStandardMaterial;
        if (material.emissiveIntensity > 0) {
            material.emissiveIntensity -= 0.02;
        }

        if (!activeModule) {
            ambientLight.color.lerp(defaultAmbientColor, 0.05);
        }
    }

    animateParticles();
    renderer.render(scene, camera);
}

// --- RUN ---
init();