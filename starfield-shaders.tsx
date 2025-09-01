/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Vertex Shader for the starfield
export const vs = `
  attribute float aScale;
  varying vec3 vColor;
  varying float vScale; // Pass scale to fragment shader

  void main() {
    vColor = color;
    vScale = aScale; // Set the varying
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Make stars scale with distance
    gl_PointSize = aScale * (400.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment Shader for the starfield, with an enhanced twinkling effect
export const fs = `
  uniform float uTime;
  varying vec3 vColor;
  varying float vScale; // Receive scale from vertex shader

  void main() {
    // --- Twinkle Calculation (Less Frequent, More Gradual) ---
    // Use lower frequencies for a slower, more subtle twinkle.
    float freq1 = 0.6 + vColor.r * 1.0;
    float freq2 = 0.7 + vColor.g * 1.2;
    float freq3 = 0.5 + vColor.b * 1.5;

    // Three sine waves with varied speeds and phases.
    float twinkle1 = (sin(uTime * freq1 + vColor.b * 10.0) + 1.0) * 0.5;
    float twinkle2 = (sin(uTime * freq2 + vColor.r * 15.0) + 1.0) * 0.5;
    float twinkle3 = (sin(uTime * freq3 + vColor.g * 12.0) + 1.0) * 0.5;
    
    // Combine the waves. A HIGHER power makes bright twinkles much less frequent.
    float twinkleValue = pow(twinkle1 * twinkle2 * twinkle3, 10.0);

    // Use a wider smoothstep range for a more gradual fade-in/out effect.
    float coreBrightness = smoothstep(0.1, 0.8, twinkleValue);
    
    // --- Pulsing Halo for Brighter Stars ---
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    
    // A gentle pulse that varies over time
    float pulse = 0.7 + sin(uTime * 0.8 + vColor.r * 20.0) * 0.3;
    
    // Halo is only visible on larger stars (vScale) and modulated by the pulse.
    // smoothstep creates a soft threshold for which stars get a halo.
    float haloIntensity = smoothstep(2.5, 5.0, vScale) * pulse;
    
    // A soft radial falloff for the halo/glow effect.
    float halo = pow(1.0 - d, 3.0) * haloIntensity;

    // --- Final Color Composition ---
    // A very small, sharp core for the star itself.
    float core = smoothstep(0.1, 0.0, d); 

    // Combine the sharp core (with twinkle) and the soft halo.
    vec3 finalColor = vColor * (core * coreBrightness + halo);

    // The final alpha is based on the combined brightness of the core and halo,
    // which works well with additive blending.
    float alpha = (core * coreBrightness + halo) * 0.8;
    
    // Discard pixels outside the point's circular radius.
    if (d > 0.5) discard;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;