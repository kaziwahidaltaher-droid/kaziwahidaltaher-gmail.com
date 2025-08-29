/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for the interactive human phantom model, including its glow effect.

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
uniform vec3 uGlowColor;
uniform float uOpacity;
uniform float uIsGlow; // 0 for core, 1 for glow

// Feature Uniforms
uniform float aiState; // 0: idle, 1: thinking, 2: speaking
uniform float uAudioBass;
uniform float uAudioMids;
uniform float uAudioHighs;
uniform vec2 uHeartbeat; // x: radius, y: thickness

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

void main() {
    float fresnel = pow(1.0 - clamp(dot(normalize(vViewPosition), vNormal), 0.0, 1.0), 3.0);
    
    // Base texture and color
    float speed = 0.1 + aiState * 0.3;
    float turbulence = 1.0 + aiState * 1.5;
    float energyPattern = snoise(vWorldPosition.xy * 0.5 + time * speed);
    energyPattern = snoise(vWorldPosition.xy + energyPattern * turbulence);
    energyPattern = (energyPattern + 1.0) * 0.5;

    vec3 finalColor = uGlowColor * energyPattern * 0.7;
    
    // Audio Reactivity
    finalColor += uGlowColor * uAudioBass * 1.5; // Bass pulses brightness
    finalColor += vec3(0.8, 1.0, 1.0) * uAudioMids * 0.5; // Mids add cyan highlights

    // 'Thinking' glitch effect
    float thinkingFactor = smoothstep(0.5, 1.0, aiState) * (1.0 - smoothstep(1.0, 1.5, aiState));
    if (thinkingFactor > 0.0) {
        float staticNoise = fract(sin(vWorldPosition.y * 500.0 + time * 20.0) * 43758.5453);
        finalColor += vec3(1.0) * staticNoise * thinkingFactor * 0.6;
    }

    // Flicker for mission simulation
    if (uFlickerIntensity > 0.01) {
        finalColor *= 0.5 + uFlickerIntensity * 1.5;
    }

    // Scanline
    if (uScanActive > 0.5) {
        float scanDist = abs(vWorldPosition.y - uScanLinePosition);
        float scanGlow = 1.0 - smoothstep(0.0, uScanLineWidth, scanDist);
        finalColor += vec3(1.0, 1.0, 1.0) * pow(scanGlow, 2.0) * 2.5;
    }
    
    // Heartbeat from cosmic web
    float distToCenter = length(vWorldPosition.xz); // Use XZ plane for a ring effect around the model
    float waveRadius = uHeartbeat.x;
    float waveThickness = uHeartbeat.y;
    float waveFactor = smoothstep(waveRadius - waveThickness, waveRadius, distToCenter) - smoothstep(waveRadius, waveRadius + waveThickness, distToCenter);
    if (waveFactor > 0.01) {
        finalColor += vec3(1.0, 0.8, 0.6) * waveFactor * 2.0;
    }

    // Add base fresnel glow to everything
    finalColor += uGlowColor * fresnel * 0.5;

    // Final Alpha calculation
    float alpha;
    if (uIsGlow > 0.5) {
        // Glow mesh is a soft fresnel effect
        alpha = fresnel * 0.7;
    } else {
        // Core mesh is more solid, with some texture and a fresnel highlight
        alpha = fresnel * 0.8 + energyPattern * 0.2;
    }

    gl_FragColor = vec4(finalColor, alpha * uOpacity);
}
`;