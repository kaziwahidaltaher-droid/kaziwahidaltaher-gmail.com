import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { GoogleGenAI } from '@google/genai';
import { vs as sunVS, fs as sunFS } from './sun-shader.tsx';
import { vs as galaxyPointVS, fs as galaxyPointFS } from './galaxy-point-shaders.tsx';
import { Analyser } from './analyser.ts';

// --- Configuration ---
const GALAXY_RADIUS = 500;
const NUM_STARS = 50000;
const GRAVITATIONAL_CONSTANT = 0.5;
const STAR_COLORS = [
    new THREE.Color(0.5, 0.5, 1.0),   // Blue
    new THREE.Color(1.0, 1.0, 0.8),   // Yellow-white
    new THREE.Color(1.0, 0.8, 0.5)    // Orange
];

// --- Scene Globals ---
let scene, camera, renderer, composer, clock;
let controls: OrbitControls;
let galaxy, sun, starVelocities, starPositions;
let afterimagePass, bloomPass;
let raycaster, mouse;
let lastPosition;
let isAutoFocusing = false;
let autoFocusTarget = new THREE.Vector3();
let autoFocusCameraTarget = new THREE.Vector3();

// --- AI & UI Globals ---
let ai;
let aiState = 'idle'; // 'idle', 'thinking', 'speaking'
let typewriterInterval: ReturnType<typeof setInterval>;
const telemetryMessages = [
    'PROBE-01A: Gravitational lens scan complete.',
    'NETWORK: All probes nominal.',
    'DATA LINK: Stable connection to Deep Space Network.',
    'TRACKING: Object NGC 6302 (Bug Nebula)',
    'SYSTEM: Calibrating stellar velocity sensors.',
];
let telemetryIndex = 0;

// --- Audio Globals ---
let audioAnalyser: Analyser;

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

/**
 * Main initialization function
 */
function init() {
    // --- Basic Setup ---
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 50, GALAXY_RADIUS * 0.7);
    lastPosition = camera.position.clone();
    
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg'),
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    // --- Create Celestial Objects ---
    createGalaxy();
    createSun();
    
    // --- Post-processing ---
    const renderPass = new RenderPass(scene, camera);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.1, 0.85);
    afterimagePass = new AfterimagePass(0.9); // Motion trails
    
    composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(afterimagePass);

    // --- Controls ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = GALAXY_RADIUS * 2;
    controls.target.set(0, 0, 0); // Start looking at the center
    controls.maxPolarAngle = Math.PI; // Allow full vertical rotation
    controls.addEventListener('start', () => {
        isAutoFocusing = false;
    });


    // --- Raycasting for Click-to-Focus ---
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 5; // Click tolerance for stars
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
    promptForm.addEventListener('submit', handlePrompt);
    closeResponseBtn.addEventListener('click', hideResponse);
    autoFocusBtn.addEventListener('click', startAutoFocus);

    // --- Audio Setup ---
    setupAudio();

    // --- Telemetry ---
    updateTelemetry();
    setInterval(updateTelemetry, 5000);
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
 * Creates the galaxy with stars and physics properties
 */
function createGalaxy() {
    const geometry = new THREE.BufferGeometry();
    starPositions = new Float32Array(NUM_STARS * 3);
    const colors = new Float32Array(NUM_STARS * 3);
    const velocityMagnitudes = new Float32Array(NUM_STARS);
    starVelocities = new Array(NUM_STARS).fill(null).map(() => new THREE.Vector3());

    for (let i = 0; i < NUM_STARS; i++) {
        const i3 = i * 3;
        // Position stars in a spiral galaxy shape
        const radius = Math.random() * GALAXY_RADIUS;
        const angle = (radius / GALAXY_RADIUS) * 10;
        const arm = Math.floor(Math.random() * 4);
        const armAngle = (arm / 4) * Math.PI * 2;
        const spiralAngle = angle + armAngle + (Math.random() - 0.5) * 0.5;

        starPositions[i3] = Math.cos(spiralAngle) * radius;
        starPositions[i3 + 1] = (Math.random() - 0.5) * 40 * (1 - radius / GALAXY_RADIUS); // Galactic bulge
        starPositions[i3 + 2] = Math.sin(spiralAngle) * radius;

        // Color
        const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aVelocityMagnitude', new THREE.BufferAttribute(velocityMagnitudes, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            size: { value: 1.5 },
            uAudioLevel: { value: 0.0 },
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
function createSun() {
    const geometry = new THREE.SphereGeometry(30, 64, 64);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            aiState: { value: 0.0 }, // 0: idle, 1: thinking, 2: speaking
            beamTarget: { value: new THREE.Vector3() },
            beamActive: { value: 0.0 },
            responseMetric: { value: 0.0 },
            audioLevel: { value: 0.0 }
        },
        vertexShader: sunVS,
        fragmentShader: sunFS,
    });
    sun = new THREE.Mesh(geometry, material);
    scene.add(sun);
}

/**
 * Updates star positions based on gravity
 */
function updatePhysics(delta) {
    if (!galaxy) return;
    const positions = galaxy.geometry.attributes.position.array;
    const velocities = galaxy.geometry.attributes.aVelocityMagnitude.array;
    let maxVelocitySq = 0;

    for (let i = 0; i < NUM_STARS; i++) {
        const i3 = i * 3;
        const pos = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
        
        const distanceSq = pos.lengthSq();
        if (distanceSq < 10) continue; // Avoid singularity at center
        
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

    // Normalize velocity magnitudes for the shader
    if (maxVelocitySq > 0) {
        for (let i = 0; i < NUM_STARS; i++) {
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

    // --- Auto-Focus Camera ---
    if (isAutoFocusing) {
        const focusSpeed = 2.0;
        const lerpAlpha = Math.min(focusSpeed * delta, 1.0);
        
        controls.target.lerp(autoFocusTarget, lerpAlpha);
        camera.position.lerp(autoFocusCameraTarget, lerpAlpha);

        // Stop when close enough
        if (camera.position.distanceTo(autoFocusCameraTarget) < 1 && controls.target.distanceTo(autoFocusTarget) < 1) {
            isAutoFocusing = false;
            controls.target.copy(autoFocusTarget); // Snap to final position to prevent overshooting
        }
    }

    // --- Audio Reactivity ---
    if (audioAnalyser) {
        audioAnalyser.update();
        const data = audioAnalyser.data;
        const average = data.reduce((sum, value) => sum + value, 0) / data.length;
        const normalizedAudio = Math.min(average / 128, 1.0); // Normalize to 0-1 range

        // Modulate post-processing effects
        if (bloomPass) {
            bloomPass.strength = THREE.MathUtils.lerp(bloomPass.strength, 1.0 + normalizedAudio * 1.5, delta * 5.0);
        }
        if (afterimagePass) {
            afterimagePass.uniforms.damp.value = THREE.MathUtils.lerp(afterimagePass.uniforms.damp.value, 0.9 - normalizedAudio * 0.15, delta * 5.0);
        }
        
        // Update shader uniforms
        if (sun) {
            (sun.material as THREE.ShaderMaterial).uniforms.audioLevel.value = THREE.MathUtils.lerp((sun.material as THREE.ShaderMaterial).uniforms.audioLevel.value, normalizedAudio, delta * 5.0);
        }
        if (galaxy) {
            (galaxy.material as THREE.ShaderMaterial).uniforms.uAudioLevel.value = THREE.MathUtils.lerp((galaxy.material as THREE.ShaderMaterial).uniforms.uAudioLevel.value, normalizedAudio, delta * 5.0);
        }
    }

    // Update controls for damping
    if (controls) controls.update(delta);
    
    // --- Update Scene Objects ---
    updatePhysics(delta);
    
    // Galactic Precession (wobble)
    if (galaxy) {
      const precessionSpeed = 0.15;
      const precessionAngle = 0.1;
      galaxy.rotation.z = Math.sin(elapsedTime * precessionSpeed) * precessionAngle;
    }

    // --- Update Sun Shader ---
    if (sun) {
        const sunMaterial = sun.material as THREE.ShaderMaterial;
        sunMaterial.uniforms.time.value = elapsedTime;
        let stateValue = 0;
        if (aiState === 'thinking') stateValue = 1.0;
        else if (aiState === 'speaking') stateValue = 2.0;
        sunMaterial.uniforms.aiState.value = THREE.MathUtils.lerp(sunMaterial.uniforms.aiState.value, stateValue, delta * 5.0);
    }
    
    // --- Update UI ---
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
}

/**
 * Handles mouse clicks for raycasting, focusing, and querying stars.
 */
function onMouseClick(event) {
    // If the click is inside the response panel, do nothing.
    if (responseContainer.contains(event.target as Node)) {
        return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(galaxy);

    if (intersects.length > 0) {
        isAutoFocusing = false; // User takes control, cancel any ongoing auto-focus

        const intersect = intersects[0];
        // The index property might not exist on all intersection types, ensure it does.
        if (intersect.index === undefined) return;
        const index = intersect.index;

        const posAttr = galaxy.geometry.attributes.position;
        const targetPosition = new THREE.Vector3(
            posAttr.getX(index),
            posAttr.getY(index),
            posAttr.getZ(index)
        );
        
        // Set the orbit controls target to the clicked star for visual feedback
        controls.target.copy(targetPosition);

        // --- Gather Star Properties for AI ---
        const colorAttr = galaxy.geometry.attributes.color;
        const starColor = new THREE.Color(colorAttr.getX(index), colorAttr.getY(index), colorAttr.getZ(index));
        const velocity = starVelocities[index].length();
        const distanceFromCenter = targetPosition.length();

        // Convert raw data into descriptive strings for a better AI prompt
        let colorDesc = 'a spectral white';
        if (starColor.b > 0.8 && starColor.r < 0.6) colorDesc = 'a brilliant blue-white';
        else if (starColor.r > 0.8 && starColor.g > 0.8) colorDesc = 'a glowing yellow';
        else if (starColor.r > 0.8) colorDesc = 'a deep orange';

        // Velocities are small values, establish a relative scale
        let velocityDesc = 'serene';
        if (velocity > 0.1) velocityDesc = 'swift';
        if (velocity > 0.3) velocityDesc = 'fierce';

        let regionDesc = 'the galactic fringe';
        if (distanceFromCenter < GALAXY_RADIUS * 0.7) regionDesc = 'the spiral arms';
        if (distanceFromCenter < GALAXY_RADIUS * 0.2) regionDesc = 'the turbulent core';
        
        // Asynchronously fetch and display the star's description
        getStarDescription({ color: colorDesc, velocity: velocityDesc, region: regionDesc });

    } else {
        // If the user clicks on empty space, hide the response panel.
        hideResponse();
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
 * @param starProperties - Descriptive properties of the clicked star.
 */
async function getStarDescription(starProperties: { color: string, velocity: string, region: string }) {
    if (!ai || aiState === 'thinking') return;

    aiState = 'thinking';
    // Provide immediate feedback to the user that something is happening
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
 * Displays a system message or error instantly without the typewriter effect.
 */
function showSystemMessage(message: string) {
    if (typewriterInterval) clearInterval(typewriterInterval);
    responseText.innerHTML = message;
    responseContainer.classList.remove('hidden');
    aiState = 'idle'; // Ensure state is idle for system messages.
}

/**
 * Displays the AI response with a typewriter effect
 */
function showResponse(text) {
    if (typewriterInterval) clearInterval(typewriterInterval);
    responseText.innerHTML = '';
    responseContainer.classList.remove('hidden');

    aiState = 'speaking';
    
    let i = 0;
    typewriterInterval = setInterval(() => {
        if (i < text.length) {
            responseText.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typewriterInterval);
            aiState = 'idle';
        }
    }, 20);
}

/**
 * Hides the AI response container
 */
function hideResponse() {
    responseContainer.classList.add('hidden');
    if (typewriterInterval) clearInterval(typewriterInterval);
    aiState = 'idle';
}

/**
 * Selects a random star and smoothly transitions the camera to focus on it.
 */
function startAutoFocus() {
    if (isAutoFocusing) return; // Don't interrupt an ongoing focus

    const randomIndex = Math.floor(Math.random() * NUM_STARS);
    const posAttr = galaxy.geometry.attributes.position;
    
    autoFocusTarget.set(
        posAttr.getX(randomIndex),
        posAttr.getY(randomIndex),
        posAttr.getZ(randomIndex)
    );

    // Calculate a good camera position: offset from the star along its vector from the origin
    const offsetDistance = 100; // How far from the star to position camera
    autoFocusCameraTarget
        .copy(autoFocusTarget)
        .normalize()
        .multiplyScalar(autoFocusTarget.length() + offsetDistance);
    
    // A small vertical offset for a better viewing angle
    autoFocusCameraTarget.y += 20;

    isAutoFocusing = true;
}

/**
 * Updates the telemetry ticker with a new message
 */
function updateTelemetry() {
    if (!telemetryTicker) return;
    telemetryIndex = (telemetryIndex + 1) % telemetryMessages.length;
    telemetryTicker.textContent = telemetryMessages[telemetryIndex];
}

/**
 * Updates the CCS panel with live data
 */
function updateCCSPanel(delta) {
    if (!ccsMode || !ccsPos || !ccsVel || !lastPosition || !camera || !controls || !ccsTarget) return;
    
    const velocity = camera.position.distanceTo(lastPosition) / delta;

    // Update Mode
    if (isAutoFocusing) {
        ccsMode.textContent = 'AUTOPILOT';
    } else if (velocity > 1.0) {
        ccsMode.textContent = 'MANEUVERING';
    } else {
        ccsMode.textContent = 'IDLE';
    }

    // Update Position
    ccsPos.textContent = `${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`;

    // Update Velocity
    ccsVel.textContent = `${velocity.toFixed(1)} u/s`;
    
    // Update Target
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