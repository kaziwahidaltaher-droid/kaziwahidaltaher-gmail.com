
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AURELION - Oltaris Aura Shader
 * Inspired by user analysis.
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
  uniform float uMoodIntensity;
  uniform float uResonance;
  uniform vec3 uColorCore;
  uniform vec3 uColorAura;
  varying vec2 vUv;

  float radial(vec2 p) {
    return smoothstep(0.0, 1.0, 1.0 - length(p - 0.5) * 2.0);
  }

  void main() {
    float pulse = sin(uTime * uResonance + vUv.x * 3.0 + vUv.y * 3.0) * 0.5 + 0.5;
    float glow = radial(vUv) * uMoodIntensity;
    vec3 color = mix(uColorAura, uColorCore, glow * pulse);
    // Use the glow and pulse to control the alpha for a soft, transparent effect
    gl_FragColor = vec4(color, glow * pulse * 0.7);
  }
`;