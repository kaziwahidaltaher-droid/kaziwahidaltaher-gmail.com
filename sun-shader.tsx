
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const vs = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

const fs = `
precision highp float;

uniform float time;
uniform float aiState; // 0: idle, 1: thinking, 2: speaking
uniform float audioLevel; // Bass
uniform float uAudioMids; // Mids
uniform vec3 uColor; // Base color from AI
uniform float uFade;

varying vec2 vUv;
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
    for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

void main() {
    // --- Sun Surface ---
    float speed = 0.1 + aiState * 0.4; // Idle: 0.1, Thinking: 0.5, Speaking: 0.9
    float turbulence = 0.5 + aiState * 0.4;
    
    vec2 uv = vUv;
    float noise = fbm(uv * 4.0 + time * speed);
    noise = fbm(uv + noise * turbulence);

    // Derive color palette from the AI-provided base color
    vec3 color1 = uColor * 0.8; // A darker, more saturated version
    vec3 color2 = uColor + vec3(0.2, 0.2, 0.1); // A brighter, slightly yellower version
    vec3 finalColor = mix(color1, color2, noise);
    
    // --- AI State Visuals ---
    // 'Thinking' state adds a cool, high-frequency static effect.
    float thinkingFactor = smoothstep(0.5, 1.0, aiState) * (1.0 - smoothstep(1.0, 1.5, aiState));
    if (thinkingFactor > 0.0) {
        float staticNoise = snoise(vUv * 80.0 + time * 20.0);
        staticNoise = pow(staticNoise, 2.0) * 0.5;
        vec3 thinkingColor = vec3(0.7, 0.8, 1.0) * staticNoise;
        finalColor += thinkingColor * thinkingFactor;
    }

    // --- Audio Reactivity ---
    float audioPulse = audioLevel * 1.5; // Pulse brightness with bass
    vec3 midGlowColor = vec3(0.8, 1.0, 1.0); // Cyan glow for mids
    finalColor = mix(finalColor, midGlowColor, uAudioMids * 0.3); // Mix in mid-range glow

    // --- Brightness & Rim ---
    float baseBrightness = 1.2 + aiState * 0.4;
    float speakingPulse = (aiState > 1.5) ? (0.5 * sin(time * 10.0) + 0.5) : 0.0; // Pulse when speaking
    finalColor *= baseBrightness + speakingPulse * 0.5 + audioPulse;
    
    float rim = 1.0 - clamp(dot(normalize(vViewPosition), vNormal), 0.0, 1.0);
    finalColor += pow(rim, 2.0) * 1.5; // Wider, brighter corona

    gl_FragColor = vec4(finalColor, uFade);
}
`;

export { fs, vs };
