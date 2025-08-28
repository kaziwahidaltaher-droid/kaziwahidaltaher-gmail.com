/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Shaders for the majestic OLTARIS phantom

export const vs = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const fs = `
precision highp float;

uniform float time;
uniform float aiState; // 0: idle, 1: thinking, 2: speaking
uniform float audioLevel; // Bass
uniform float uAudioMids; // Mids
uniform float uFade;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

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

void main() {
    float speed = 0.1 + aiState * 0.3; // Idle: 0.1, Thinking: 0.4, Speaking: 0.7
    float turbulence = 1.5 + aiState * 2.0; // More turbulence when thinking/speaking
    
    // Create flowing energy patterns
    vec2 uv = vUv;
    float noise = fbm(uv * vec2(1.0, 4.0) + vec2(0.0, time * speed * -0.5), 4);
    noise = fbm(uv + noise * turbulence, 3);
    noise = (noise + 1.0) * 0.5; // map to 0-1 range

    // Base ethereal color
    vec3 baseColor = vec3(0.6, 0.8, 1.0); // Cool electric blue
    vec3 finalColor = baseColor * noise;

    // --- AI State Visuals ---
    // 'Thinking' state adds a glitchy, high-frequency static.
    float thinkingFactor = smoothstep(0.5, 1.0, aiState) * (1.0 - smoothstep(1.0, 1.5, aiState));
    if (thinkingFactor > 0.0) {
        float staticNoise = fract(sin(vUv.y * 500.0 + time * 15.0) * 43758.5453);
        finalColor += vec3(1.0) * staticNoise * thinkingFactor * 0.3;
    }

    // --- Audio Reactivity ---
    // Bass pulses the overall brightness.
    float audioPulse = audioLevel * 1.8;
    // Mids create bright, flowing hotspots.
    float midHotspot = pow(snoise(vUv * 2.0 + time * (0.2 + uAudioMids * 2.0)), 5.0);
    midHotspot = max(0.0, midHotspot) * uAudioMids * 2.0;

    finalColor += vec3(1.0, 1.0, 1.0) * midHotspot;
    finalColor *= (1.0 + audioPulse);
    
    // --- Majestic Glow (Fresnel/Rim lighting) ---
    float fresnel = pow(1.0 - clamp(dot(normalize(vViewPosition), vNormal), 0.0, 1.0), 3.0);
    finalColor += fresnel * 2.0;

    gl_FragColor = vec4(finalColor, fresnel * 0.5 + noise * 0.5) * uFade;
}
`;