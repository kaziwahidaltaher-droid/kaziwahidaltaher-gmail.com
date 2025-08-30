/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { Analyser } from './analyser.ts';
import { vs, fs } from './galaxy-point-shaders.tsx';

type AIStateUpdate = {
    state: string;
    heartbeatRadius: number;
    flarePosition: THREE.Vector3;
    flareIntensity: number;
    flareRadius: number;
};

export class CosmicWebVisualizer {
    public points: THREE.Points;
    private material: THREE.ShaderMaterial;
    private geometry: THREE.BufferGeometry;
    private bounds: THREE.Box3;
    private camera: THREE.PerspectiveCamera; // For LOD

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        this.camera = camera;
        this.geometry = new THREE.BufferGeometry();
        const numPoints = 200000; // Increased for more detail
        const positions = new Float32Array(numPoints * 3);
        const velocities = new Float32Array(numPoints);
        const starIds = new Float32Array(numPoints);
        
        // Galaxy generation parameters
        const numArms = 4;
        const armRotation = 5;
        const galaxyRadius = 2500;
        const centralBulgeRadius = 500;

        for (let i = 0; i < numPoints; i++) {
            const i3 = i * 3;
            
            // Determine if particle is in the central bulge or arms
            const isBulge = Math.random() < 0.25; 
            
            let r, theta, x, y, z;
            
            if (isBulge) {
                // Central Bulge: dense spherical distribution
                const u = Math.random();
                const v = Math.random();
                theta = 2 * Math.PI * u;
                const phi = Math.acos(2 * v - 1);
                r = centralBulgeRadius * Math.cbrt(Math.random());

                x = r * Math.sin(phi) * Math.cos(theta);
                y = r * Math.sin(phi) * Math.sin(theta); // Use as vertical component
                z = r * Math.cos(phi);

            } else {
                // Spiral Arms: logarithmic spiral distribution
                r = Math.random() * galaxyRadius;
                const angle = Math.pow(r / galaxyRadius, 0.8) * armRotation;
                const arm = Math.floor(Math.random() * numArms);
                theta = angle + (arm / numArms) * 2 * Math.PI;

                // Add random spread to make arms look natural
                const spread = 250 * Math.pow(1 - r / galaxyRadius, 2.0);
                x = Math.cos(theta) * r + (Math.random() - 0.5) * spread;
                z = Math.sin(theta) * r + (Math.random() - 0.5) * spread;
                y = (Math.random() - 0.5) * 80 * Math.pow(1 - r / galaxyRadius, 2.0); // Thinner disk
            }

            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;

            velocities[i] = Math.random();
            starIds[i] = i;
        }


        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('aVelocityMagnitude', new THREE.BufferAttribute(velocities, 1));
        this.geometry.setAttribute('aStarId', new THREE.BufferAttribute(starIds, 1));

        this.geometry.computeBoundingBox();
        this.bounds = this.geometry.boundingBox!;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                size: { value: 5.0 },
                uAudioLevel: { value: 0.0 },
                uOverallAudio: { value: 0.0 },
                time: { value: 0.0 },
                uFade: { value: 1.0 },
                color: { value: new THREE.Color(0xaaaaff) },
                uCameraFarPlane: { value: this.camera.far },
                uHeartbeat: { value: new THREE.Vector2(0, 400) }, // x: radius, y: thickness
                uFlarePosition: { value: new THREE.Vector3() },
                uFlareIntensity: { value: 0.0 },
                uFlareRadius: { value: 0.0 },
                uAiStateTimeFactor: { value: 0.0 }
            },
            vertexShader: vs,
            fragmentShader: fs,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
        });

        this.points = new THREE.Points(this.geometry, this.material);
        this.points.visible = false;
        scene.add(this.points);
    }
    
    getPoints(): Float32Array {
        return this.geometry.attributes.position.array as Float32Array;
    }

    getBounds(): THREE.Box3 {
        return this.bounds;
    }

    setVisible(visible: boolean) {
        this.points.visible = visible;
    }

    setFade(fade: number) {
        this.material.uniforms.uFade.value = fade;
    }

    updateAIState(params: AIStateUpdate) {
        if (!this.points.visible) return;
        this.material.uniforms.uHeartbeat.value.x = params.heartbeatRadius;
        this.material.uniforms.uFlarePosition.value.copy(params.flarePosition);
        this.material.uniforms.uFlareIntensity.value = params.flareIntensity;
        this.material.uniforms.uFlareRadius.value = params.flareRadius;
        
        // Smoothly transition the time factor for thinking state
        const targetFactor = params.state === 'thinking' ? 0.1 : 0.02;
        this.material.uniforms.uAiStateTimeFactor.value = THREE.MathUtils.lerp(
             this.material.uniforms.uAiStateTimeFactor.value,
             targetFactor,
             0.05
        );
    }


    update(time: number, audioAnalyser: Analyser | null) {
        if (!this.points.visible) return;
        this.material.uniforms.time.value = time;
        // Audio reactivity logic can be added here if needed
    }

    onWindowResize() {
        this.material.uniforms.uCameraFarPlane.value = this.camera.far;
    }
}