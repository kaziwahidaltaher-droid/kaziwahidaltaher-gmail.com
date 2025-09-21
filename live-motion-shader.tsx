/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// FIX: This file was empty, causing a module import error.
// The 'vs' and 'fs' exports have been added to provide the necessary shaders.

/**
 * A simple pass-through vertex shader for a fullscreen quad.
 */
export const vs = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * A fragment shader that creates a "live motion" effect using noise.
 * The 'rand' uniform is updated every frame to create animation, resulting
 * in a subtle, flickering static effect.
 */
export const fs = `
  precision highp float;

  uniform vec2 resolution;
  uniform float rand;

  // A simple pseudo-random number generator to create noise.
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.545353);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    float n = random(uv + rand);
    
    // Output a dark, subtly animated blueish noise.
    gl_FragColor = vec4(vec3(n * 0.05, n * 0.08, n * 0.15), 1.0);
  }
`;