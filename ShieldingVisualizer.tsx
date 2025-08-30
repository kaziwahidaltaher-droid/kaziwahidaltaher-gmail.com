/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { Analyser } from './analyser.ts';
import { vs, fs } from './shielding-shader.tsx';

export class ShieldingVisualizer {
    public container: THREE.Group;
    private shields: THREE.Mesh[] = [];

    constructor(scene: THREE.Scene) {
        this.container = new THREE.Group();
        this.container.visible = false;
        scene.add(this.container);

        const colors = [0x00ffff, 0x87CEEB, 0xADD8E6];
        for (let i = 0; i < 3; i++) {
            const geometry = new THREE.SphereGeometry(200 + i * 80, 64, 64);
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: Math.random() * 10 },
                    uColor: { value: new THREE.Color(colors[i]) },
                    uOpacity: { value: 0.0 },
                },
                vertexShader: vs,
                fragmentShader: fs,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.FrontSide,
            });
            const shield = new THREE.Mesh(geometry, material);
            shield.userData.rotationSpeed = (Math.random() * 0.2 + 0.1) * (i % 2 === 0 ? 1 : -1);
            this.shields.push(shield);
            this.container.add(shield);
        }
    }

    setVisible(visible: boolean) {
        this.container.visible = visible;
    }

    setFade(fade: number) {
        this.shields.forEach(shield => {
            (shield.material as THREE.ShaderMaterial).uniforms.uOpacity.value = fade * 0.4; // Keep it subtle
        });
    }

    update(time: number, audioAnalyser: Analyser | null) {
        if (!this.container.visible) return;
        
        this.shields.forEach((shield, i) => {
            const material = shield.material as THREE.ShaderMaterial;
            material.uniforms.time.value = time * 0.001;
            shield.rotation.y += shield.userData.rotationSpeed * 0.01;
            shield.rotation.x += shield.userData.rotationSpeed * 0.005;
        });
    }

    onWindowResize() { /* No-op */ }
}
