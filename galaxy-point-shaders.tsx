/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for galaxy particles to enable velocity-based coloring and soft particles.

export const vs = `
  uniform float size;
  uniform float uAudioLevel;
  attribute float aVelocityMagnitude; // Normalized 0-1
  varying vec3 vColor;

  void main() {
    // Base color is passed from geometry
    vColor = color; 
    
    // Define the "hot" color for high-velocity stars
    vec3 hotColor = vec3(0.8, 0.9, 1.0); // Bright blue-white
    
    // Define an "audio pulse" color
    vec3 audioPulseColor = vec3(1.0, 0.7, 0.7); // A reddish-pink pulse

    // Interpolate towards the hot color based on velocity.
    // Higher velocity (closer to core) means more blending with hotColor.
    vColor = mix(vColor, hotColor, aVelocityMagnitude * 0.7);

    // Interpolate towards the audio pulse color based on audio level
    vColor = mix(vColor, audioPulseColor, uAudioLevel * 0.5);

    // Standard point projection
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation to make points in the distance smaller, and scale by size uniform
    gl_PointSize = size * (300.0 / -mvPosition.z);
  }
`;

export const fs = `
  varying vec3 vColor;

  void main() {
    // Create soft, circular points instead of harsh squares
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) {
      discard;
    }
    
    // Smooth falloff at the edge of the circle
    float alpha = 1.0 - smoothstep(0.45, 0.5, dist);
    
    gl_FragColor = vec4(vColor, alpha);
  }
`;
