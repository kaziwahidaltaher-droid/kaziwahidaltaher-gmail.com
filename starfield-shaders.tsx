/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Vertex Shader for the starfield
export const vs = `
  attribute vec3 color;
  attribute float aScale;
  uniform float uTime;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying vec3 vPosition;

  // 2D Simplex noise for shimmering effect
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
    vColor = color; // Pass vertex color to fragment shader
    vPosition = position; // Pass position to fragment shader
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Add a subtle positional shimmer based on simplex noise
    float shimmerX = snoise(position.xy * 0.5 + uTime * 0.1) * 0.02 * aScale;
    float shimmerY = snoise(position.yz * 0.5 + uTime * 0.1) * 0.02 * aScale;
    mvPosition.xy += vec2(shimmerX, shimmerY);
    
    // Make stars scale with distance and pixel ratio
    gl_PointSize = aScale * uPixelRatio * (300.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment Shader for the starfield, with an enhanced twinkling effect
export const fs = `
  uniform float uTime;
  varying vec3 vColor;
  varying vec3 vPosition;

  void main() {
    // --- Twinkle Calculation (Less Frequent, More Gradual) ---
    float freq1 = 0.6 + vPosition.x * 0.001;
    float freq2 = 0.7 + vPosition.y * 0.001;
    
    float twinkle1 = (sin(uTime * freq1 + vPosition.z * 0.1) + 1.0) * 0.5;
    float twinkle2 = (cos(uTime * freq2 + vPosition.x * 0.1) + 1.0) * 0.5;
    
    float twinkleValue = pow(twinkle1 * twinkle2, 8.0);
    float coreBrightness = smoothstep(0.1, 0.8, twinkleValue);
    
    // --- Final Color Composition ---
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    if (d > 0.5) discard;

    vec3 baseColor = vColor; // Use passed color attribute
    baseColor = mix(baseColor, vec3(1.0), smoothstep(0.8, 1.0, coreBrightness));

    float alpha = (1.0 - d * 2.0) * (coreBrightness * 0.5 + 0.5);
    
    gl_FragColor = vec4(baseColor, alpha);
  }
`;