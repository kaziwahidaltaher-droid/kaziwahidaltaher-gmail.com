/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { WarpShader } from './warp-shader.tsx';

import { Analyser } from './analyser.ts';
import { SignalSphereVisualizer } from './SignalSphereVisualizer.tsx';
import { SunVisualizer } from './SunVisualizer.tsx';
import { NebulaVisualizer } from './NebulaVisualizer.tsx';
import { GameOfLifeVisualizer } from './GameOfLifeVisualizer.tsx';
import { CosmicWebVisualizer } from './CosmicWebVisualizer.tsx';
import { QuantumFoamVisualizer } from './QuantumFoamVisualizer.tsx';
import { StarfieldVisualizer } from './StarfieldVisualizer.tsx';


interface FadingVisualizer {
    setVisible(visible: boolean): void;
    update(time: number, audioAnalyser: Analyser | null, ...args: any[]): void;
    onWindowResize(): void;
    setFade(fade: number): void;
}

type Visualizer = SignalSphereVisualizer | SunVisualizer | NebulaVisualizer | GameOfLifeVisualizer | CosmicWebVisualizer | QuantumFoamVisualizer;

export class AurelionEngine {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private composer: EffectComposer;
    private bloomPass: UnrealBloomPass;
    private lensflare: Lensflare;
    private light: THREE.PointLight;
    private sunColor = new THREE.Color(0xffcc88);
    private controls: OrbitControls;
    private clock: THREE.Clock;
    private warpPass: ShaderPass;

    private visualizers: Record<string, FadingVisualizer> = {};
    private activeVisualizerKey: string | null = null;
    private starfield: StarfieldVisualizer;
    private audioAnalyser: Analyser | null = null;
    
    // Transition state
    private isTransitioning = false;
    private transitionFromKey: string | null = null;
    private transitionToKey: string | null = null;
    private transitionDuration = 1.5; // in seconds
    private transitionTime = 0;
    
    private navigationTarget: THREE.Vector3 | null = null;
    private isNavigating = false;
    private isTouring = false;
    private isAutoRotating = false;
    private tourTime = 0;
    private aiState = 'idle';

    // Animation state for AI-driven effects
    private heartbeatTime = 0;
    private flare = {
        active: false,
        startTime: 0,
        position: new THREE.Vector3(),
        maxIntensity: 0,
        radius: 0
    };

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.position.z = 1000;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.2;
        this.controls.zoomSpeed = 0.8; // Smoother zoom
        
        this.clock = new THREE.Clock();

        // Post-processing
        const renderPass = new RenderPass(this.scene, this.camera);
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        this.bloomPass.threshold = 0;
        this.bloomPass.strength = 1.0;
        this.bloomPass.radius = 0.5;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderPass);
        this.composer.addPass(this.bloomPass);

        // Add the custom warp pass for transitions
        this.warpPass = new ShaderPass(WarpShader);
        this.warpPass.enabled = false;
        this.composer.addPass(this.warpPass);

        this.initLensflare();
        this.initVisualizers();
        this.starfield = new StarfieldVisualizer(this.scene);
    }

    private initVisualizers() {
        this.visualizers['cosmic_web'] = new CosmicWebVisualizer(this.scene, this.camera);
        this.visualizers['signal_sphere'] = new SignalSphereVisualizer(this.scene);
        this.visualizers['living_star'] = new SunVisualizer(this.scene);
        this.visualizers['nebula_weaver'] = new NebulaVisualizer(this.scene);
        this.visualizers['game_of_life'] = new GameOfLifeVisualizer(this.scene);
        this.visualizers['quantum_foam'] = new QuantumFoamVisualizer(this.scene);
    }

    private initLensflare() {
        this.light = new THREE.PointLight(this.sunColor, 1.2, 4000);
        this.light.position.set(0, 0, 0); // At the sun's position
        this.scene.add(this.light);

        const textureLoader = new THREE.TextureLoader();
        const textureFlare0 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
        const textureFlare3 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare3.png');
        
        this.lensflare = new Lensflare();
        this.lensflare.addElement(new LensflareElement(textureFlare0, 600, 0, this.light.color));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 70, 1.0));

        this.light.add(this.lensflare);
    }

    public init() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        (window as any).setActiveModule = this.setActiveModule.bind(this);
        (window as any).setVisualConfig = this.setVisualConfig.bind(this);
        (window as any).toggleAutoRotate = this.toggleAutoRotate.bind(this);
        window.addEventListener('navigatetopoint', this.handleNavigate.bind(this) as EventListener);
        window.addEventListener('aistatechange', this.handleAiStateChange.bind(this) as EventListener);
        window.addEventListener('toggletour', this.handleToggleTour.bind(this) as EventListener);
        
        this.initAudio().catch(err => {
            console.error("Failed to initialize microphone:", err);
        });
        
        this.setActiveModule('cosmic_web');
        this.updateZoomLimits('cosmic_web');
        this.animate();
    }

    private async initAudio() {
        if (this.audioAnalyser) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            this.audioAnalyser = new Analyser(source);
        } catch (err) {
            console.error("Could not get microphone input.", err);
            throw err;
        }
    }

    private handleAiStateChange(event: CustomEvent) {
        if (event.detail && typeof event.detail.state === 'string') {
            const newState = event.detail.state;
            
            // Trigger a flare when the AI starts speaking
            if (newState === 'speaking' && this.aiState !== 'speaking') {
                this.triggerFlare();
            }

            this.aiState = newState;
        }
    }

    private triggerFlare() {
        const cosmicWeb = this.visualizers['cosmic_web'] as CosmicWebVisualizer;
        if (!cosmicWeb || !cosmicWeb.getBounds()) return;

        const bounds = cosmicWeb.getBounds();
        this.flare.position.set(
            THREE.MathUtils.randFloat(bounds.min.x, bounds.max.x) * 0.8,
            THREE.MathUtils.randFloat(bounds.min.y, bounds.max.y) * 0.8,
            THREE.MathUtils.randFloat(bounds.min.z, bounds.max.z) * 0.8
        );
        this.flare.maxIntensity = THREE.MathUtils.randFloat(80, 150);
        this.flare.radius = THREE.MathUtils.randFloat(400, 600);
        this.flare.startTime = this.clock.getElapsedTime();
        this.flare.active = true;
    }


    public setVisualConfig(config: { ambientColor?: string, sunColor?: string }) {
        if (config.ambientColor) {
            this.scene.background = new THREE.Color(config.ambientColor);
        }
        if (config.sunColor) {
            this.sunColor.set(config.sunColor);
            const sun = this.visualizers['living_star'] as SunVisualizer;
            if (sun) {
                sun.setColor(this.sunColor);
            }
            if (this.light) {
                this.light.color.set(this.sunColor);
            }
        }
    }
    
    private dispatchModuleReadyEvent(key: string) {
        if (key === 'cosmic_web') {
            const cosmicWeb = this.visualizers['cosmic_web'] as CosmicWebVisualizer;
            window.dispatchEvent(new CustomEvent('galaxyready', {
                detail: {
                    points: cosmicWeb.getPoints(),
                    bounds: cosmicWeb.getBounds(),
                }
            }));
        } else {
             window.dispatchEvent(new CustomEvent('galaxyready', {
                detail: {
                    points: null,
                    bounds: null,
                }
            }));
        }
    }

    public setActiveModule(key: string) {
        if (this.isTransitioning || this.activeVisualizerKey === key) {
            return;
        }
        
        this.updateZoomLimits(key);

        // --- Initial Load Case (no transition) ---
        if (!this.activeVisualizerKey) {
            this.activeVisualizerKey = key;
            const visualizer = this.visualizers[key];
            visualizer.setVisible(true);
            visualizer.setFade(1.0);
            this.dispatchModuleReadyEvent(key);
            return;
        }

        // --- Standard Transition Case ---
        this.transitionFromKey = this.activeVisualizerKey;
        this.transitionToKey = key;
        this.isTransitioning = true;
        this.transitionTime = 0;

        // The 'active' key is now the 'to' key for update logic
        this.activeVisualizerKey = key;
        
        // Prepare the 'to' visualizer but keep it faded out
        const toVisualizer = this.visualizers[this.transitionToKey];
        toVisualizer.setVisible(true);
        toVisualizer.setFade(0);

        this.warpPass.enabled = true;
        
        this.dispatchModuleReadyEvent(key);
    }

    private updateZoomLimits(moduleKey: string) {
        switch (moduleKey) {
            case 'cosmic_web':
                this.controls.minDistance = 100;
                this.controls.maxDistance = 8000;
                break;
            case 'living_star':
                this.controls.minDistance = 180; // Keep camera outside the sun's surface (radius 150)
                this.controls.maxDistance = 3000;
                break;
            case 'signal_sphere':
                this.controls.minDistance = 5;
                this.controls.maxDistance = 2000;
                break;
            case 'nebula_weaver':
                this.controls.minDistance = 100;
                this.controls.maxDistance = 5000;
                break;
            case 'game_of_life':
                this.controls.minDistance = 100;
                this.controls.maxDistance = 2000;
                break;
            case 'quantum_foam':
                // This is a 2D shader, so zoom doesn't do much. Constrain it.
                this.controls.minDistance = 500;
                this.controls.maxDistance = 1500;
                break;
            default:
                this.controls.minDistance = 1;
                this.controls.maxDistance = 8000;
                break;
        }
        this.controls.update();
    }

    private handleNavigate(event: CustomEvent) {
        const target = event.detail.target as THREE.Vector3;
        let stateChanged = false;

        if (this.isTouring) {
            this.isTouring = false;
            stateChanged = true;
        }
        if (this.isAutoRotating) {
            this.isAutoRotating = false;
            this.controls.autoRotate = false;
            stateChanged = true;
        }
        
        this.navigationTarget = target.clone();
        this.isNavigating = true;
        this.controls.enabled = false; // Disable controls during auto-navigation

        if (stateChanged) {
            window.dispatchEvent(new CustomEvent('cameracontrolchange', {
                detail: { isTouring: this.isTouring, isAutoRotating: this.isAutoRotating }
            }));
        }
    }
    
    public toggleAutoRotate() {
        this.isAutoRotating = !this.isAutoRotating;
        this.controls.autoRotate = this.isAutoRotating;
    
        if (this.isAutoRotating && this.isTouring) {
            this.isTouring = false;
        }
        this.controls.enabled = !this.isTouring && !this.isNavigating;
    
        window.dispatchEvent(new CustomEvent('cameracontrolchange', {
            detail: { isTouring: this.isTouring, isAutoRotating: this.isAutoRotating }
        }));
    }

    private handleToggleTour() {
        this.isTouring = !this.isTouring;
        if (this.isTouring) {
            this.isNavigating = false;
            this.navigationTarget = null;
            if (this.isAutoRotating) {
                this.isAutoRotating = false;
                this.controls.autoRotate = false;
            }
        }
        this.controls.enabled = !this.isTouring;
        
        window.dispatchEvent(new CustomEvent('cameracontrolchange', {
            detail: { isTouring: this.isTouring, isAutoRotating: this.isAutoRotating }
        }));
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);

        Object.values(this.visualizers).forEach(v => v.onWindowResize());
        this.starfield.onWindowResize();
    }

    private updateAnimations(elapsedTime: number) {
        // Update Heartbeat
        if (this.aiState === 'idle') {
            this.heartbeatTime += this.clock.getDelta();
        }
        const heartbeatRadius = (this.heartbeatTime % 5) * 600; // Pulse travels outwards every 5s
        
        // Update Flare
        let flareIntensity = 0;
        if (this.flare.active) {
            const flareAge = elapsedTime - this.flare.startTime;
            const flareDuration = 3.0; // seconds
            if (flareAge > flareDuration) {
                this.flare.active = false;
            } else {
                // A quick rise and slower fall
                const progress = flareAge / flareDuration;
                flareIntensity = this.flare.maxIntensity * Math.sin(progress * Math.PI);
            }
        }
        
        // Update uniforms on the active cosmic web visualizer
        if (this.activeVisualizerKey === 'cosmic_web') {
            const cosmicWeb = this.visualizers['cosmic_web'] as CosmicWebVisualizer;
            cosmicWeb.updateAIState({
                state: this.aiState,
                heartbeatRadius: heartbeatRadius,
                flarePosition: this.flare.position,
                flareIntensity: flareIntensity,
                flareRadius: this.flare.radius
            });
        }
    }
    
    private updateVisualizer(visualizer: FadingVisualizer, elapsedTime: number, audioAnalyser: Analyser | null) {
        if (visualizer instanceof SunVisualizer) {
            visualizer.update(elapsedTime, audioAnalyser, this.aiState);
        } else if (visualizer instanceof GameOfLifeVisualizer) {
            visualizer.update();
        } else if (visualizer instanceof CosmicWebVisualizer ||
                   visualizer instanceof SignalSphereVisualizer ||
                   visualizer instanceof NebulaVisualizer ||
                   visualizer instanceof QuantumFoamVisualizer) {
            visualizer.update(elapsedTime, audioAnalyser);
        }
    }

    private updatePostProcessing() {
        if (this.bloomPass) {
            let targetStrength = 1.0;
            let targetRadius = 0.5;

            switch(this.activeVisualizerKey) {
                case 'cosmic_web':
                    targetStrength = 1.2;
                    targetRadius = 0.6;
                    break;
                case 'living_star':
                    targetStrength = 0.8;
                    targetRadius = 0.7;
                    break;
                case 'signal_sphere':
                    targetStrength = 1.5;
                    targetRadius = 0.4;
                    break;
            }
            this.bloomPass.strength = THREE.MathUtils.lerp(this.bloomPass.strength, targetStrength, 0.1);
            this.bloomPass.radius = THREE.MathUtils.lerp(this.bloomPass.radius, targetRadius, 0.1);
        }
        
        if (this.lensflare) {
            const isSunModuleActive = this.activeVisualizerKey === 'living_star';
            const isTransitioningToOrFromSun = this.isTransitioning && (this.transitionFromKey === 'living_star' || this.transitionToKey === 'living_star');
            this.lensflare.visible = isSunModuleActive || isTransitioningToOrFromSun;
        }
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        if (this.audioAnalyser) {
            this.audioAnalyser.update();
        }
        this.starfield.update(elapsedTime, this.audioAnalyser);

        this.updateAnimations(elapsedTime);

        if (this.isNavigating && this.navigationTarget) {
            this.camera.position.lerp(this.navigationTarget, 0.05);
            if (this.camera.position.distanceTo(this.navigationTarget) < 10) {
                this.isNavigating = false;
                this.navigationTarget = null;
                this.controls.enabled = true;
            }
        } else if (this.isTouring) {
            this.tourTime += delta * 0.05; // Control tour speed

            const radiusX = 2800;
            const radiusZ = 3500;
            const yAmplitude = 800;

            const x = Math.cos(this.tourTime) * radiusX;
            const z = Math.sin(this.tourTime) * radiusZ;
            const y = Math.sin(this.tourTime * 0.5) * yAmplitude;
            this.camera.position.set(x, y, z);

            const targetX = Math.cos(this.tourTime * 0.2) * 200;
            const targetZ = Math.sin(this.tourTime * 0.2) * 200;
            this.camera.lookAt(targetX, 0, targetZ);
        } else {
            this.controls.update();
        }

        // Handle transition fading and updates
        if (this.isTransitioning) {
            this.transitionTime += delta;
            const progress = Math.min(this.transitionTime / this.transitionDuration, 1.0);
    
            // A 0 -> 1 -> 0 curve for the warp effect intensity
            const warpProgress = Math.sin(progress * Math.PI);
            this.warpPass.uniforms.uProgress.value = warpProgress;
    
            const fromVisualizer = this.transitionFromKey ? this.visualizers[this.transitionFromKey] : null;
            const toVisualizer = this.transitionToKey ? this.visualizers[this.transitionToKey] : null;
    
            if (fromVisualizer) {
                // Fade out the old visualizer in the first half of the transition
                fromVisualizer.setFade(1.0 - Math.min(progress * 2, 1.0));
                this.updateVisualizer(fromVisualizer, elapsedTime, this.audioAnalyser);
            }
    
            if (toVisualizer) {
                // Fade in the new visualizer in the second half
                toVisualizer.setFade(Math.max(0, (progress - 0.5) * 2));
                this.updateVisualizer(toVisualizer, elapsedTime, this.audioAnalyser);
            }
            
            if (progress >= 1.0) {
                if (fromVisualizer) {
                    fromVisualizer.setVisible(false);
                }
                if (toVisualizer) {
                    toVisualizer.setFade(1.0);
                }
                this.isTransitioning = false;
                this.transitionFromKey = null;
                this.transitionToKey = null;
                this.warpPass.enabled = false;
                this.warpPass.uniforms.uProgress.value = 0.0;
            }
    
        } else if (this.activeVisualizerKey) {
            // Normal update when not transitioning
            const visualizer = this.visualizers[this.activeVisualizerKey];
            this.updateVisualizer(visualizer, elapsedTime, this.audioAnalyser);
        }
        
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        window.dispatchEvent(new CustomEvent('cameraupdate', {
            detail: {
                position: this.camera.position.clone(),
                direction: cameraDirection,
            }
        }));

        this.updatePostProcessing();
        this.composer.render();
    }
}