
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Vertex Shader for the starfield
export const vs = `
  attribute float aScale;
  // attribute vec3 color; // Removed to prevent redefinition error (provided by Three.js)
  
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec3 uCameraPosition; // Provided by Three.js or passed manually

  varying vec3 vColor;
  varying float vAlpha;
  varying float vDist;

  void main() {
    vColor = color;
    
    // --- Infinite Scrolling / Wrapping Logic ---
    // Define the bounding box of the starfield. 
    // This must match the range used in the JS generation (e.g., 4000 units wide).
    float range = 2000.0; 
    float size = range * 2.0;

    // Calculate the position relative to the camera
    vec3 relativePos = position - uCameraPosition;
    
    // Wrap the stars around the camera using modulo arithmetic.
    // This ensures that as the camera moves, stars that fall behind wrap to the front.
    // 'mod' in GLSL handles negatives differently than JS, so we adjust.
    vec3 wrappedPos = mod(relativePos + range, size) - range;
    
    // The final world position of the star is the camera pos + wrapped offset
    vec3 finalWorldPos = uCameraPosition + wrappedPos;

    vec4 mvPosition = viewMatrix * vec4(finalWorldPos, 1.0);
    vDist = -mvPosition.z; // Depth for fading

    // --- Parallax & Size ---
    // Standard perspective divide provides the primary parallax.
    // We enhance the size calculation to make stars distinct.
    gl_PointSize = aScale * uPixelRatio * (400.0 / vDist);
    
    // Fade out stars as they reach the edge of the "box" to prevent popping artifacts
    float distFromCamera = length(wrappedPos);
    vAlpha = 1.0 - smoothstep(range * 0.8, range * 0.95, distFromCamera);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment Shader for the starfield
export const fs = `
  uniform float uTime;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDist;

  // Pseudo-random function
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // Noise function
  float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    // Round point shape
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distFromCenter = length(coord);
    if (distFromCenter > 0.5) discard;

    // --- Realistic Twinkling ---
    // Twinkle speed depends on time
    float t = uTime * 2.0;
    
    // Use screen coordinates + time for a scintillation effect that changes as you look around
    // This simulates atmospheric turbulence (or quantum fluctuations in this context)
    float sparkle = noise(gl_FragCoord.xy * 0.05 + t);
    
    // Distance modulation: 
    // In reality, atmosphere affects all stars, but visually, keeping close stars steadier looks better.
    // Far stars (high vDist) will twinkle more vigorously.
    float distanceFactor = smoothstep(0.0, 1000.0, vDist); 
    float twinkleIntensity = mix(0.2, 0.8, distanceFactor); // 0.2 min twinkle for close, 0.8 for far
    
    // Calculate final brightness multiplier
    float brightness = 1.0 - (twinkleIntensity * (0.5 + 0.5 * sin(t * 3.0 + sparkle * 6.0)));
    
    // Soft core glow
    float core = 1.0 - distFromCenter * 2.0;
    core = pow(core, 1.5); // Soften edge

    // Combine
    vec3 finalColor = vColor * brightness;
    
    // Subtle color shift during dimming (blue-shift)
    finalColor = mix(finalColor, vec3(0.5, 0.7, 1.0), (1.0 - brightness) * 0.3);

    gl_FragColor = vec4(finalColor, vAlpha * core);
  }
`;
