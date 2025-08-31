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
import { SignalSphereVisualizer } from './SignalSphereVisualizer.tsx';
import { SunVisualizer } from './SunVisualizer.tsx';
import { NebulaVisualizer } from './NebulaVisualizer.tsx';
import { GameOfLifeVisualizer } from './GameOfLifeVisualizer.tsx';
import { CosmicWebVisualizer } from './CosmicWebVisualizer.tsx';
import { QuantumFoamVisualizer } from './QuantumFoamVisualizer.tsx';
import { StarfieldVisualizer } from './StarfieldVisualizer.tsx';
import { CelestialBodyVisualizer } from './CelestialBodyVisualizer.tsx';
import { ProbeVisualizer } from './ProbeVisualizer.tsx';
import { ShieldingVisualizer } from './ShieldingVisualizer.tsx';
import { PhantomVisualizer } from './PhantomVisualizer.tsx';
import { SatelliteVisualizer } from './SatelliteVisualizer.tsx';


interface FadingVisualizer {
    setVisible(visible: boolean): void;
    update(time: number, audioAnalyser: Analyser | null, ...args: any[]): void;
    onWindowResize(): void;
    setFade(fade: number): void;
}

type Visualizer = SignalSphereVisualizer | SunVisualizer | NebulaVisualizer | GameOfLifeVisualizer | CosmicWebVisualizer | QuantumFoamVisualizer | CelestialBodyVisualizer | ProbeVisualizer | ShieldingVisualizer | PhantomVisualizer | SatelliteVisualizer;

type FlareData = {
    position: THREE.Vector3;
    intensity: number;
    radius: number;
};

export class AurelionEngine {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private composer: EffectComposer;
    private controls: OrbitControls;
    private clock: THREE.Clock;
    private starfield: StarfieldVisualizer;

    private visualizers: Record<string, FadingVisualizer> = {};
    private activeVisualizerKey: string | null = null;
    private fadingOutVisualizerKey: string | null = null;
    private transitionDuration = 1.0; // in seconds
    private transitionTime = 0;
    
    private navigationTarget: THREE.Vector3 | null = null;
    private isNavigating = false;
    private isTouring = false;
    private tourTime = 0;
    private aiState = 'idle';
    private targetGalaxyRotationY = 0;
    private aiOutputVolume = 0;


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
        this.controls.dampingFactor = 0.03; // Increased inertia for smoother coasting
        this.controls.screenSpacePanning = true; // More intuitive panning
        this.controls.minDistance = 1;
        this.controls.maxDistance = 8000;
        this.controls.zoomSpeed = 1.2; // Faster, more responsive zoom
        this.controls.panSpeed = 1.1; // Slightly faster panning
        
        this.clock = new THREE.Clock();

        this.starfield = new StarfieldVisualizer(this.scene);

        // Post-processing
        const renderPass = new RenderPass(this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0;
        bloomPass.strength = 1.0;
        bloomPass.radius = 0.5;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderPass);
        this.composer.addPass(bloomPass);

        this.initVisualizers();
    }

    private initVisualizers() {
        this.visualizers['cosmic_web'] = new CosmicWebVisualizer(this.scene, this.camera);
        this.visualizers['signal_sphere'] = new SignalSphereVisualizer(this.scene);
        this.visualizers['living_star'] = new SunVisualizer(this.scene);
        this.visualizers['nebula_weaver'] = new NebulaVisualizer(this.scene);
        this.visualizers['game_of_life'] = new GameOfLifeVisualizer(this.scene);
        this.visualizers['quantum_foam'] = new QuantumFoamVisualizer(this.scene);
        this.visualizers['celestial_bodies'] = new CelestialBodyVisualizer(this.scene);
        this.visualizers['probe'] = new ProbeVisualizer(this.scene);
        this.visualizers['shielding'] = new ShieldingVisualizer(this.scene);
        this.visualizers['phantom'] = new PhantomVisualizer(this.scene);
        this.visualizers['satellite_stream'] = new SatelliteVisualizer(this.scene);
    }

    public init() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        (window as any).setActiveModule = this.setActiveModule.bind(this);
        (window as any).setVisualConfig = this.setVisualConfig.bind(this);
        (window as any).setGalaxyRotation = this.setGalaxyRotation.bind(this);
        (window as any).toggleStarfield = this.toggleStarfield.bind(this);
        (window as any).updateSatelliteTexture = this.updateSatelliteTexture.bind(this);
        window.addEventListener('navigatetopoint', this.handleNavigate.bind(this) as EventListener);
        window.addEventListener('aistatechange', this.handleAiStateChange.bind(this) as EventListener);
        window.addEventListener('toggletour', this.handleToggleTour.bind(this) as EventListener);
        window.addEventListener('startsurvey', this.handleStartSurvey.bind(this) as EventListener);
        
        this.setActiveModule('cosmic_web');
        this.animate();
    }
    
    public setAiOutputVolume(volume: number) {
        this.aiOutputVolume = volume;
    }

    public updateSatelliteTexture(imageUrl: string) {
        const visualizer = this.visualizers['satellite_stream'] as SatelliteVisualizer;
        if (visualizer) {
            visualizer.updateTexture(imageUrl);
        }
    }

    public toggleStarfield() {
        this.starfield.setVisible(!this.starfield.points.visible);
    }

    public setGalaxyRotation(rotationY: number) {
        this.targetGalaxyRotationY = rotationY;
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
            const sun = this.visualizers['living_star'] as SunVisualizer;
            if (sun) {
                sun.setColor(new THREE.Color(config.sunColor));
            }
        }
    }

    public setActiveModule(key: string) {
        if (this.activeVisualizerKey === key) {
            return;
        }

        if (this.activeVisualizerKey) {
             if (this.fadingOutVisualizerKey) {
                this.visualizers[this.fadingOutVisualizerKey].setVisible(false);
            }
            this.fadingOutVisualizerKey = this.activeVisualizerKey;
            this.transitionTime = 0;
        }

        this.activeVisualizerKey = key;
        const activeVisualizer = this.visualizers[key];
        activeVisualizer.setVisible(true);
        activeVisualizer.setFade(this.fadingOutVisualizerKey ? 0 : 1);


        if (key === 'cosmic_web') {
            const cosmicWeb = activeVisualizer as CosmicWebVisualizer;
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

    private handleNavigate(event: CustomEvent) {
        const target = event.detail.target as THREE.Vector3;
        if (this.isTouring) this.isTouring = false; // Stop tour on navigation
        this.navigationTarget = target.clone();
        this.isNavigating = true;
        this.controls.enabled = false; // Disable controls during auto-navigation
    }
    
    private handleToggleTour() {
        this.isTouring = !this.isTouring;
        if (this.isTouring) {
            this.isNavigating = false;
            this.navigationTarget = null;
        }
        this.controls.enabled = !this.isTouring;
    }

    private handleStartSurvey() {
        const cosmicWeb = this.visualizers['cosmic_web'] as CosmicWebVisualizer;
        if (cosmicWeb && cosmicWeb.getPoints()) {
            const points = cosmicWeb.getPoints();
            const numPoints = points.length / 3;
            const randomIndex = Math.floor(Math.random() * numPoints);
            const target = new THREE.Vector3(
                points[randomIndex * 3],
                points[randomIndex * 3 + 1],
                points[randomIndex * 3 + 2]
            );
            
            const offset = new THREE.Vector3().subVectors(target, this.camera.position).normalize().multiplyScalar(200);
            const finalTarget = new THREE.Vector3().subVectors(target, offset);
            
            this.navigationTarget = finalTarget;
            this.isNavigating = true;
            this.controls.enabled = false;
        }
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);

        Object.values(this.visualizers).forEach(v => v.onWindowResize());
        this.starfield.onWindowResize();
    }
    
    private updateVisualizer(visualizer: FadingVisualizer, elapsedTime: number, audioAnalyser: Analyser | null, aiState: string, heartbeat: { x: number, y: number }, flare: FlareData, aiAudioLevel: number) {
        if (visualizer instanceof SunVisualizer) {
            visualizer.update(elapsedTime, audioAnalyser, aiState);
        } else if (visualizer instanceof PhantomVisualizer) {
            visualizer.update(elapsedTime, audioAnalyser, aiState);
        } else if (visualizer instanceof CosmicWebVisualizer) {
            visualizer.updateAIState({
                state: aiState,
                heartbeatRadius: heartbeat.x,
                flarePosition: flare.position,
                flareIntensity: flare.intensity,
                flareRadius: flare.radius,
            });
            visualizer.update(elapsedTime, audioAnalyser, this.targetGalaxyRotationY, aiAudioLevel);
        } else if (visualizer instanceof GameOfLifeVisualizer) {
            visualizer.update();
        } else if (
            visualizer instanceof SignalSphereVisualizer ||
            visualizer instanceof NebulaVisualizer ||
            visualizer instanceof QuantumFoamVisualizer ||
            visualizer instanceof CelestialBodyVisualizer ||
            visualizer instanceof ProbeVisualizer ||
            visualizer instanceof ShieldingVisualizer ||
            visualizer instanceof SatelliteVisualizer
        ) {
            visualizer.update(elapsedTime, audioAnalyser);
        }
    }


    private animate() {
        requestAnimationFrame(this.animate.bind(this));
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        this.starfield.update(elapsedTime, null);
        
        // --- Calculate AI-driven state once per frame ---
        if (this.aiState === 'idle') {
            this.heartbeatTime += delta;
        }
        const heartbeat = { x: (this.heartbeatTime % 5) * 600, y: 400 };

        let flareIntensity = 0;
        if (this.flare.active) {
            const flareAge = elapsedTime - this.flare.startTime;
            const flareDuration = 3.0;
            if (flareAge > flareDuration) {
                this.flare.active = false;
            } else {
                const progress = flareAge / flareDuration;
                flareIntensity = this.flare.maxIntensity * Math.sin(progress * Math.PI);
            }
        }
        const flareData = {
            position: this.flare.position,
            intensity: flareIntensity,
            radius: this.flare.radius
        };


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
        if (this.fadingOutVisualizerKey) {
            this.transitionTime += delta;
            const progress = Math.min(this.transitionTime / this.transitionDuration, 1.0);

            const fadingOutVisualizer = this.visualizers[this.fadingOutVisualizerKey];
            const activeVisualizer = this.visualizers[this.activeVisualizerKey!];

            fadingOutVisualizer.setFade(1.0 - progress);
            activeVisualizer.setFade(progress);
            
            // Update both during transition
            this.updateVisualizer(fadingOutVisualizer, elapsedTime, null, this.aiState, heartbeat, flareData, this.aiOutputVolume);
            this.updateVisualizer(activeVisualizer, elapsedTime, null, this.aiState, heartbeat, flareData, this.aiOutputVolume);

            if (progress >= 1.0) {
                fadingOutVisualizer.setVisible(false);
                activeVisualizer.setFade(1.0); // Ensure it's fully opaque
                this.fadingOutVisualizerKey = null;
            }
        } else if (this.activeVisualizerKey) {
            // Normal update when not transitioning
            const visualizer = this.visualizers[this.activeVisualizerKey];
            this.updateVisualizer(visualizer, elapsedTime, null, this.aiState, heartbeat, flareData, this.aiOutputVolume);
        }
        
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        window.dispatchEvent(new CustomEvent('cameraupdate', {
            detail: {
                position: this.camera.position.clone(),
                direction: cameraDirection,
            }
        }));

        this.composer.render();
    }
}