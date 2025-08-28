
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for galaxy particles to enable velocity-based coloring and soft particles.

export const vs = `
  uniform float size;
  uniform float uAudioLevel; // Mids for color
  uniform float uOverallAudio; // Overall for size
  attribute float aVelocityMagnitude; // Normalized 0-1
  attribute float aStarId;
  varying vec3 vColor;
  varying float vStarId;
  varying vec3 vWorldPosition;

  void main() {
    vStarId = aStarId;
    
    // Pass world position to fragment shader for lighting calculations
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    
    // Base color is passed from geometry
    vColor = color; 
    
    // Define the "hot" color for high-velocity stars
    vec3 hotColor = vec3(0.8, 0.9, 1.0); // Bright blue-white
    
    // Define an "audio pulse" color
    vec3 audioPulseColor = vec3(1.0, 0.7, 0.7); // A reddish-pink pulse

    // Interpolate towards the hot color based on velocity.
    // Higher velocity (closer to core) means more blending with hotColor.
    vColor = mix(vColor, hotColor, aVelocityMagnitude * 0.7);

    // Interpolate towards the audio pulse color based on audio level (mids)
    vColor = mix(vColor, audioPulseColor, uAudioLevel * 0.5);

    // Standard point projection
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Modulate point size with overall audio level for a 'breathing' effect
    float audioSizeMultiplier = 1.0 + uOverallAudio * 0.75;

    // Size attenuation to make points in the distance smaller, and scale by size uniform
    gl_PointSize = size * audioSizeMultiplier * (300.0 / -mvPosition.z);
  }
`;

export const fs = `
  #define MAX_NEBULAE 5

  uniform float time;
  uniform float uFade;
  uniform vec3 uNebulaPositions[MAX_NEBULAE];
  uniform vec3 uNebulaColorHotspots[MAX_NEBULAE];
  uniform float uNebulaRadii[MAX_NEBULAE];
  uniform int uNumNebulae;

  varying vec3 vColor;
  varying float vStarId;
  varying vec3 vWorldPosition;


  void main() {
    // --- Procedural Star Shape ---
    vec2 p = gl_PointCoord - vec2(0.5);
    float dist = length(p);
    if (dist > 0.5) discard;
    
    // --- Nebula Interaction ---
    vec3 colorFromNebulae = vColor;
    float alphaFromNebulae = 1.0;

    for (int i = 0; i < MAX_NEBULAE; i++) {
        if (i >= uNumNebulae) break; // Don't process empty slots

        vec3 nebulaPos = uNebulaPositions[i];
        vec3 nebulaColor = uNebulaColorHotspots[i];
        float nebulaRadius = uNebulaRadii[i];

        float distToNebulaCenter = distance(vWorldPosition, nebulaPos);
        vec3 starToCamDir = normalize(cameraPosition - vWorldPosition);

        // --- 1. Scattering (Illumination) ---
        // If the star is within the nebula's radius, tint it.
        if (distToNebulaCenter < nebulaRadius) {
            float scatterInfluence = 1.0 - smoothstep(0.0, nebulaRadius, distToNebulaCenter);
            scatterInfluence = pow(scatterInfluence, 2.0); // Make it stronger towards the center
            colorFromNebulae = mix(colorFromNebulae, nebulaColor, scatterInfluence * 0.6);
        }

        // --- 2. Absorption (Occlusion) ---
        // If the nebula is between the star and the camera.
        float starToCamDist = distance(vWorldPosition, cameraPosition);
        float nebulaToCamDist = distance(nebulaPos, cameraPosition);

        if (starToCamDist > nebulaToCamDist) {
            // Check if the star is behind the nebula's "disc" from the camera's POV
            vec3 nebulaToStar = vWorldPosition - nebulaPos;
            vec3 projected = dot(nebulaToStar, starToCamDir) * starToCamDir;
            float distToLineOfSight = distance(nebulaToStar, projected);
            
            if (distToLineOfSight < nebulaRadius) {
                  // The star is occluded. Dim and color shift it.
                  float occlusionFactor = 1.0 - smoothstep(0.0, nebulaRadius, distToLineOfSight);
                  occlusionFactor = pow(occlusionFactor, 1.5); // Sharpen the effect
                  colorFromNebulae = mix(colorFromNebulae, nebulaColor, occlusionFactor * 0.7); // Strong color shift
                  alphaFromNebulae *= 1.0 - (occlusionFactor * 0.8); // Dim alpha significantly
            }
        }
    }

    // --- Twinkling Effect ---
    float twinkle = sin(time * 0.8 + vStarId * 1.5) * 0.5 + 0.5; // slow pulse
    twinkle += sin(time * 2.5 + vStarId * 0.8) * 0.2; // faster shimmer
    twinkle = pow(twinkle, 3.0) * 0.4 + 0.6; // Clamp to a nice range (0.6 to 1.0)
    
    // --- Procedural Star Shape (continued) ---
    float core = 1.0 - smoothstep(0.0, 0.1, dist);
    float angle = atan(p.y, p.x);
    float rays = pow(sin(angle * 4.0) * 0.5 + 0.5, 8.0); 
    rays *= smoothstep(0.05, 0.5, dist);
    float glow = 1.0 - smoothstep(0.2, 0.5, dist);
    
    // --- Combine components ---
    float proceduralAlpha = clamp(core * 1.5 + rays * 0.3 + glow * 0.2, 0.0, 1.0);
    float finalAlpha = proceduralAlpha * alphaFromNebulae;
    vec3 finalColor = colorFromNebulae;
    
    gl_FragColor = vec4(finalColor * twinkle * 1.1, finalAlpha * uFade);
  }
`;