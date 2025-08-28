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
                totalEmissiveRadiance += shimmer * shimmerIntensity * shimmerColor;
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

        const sphereMaterial = this.signalSphere.material as THREE.MeshStandardMaterial;
        const shader = (sphereMaterial as any).userData.shader;
        
        let normalizedBass = 0, normalizedMids = 0, normalizedHighs = 0;

        if (shader && audioAnalyser) {
            shader.uniforms.time.value = time * 0.001;
            const audioData = audioAnalyser.data;
            const bufferLength = audioData.length;

            // --- Audio Band Analysis for dynamic animation ---
            const bassBand = { start: 1, end: 10 };
            const midBand = { start: 11, end: 100 };
            const highBand = { start: 101, end: bufferLength - 1 };

            const getBandAverage = (band: { start: number, end: number }) => {
                const size = band.end - band.start + 1;
                if (size <= 0 || bufferLength === 0) return 0;
                let sum = 0;
                for (let i = band.start; i <= band.end; i++) {
                     if (i < bufferLength) sum += audioData[i];
                }
                return sum / size;
            };

            const bassAvg = getBandAverage(bassBand);
            const midAvg = getBandAverage(midBand);
            const highAvg = getBandAverage(highBand);
            const overallAvg = bufferLength > 0 ? audioData.reduce((sum, value) => sum + value, 0) / bufferLength : 0;

            normalizedBass = Math.min(bassAvg / 140.0, 1.0) || 0;
            normalizedMids = Math.min(midAvg / 150.0, 1.0) || 0;
            normalizedHighs = Math.min(highAvg / 120.0, 1.0) || 0;
            const normalizedOverall = Math.min(overallAvg / 140.0, 1.0) || 0;
            
            // Keep the vertex shader deformation as is
            shader.uniforms.inputData.value.set( (1 * audioData[0]) / 255, (0.1 * audioData[1]) / 255, (10 * audioData[2]) / 255, 0 );
            shader.uniforms.outputData.value.set( (2 * audioData[0]) / 255, (0.1 * audioData[1]) / 255, (10 * audioData[2]) / 255, 0 );

            // Update shimmer with a more pronounced non-linear curve for a dynamic, peak-reactive effect.
            const shimmerPower = 10.0; // Further increased power for sharper peak reactivity.
            const shimmerMultiplier = 5.0; // Slightly boost the peak brightness.
            const targetIntensity = Math.pow(normalizedHighs, shimmerPower) * shimmerMultiplier;
            
            // Smoothly interpolate to the target intensity with a faster response time.
            const currentIntensity = shader.uniforms.shimmerIntensity.value;
            shader.uniforms.shimmerIntensity.value = THREE.MathUtils.lerp(currentIntensity, targetIntensity, 0.5);

            // Update pulsating glow with more robust overall data
            const baseIntensity = 1.4;
            const pulseAmount = 0.8;
            const targetIntensityGlow = baseIntensity + normalizedOverall * pulseAmount;
            const smoothingFactor = 0.075;
            sphereMaterial.emissiveIntensity = THREE.MathUtils.lerp(
                sphereMaterial.emissiveIntensity,
                targetIntensityGlow,
                smoothingFactor
            );
        }

        // --- NEW: Dynamic, Audio-Reactive Animation ---
        
        // Scaling: The sphere "breathes" with the bass.
        const baseScale = 1.0;
        const scalePulseAmount = 0.15;
        const targetScale = baseScale + (normalizedBass * scalePulseAmount);
        const scaleVector = new THREE.Vector3(targetScale, targetScale, targetScale);
        this.signalSphere.scale.lerp(scaleVector, 0.1); // Use lerp for smooth scaling

        // Rotation: Mids drive the main rotation, highs add a subtle "wobble".
        const baseRotationSpeed = 0.001;
        const midRotationBoost = normalizedMids * 0.008;
        const highWobbleAmount = normalizedHighs * 0.006;
        
        this.signalSphere.rotation.y += baseRotationSpeed + midRotationBoost;
        // Lerp the wobble rotation for a smoother, more organic feel.
        this.signalSphere.rotation.x = THREE.MathUtils.lerp(this.signalSphere.rotation.x, highWobbleAmount, 0.1);


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