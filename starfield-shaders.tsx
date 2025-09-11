/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Vertex Shader for the starfield
export const vs = `
  attribute float aScale;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Make stars scale with distance
    gl_PointSize = aScale * (400.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment Shader for the starfield, with twinkling effect
export const fs = `
  uniform float uTime;
  varying vec3 vColor;

  void main() {
    // A pseudo-random seed based on color, gives each star a unique twinkle
    float seed = (vColor.r + vColor.g + vColor.b) * 10.0;
    
    // Combine two sine waves for a more complex, less regular twinkle
    float fastTwinkle = sin(uTime * 2.0 + seed * 1.5);
    float slowTwinkle = sin(uTime * 0.5 + seed * 0.5);
    
    // Combine and remap from [-2, 2] to a more usable range
    float combined = (fastTwinkle + slowTwinkle) / 2.0; // now in [-1, 1]
    float twinkle = (combined + 1.0) / 2.0; // now in [0, 1]

    // Soften the twinkle effect to create a more gradual dimming and brightening
    twinkle = 0.5 + twinkle * 0.5;

    // Create a circular point shape
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    if (d > 0.5) discard;

    gl_FragColor = vec4(vColor, twinkle);
  }
`;