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

#define MAX_NEBULAE 5

uniform float time;
uniform float uAudioLevel; // Overall audio
uniform float uFade;
uniform vec3 uSunPosition;
uniform vec3 uSunColor;
uniform vec3 uNebulaPositions[MAX_NEBULAE];
uniform vec3 uNebulaColors[MAX_NEBULAE];
uniform int uNumNebulae;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

// 2D simplex noise for flicker effect
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}


void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    // --- 1. Reflection Calculation ---
    vec3 reflectDir = reflect(-viewDir, normal);
    vec3 reflectedColor = vec3(0.0);
    float metallicFactor = 0.8; // How metallic the surface is

    // Sun reflection (sharp highlight)
    vec3 sunDir = normalize(uSunPosition - vWorldPosition);
    float sunDot = max(dot(reflectDir, sunDir), 0.0);
    reflectedColor += uSunColor * pow(sunDot, 32.0) * 2.0;

    // Nebula reflections (diffuse highlights)
    for (int i = 0; i < MAX_NEBULAE; i++) {
        if (i >= uNumNebulae) break;
        vec3 nebulaDir = normalize(uNebulaPositions[i] - vWorldPosition);
        float nebulaDot = max(dot(reflectDir, nebulaDir), 0.0);
        reflectedColor += uNebulaColors[i] * pow(nebulaDot, 6.0) * 0.4;
    }

    // --- 2. Emissive Glow Animation ---
    vec3 baseColor = vec3(0.7, 0.85, 1.0); // A cool, energetic blue/white
    
    // Audio pulse (sharp, punchy)
    float audioPulse = pow(uAudioLevel, 3.0) * 2.5;

    // Energy flicker (subtle, high-frequency noise)
    float flicker = snoise(vWorldPosition.xy * 15.0 + time * 40.0);
    flicker = pow(flicker * 0.5 + 0.5, 12.0) * 0.3;

    float coreGlow = 0.2;
    vec3 emissiveColor = baseColor * (coreGlow + audioPulse + flicker);
    
    // --- 3. Final Composition ---
    // Fresnel effect for edge glow
    float fresnel = pow(1.0 - clamp(dot(viewDir, normal), 0.0, 1.0), 3.0);
    
    // Combine reflected light with emissive and fresnel
    vec3 finalColor = reflectedColor * metallicFactor + emissiveColor + baseColor * fresnel * 2.0;
    
    // Alpha is based on fresnel to make the center more transparent and edges solid
    float alpha = fresnel * 0.9 + 0.1;

    gl_FragColor = vec4(finalColor, alpha * uFade);
}
`;