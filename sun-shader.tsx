/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fs = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec2 vUv;

  // 2D Simplex noise for procedural textures
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
  
  // Fractal Brownian Motion for more complex noise
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
    // Animate texture coordinates to create motion
    vec2 uv1 = vUv * 4.0 + vec2(uTime * 0.1, uTime * 0.05);
    vec2 uv2 = vUv * 6.0 - vec2(uTime * 0.08, uTime * 0.12);

    // Combine multiple layers of noise for a turbulent effect
    float noise1 = fbm(uv1);
    float noise2 = fbm(uv2);
    float combinedNoise = (noise1 + noise2) * 0.5;

    // Create bright convection cells from the noise
    float cells = smoothstep(0.4, 0.6, abs(combinedNoise));
    
    // Base color with turbulent patterns
    vec3 color = vec3(1.0, 0.4, 0.1) * (0.5 + cells * 0.8);

    // Add bright hotspots
    float hotspots = smoothstep(0.7, 0.75, abs(combinedNoise));
    color = mix(color, vec3(1.0, 0.9, 0.5), hotspots);

    // Add a glowing edge effect (fresnel) for the limb
    float fresnel = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    fresnel = pow(fresnel, 4.0);
    color += vec3(1.0, 0.7, 0.2) * fresnel * 1.2;

    gl_FragColor = vec4(color, 1.0);
  }
`;
