/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for the background starfield.

export const vs = `
attribute float aStarId;

uniform float time;
uniform float uAudioMids;
uniform float uMaxStarfieldRadius;

varying float vStarId;
varying float vDist; // Pass distance for fragment shader effects

// A simple pseudo-random function (hash) - much faster than snoise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vStarId = aStarId;
  vDist = length(position);

  // --- Parallax Effect ---
  // Stars further away (higher vDist) will have a lower parallax factor and drift less.
  // The effect is enhanced with a power curve, making closer stars feel much more dynamic.
  float parallaxFactor = 1.0 - smoothstep(0.0, uMaxStarfieldRadius, vDist);
  parallaxFactor = pow(parallaxFactor, 2.0);

  // --- Drifting Animation ---
  // Drift speed is now audio-reactive, causing the noise field to evolve faster with audio.
  float driftSpeed = time * (0.02 + uAudioMids * 0.05);
  vec2 noiseInput = vec2(aStarId * 0.1, driftSpeed);
  
  // Use the fast hash function and map its [0,1] output to [-1,1]
  float driftX = (hash(noiseInput) - 0.5) * 2.0;
  float driftY = (hash(noiseInput + 10.0) - 0.5) * 2.0;
  float driftZ = (hash(noiseInput + 20.0) - 0.5) * 2.0;
  
  vec3 driftOffset = vec3(driftX, driftY, driftZ);
  
  // Drift magnitude is controlled by audio and parallax for a dynamic, deep space effect.
  float driftMagnitude = (2.0 + uAudioMids * 35.0) * parallaxFactor;
  
  vec3 finalPosition = position + driftOffset * driftMagnitude;

  vec4 mvPosition = modelViewMatrix * vec4(finalPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Make points smaller with distance
  gl_PointSize = 1.5 * (500.0 / -mvPosition.z);
}
`;

export const fs = `
uniform float time;
uniform float uAudioHighs;
varying float vStarId;
varying float vDist; // Receive distance from vertex shader

void main() {
  // --- Twinkling Effect ---
  // Slow base pulse for all stars
  float slowPulse = 0.5 + 0.5 * sin(time * 0.8 + vStarId);
  slowPulse = pow(slowPulse, 4.0);

  // Faster, sharper shimmer that reacts to high-frequency audio
  float fastShimmer = 0.5 + 0.5 * sin(time * 5.0 + vStarId * 1.3);
  fastShimmer = pow(fastShimmer, 10.0) * uAudioHighs * 2.0;
  
  float twinkle = 0.5 * slowPulse + fastShimmer;

  // --- Point Shape ---
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  
  float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
  
  // Base color is a cool white
  vec3 starColor = vec3(0.8, 0.9, 1.0);
  
  gl_FragColor = vec4(starColor, alpha * clamp(twinkle, 0.0, 1.0));
}
`;