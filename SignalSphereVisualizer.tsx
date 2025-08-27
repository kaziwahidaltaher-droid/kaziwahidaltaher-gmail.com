



/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as THREE from 'three';
import { Analyser } from './analyser';
import { vs as sphereVS } from './sphere-shader';
import { fs as backdropFS, vs as backdropVS } from './backdrop-shader';

/**
 * Encapsulates the 3D visuals for the 'Cosmic Transmission' module,
 * including the signal sphere and the starfield backdrop.
 */
export class SignalSphereVisualizer {
    public signalSphere: THREE.Mesh;
    public backdrop: THREE.Mesh;

    constructor(scene: THREE.Scene) {
        // Create backdrop
        this.backdrop = new THREE.Mesh(
            new THREE.IcosahedronGeometry(10, 5),
            new THREE.RawShaderMaterial({
                uniforms: {
                    resolution: { value: new THREE.Vector2(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio) },
                    rand: { value: 0 },
                    time: { value: 0 }, // Added for time-based glow
                },
                vertexShader: backdropVS,
                fragmentShader: backdropFS,
                glslVersion: THREE.GLSL3,
            }),
        );
        (this.backdrop.material as THREE.Material).side = THREE.BackSide;
        this.backdrop.visible = false;
        scene.add(this.backdrop);

        // Create signal sphere
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0x00BFFF,
            metalness: 0.5,
            roughness: 0.1,
            emissive: 0x000010,
            emissiveIntensity: 1.5,
        });

        sphereMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.time = { value: 0 };
            shader.uniforms.inputData = { value: new THREE.Vector4() };
            shader.uniforms.outputData = { value: new THREE.Vector4() };
            shader.uniforms.shimmerIntensity = { value: 0.0 }; // For shimmer effect
            (sphereMaterial as any).userData.shader = shader;
            shader.vertexShader = sphereVS;

            // Inject shimmer effect into the standard material's fragment shader
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                `
                // FIX: Declare the uniforms in the fragment shader so GLSL knows what they are.
                uniform float time;
                uniform float shimmerIntensity;

                #include <emissivemap_fragment>
                // A rapid, sharp shimmer effect controlled by the shimmerIntensity uniform
                float shimmer = pow(sin(time * 50.0) * 0.5 + 0.5, 8.0);
                vec3 shimmerColor = vec3(0.8, 0.9, 1.0); // Bright, cool white
                totalEmissiveRadiance += shimmer * shimmerIntensity * shimmerColor * 0.75; // Reduced intensity for a more subtle effect
                `
            );
        };

        this.signalSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 10), sphereMaterial);
        this.signalSphere.visible = false;
        scene.add(this.signalSphere);
    }

    /**
     * Toggles the visibility of the visualizer's components.
     * @param {boolean} visible - Whether the visualizer should be visible.
     */
    setVisible(visible: boolean) {
        this.signalSphere.visible = visible;
        this.backdrop.visible = visible;
    }

    /**
     * Updates the visualizer's state for the animation frame.
     * @param {number} time - The current performance time.
     * @param {Analyser | null} audioAnalyser - The audio analyser for real-time data.
     */
    update(time: number, audioAnalyser: Analyser | null) {
        if (!this.signalSphere.visible) return;

        // Update sphere shader uniforms and rotation
        const sphereMaterial = this.signalSphere.material as THREE.MeshStandardMaterial;
        const shader = (sphereMaterial as any).userData.shader;
        if (shader && audioAnalyser) {
            shader.uniforms.time.value = time * 0.001;
            const audioData = audioAnalyser.data;
            shader.uniforms.inputData.value.set( (1 * audioData[0]) / 255, (0.1 * audioData[1]) / 255, (10 * audioData[2]) / 255, 0 );
            shader.uniforms.outputData.value.set( (2 * audioData[0]) / 255, (0.1 * audioData[1]) / 255, (10 * audioData[2]) / 255, 0 );
        }
        this.signalSphere.rotation.y += 0.002;

        // Update backdrop shader for twinkling stars and a slow pulsating glow
        const backdropMaterial = this.backdrop.material as THREE.RawShaderMaterial;
        backdropMaterial.uniforms.rand.value = Math.random() * 10000;
        backdropMaterial.uniforms.time.value = time;
    }
    
    /**
     * Handles window resize events to keep the backdrop shader updated.
     */
    onWindowResize() {
        (this.backdrop.material as THREE.RawShaderMaterial).uniforms.resolution.value.set(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);
    }
}