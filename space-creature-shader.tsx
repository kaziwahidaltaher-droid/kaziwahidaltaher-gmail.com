/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uAmplitude;
  uniform float uFrequency;

  varying vec2 vUv;
  varying float vRim;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Undulating motion along the length of the tube (x-axis)
    pos.y += sin(pos.x * uFrequency + uTime * uSpeed) * uAmplitude;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Rim lighting calculation
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec3 worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    vec3 cameraDirection = normalize(cameraPosition - worldPosition);
    vRim = 1.0 - dot(worldNormal, cameraDirection);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fs = `
  uniform float uTime;
  uniform vec3 uColor;

  varying vec2 vUv;
  varying float vRim;

  // 2D Simplex noise
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
    // Scrolling noise for texture
    vec2 noiseUv = vec2(vUv.x * 2.0 - uTime * 0.1, vUv.y);
    float noise = snoise(noiseUv * 5.0);
    noise = (noise + 1.0) * 0.5;
    
    // Bioluminescent pattern
    float pattern = smoothstep(0.6, 1.0, noise);
    
    // Rim glow
    float rim = pow(vRim, 3.0);
    vec3 rimColor = uColor * 2.0;
    
    // Final color
    vec3 baseColor = uColor * 0.3;
    vec3 finalColor = baseColor + pattern * uColor * 0.7 + rim * rimColor;

    gl_FragColor = vec4(finalColor, rim * 0.8 + pattern * 0.2);
  }
`;