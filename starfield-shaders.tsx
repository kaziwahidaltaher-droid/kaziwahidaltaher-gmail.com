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
    // Increase perspective effect to make distant stars smaller
    gl_PointSize = aScale * (800.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fs = `
  uniform float uTime;
  varying vec3 vColor;

  void main() {
    // Unique seed for each star based on its color components
    float seed = (vColor.r + vColor.g + vColor.b) * 10.0;
    
    // Combine two sine waves at different frequencies for a more natural twinkle
    float fastTwinkle = sin(uTime * 2.0 + seed * 1.5);
    float slowTwinkle = sin(uTime * 0.5 + seed * 0.5);
    
    // Average the twinkles and map from [-1, 1] to [0, 1]
    float combined = (fastTwinkle + slowTwinkle) * 0.5;
    float twinkleFactor = (combined + 1.0) * 0.5;
    
    // Make the twinkle effect more subtle: brightness varies between 50% and 100%
    float finalAlpha = 0.5 + twinkleFactor * 0.5;

    // Discard fragment if outside the circular point
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    if (d > 0.5) discard;

    gl_FragColor = vec4(vColor, finalAlpha);
  }
`;