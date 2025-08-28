/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for the Phantom's glowing aura

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
uniform vec3 uGlowColor;
uniform float uOpacity;
uniform float uScanActive;
uniform float uScanLinePosition;
uniform float uScanLineWidth;
uniform float uFlickerIntensity; // New uniform for simulation effect

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

// A simple pseudo-random function (hash)
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // A classic Fresnel effect for a soft, ethereal glow on the edges.
    float fresnel = pow(1.0 - clamp(dot(normalize(vViewPosition), vNormal), 0.0, 1.0), 3.0);
    
    vec3 finalGlowColor = uGlowColor;
    float glowAlpha = (0.3 + fresnel * 0.7) * uOpacity;

    if (uScanActive > 0.5) {
        // Calculate scan line effect based on world Y position
        float scanLineFactor = smoothstep(uScanLineWidth, 0.0, abs(vWorldPosition.y - uScanLinePosition));
        
        // Make the scan line a bright cyan color
        vec3 scanColor = vec3(0.5, 1.0, 1.0);
        
        // Mix the scan color into the glow color
        finalGlowColor = mix(finalGlowColor, scanColor, scanLineFactor);
        
        // The scan line should be more opaque than the rest of the glow
        glowAlpha = max(glowAlpha, scanLineFactor * uOpacity * 1.5);
    }

    if (uFlickerIntensity > 0.0) {
        float flicker = hash(vWorldPosition.xy * 0.1 + vec2(uFlickerIntensity, 0.0));
        flicker = pow(flicker, 2.0); // Make flicker sharper
        glowAlpha *= (1.0 - uFlickerIntensity) + (flicker * uFlickerIntensity * 3.0);
        finalGlowColor = mix(finalGlowColor, vec3(1.0, 1.0, 0.8), flicker * uFlickerIntensity * 0.5); // Flicker towards yellow
    }
    
    gl_FragColor = vec4(finalGlowColor, glowAlpha);
}
`;