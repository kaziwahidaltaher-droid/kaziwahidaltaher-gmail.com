/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  attribute float aScale;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aScale * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fs = `
  uniform float uTime;
  varying vec3 vColor;

  void main() {
    float seed = (vColor.r + vColor.g + vColor.b) * 10.0;
    float fastTwinkle = sin(uTime * 2.0 + seed * 1.5);
    float slowTwinkle = sin(uTime * 0.5 + seed * 0.5);
    float combined = (fastTwinkle + slowTwinkle) / 2.0;
    float twinkle = (combined + 1.0) / 2.0; // now in [0, 1]
    twinkle = 0.5 + twinkle * 0.5;

    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    if (d > 0.5) discard;

    gl_FragColor = vec4(vColor, twinkle);
  }
`;