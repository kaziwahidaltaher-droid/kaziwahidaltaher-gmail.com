
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  uniform float uTime;
  uniform float uSpeed;
  attribute float aProgress; // Progress along the curve (0 to 1)

  varying float vProgress;

  void main() {
    vProgress = aProgress;
    vec3 p = position;

    // Calculate point size with a pulsing wave effect that travels along the path
    float size = 8.0 + sin(aProgress * 25.0 - uTime * uSpeed) * 4.0;
    
    // Make the line "taper" at the ends slightly for a cleaner look
    size *= pow(1.0 - abs(aProgress - 0.5) * 2.0, 0.5);

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    
    // Size attenuation based on distance to camera
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fs = `
  uniform float uTime;
  uniform float uSpeed;
  varying float vProgress;

  void main() {
    // Create a soft circular point
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    if (d > 0.5) discard;

    // The brightness pulses along the path, creating a flow effect
    float brightness = sin(vProgress * 10.0 - uTime * uSpeed) * 0.4 + 0.6;
    
    // Use a vibrant cyan color
    vec3 color = vec3(0.4, 0.8, 1.0);

    // Fade out the edges of the point to make it soft
    float alpha = pow(1.0 - d * 2.0, 2.0);
    
    gl_FragColor = vec4(color, alpha * brightness);
  }
`;