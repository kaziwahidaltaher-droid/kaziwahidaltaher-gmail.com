/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  uniform float uTime;
  uniform sampler2D uAudioData;
  uniform int uState;
  uniform float uHover;
  uniform float uClickPulse;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement;

  // 2D Simplex noise function for organic-looking deformation
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
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Calculate overall audio level from frequency data
    float audioLevel = 0.0;
    audioLevel += texture(uAudioData, vec2(0.1, 0.5)).r; // Bass
    audioLevel += texture(uAudioData, vec2(0.5, 0.5)).r; // Mids
    audioLevel += texture(uAudioData, vec2(0.8, 0.5)).r; // Highs
    audioLevel *= 0.33; // Average
    
    // Base "breathing" animation using simplex noise
    float noiseFrequency = 2.0;
    float noiseAmplitude = 0.1;
    float noise = snoise(position.xy * noiseFrequency + uTime * 0.5) * noiseAmplitude;

    // Combine effects based on state
    float displacement = noise; // Start with the base breathing
    if (uState > 0) { // If listening or speaking
        displacement += audioLevel * 2.5; 
    }
    
    // Add hover and click effects
    displacement += uHover * 0.1; // Slight size increase on hover
    displacement += uClickPulse * 0.5; // Pronounced pulse on click

    vec3 displacedPosition = position + normal * displacement;

    vDisplacement = displacement; // Pass to fragment shader
    vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fs = `
  uniform float uTime;
  uniform sampler2D uAudioData;
  uniform int uState; // 0: idle, 1: listening, 2: speaking
  uniform float uHover;
  uniform float uClickPulse;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement; // Received from vertex shader

  float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    // Fresnel effect for a nice rim light
    float fresnel = 1.0 - dot(normalize(vViewPosition), vNormal);
    fresnel = pow(fresnel, 2.5);

    // Set base color based on state
    vec3 baseColor = vec3(0.1, 0.5, 1.0); // Default idle color (cyan)
    if (uState == 1) { // Listening
        baseColor = vec3(0.2, 0.8, 1.0); // Brighter cyan/blue
    } else if (uState == 2) { // Speaking
        baseColor = vec3(0.2, 1.0, 0.5); // Green
    }

    // Add hover effect to color
    if (uHover > 0.5) {
        baseColor *= 1.2;
    }

    // Modulate color intensity based on displacement and click
    float intensity = 0.5 + vDisplacement * 2.0 + uClickPulse * 2.0;

    // Create a subtle energy pattern on the surface
    float pattern = sin(vUv.y * 20.0 + uTime * -1.5);
    pattern = smoothstep(0.0, 1.0, pattern);
    pattern *= (0.5 + texture(uAudioData, vec2(0.8, 0.5)).r * 2.5);

    vec3 glowColor = mix(baseColor * 0.5, vec3(0.5, 1.0, 1.0), pattern);
    
    // Combine effects
    vec3 finalColor = glowColor * intensity;
    finalColor += fresnel * baseColor * (intensity + 0.5);
    finalColor += rand(vUv + uTime * 0.01) * 0.05; // Subtle noise

    // Final alpha based on fresnel and displacement for a soft, volumetric look
    float alpha = fresnel * (0.3 + vDisplacement * 0.7);
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;