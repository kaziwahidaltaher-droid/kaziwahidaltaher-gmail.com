/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Shaders for the majestic OLTARIS phantom

export const vs = `
uniform float time;
uniform float aiState; // 0: idle, 1: thinking, 2: speaking
uniform float audioLevel; // Bass for pulsating displacement

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

// 3D Simplex Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Fractal Brownian Motion
float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < octaves; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}


void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    float speed = 0.1 + aiState * 0.2;
    float turbulence = 25.0 + aiState * 25.0; // Thinking/Speaking makes it more chaotic
    
    // Displace vertices along their normals using FBM noise
    float displacement = fbm(normal * 2.0 + time * speed, 3) * turbulence;

    // Add a pulsating effect based on audio bass
    displacement += audioLevel * 40.0;
    
    vec3 newPosition = position + normal * displacement;
    
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
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
    // OPTIMIZATION: Reduced FBM octaves for better performance on fragment shader.
    vec2 uv = vUv;
    float noise = fbm(uv * vec2(1.0, 4.0) + vec2(0.0, time * speed * -0.5), 2);
    noise = fbm(uv + noise * turbulence, 1);
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