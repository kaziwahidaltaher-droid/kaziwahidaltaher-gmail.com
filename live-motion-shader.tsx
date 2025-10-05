/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  uniform float uTime;
  uniform sampler2D uAudioData;
  uniform int uState; // 0:idle, 1:listening, 2:speaking, 3:thinking
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
    
    float audioLevel = texture(uAudioData, vec2(0.5, 0.5)).r;
    
    float displacement = 0.0;

    if (uState == 0) { // Idle
        float noise = snoise(position.xy * 2.0 + uTime * 0.3) * 0.05;
        displacement = noise;
    } else if (uState == 1) { // Listening
        displacement = snoise(position.xy * 2.0 + uTime * 0.3) * 0.05 + audioLevel * 0.3;
    } else if (uState == 2) { // Speaking
        displacement = snoise(position.yz * 3.0 + uTime * 0.8) * 0.15 + audioLevel * 0.1;
    } else { // Thinking
        displacement = snoise(position.xz * 4.0 + uTime * 1.5) * 0.2;
    }
    
    vec3 displacedPosition = position + normal * displacement;

    vDisplacement = displacement;
    vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fs = `
  uniform float uTime;
  uniform int uState; // 0: idle, 1: listening, 2: speaking, 3: thinking

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDisplacement;

  float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    float fresnel = 1.0 - dot(normalize(vViewPosition), vNormal);
    fresnel = pow(fresnel, 2.5);

    vec3 baseColor = vec3(0.1, 0.5, 1.0); // Idle: cyan
    if (uState == 1) { // Listening: brighter blue
        baseColor = vec3(0.2, 0.8, 1.0); 
    } else if (uState == 2) { // Speaking: green
        baseColor = vec3(0.2, 1.0, 0.5);
    } else if (uState == 3) { // Thinking: purple
        baseColor = vec3(0.8, 0.4, 1.0);
    }

    float intensity = 0.5 + abs(vDisplacement) * 2.0;

    float pattern = 0.0;
    if (uState == 2 || uState == 3) { // More active pattern when speaking/thinking
        pattern = sin(vUv.y * 20.0 + uTime * -1.5);
        pattern = smoothstep(0.0, 1.0, pattern);
    }
    
    vec3 glowColor = mix(baseColor * 0.5, vec3(0.8, 0.9, 1.0), pattern);
    
    vec3 finalColor = glowColor * intensity;
    finalColor += fresnel * baseColor * (intensity + 0.5);
    finalColor += rand(vUv + uTime * 0.01) * 0.05;

    float alpha = fresnel * (0.3 + abs(vDisplacement) * 0.7);
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;