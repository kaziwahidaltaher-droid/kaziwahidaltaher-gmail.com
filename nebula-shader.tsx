/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for procedural, animated nebulae.

export const vs = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fs = `
// OPTIMIZATION: Lowered precision for performance gains on mobile/integrated GPUs.
precision mediump float;

uniform float time;
uniform vec3 color1;
uniform vec3 color2;
uniform float uAudioMids;  // For swirl speed
uniform float uAudioHighs; // For brightness
uniform float uAudioBass;  // For alpha pulsing
uniform float uFade;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

// 2D simplex noise
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

// Fractal Brownian Motion
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 2.0;
    // OPTIMIZATION: Reduced from 8 octaves to 5 for a significant performance gain.
    for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5; // Standard falloff
        frequency *= 2.0;
    }
    return value;
}

void main() {
    float dynamicTime = time * (1.0 + uAudioMids * 8.0);
    float angle = dynamicTime * 0.05;
    mat2 rotationMatrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 rotatedUv = vUv - 0.5;
    rotatedUv = rotationMatrix * rotatedUv;
    rotatedUv += 0.5;

    float timeScaledForChurn = dynamicTime * 0.02;

    // OPTIMIZATION: Simplified domain warping from 4 layers to 2.
    // This reduces the number of expensive fbm calls from 9 to 5 per fragment.
    // Multipliers are increased slightly to retain visual complexity.
    vec2 q = vec2(fbm(rotatedUv + timeScaledForChurn * 0.5), fbm(rotatedUv + timeScaledForChurn * 0.5 + vec2(5.2,1.3)));
    vec2 r = vec2(fbm(rotatedUv + q*2.5 + timeScaledForChurn * 1.5), fbm(rotatedUv + q*2.5 + timeScaledForChurn * 1.5 + vec2(8.3,2.8)));

    // Final noise lookup now uses the 'r' layer, and its frequency is increased to compensate for fewer layers.
    float noise = fbm(rotatedUv*3.0 + r*1.5);

    // --- Refined Alpha: Pronounced Cores & Wispy Tendrils ---
    float remapped_noise = smoothstep(0.3, 0.6, noise);
    float core_alpha = pow(remapped_noise, 15.0);
    float wisp_alpha = pow(remapped_noise, 4.0) * 0.2;
    float alpha = core_alpha + wisp_alpha;

    // --- Volumetric Color & Audio-Reactive Hotspots ---
    vec3 baseColor = mix(color1, color2, remapped_noise);
    vec3 hotColor = (color1 + color2 + vec3(1.0, 1.0, 0.8)) * 0.5;
    float hotspotMix = smoothstep(0.8, 1.0, remapped_noise) * (1.0 + uAudioHighs * 12.0);
    vec3 finalColor = mix(baseColor, hotColor, hotspotMix);

    // --- Volumetric Rim Lighting ---
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rimDot = 1.0 - clamp(dot(viewDir, normalize(vNormal)), 0.0, 1.0);
    float rim = pow(rimDot, 3.0) * 2.0;
    
    finalColor += (hotColor * 0.8 + baseColor * 0.2) * rim * 1.5;
    alpha += rim * 0.5;

    // --- Final Composition ---
    float edgeFade = smoothstep(0.0, 0.5, vUv.x) * (1.0 - smoothstep(0.5, 1.0, vUv.x));
    edgeFade *= smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
    float bassPulse = uAudioBass * 0.4;
    
    gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0) * edgeFade * (0.6 + bassPulse) * uFade);
}
`;
