/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fs = `
  uniform float uTime;
  uniform vec3 uColor1; // Land color
  uniform vec3 uColor2; // Mountain/feature color
  uniform vec3 uOceanColor;
  uniform float uCloudiness; // 0.0 to 1.0
  uniform float uIceCoverage; // 0.0 to 1.0
  uniform int uTextureType; // 1: Terrestrial, 2: Gas Giant, 3: Volcanic

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // 3D Simplex Noise function
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
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
  }

  void main() {
    vec3 finalColor;

    if (uTextureType == 2) { // Gas Giant
        float noise = fbm(vPosition * 3.0 + vec3(uTime * 0.1, uTime * 0.05, 0.0), 5);
        float microNoise = snoise(vPosition * 20.0 + vec3(0.0, uTime * 0.3, 0.0));
        float bands = sin((vPosition.y + microNoise * 0.1) * 10.0 + noise * 5.0);
        
        finalColor = mix(uColor1, uColor2, smoothstep(-1.0, 1.0, bands));

        vec3 stormColor = mix(uColor2, uColor1, 0.5) * 1.2; // A third color for intense storms
        finalColor = mix(finalColor, stormColor, smoothstep(0.6, 0.8, abs(noise)));

    } else if (uTextureType == 3) { // Volcanic
        float baseNoise = fbm(vPosition * 4.0, 6);
        float cracks = 1.0 - smoothstep(0.0, 0.05, abs(fbm(vPosition * 10.0 + baseNoise, 2)));
        
        float pulseNoise = snoise(vPosition * 20.0 + uTime);
        float pulse = (sin(uTime * 2.0 + vPosition.x * 5.0 + pulseNoise * 2.0) + 1.0) / 2.0;
        pulse = pow(pulse, 2.0); // Make the bright parts brighter and shorter
        pulse = 0.8 + pulse * 1.2; // pulse up to 2.0
        
        vec3 crackColor = uColor2 * 1.5 * pulse;
        finalColor = mix(uColor1, crackColor, cracks);

    } else { // Terrestrial (default)
        float terrain = fbm(vPosition * 2.5, 6);
        float seaLevel = 0.0;
        vec3 surfaceColor = mix(uOceanColor, uColor1, smoothstep(seaLevel - 0.05, seaLevel + 0.05, terrain));
        surfaceColor = mix(surfaceColor, uColor2, smoothstep(0.3, 0.4, terrain));
        float iceFalloff = smoothstep(0.6, 0.8, abs(vPosition.y));
        float iceNoise = snoise(vPosition * 10.0) * 0.1;
        float iceAmount = smoothstep(1.0 - uIceCoverage, 1.0, iceFalloff + iceNoise);
        surfaceColor = mix(surfaceColor, vec3(0.95), iceAmount);
        finalColor = surfaceColor;
        
        // Add auroras if there is significant ice coverage
        if (uIceCoverage > 0.3) {
            float poleFalloff = smoothstep(0.5, 0.8, abs(vPosition.y)) * pow(abs(vPosition.y), 2.0);
            float auroraNoise = fbm(vPosition * 2.0 + vec3(0.0, 0.0, uTime * 0.3), 5);
            auroraNoise = smoothstep(0.4, 0.6, auroraNoise);
            
            float auroraShape = sin(vPosition.x * 10.0 + uTime) * sin(vPosition.z * 10.0 + uTime * 0.5);
            auroraShape = smoothstep(0.8, 1.0, auroraShape);

            float aurora = poleFalloff * auroraNoise * auroraShape;
            
            vec3 auroraColor = mix(vec3(0.1, 1.0, 0.2), vec3(0.8, 0.2, 1.0), sin(vPosition.x * 2.0));
            finalColor = mix(finalColor, auroraColor, aurora * (0.5 + uIceCoverage));
        }
    }

    if (uCloudiness > 0.0) {
      float angle = uTime * 0.2;
      mat3 rotationMatrix = mat3(cos(angle), 0, sin(angle), 0, 1, 0, -sin(angle), 0, cos(angle));
      vec3 cloudPos = rotationMatrix * vPosition;
      // Animate cloud shapes over time
      float cloudNoise = fbm(cloudPos * 4.0 + vec3(uTime * 0.1, 0.0, 0.0), 4);
      float cloudCoverage = smoothstep(0.5 - uCloudiness, 0.5, cloudNoise);
      finalColor = mix(finalColor, vec3(1.0), cloudCoverage);
    }
    
    float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0)));
    light = clamp(light, 0.3, 1.0);
    
    gl_FragColor = vec4(finalColor * light, 1.0);
  }
`;