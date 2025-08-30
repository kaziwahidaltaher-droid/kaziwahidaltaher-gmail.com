/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { Analyser } from './analyser.ts';
import { vs, fs } from './oltaris-shader.tsx';

export class PhantomVisualizer {
    public container: THREE.Group;
    private mesh: THREE.Mesh;

    constructor(scene: THREE.Scene) {
        this.container = new THREE.Group();
        this.container.visible = false;
        scene.add(this.container);
        
        // A high-detail Icosahedron provides a good base for procedural displacement
        const geometry = new THREE.IcosahedronGeometry(150, 5);
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                aiState: { value: 0.0 },
                audioLevel: { value: 0.0 }, // For bass
                uAudioMids: { value: 0.0 },   // For mids
                uFade: { value: 1.0 },
            },
            vertexShader: vs,
            fragmentShader: fs,
            transparent: true,
            blending: THREE.AdditiveBlending,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.container.add(this.mesh);
    }

    setVisible(visible: boolean) {
        this.container.visible = visible;
    }

    setFade(fade: number) {
        (this.mesh.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;
    }

    update(time: number, audioAnalyser: Analyser | null, aiState: string) {
        if (!this.container.visible) return;

        const material = this.mesh.material as THREE.ShaderMaterial;
        const uniforms = material.uniforms;
        
        uniforms.time.value = time * 0.001;
        this.container.rotation.y = time * 0.0001;
        this.container.rotation.x = time * 0.00005;


        // Update AI state
        const stateValue = aiState === 'thinking' ? 1.0 : (aiState === 'speaking' ? 2.0 : 0.0);
        uniforms.aiState.value = THREE.MathUtils.lerp(uniforms.aiState.value, stateValue, 0.1);
        
        // Update audio reactivity
        if (audioAnalyser) {
            const data = audioAnalyser.data;
            const bassAvg = (data[1] + data[2]) / 2 / 255;
            const midAvg = (data[20] + data[21]) / 2 / 255;
            uniforms.audioLevel.value = THREE.MathUtils.lerp(uniforms.audioLevel.value, bassAvg, 0.1);
            uniforms.uAudioMids.value = THREE.MathUtils.lerp(uniforms.uAudioMids.value, midAvg, 0.1);
        }
    }

    onWindowResize() { /* No-op */ }
}
