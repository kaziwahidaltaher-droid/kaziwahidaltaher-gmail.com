/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AURELION - Nebula Shader
 */

export const vs = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fs = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uSeed;
  uniform float uCameraDistance;
  varying vec2 vUv;

  // 2D Simplex Noise
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

  // Fractional Brownian Motion
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
    vec2 p = vUv * 4.0;
    
    // Animate the noise field over time
    p.x += uTime * 0.05 + uSeed;
    p.y += uTime * 0.02 + uSeed;

    // Create a base noise pattern
    float noise = fbm(p, 5);
    noise = (noise + 1.0) * 0.5; // map to 0-1

    // Proximity factor (0 = far, 1 = close)
    float proximity = smoothstep(400.0, 100.0, uCameraDistance);
    
    // Create a third "hot" color for close proximity
    vec3 hotColor = uColor2 + vec3(0.5, 0.5, 0.5);

    // Mix between the two base colors
    vec3 mixedColor = mix(uColor1, uColor2, noise);
    
    // Further mix towards the hot color based on proximity and noise pattern
    mixedColor = mix(mixedColor, hotColor, proximity * (0.5 + noise * 0.5));

    // Create a soft, circular mask to fade the edges
    float d = distance(vUv, vec2(0.5));
    float mask = smoothstep(0.5, 0.1, d);

    // Combine noise and mask
    float intensity = pow(noise, 2.5) * mask;

    // Add some sharper "wisps" using another layer of noise
    float wisps = fbm(p * 3.5, 5);
    wisps = smoothstep(0.65, 1.0, wisps) * 0.4;

    // Add a subtle brightness pulse to the whole nebula
    float pulse = 1.0 + sin(uTime * 0.5) * 0.1;

    float finalIntensity = (intensity + wisps) * pulse;

    // Apply proximity fade effect (on alpha)
    float proximityFade = 1.0 - smoothstep(150.0, 600.0, uCameraDistance);
    finalIntensity *= proximityFade;

    gl_FragColor = vec4(mixedColor * finalIntensity, finalIntensity);
  }
`;