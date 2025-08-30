/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { Analyser } from './analyser.ts';

export class SatelliteVisualizer {
    public mesh: THREE.Mesh;
    private textureLoader: THREE.TextureLoader;

    constructor(scene: THREE.Scene) {
        this.textureLoader = new THREE.TextureLoader();
        
        const geometry = new THREE.SphereGeometry(250, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.8,
            map: null,
            transparent: true,
            opacity: 1.0,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.visible = false;
        scene.add(this.mesh);
    }

    public setVisible(visible: boolean) {
        this.mesh.visible = visible;
    }

    public setFade(fade: number) {
        const material = this.mesh.material as THREE.MeshStandardMaterial;
        material.opacity = fade;
    }

    public updateTexture(imageUrl: string) {
        this.textureLoader.load(imageUrl, (texture) => {
            const material = this.mesh.material as THREE.MeshStandardMaterial;
            material.map = texture;
            material.needsUpdate = true;
        }, undefined, (error) => {
            console.error('An error occurred while loading the texture:', error);
        });
    }

    public update(time: number, audioAnalyser: Analyser | null) {
        if (!this.mesh.visible) return;
        // Slow rotation to simulate Earth's movement
        this.mesh.rotation.y = time * 0.00005;
    }

    public onWindowResize() {
        // No-op for this visualizer
    }
}