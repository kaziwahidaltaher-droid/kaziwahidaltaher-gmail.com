/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import * as THREE from 'three';

// FIX: Removed incorrect THREE.Shader type annotation. The type is inferred.
export const WarpShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'uProgress': { value: 0.0 }, // 0 (no effect) to 1 (max effect)
        'uStrength': { value: 0.4 }, // How strong the warp is
    },

    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uProgress;
        uniform float uStrength;
        varying vec2 vUv;

        void main() {
            vec2 center = vec2(0.5);
            vec2 toCenter = center - vUv;
            float dist = length(toCenter);

            // Warp effect: pulls pixels towards the center
            float warpAmount = uProgress * uStrength;
            vec2 offset = toCenter * warpAmount * (1.0 - dist);

            // Add a slight zoom effect
            vec2 zoomedUv = vUv * (1.0 - warpAmount) + center * warpAmount;
            vec2 finalUv = zoomedUv + offset;

            // Chromatic aberration for more sci-fi feel
            vec2 R_uv = finalUv + toCenter * 0.015 * warpAmount;
            vec2 G_uv = finalUv;
            vec2 B_uv = finalUv - toCenter * 0.015 * warpAmount;

            float r = texture2D(tDiffuse, R_uv).r;
            float g = texture2D(tDiffuse, G_uv).g;
            float b = texture2D(tDiffuse, B_uv).b;
            
            // Add streaks/tunnel vision at the edges of the screen
            float tunnel = smoothstep(0.4, 0.5, dist);
            tunnel *= (1.0 - smoothstep(0.5, 0.51, dist));
            tunnel *= warpAmount * 3.0; // Make streaks more visible during warp

            // Combine base color with tunnel effect
            vec3 finalColor = vec3(r, g, b) + tunnel;

            // Add a final vignette that intensifies with the warp
            float vignette = 1.0 - (dist * 0.5 * warpAmount);
            
            gl_FragColor = vec4(finalColor * vignette, 1.0);
        }
    `,
};
