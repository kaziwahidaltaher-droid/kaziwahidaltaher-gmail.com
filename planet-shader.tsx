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
export const fs = `
  uniform float uTime;
  uniform vec3 uColor1; // Primary land/gas color
  uniform vec3 uColor2; // Secondary land/gas color
  uniform vec3 uOceanColor;
  uniform float uCloudiness;
  uniform float uIceCoverage;
  uniform int uTextureType; // 1:TERRESTRIAL, 2:GAS_GIANT, 3:VOLCANIC, 4:ICY
  uniform bool uIsSelected;
  uniform bool uIsHovered;
  uniform vec3 uLightDirection;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;

  // Simplex Noise and FBM functions (standard implementation)
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

  float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 2.0;
    for (int i = 0; i < octaves; i++) {
        value += amplitude * abs(snoise(p * frequency));
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
  }

  vec3 getGasGiantColor(vec3 p) {
    float noise = fbm(p * 2.0 + vec3(uTime * 0.1, 0.0, 0.0), 4);
    float bands = sin(p.y * 10.0 + noise * 2.0 + uTime * 0.2);
    return mix(uColor1, uColor2, smoothstep(-1.0, 1.0, bands));
  }

  vec3 getTerrainColor(vec3 p) {
    float n = fbm(p * 3.0, 5);
    vec3 color = mix(uColor1, uColor2, pow(n, 1.5));
    if (n < 0.35) {
        color = uOceanColor;
    }
    return color;
  }

  vec3 getVolcanicColor(vec3 p) {
    float n = fbm(p * 4.0, 6);
    vec3 color = mix(uColor1, uColor2, n);
    float cracks = fbm(p * 8.0 + vec3(uTime * 0.05, 0.0, 0.0), 3);
    color = mix(color, vec3(1.0, 0.3, 0.0), smoothstep(0.6, 0.7, cracks));
    return color;
  }

  vec3 getIcyColor(vec3 p) {
      float n = fbm(p * 5.0, 6);
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
    } else {
      baseColor = getTerrainColor(vPosition);
    }

    float iceFactor = pow(smoothstep(0.6, 0.8, abs(vPosition.y)), 2.0) * uIceCoverage;
    baseColor = mix(baseColor, vec3(0.9, 0.9, 1.0), iceFactor);

    float cloudNoise = fbm(vPosition * 4.0 + vec3(uTime * 0.1, 0.0, 0.0), 5);
    float cloudMask = smoothstep(0.4, 0.6, cloudNoise) * uCloudiness;
    baseColor = mix(baseColor, vec3(1.0), cloudMask);

    float light = dot(vNormal, normalize(uLightDirection));
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
