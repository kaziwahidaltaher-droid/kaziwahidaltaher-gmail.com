/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for the Human Phantom, incorporating all major visual features.

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
uniform float uOpacity;
uniform vec3 uGlowColor;

// Feature Uniforms
uniform float aiState; // 0: idle, 1: thinking, 2: speaking
uniform float uAudioBass;
uniform float uAudioMids;
uniform float uAudioHighs;
uniform vec2 uHeartbeat; // x: radius, y: thickness
uniform float uIsGlow; // 0.0 for core, 1.0 for glow

// Mission Uniforms
uniform float uScanActive;
uniform float uScanLinePosition;
uniform float uScanLineWidth;
uniform float uFlickerIntensity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

// 2D simplex noise function
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
    m = m*m; m = m*m;
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

// Fractal Brownian Motion
float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 2.0;
    for (int i = 0; i < octaves; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // 1. BASE ENERGY PATTERN (FBM)
    float speed = 0.1 + aiState * 0.4 + uAudioMids * 1.5;
    float turbulence = 1.0 + aiState * 2.0;
    vec2 uv = vWorldPosition.xy;
    float noise = fbm(uv * vec2(0.1, 0.5) + vec2(0.0, time * speed * -0.2), 4);
    noise = fbm(uv + noise * turbulence, 3);
    noise = (noise + 1.0) * 0.5;

    // 2. BASE COLOR & FRESNEL
    vec3 finalColor = uGlowColor * noise;
    float fresnel = pow(1.0 - clamp(dot(normalize(vViewPosition), vNormal), 0.0, 1.0), 2.0);
    
    // 3. AI STATE EFFECTS
    float thinkingFactor = smoothstep(0.5, 1.5, aiState) * (1.0 - smoothstep(1.5, 2.0, aiState));
    if (thinkingFactor > 0.0) {
        float staticNoise = fract(sin(vWorldPosition.y * 300.0 + time * 25.0) * 43758.5453);
        finalColor += vec3(0.8, 1.0, 1.0) * staticNoise * thinkingFactor * 0.5;
    }

    // 4. AUDIO REACTIVITY
    float bassPulse = uAudioBass * 1.5;
    float shimmer = pow(snoise(vWorldPosition.xy * 20.0 + time * 30.0), 12.0);
    shimmer = max(0.0, shimmer) * uAudioHighs * 2.5;
    finalColor += vec3(1.0) * shimmer;

    // 5. GALACTIC HEARTBEAT
    float distFromHeart = length(vWorldPosition.y - 20.0); // Heart is around y=20
    float waveRadius = uHeartbeat.x;
    float waveThickness = uHeartbeat.y * 0.3; // Make phantom wave thinner
    float waveFactor = smoothstep(waveRadius - waveThickness, waveRadius, distFromHeart) - smoothstep(waveRadius, waveRadius + waveThickness, distFromHeart);
    if (waveFactor > 0.01) {
        vec3 waveColor = vec3(1.0, 0.9, 0.7);
        finalColor += waveColor * waveFactor * 3.0;
    }

    // 6. MISSION EFFECTS
    if (uScanActive > 0.5) {
        float scanLineFactor = smoothstep(uScanLineWidth, 0.0, abs(vWorldPosition.y - uScanLinePosition));
        vec3 scanColor = vec3(0.5, 1.0, 1.0);
        finalColor = mix(finalColor, scanColor, scanLineFactor * 2.0);
    }
    if (uFlickerIntensity > 0.0) {
        float flicker = hash(vWorldPosition.xy * 0.1 + vec2(uFlickerIntensity, time));
        finalColor = mix(finalColor, vec3(1.0, 1.0, 0.8), flicker * uFlickerIntensity * 0.8);
    }

    // 7. FINAL COMPOSITION (CORE vs GLOW)
    finalColor *= (1.0 + bassPulse);
    finalColor += fresnel * 2.5;

    float finalAlpha;
    if (uIsGlow > 0.5) {
        // Glow is mostly fresnel, wispy
        finalAlpha = fresnel * 0.8 + noise * 0.1;
    } else {
        // Core is more solid, defined by noise
        finalAlpha = noise * 0.6 + fresnel * 0.3;
    }
    
    // Scan line should be more opaque
    if (uScanActive > 0.5) {
        float scanLineFactor = smoothstep(uScanLineWidth, 0.0, abs(vWorldPosition.y - uScanLinePosition));
        finalAlpha = max(finalAlpha, scanLineFactor);
    }
    if (uFlickerIntensity > 0.0) {
        finalAlpha *= (1.0 - uFlickerIntensity) + (hash(vWorldPosition.yz + time) * uFlickerIntensity * 3.0);
    }

    gl_FragColor = vec4(finalColor, finalAlpha * uOpacity);
}
