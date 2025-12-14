
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { glsl_noise_utils } from './shader-utils.tsx';

// Vertex Shader: Passes position, normals, and UVs to the fragment shader.
export const vs = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  uniform float uAxialTilt;

  // Function to rotate around the Y axis
  mat3 rotateY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
      c, 0, s,
      0, 1, 0,
      -s, 0, c
    );
  }

  void main() {
    vUv = uv;
    // Pass original position for stable noise patterns that don't depend on tilt
    vPosition = position; 
    
    // Apply axial tilt to the sphere's orientation
    vec3 tiltedPosition = rotateY(uAxialTilt) * position;
    vec3 tiltedNormal = rotateY(uAxialTilt) * normal;

    vNormal = normalize(normalMatrix * tiltedNormal);
    
    vec4 mvPosition = modelViewMatrix * vec4(tiltedPosition, 1.0);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment Shader: Procedurally generates planet surfaces.
export const fs = glsl_noise_utils + `
  uniform float uTime;
  uniform vec3 uColor1; // Primary land/gas color
  uniform vec3 uColor2; // Secondary land/gas color
  uniform vec3 uOceanColor;
  uniform float uCloudiness;
  uniform float uIceCoverage;
  uniform int uTextureType; // 1:TERRESTRIAL, 2:GAS_GIANT, 3:VOLCANIC, 4:ICY, 5:ORGANIC
  uniform bool uIsSelected;
  uniform bool uIsHovered;
  uniform vec3 uLightDirection;
  
  // Scale and Distortion controls
  uniform float uSurfaceScale;
  uniform float uSurfaceDistortion;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;

  // Apply scaling and domain warping to coordinates
  vec3 getDistortedCoord(vec3 p) {
      vec3 q = p * uSurfaceScale;
      float d = snoise(q * 0.4); 
      return q + d * uSurfaceDistortion;
  }

  vec3 getGasGiantColor(vec3 p) {
    // Gas giants have their own specific banding logic
    vec3 coord = p * uSurfaceScale;
    
    // Warp the domain for turbulence
    float warp = fbm(coord * 0.5, 2);
    vec3 q = coord + vec3(warp * uSurfaceDistortion);
    
    float noise = fbm(q * 2.0 + vec3(uTime * 0.1, 0.0, 0.0), 4);
    float bands = sin(q.y * 10.0 + noise * 2.0 + uTime * 0.2);
    return mix(uColor1, uColor2, smoothstep(-1.0, 1.0, bands));
  }

  vec3 getTerrainColor(vec3 p) {
    vec3 q = getDistortedCoord(p);
    float n = fbm(q, 6);
    vec3 color = mix(uColor1, uColor2, pow(n, 1.5));
    if (n < 0.35) {
        color = uOceanColor;
    }
    return color;
  }

  vec3 getVolcanicColor(vec3 p) {
    vec3 q = getDistortedCoord(p);
    float n = fbm(q, 6);
    vec3 color = mix(uColor1, uColor2, n);
    float cracks = fbm(q * 2.0 + vec3(uTime * 0.05, 0.0, 0.0), 4);
    color = mix(color, vec3(1.0, 0.3, 0.0), smoothstep(0.6, 0.7, cracks));
    return color;
  }
  
  vec3 getOrganicColor(vec3 p) {
    vec3 q = getDistortedCoord(p);
    float n = fbm(q + uTime * 0.2, 6);
    n = pow(n, 1.2);
    vec3 veinColor = uColor2 * (0.8 + sin(n * 20.0 + uTime) * 0.2);
    return mix(uColor1, veinColor, smoothstep(0.5, 0.8, n));
  }

  vec3 getIcyColor(vec3 p) {
      vec3 q = getDistortedCoord(p);
      float n = fbm(q, 6);
      return mix(uColor1, uColor2, n);
  }
  
  void main() {
    vec3 baseColor;
    
    if (uTextureType == 2) {
      baseColor = getGasGiantColor(vPosition);
    } else if (uTextureType == 3) {
      baseColor = getVolcanicColor(vPosition);
    } else if (uTextureType == 4) {
      baseColor = getIcyColor(vPosition);
    } else if (uTextureType == 5) {
      baseColor = getOrganicColor(vPosition);
    } else {
      baseColor = getTerrainColor(vPosition);
    }

    float iceFactor = pow(smoothstep(0.6, 0.8, abs(vPosition.y)), 2.0) * uIceCoverage;
    baseColor = mix(baseColor, vec3(0.9, 0.9, 1.0), iceFactor);

    float cloudNoise = fbm(vPosition * 4.0 * (uSurfaceScale * 0.3) + vec3(uTime * 0.1, 0.0, 0.0), 5);
    float cloudMask = smoothstep(0.4, 0.6, cloudNoise) * uCloudiness;
    baseColor = mix(baseColor, vec3(1.0), cloudMask);

    float light = dot(vNormal, uLightDirection);
    light = smoothstep(-0.2, 1.0, light);
    
    float rim = 1.0 - dot(normalize(vViewPosition), vNormal);
    rim = pow(rim, 3.0);
    float selectionGlow = 0.0;
    if (uIsSelected) selectionGlow = rim * 0.8;
    if (uIsHovered) selectionGlow = max(selectionGlow, rim * 0.5);

    vec3 finalColor = baseColor * (light * 0.8 + 0.2) + selectionGlow * vec3(0.5, 0.8, 1.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
