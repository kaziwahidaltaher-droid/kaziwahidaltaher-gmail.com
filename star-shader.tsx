
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AURELION - Star Shader
 */

import { glsl_noise_utils } from './shader-utils.tsx';

export const vs = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vPosition;

  void main() {
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fs = glsl_noise_utils + `
  uniform float uTime;
  uniform vec3 uColor1; // core color
  uniform vec3 uColor2; // surface/flare color
  uniform int uStarType; // 1:G-type, 2:K-type, 3:M-type, 4:Pulsar

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vPosition;

  void main() {
    // Fresnel effect for corona/glow
    float fresnel = 1.0 - dot(normalize(vViewPosition), vNormal);
    fresnel = pow(fresnel, 4.0);

    vec3 finalColor;

    if (uStarType == 4) { // Pulsar
        float pulse = 0.5 + 0.5 * sin(uTime * 15.0);
        pulse = pow(pulse, 20.0); // Sharpen the pulse
        
        // Add rotating beams
        float beam = sin(vPosition.x * 5.0 + uTime * 2.0) * sin(vPosition.y * 5.0 + uTime * 2.0);
        beam = smoothstep(0.8, 1.0, beam) * 2.0;

        finalColor = uColor1 * pulse * 2.0;
        finalColor += fresnel * uColor2 * (pulse * 5.0 + 0.2);
        finalColor += beam * uColor2 * 0.8;
    } else { // G, K, M types
        vec3 p = normalize(vPosition) * 3.0 + uTime * 0.1;
        float noise = fbm(p, 4);
        noise = smoothstep(0.2, 0.8, noise);
        vec3 surfaceColor = mix(uColor1, uColor2, noise);
        
        // Sun spots for G-type
        if (uStarType == 1) {
            float spots = fbm(normalize(vPosition) * 8.0 + uTime * 0.05, 3);
            spots = smoothstep(0.6, 0.7, spots);
            surfaceColor = mix(surfaceColor, uColor1 * 0.5, spots);
        }

        finalColor = surfaceColor + fresnel * uColor2 * 2.0;
    }

    gl_FragColor = vec4(finalColor, fresnel * 0.5 + 0.5);
  }
`;