/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shaders for galaxy particles to enable velocity-based coloring and soft particles.

export const vs = `
  uniform float size;
  uniform float uAudioLevel; // Mids for color
  uniform float uOverallAudio; // Overall for size
  uniform float uCameraFarPlane; // For LOD distance calculations
  uniform float time;
  uniform vec3 color;
  uniform vec2 uHeartbeat; // x: radius, y: thickness
  uniform vec3 uFlarePosition;
  uniform float uFlareIntensity;
  uniform float uFlareRadius;

  attribute float aVelocityMagnitude; // Normalized 0-1
  attribute float aStarId;

  varying vec3 vColor;
  varying float vStarId;
  varying vec3 vWorldPosition;
  varying float vDistToCam; // Pass distance to fragment shader for LOD
  varying float vPointSize; // Pass calculated size to fragment shader for LOD
  varying float vNoise;
  varying float vWaveFactor;
  varying float vFlareEffect;

  // 3D Simplex Noise
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
      return mod289(((x*34.0)+1.0)*x);
  }

  vec4 taylorInvSqrt(vec4 r)
  {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v)
  {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; 
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  // Fractal Brownian Motion for more organic structures
  float fbm(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      // OPTIMIZATION: Reduced octaves from 3 to 2 for performance.
      for (int i = 0; i < 2; i++) {
          value += amplitude * snoise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
      }
      return value;
  }


  void main() {
    vStarId = aStarId;
    
    // --- Galactic Heartbeat Wave ---
    float distToCenter = length(position);
    float waveRadius = uHeartbeat.x;
    float waveThickness = uHeartbeat.y;
    // Calculate a smooth wave profile (0 -> 1 -> 0)
    vWaveFactor = smoothstep(waveRadius - waveThickness, waveRadius, distToCenter) - smoothstep(waveRadius, waveRadius + waveThickness, distToCenter);
    
    // Apply displacement. The original position is used for noise to keep the web structure stable.
    vec3 displacement = normalize(position) * vWaveFactor * 60.0;
    vec3 displacedPosition = position + displacement;

    // --- Stellar Flare Effect ---
    vFlareEffect = 0.0;
    if (uFlareIntensity > 0.0) {
        float distToFlare = distance(displacedPosition, uFlarePosition);
        if (distToFlare < uFlareRadius) {
            // Calculate effect strength based on distance from flare center
            float flareFalloff = 1.0 - smoothstep(0.0, uFlareRadius, distToFlare);
            vFlareEffect = flareFalloff * flareFalloff; // squared for a sharper core effect

            // Apply displacement
            vec3 flareDir = normalize(displacedPosition - uFlarePosition);
            displacedPosition += flareDir * uFlareIntensity * vFlareEffect;
        }
    }

    vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;
    
    // --- Cosmic Web Generation via FBM noise ---
    vec3 p1 = position * 0.004 + time * 0.02;
    float noise = fbm(p1);
    noise = (noise + 1.0) / 2.0; // Map noise from [-1, 1] to [0, 1]
    vNoise = noise;

    // Use smoothstep to create sharp filaments from the noise field
    float filament_threshold = 0.45; // Adjusted for new noise characteristics
    float filament_thickness = 0.1;
    float filament_factor = smoothstep(filament_threshold, filament_threshold + filament_thickness, noise);

    // --- Audio-Reactive Color ---
    // Color particles based on their density (noise value) and audio input.
    vec3 hotColor = vec3(1.0, 0.9, 0.5); // Dense regions are hotter
    vec3 baseColor = mix(color, hotColor, noise * noise); // Color from density
    
    // Enhanced audio reactivity: mid-frequencies make filaments pulse with a vibrant cyan light.
    vec3 audioGlowColor = vec3(0.5, 1.0, 1.0); // A vibrant cyan
    // Using a power curve to make the reaction to mid-range audio more dynamic and peaky.
    float audioIntensity = pow(uAudioLevel, 2.0);
    // Mix towards cyan based on intensity.
    vec3 mixedColor = mix(baseColor, audioGlowColor, audioIntensity * 0.8);
    // Also additively boost the brightness to make it pulse with light.
    vColor = mixedColor + baseColor * audioIntensity * 0.5;

    vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
    
    // --- LOD: Distance Calculation ---
    vDistToCam = -mvPosition.z;

    // --- LOD: Size Attenuation & Culling ---
    float distanceFade = 1.0 - smoothstep(uCameraFarPlane * 0.70, uCameraFarPlane * 0.95, vDistToCam);
    float sizeAtDistance = (400.0 / vDistToCam) * distanceFade;
    float audioSizeMultiplier = 1.0 + uOverallAudio * 0.75;
    
    // Final point size is determined by LOD, audio, and its position in the filament structure.
    // Points in voids (filament_factor = 0) will have their size culled to 0.
    vPointSize = clamp(size * audioSizeMultiplier * sizeAtDistance, 0.0, 15.0) * filament_factor;
    
    gl_PointSize = vPointSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fs = `
  precision highp float;

  uniform float time;
  uniform float uFade;
  uniform float uCameraFarPlane;

  varying vec3 vColor;
  varying float vStarId;
  varying vec3 vWorldPosition;
  varying float vDistToCam;
  varying float vPointSize;
  varying float vNoise;
  varying float vWaveFactor;
  varying float vFlareEffect;

  void main() {
    // --- LOD: Distance-based Culling & Fading ---
    float lodFade = 1.0 - smoothstep(uCameraFarPlane * 0.85, uCameraFarPlane, vDistToCam);
    if (lodFade < 0.01) discard;

    float twinkle = 0.7 + 0.3 * sin(time * 1.5 + vStarId * 1.5);

    vec4 finalColor = vec4(vColor * twinkle, 0.0);
    float finalAlpha = 0.0;

    // --- LOD: Dynamic Shader Complexity ---
    if (vPointSize < 4.0) {
        // PATH 1: Simplified (for small, distant stars)
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        finalAlpha = (1.0 - dist * 2.0);
    } 
    else {
        // PATH 2: High-Detail (for large, close-up stars)
        vec2 p = gl_PointCoord - vec2(0.5);
        float dist = length(p);
        if (dist > 0.5) discard;
        
        float core = 1.0 - smoothstep(0.0, 0.1 + vNoise * 0.05, dist);
        float angle = atan(p.y, p.x);
        float numRays = 4.0;

        // Wave makes coronas sharper and brighter
        float raySharpness = 8.0 + vWaveFactor * 20.0;
        float rayBrightness = 0.3 + vWaveFactor * 0.5;

        float rays = pow(sin(angle * numRays) * 0.5 + 0.5, raySharpness) * smoothstep(0.05, 0.5, dist);
        float glow = 1.0 - smoothstep(0.2, 0.5, dist);
        
        finalAlpha = clamp(core * 1.5 + rays * rayBrightness + glow * 0.2, 0.0, 1.0);
    }
    
    // --- Galactic Heartbeat Visual Effect ---
    if (vWaveFactor > 0.01) {
        vec3 waveColor = vec3(1.0, 0.85, 0.6); // Fiery gold
        finalColor.rgb = mix(finalColor.rgb, waveColor, vWaveFactor);
        finalColor.rgb *= 1.0 + vWaveFactor * 2.0; // Boost brightness in the wave
    }
    
    // --- Stellar Flare Visual Effect ---
    if (vFlareEffect > 0.01) {
        vec3 flareColor = vec3(1.0, 1.0, 0.6); // Hot yellow-white
        finalColor.rgb += flareColor * vFlareEffect * 2.0; // Additive bright flare
    }

    // Final composition
    finalAlpha *= lodFade;
    gl_FragColor = vec4(finalColor.rgb, finalAlpha * uFade);
  }
`;