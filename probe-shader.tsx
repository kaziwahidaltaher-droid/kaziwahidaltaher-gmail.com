/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for the Aurelion Probe

export const vs = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const fs = `
precision highp float;

uniform float time;
uniform float uAudioLevel; // Overall audio
uniform float uFade;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vec3 baseColor = vec3(0.8, 0.9, 1.0); // Cool white/blue
    
    // Fresnel effect for a glowing edge
    float fresnel = 1.0 - clamp(dot(normalize(vViewPosition), vNormal), 0.0, 1.0);
    fresnel = pow(fresnel, 2.5);
    
    // Pulsing effect based on time and audio
    float pulse = sin(time * 5.0) * 0.5 + 0.5;
    pulse = (pulse * 0.5 + 0.5) + uAudioLevel * 0.5;
    
    vec3 finalColor = baseColor * pulse + fresnel * baseColor;
    
    gl_FragColor = vec4(finalColor, (fresnel * 0.8 + 0.2) * uFade);
}
`;