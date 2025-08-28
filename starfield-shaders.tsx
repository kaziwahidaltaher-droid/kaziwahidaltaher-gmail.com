/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for the background starfield.

export const vs = `
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

uniform float time;
uniform float uAudioMids;

attribute float aStarId;
varying float vStarId;

void main() {
    vStarId = aStarId;
    
    // --- REFINED Subtle Drift Animation ---
    vec2 seed = vec2(aStarId * 0.13, aStarId * 0.27);
    
    // Layer 1: Slow, large-scale drift
    float time1 = time * 0.04; // Slightly faster base drift
    vec3 displacement1;
    displacement1.x = snoise(seed + time1);
    displacement1.y = snoise(seed.yx + time1);
    displacement1.z = snoise(seed + time1 * 0.5);
    
    // Layer 2: Faster, smaller-scale perturbation
    float time2 = time * 0.1;
    vec3 displacement2;
    displacement2.x = snoise(seed * 2.1 + time2);
    displacement2.y = snoise(seed.yx * 2.1 + time2);
    displacement2.z = snoise(seed * 2.1 + time2 * 0.5);

    // Combine the displacements for a more organic motion
    vec3 totalDisplacement = displacement1 * 0.7 + displacement2 * 0.3;

    // The magnitude of the drift is small but increases with audio.
    float driftMagnitude = 2.5 + uAudioMids * 5.0; // Increased audio reactivity
    vec3 animatedPosition = position + (totalDisplacement * driftMagnitude);
    
    // Standard point projection.
    vec4 mvPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation to make points in the distance smaller.
    gl_PointSize = 1.5 * (1000.0 / -mvPosition.z);
}
`;

export const fs = `
  uniform float time;
  uniform float uAudioHighs;
  uniform float uAudioMids;
  varying float vStarId;

  void main() {
    // --- Enhanced Twinkling Effect ---
    // A base, slow pulse for general brightness variation.
    float slowPulse = sin(time * 0.5 + vStarId * 2.5) * 0.5 + 0.5;
    slowPulse = pow(slowPulse, 5.0); // Sharpen the pulse into a glint.

    // A faster, sharper shimmer for a sparkling effect.
    float fastShimmer = sin(time * 7.0 + vStarId * 1.8);
    fastShimmer = pow(fastShimmer, 10.0) * 0.5; // Creates very sharp, occasional glints.

    // Combine the layers for a more complex twinkle.
    float twinkle = 0.5 + slowPulse * 0.4 + fastShimmer * 0.3;
    
    // Add audio reactivity, making stars sparkle more with high frequencies.
    twinkle += uAudioHighs * 1.5;
    twinkle = clamp(twinkle, 0.5, 1.5); // Boost twinkle with audio, but clamp it.

    // --- Soft circular point ---
    vec2 p = gl_PointCoord - vec2(0.5);
    float dist = length(p);
    
    if (dist > 0.5) {
      discard;
    }
    
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
    
    // --- Audio Reactive Color ---
    vec3 baseColor = vec3(1.0); // Base color is white.
    vec3 pulseColor = vec3(1.0, 0.8, 0.5); // Shift color towards a warm yellow/orange.
    vec3 finalColor = mix(baseColor, pulseColor, uAudioMids * 0.6);

    // Final color is modulated by the twinkle and alpha.
    gl_FragColor = vec4(finalColor * twinkle, alpha);
  }
`;