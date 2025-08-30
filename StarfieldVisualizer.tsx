/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { Analyser } from './analyser.ts';
import { vs, fs } from './starfield-shaders.tsx';

export class StarfieldVisualizer {
    public points: THREE.Points;
    private material: THREE.ShaderMaterial;
    private maxRadius = 5000;

    constructor(scene: THREE.Scene) {
        const geometry = new THREE.BufferGeometry();
        const numPoints = 20000;
        const positions = new Float32Array(numPoints * 3);
        const starIds = new Float32Array(numPoints);

        for (let i = 0; i < numPoints; i++) {
            const i3 = i * 3;
            
            // Spherical distribution
            const r = this.maxRadius * Math.cbrt(Math.random()); // Use cube root for uniform volume distribution
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);

            starIds[i] = i;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aStarId', new THREE.BufferAttribute(starIds, 1));
        
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                uAudioMids: { value: 0.0 },
                uAudioHighs: { value: 0.0 },
                uMaxStarfieldRadius: { value: this.maxRadius },
            },
            vertexShader: vs,
            fragmentShader: fs,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
        });

        this.points = new THREE.Points(geometry, this.material);
        scene.add(this.points);
    }

    update(time: number, audioAnalyser: Analyser | null) {
        this.material.uniforms.time.value = time;

        if (audioAnalyser) {
            const data = audioAnalyser.data;
            const bufferLength = data.length;

            const midBand = { start: 20, end: 70 };
            const highBand = { start: 71, end: bufferLength - 1 };

            const getBandAverage = (band: { start: number, end: number }) => {
                const size = band.end - band.start + 1;
                if (size <= 0 || bufferLength === 0) return 0;
                let sum = 0;
                for (let i = band.start; i <= band.end; i++) {
                    if (i < bufferLength) sum += data[i];
                }
                return (sum / size) / 255.0; // Normalize
            };

            const midAvg = getBandAverage(midBand);
            const highAvg = getBandAverage(highBand);

            // Smoothly update the audio uniforms
            this.material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(this.material.uniforms.uAudioMids.value, midAvg, 0.1);
            this.material.uniforms.uAudioHighs.value = THREE.MathUtils.lerp(this.material.uniforms.uAudioHighs.value, highAvg, 0.1);
        }
    }

    onWindowResize() {
        // No-op for this visualizer
    }
}