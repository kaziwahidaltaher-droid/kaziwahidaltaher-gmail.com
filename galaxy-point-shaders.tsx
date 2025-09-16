/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  uniform float uTime;
  uniform float uSize;
  uniform float uSpinRate;

  varying vec3 vColor;

  void main() {
    vColor = color;
    vec3 pos = position;

    // Apply differential rotation for a swirling effect in spiral galaxies.
    // The rotation speed is faster near the center and slower towards the edges.
    if (uSpinRate > 0.0) {
      float radius = length(pos.xz);
      // Add 1.0 to denominator to prevent division by zero and keep rotation sane at the center.
      float angle = uTime * uSpinRate * (5.0 / (radius + 1.0));
      mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      pos.xz = rot * pos.xz;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    // Point size is attenuated by distance (perspective).
    gl_PointSize = uSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fs = `
  varying vec3 vColor;

  void main() {
    // Create circular points instead of square ones.
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    if (d > 0.5) discard;

    // Fade out towards the edge for softer points.
    float strength = 1.0 - d * 2.0;

    gl_FragColor = vec4(vColor, strength);
  }
`;
