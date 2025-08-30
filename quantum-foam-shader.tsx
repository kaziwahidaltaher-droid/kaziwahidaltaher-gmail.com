/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for the Quantum Foam visualization

export const vs = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

export const fs = `
precision highp float;

uniform float time;
uniform vec2 uResolution;
uniform float uAudioBass;
uniform float uAudioMids;
uniform float uAudioHighs;
uniform float uFade;

varying vec2 vUv;

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
    vec2 uv = vUv - 0.5;
    uv.x *= uResolution.x / uResolution.y;

    float dynamicTime = time * (0.05 + uAudioMids * 0.2);

    // Multi-layered, domain-warped FBM for a chaotic, fluid look
    vec2 q = vec2(fbm(uv + dynamicTime * 0.2, 5), fbm(uv + dynamicTime * 0.2 + vec2(5.2, 1.3), 5));
    vec2 r = vec2(fbm(uv + q * 1.5 + dynamicTime * 0.8, 4), fbm(uv + q * 1.5 + dynamicTime * 0.8 + vec2(8.3, 2.8), 4));
    float noise = fbm(uv * 2.0 + r * 1.2, 6);
    noise = (noise + 1.0) * 0.5; // map to 0-1

    // Color palette based on noise and audio reactivity
    vec3 color1 = vec3(0.0, 0.1, 0.3) + uAudioBass * vec3(0.3, 0.0, 0.1); // Deep blue, pulses red with bass
    vec3 color2 = vec3(0.5, 0.0, 1.0) + uAudioMids * vec3(0.2, 0.5, 0.0); // Violet, pulses green with mids
    vec3 color3 = vec3(1.0, 0.9, 0.8) + uAudioHighs * vec3(0.0, 0.2, 0.4); // Bright white, pulses cyan with highs

    // Create sharp, branching structures from the noise field
    float structure = smoothstep(0.45, 0.5, noise) * (1.0 - smoothstep(0.5, 0.55, noise));

    vec3 finalColor = mix(color1, color2, smoothstep(0.0, 0.5, noise));
    finalColor = mix(finalColor, color3, smoothstep(0.5, 1.0, noise));

    // Additive glow for the structures
    finalColor += color3 * structure * (1.0 + uAudioHighs * 5.0);
    
    // Add a subtle vignette
    float vignette = 1.0 - length(uv) * 0.8;
    finalColor *= vignette;

    gl_FragColor = vec4(finalColor, uFade);
}
`;