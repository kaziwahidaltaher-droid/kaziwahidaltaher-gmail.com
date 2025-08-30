/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { Analyser } from './analyser.ts';
import { vs, fs } from './quantum-foam-shader.tsx';

export class QuantumFoamVisualizer {
    public mesh: THREE.Mesh;
    private material: THREE.ShaderMaterial;

    constructor(scene: THREE.Scene) {
        const geometry = new THREE.PlaneGeometry(2, 2);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uAudioBass: { value: 0.0 },
                uAudioMids: { value: 0.0 },
                uAudioHighs: { value: 0.0 },
                uFade: { value: 1.0 },
            },
            vertexShader: vs,
            fragmentShader: fs,
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.visible = false;
        scene.add(this.mesh);
    }

    setVisible(visible: boolean) {
        this.mesh.visible = visible;
    }

    setFade(fade: number) {
        this.material.uniforms.uFade.value = fade;
    }

    update(time: number, audioAnalyser: Analyser | null) {
        if (!this.mesh.visible) return;
        this.material.uniforms.time.value = time;
        if (audioAnalyser) {
            const data = audioAnalyser.data;
            const bassAvg = (data[1] + data[2]) / 2 / 255;
            const midAvg = (data[20] + data[21]) / 2 / 255;
            const highAvg = (data[80] + data[81]) / 2 / 255;
            this.material.uniforms.uAudioBass.value = THREE.MathUtils.lerp(this.material.uniforms.uAudioBass.value, bassAvg, 0.1);
            this.material.uniforms.uAudioMids.value = THREE.MathUtils.lerp(this.material.uniforms.uAudioMids.value, midAvg, 0.1);
            this.material.uniforms.uAudioHighs.value = THREE.MathUtils.lerp(this.material.uniforms.uAudioHighs.value, highAvg, 0.1);
        }
    }

    onWindowResize() {
        this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }
}