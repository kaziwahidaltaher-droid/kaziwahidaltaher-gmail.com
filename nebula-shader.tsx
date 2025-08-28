/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for procedural, animated nebulae.

export const vs = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fs = `
precision highp float;

uniform float time;
uniform vec3 color1;
uniform vec3 color2;
varying vec2 vUv;

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
    for (int i = 0; i < 6; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

void main() {
    // A secondary, slow-moving noise field to warp the main coordinates for a flowing effect
    vec2 motion = vec2(fbm(vUv * 0.5 + time * 0.01), fbm(vUv * 0.5 + time * 0.01 + 10.0));
    
    // Apply the motion warp and a slow, constant drift
    vec2 p = vUv * 2.5 + motion * 0.3;
    p.x -= time * 0.02; // Slow horizontal drift
    
    float noise = fbm(p);
    noise = (noise + 1.0) * 0.5; // Remap from [-1, 1] to [0, 1]

    // Create a wispy, gaseous look by raising noise to a higher power
    float alpha = pow(noise, 3.0);

    // Color mixing
    vec3 finalColor = mix(color1, color2, noise);

    // Fade out at the edges of the plane to avoid hard cuts
    float edgeFade = smoothstep(0.0, 0.4, vUv.x) * (1.0 - smoothstep(0.6, 1.0, vUv.x));
    edgeFade *= smoothstep(0.0, 0.4, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
    
    gl_FragColor = vec4(finalColor, alpha * edgeFade * 0.5); // Make it quite transparent
}
`;