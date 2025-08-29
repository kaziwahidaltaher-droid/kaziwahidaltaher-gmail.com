/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Analyser } from './analyser.ts';
import { vs as galaxyVS, fs as galaxyFS } from './galaxy-point-shaders.tsx';
import { vs as starfieldVS, fs as starfieldFS } from './starfield-shaders.tsx';
import { vs as phantomVS, fs as phantomFS } from './phantom-glow-shader.tsx';

// --- PHANTOM VISUALIZER ---
class PhantomVisualizer {
    public mesh: THREE.Mesh;
    private material: THREE.ShaderMaterial;

    constructor(scene: THREE.Scene) {
        const geometry = new THREE.SphereGeometry(15, 32, 32);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                aiState: { value: 0.0 }, // 0: idle, 1: thinking, 2: speaking
                audioLevel: { value: 0.0 },
                uAudioMids: { value: 0.0 },
                uFade: { value: 1.0 },
                uGlowColor: { value: new THREE.Color(0x00ffff) },
                uOpacity: { value: 1.0 },
                uIsGlow: { value: 0.0 },
                // Feature Uniforms (can be expanded)
                uAudioBass: { value: 0.0 },
                uAudioHighs: { value: 0.0 },
                uHeartbeat: { value: new THREE.Vector2(0, 0) },
                // Mission Uniforms
                uScanActive: { value: 0.0 },
                uScanLinePosition: { value: 0.0 },
                uScanLineWidth: { value: 0.1 },
                uFlickerIntensity: { value: 0.0 },
            },
            vertexShader: phantomVS,
            fragmentShader: phantomFS,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.visible = false;
        scene.add(this.mesh);
    }

    setVisible(visible: boolean) {
        this.mesh.visible = visible;
    }

    update(time: number, audioAnalyser: Analyser | null, aiState: number) {
        if (!this.mesh.visible) return;
        this.material.uniforms.time.value = time;
        this.material.uniforms.aiState.value = THREE.MathUtils.lerp(this.material.uniforms.aiState.value, aiState, 0.1);

        if (audioAnalyser) {
            const data = audioAnalyser.data;
            const bass = (data[1] + data[2]) / 2 / 255;
            this.material.uniforms.uAudioBass.value = THREE.MathUtils.lerp(this.material.uniforms.uAudioBass.value, bass, 0.1);
        }
    }
}

// --- COSMIC WEB VISUALIZER ---
class CosmicWebVisualizer {
    public galaxyPoints: THREE.Points;
    public starfield: THREE.Points;
    private galaxyMaterial: THREE.ShaderMaterial;
    private starfieldMaterial: THREE.ShaderMaterial;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        // Starfield
        const starCount = 10000;
        const starVertices = [];
        const starIds = [];
        for (let i = 0; i < starCount; i++) {
            starVertices.push(
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000
            );
            starIds.push(i);
        }
        const starfieldGeo = new THREE.BufferGeometry();
        starfieldGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        starfieldGeo.setAttribute('aStarId', new THREE.Float32BufferAttribute(starIds, 1));

        this.starfieldMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                uAudioMids: { value: 0.0 },
                uAudioHighs: { value: 0.0 },
                uMaxStarfieldRadius: { value: 1000 },
            },
            vertexShader: starfieldVS,
            fragmentShader: starfieldFS,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.starfield = new THREE.Points(starfieldGeo, this.starfieldMaterial);
        scene.add(this.starfield);

        // Galaxy
        const particleCount = 500000;
        const positions = new Float32Array(particleCount * 3);
        const starId = new Float32Array(particleCount);
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Create a spherical distribution
            const r = Math.random() * 500;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);
            starId[i] = i;
        }
        const galaxyGeo = new THREE.BufferGeometry();
        galaxyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        galaxyGeo.setAttribute('aStarId', new THREE.BufferAttribute(starId, 1));
        
        this.galaxyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                size: { value: 5.0 },
                time: { value: 0 },
                uAudioLevel: { value: 0.0 },
                uOverallAudio: { value: 0.0 },
                uCameraFarPlane: { value: camera.far },
                color: { value: new THREE.Color(0xaaaaff) },
                uFade: { value: 1.0 },
                uHeartbeat: { value: new THREE.Vector2(0, 0) },
                uFlarePosition: { value: new THREE.Vector3() },
                uFlareIntensity: { value: 0.0 },
                uFlareRadius: { value: 100.0 },
            },
            vertexShader: galaxyVS,
            fragmentShader: galaxyFS,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.galaxyPoints = new THREE.Points(galaxyGeo, this.galaxyMaterial);
        scene.add(this.galaxyPoints);
    }

    update(time: number, audioAnalyser: Analyser | null) {
        this.galaxyMaterial.uniforms.time.value = time;
        this.starfieldMaterial.uniforms.time.value = time;
        if (audioAnalyser) {
            const data = audioAnalyser.data;
            const overall = data.reduce((s, v) => s + v, 0) / data.length / 255;
            const mids = (data[20] + data[21]) / 2 / 255;
            const highs = (data[80] + data[81]) / 2 / 255;
            this.galaxyMaterial.uniforms.uOverallAudio.value = THREE.MathUtils.lerp(this.galaxyMaterial.uniforms.uOverallAudio.value, overall, 0.1);
            this.galaxyMaterial.uniforms.uAudioLevel.value = THREE.MathUtils.lerp(this.galaxyMaterial.uniforms.uAudioLevel.value, mids, 0.1);
            this.starfieldMaterial.uniforms.uAudioMids.value = THREE.MathUtils.lerp(this.starfieldMaterial.uniforms.uAudioMids.value, mids, 0.1);
            this.starfieldMaterial.uniforms.uAudioHighs.value = THREE.MathUtils.lerp(this.starfieldMaterial.uniforms.uAudioHighs.value, highs, 0.1);
        }
    }
}

// --- MAIN SIMULATION ENGINE ---
class AurelionEngine {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private composer: EffectComposer;
    private controls: OrbitControls;
    private clock: THREE.Clock;

    private audioContext: AudioContext | null = null;
    private analyser: Analyser | null = null;

    private cosmicWeb: CosmicWebVisualizer;
    private phantom: PhantomVisualizer;
    private aiState: number = 0.0; // 0: idle, 1: thinking, 2: speaking

    constructor(canvas: HTMLCanvasElement) {
        this.clock = new THREE.Clock();

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.z = 300;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Post-processing
        const renderPass = new RenderPass(this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.4, 0.85);
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderPass);
        this.composer.addPass(bloomPass);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Visualizers
        this.cosmicWeb = new CosmicWebVisualizer(this.scene, this.camera);
        this.phantom = new PhantomVisualizer(this.scene);

        // Event Listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.getElementById('toggle-phantom-btn')?.addEventListener('click', () => {
             this.phantom.setVisible(!this.phantom.mesh.visible);
        });
        window.addEventListener('aistatechange', this.onAIStateChange.bind(this) as EventListener);
        
        this.initAudio();
        this.animate();
    }

    private async initAudio() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new AudioContext();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = new Analyser(source);
        } catch (err) {
            console.error('Microphone access denied:', err);
        }
    }
    
    private onAIStateChange(event: CustomEvent) {
        const state = event.detail.state;
        if (state === 'idle') this.aiState = 0.0;
        else if (state === 'thinking') this.aiState = 1.0;
        else if (state === 'speaking') this.aiState = 2.0;
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));

        const elapsedTime = this.clock.getElapsedTime();

        if (this.analyser) {
            this.analyser.update();
        }

        this.controls.update();
        this.cosmicWeb.update(elapsedTime, this.analyser);
        this.phantom.update(elapsedTime, this.analyser, this.aiState);
        
        this.composer.render();
    }
}

// --- BOOTSTRAP ---
const canvas = document.getElementById('bg') as HTMLCanvasElement;
if (canvas) {
    new AurelionEngine(canvas);
} else {
    console.error('Background canvas not found.');
}
