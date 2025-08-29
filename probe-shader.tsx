/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for the Aurelion Probe

export const vs = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const fs = `
precision highp float;

uniform float time;
uniform float uFade;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    // --- Reflection Calculation ---
    vec3 reflectDir = reflect(-viewDir, normal);
    // Simple environment map simulation
    float pseudoEnv = (reflectDir.y + 1.0) * 0.5;
    vec3 reflectedColor = mix(vec3(0.1, 0.1, 0.2), vec3(0.5, 0.7, 1.0), pseudoEnv);
    float metallicFactor = 0.9;

    // --- Emissive Glow Animation ---
    vec3 baseColor = vec3(0.7, 0.85, 1.0); // A cool, energetic blue/white
    
    // A subtle, slow pulse
    float pulse = (sin(time * 2.0) * 0.5 + 0.5) * 0.2 + 0.1;
    vec3 emissiveColor = baseColor * pulse;
    
    // --- Final Composition ---
    // Fresnel effect for edge glow
    float fresnel = pow(1.0 - clamp(dot(viewDir, normal), 0.0, 1.0), 3.0);
    
    // Combine reflected light with emissive and fresnel
    vec3 finalColor = reflectedColor * metallicFactor + emissiveColor + baseColor * fresnel * 2.0;
    
    // Alpha is based on fresnel to make the center more transparent and edges solid
    float alpha = fresnel * 0.9 + 0.1;

    gl_FragColor = vec4(finalColor, alpha * uFade);
}
`;