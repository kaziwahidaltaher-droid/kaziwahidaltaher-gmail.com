/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Vertex Shader: Passes position, normals, and UVs to the fragment shader.
export const vs = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment Shader: Generates procedural textures for the planet surface.
export const fs = `
  uniform float uTime;
  uniform vec3 uColor1; // Land color
  uniform vec3 uColor2; // Mountain/feature color
  uniform vec3 uOceanColor;
  uniform float uCloudiness; // 0.0 to 1.0
  uniform float uIceCoverage; // 0.0 to 1.0
  uniform int uTextureType; // 1: Terrestrial, 2: Gas Giant, 3: Volcanic, 4: Icy
  uniform bool uIsSelected;

  // New uniforms for tilt and scattering
  uniform float uAxialTilt;
  uniform vec3 uAtmosphereColor;
  uniform vec3 uLightDirection;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition; // New varying

  // 3D Simplex Noise function
  // (Standard GLSL implementation - necessary for procedural generation)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
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
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Fractional Brownian Motion for terrain-like features
  float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 2.0;
    for (int i = 0; i < octaves; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
  }

  // Generate clouds
  float cloud_fbm(vec3 p) {
    return fbm(p, 4); // Clouds have fewer octaves for a softer look
  }

  void main() {
    // Apply axial tilt to the position used for texturing
    mat3 tiltMatrix = mat3(
        cos(uAxialTilt), 0.0, -sin(uAxialTilt),
        0.0, 1.0, 0.0,
        sin(uAxialTilt), 0.0, cos(uAxialTilt)
    );
    vec3 tiltedPosition = tiltMatrix * vPosition;

    vec3 finalColor;
    float baseNoise = 0.0;

    if (uTextureType == 2) { // Gas Giant
        baseNoise = fbm(tiltedPosition * 3.0 + vec3(uTime * 0.1, 0.0, 0.0), 5);
        float bands = sin(tiltedPosition.y * 10.0 + baseNoise * 5.0);
        
        // Add a large, swirling storm
        vec2 stormCoord = tiltedPosition.xy - vec2(-0.2, 0.4); // Position the storm
        float stormRadius = length(stormCoord);
        float stormShape = smoothstep(0.6, 0.0, stormRadius);
        vec3 stormP = vec3(stormCoord * 3.0, uTime * 0.2);
        float stormNoise = snoise(stormP) + snoise(stormP * 2.0) * 0.5;
        float stormFinal = stormShape * stormNoise;

        finalColor = mix(uColor1, uColor2, bands + stormFinal);

    } else if (uTextureType == 3) { // Volcanic
        baseNoise = fbm(tiltedPosition * 4.0, 6);
        vec3 animatedCracksPos = tiltedPosition * 10.0 + baseNoise + vec3(0.0, 0.0, uTime * -0.3);
        float cracks = 1.0 - smoothstep(0.0, 0.05, abs(fbm(animatedCracksPos, 2)));
        
        // Make the lava pulse and glow
        vec3 crackColor = uColor2 * (1.5 + sin(uTime * 5.0 + tiltedPosition.x * 20.0) * 0.5);
        finalColor = mix(uColor1, crackColor, cracks);

    } else if (uTextureType == 4) { // Icy
        baseNoise = fbm(tiltedPosition * 5.0, 7);
        float cracks = smoothstep(0.0, 0.08, abs(fbm(tiltedPosition * 15.0 + baseNoise, 3)));
        cracks = pow(cracks, 0.5);

        // Mix between a base ice color and a slightly darker/bluer crack color
        vec3 iceColor = mix(uColor1, uColor2, cracks);
        
        // Use iceCoverage to determine overall brightness/frostiness
        float frost = smoothstep(0.5, 1.0, uIceCoverage + baseNoise * 0.1);
        finalColor = mix(iceColor, vec3(0.95, 0.98, 1.0), frost);

    } else { // Terrestrial (default)
        // Base terrain noise + a detail layer for more complexity
        float terrain = fbm(tiltedPosition * 2.5, 6);
        float detail_terrain = fbm(tiltedPosition * 12.0, 4) * 0.2;
        terrain += detail_terrain;
        
        // Land/ocean mix
        float seaLevel = 0.0;
        vec3 surfaceColor = mix(uOceanColor, uColor1, smoothstep(seaLevel - 0.05, seaLevel + 0.05, terrain));
        // Add mountains
        surfaceColor = mix(surfaceColor, uColor2, smoothstep(0.3, 0.4, terrain));

        // Ice caps
        float iceFalloff = smoothstep(0.6, 0.8, abs(tiltedPosition.y));
        float iceNoise = snoise(tiltedPosition * 10.0) * 0.1;
        float iceAmount = smoothstep(1.0 - uIceCoverage, 1.0, iceFalloff + iceNoise);
        surfaceColor = mix(surfaceColor, vec3(0.95), iceAmount);
        
        finalColor = surfaceColor;
    }

    // Add selection effects
    if (uIsSelected) {
        if (uTextureType == 3) { // Volcanic
            // Overwrite the original color with a more intense pulsing one
            float cracks = 1.0 - smoothstep(0.0, 0.05, abs(fbm(tiltedPosition * 10.0 + baseNoise + vec3(0.0, 0.0, uTime * -0.3), 2)));
            vec3 crackColor = uColor2 * (2.0 + sin(uTime * 10.0 + tiltedPosition.y * 10.0) * 1.0);
            finalColor = mix(uColor1, crackColor, cracks);
        } else { // Other types get a scanline effect
            float scanLineY = sin((tiltedPosition.y + uTime * 0.8) * 30.0) * 0.5 + 0.5;
            scanLineY = smoothstep(0.95, 1.0, scanLineY);
            float scanLineX = sin((tiltedPosition.x + uTime * 0.8) * 30.0) * 0.5 + 0.5;
            scanLineX = smoothstep(0.95, 1.0, scanLineX);
            vec3 scanColor = uAtmosphereColor * 1.5;
            finalColor = mix(finalColor, scanColor, (scanLineY + scanLineX) * 0.15);
        }
    }

    // Evolving clouds layer for all types
    if (uCloudiness > 0.0) {
      // Rotate clouds for movement across the surface
      float rotationAngle = uTime * 0.05;
      mat3 rotationMatrix = mat3(cos(rotationAngle), 0, sin(rotationAngle), 0, 1, 0, -sin(rotationAngle), 0, cos(rotationAngle));
      vec3 rotatedPosition = rotationMatrix * tiltedPosition;

      // Add a time-based offset to the noise input to make clouds evolve and change shape
      vec3 evolvingCloudPos = rotatedPosition * 4.0 + vec3(uTime * 0.1, uTime * -0.05, 0.0);

      float cloudNoise = cloud_fbm(evolvingCloudPos);
      float cloudCoverage = smoothstep(0.5 - uCloudiness, 0.5, cloudNoise);
      finalColor = mix(finalColor, vec3(1.0), cloudCoverage);
    }
    
    // New Lighting and Atmospheric Scattering
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(-vViewPosition);

    // Diffuse lighting
    float light = dot(normal, uLightDirection);
    light = clamp(light, 0.0, 1.0);
    vec3 diffuse = finalColor * (0.3 + light * 0.7); // ambient + diffuse

    // Atmospheric scattering (rim glow)
    float fresnel = 1.0 - dot(viewDirection, normal);
    fresnel = pow(fresnel, 4.0);
    float daySideGlow = smoothstep(-0.2, 0.4, light);
    vec3 scatterColor = uAtmosphereColor * fresnel * daySideGlow * 2.0;

    vec3 litColor = diffuse + scatterColor;
    
    // --- Night Side Glow ---
    // A mask for the night side of the planet with a soft transition at the terminator
    float nightMask = 1.0 - smoothstep(-0.05, 0.15, light);
    if (nightMask > 0.0) {
        vec3 nightGlow = vec3(0.0);
        if (uTextureType == 1) { // Terrestrial "City Lights"
            // Recalculate terrain to create a landmass mask. We only want lights on land.
            float terrain_for_lights = fbm(tiltedPosition * 2.5, 6) + fbm(tiltedPosition * 12.0, 4) * 0.2;
            float landMask = smoothstep(0.0, 0.05, terrain_for_lights);

            // High frequency noise for the lights themselves
            float cityNoise = fbm(tiltedPosition * 35.0, 5);
            // Sharpen the noise to create points of light rather than clouds
            cityNoise = smoothstep(0.4, 0.45, cityNoise);
            
            // Use another, lower frequency noise layer to create clusters/continents of lights
            float clusterNoise = fbm(tiltedPosition * 1.5, 4);
            clusterNoise = smoothstep(0.1, 0.4, clusterNoise);
            
            cityNoise *= clusterNoise;

            // Lights only appear on land
            cityNoise *= landMask;

            nightGlow = vec3(1.0, 0.85, 0.6) * cityNoise;
        } else if (uTextureType == 3) { // Volcanic "Lava Glow"
            float lavaGlowNoise = fbm(tiltedPosition * 4.0, 6);
            vec3 lavaPos = tiltedPosition * 10.0 + lavaGlowNoise + vec3(0.0, 0.0, uTime * -0.3);
            float lavaCracks = 1.0 - smoothstep(0.0, 0.05, abs(fbm(lavaPos, 2)));
            // Make the glow pulse subtly
            lavaCracks *= (0.6 + sin(uTime * 2.0 + tiltedPosition.x * 5.0) * 0.4);
            nightGlow = uColor2 * lavaCracks * 1.2;
        } else { // Generic Atmospheric Glow for other types (e.g., Gas Giants, Icy)
            float atmoGlowNoise = snoise(tiltedPosition * 2.0 + uTime * 0.1);
            atmoGlowNoise = (atmoGlowNoise + 1.0) * 0.5; // map to 0-1
            atmoGlowNoise = pow(atmoGlowNoise, 3.0);
            nightGlow = uAtmosphereColor * atmoGlowNoise * 0.5;
        }
        
        litColor += nightGlow * nightMask;
    }

    gl_FragColor = vec4(litColor, 1.0);
  }
`;
