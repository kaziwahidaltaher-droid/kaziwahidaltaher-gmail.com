/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { Analyser } from './analyser.ts';
import { vs, fs } from './probe-shader.tsx';

export class ProbeVisualizer {
    public mesh: THREE.Mesh;
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        // A simple, geometric shape for the probe
        const geometry = new THREE.IcosahedronGeometry(50, 2);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                uFade: { value: 0.0 },
            },
            vertexShader: vs,
            fragmentShader: fs,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.visible = false;
        scene.add(this.mesh);
    }

    setVisible(visible: boolean) {
        this.mesh.visible = visible;
    }

    setFade(fade: number) {
        (this.mesh.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;
    }

    update(time: number, audioAnalyser: Analyser | null) {
        if (!this.mesh.visible) return;
        const material = this.mesh.material as THREE.ShaderMaterial;
        material.uniforms.time.value = time * 0.001;

        // Add a gentle bobbing motion
        this.mesh.position.y = Math.sin(time * 0.0005) * 20;
        this.mesh.rotation.x = time * 0.0001;
        this.mesh.rotation.y = time * 0.00015;
    }

    onWindowResize() { /* No-op for now */ }
}
