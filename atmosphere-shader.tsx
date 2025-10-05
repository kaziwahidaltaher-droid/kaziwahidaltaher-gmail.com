/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const fs = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec2 vUv;
  
  uniform vec3 uAtmosphereColor;
  uniform float uTime;

  // 2D simplex noise for gaseous effect
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
    // Calculate the fresnel effect
    float fresnel = 1.0 - dot(vNormal, vViewDirection);
    fresnel = pow(fresnel, 3.0);
    
    // Create swirling, animated noise for a more dynamic atmosphere
    vec2 animatedUv = vec2(vUv.x * 3.0, vUv.y * 3.0 - uTime * 0.2);
    float noise = snoise(animatedUv);
    noise = (noise + 1.0) * 0.5; // map from [-1, 1] to [0, 1]

    // Combine fresnel with noise for a wispy, layered look
    float alpha = fresnel * (0.5 + noise * 0.5);
    alpha = smoothstep(0.1, 1.0, alpha);

    gl_FragColor = vec4(uAtmosphereColor, alpha);
  }
`;
