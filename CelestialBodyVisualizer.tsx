/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';
import { Analyser } from './analyser.ts';

export class CelestialBodyVisualizer {
    public container: THREE.Group;
    private planet: THREE.Mesh;
    private moon: THREE.Mesh;

    constructor(scene: THREE.Scene) {
        this.container = new THREE.Group();
        this.container.visible = false;
        scene.add(this.container);

        // Create a planet
        const planetGeometry = new THREE.SphereGeometry(150, 64, 64);
        const planetMaterial = new THREE.MeshStandardMaterial({
            color: 0x4A90E2, // A nice blue
            metalness: 0.2,
            roughness: 0.8,
            transparent: true,
            opacity: 1.0,
        });
        this.planet = new THREE.Mesh(planetGeometry, planetMaterial);
        this.container.add(this.planet);

        // Create a moon
        const moonGeometry = new THREE.SphereGeometry(40, 32, 32);
        const moonMaterial = new THREE.MeshStandardMaterial({
            color: 0xE0E0E0, // Light grey
            metalness: 0.1,
            roughness: 0.9,
            transparent: true,
            opacity: 1.0,
        });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.container.add(this.moon);
    }

    setVisible(visible: boolean) {
        this.container.visible = visible;
    }

    setFade(fade: number) {
        (this.planet.material as THREE.MeshStandardMaterial).opacity = fade;
        (this.moon.material as THREE.MeshStandardMaterial).opacity = fade;
    }

    update(time: number, audioAnalyser: Analyser | null) {
        if (!this.container.visible) return;

        // Animate the planet
        this.planet.rotation.y = time * 0.0001;

        // Animate the moon's orbit around the planet
        const orbitRadius = 400;
        const orbitSpeed = 0.0005;
        this.moon.position.x = Math.cos(time * orbitSpeed) * orbitRadius;
        this.moon.position.z = Math.sin(time * orbitSpeed) * orbitRadius;
        
        // Moon's own rotation
        this.moon.rotation.y = time * 0.0003;
        
        // Audio reactivity - let's make the planet emissive pulse with bass
        if (audioAnalyser) {
            const data = audioAnalyser.data;
            const bassAvg = (data[1] + data[2]) / 2 / 255;
            const planetMaterial = this.planet.material as THREE.MeshStandardMaterial;

            const targetEmissiveIntensity = bassAvg * 1.5;
            if(!planetMaterial.emissive) {
                planetMaterial.emissive = new THREE.Color(0x87CEEB); // Sky blue emissive
            }
            planetMaterial.emissiveIntensity = THREE.MathUtils.lerp(
                planetMaterial.emissiveIntensity,
                targetEmissiveIntensity,
                0.1
            );
        }

    }

    onWindowResize() {
        // No-op for now
    }
}
