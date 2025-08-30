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
    private maxRadius = 8000; // Match camera max distance

    constructor(scene: THREE.Scene) {
        const numPoints = 100000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(numPoints * 3);
        const starIds = new Float32Array(numPoints);

        for (let i = 0; i < numPoints; i++) {
            const i3 = i * 3;
            
            // Distribute points within a sphere
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            // Give a non-uniform distribution to have more stars further away
            const r = this.maxRadius * Math.pow(Math.random(), 0.5);

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
        this.points.visible = true; // On by default
        scene.add(this.points);
    }

    setVisible(visible: boolean) {
        this.points.visible = visible;
    }

    update(time: number, audioAnalyser: Analyser | null) {
        if (!this.points.visible) return;
        this.material.uniforms.time.value = time;
        if (audioAnalyser) {
            const data = audioAnalyser.data;
            const midAvg = (data[20] + data[21]) / 2 / 255;
            const highAvg = (data[80] + data[81]) / 2 / 255;
            this.material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(this.material.uniforms.uAudioMids.value, midAvg, 0.1);
            this.material.uniforms.uAudioHighs.value = THREE.MathUtils.lerp(this.material.uniforms.uAudioHighs.value, highAvg, 0.1);
        }
    }
    
    // The shaders don't use resolution, so this is a no-op, but good practice to include.
    onWindowResize() {}
}
