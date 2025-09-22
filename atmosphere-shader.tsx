/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const fs = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  uniform vec3 uAtmosphereColor;
  uniform float uFresnelPower;
  uniform float uTime;
  uniform bool uHasAuroras;
  uniform bool uIsSelected;

  // 3D Simplex Noise and FBM functions (needed for auroras)
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

  // Simple 2D noise for shimmering
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    // Calculate the fresnel effect
    float fresnel = 1.0 - dot(vNormal, vViewDirection);
    fresnel = pow(fresnel, uFresnelPower);
    
    // Add dynamic, shimmering noise
    float noise = random(vUv * 5.0 + uTime * 0.1);
    fresnel *= (0.8 + noise * 0.4);

    // Use smoothstep for a softer edge
    float alpha = smoothstep(0.0, 1.0, fresnel);

    vec4 finalColor = vec4(uAtmosphereColor, alpha);

    // Aurora / Selection effect
    float effectMask = 0.0;
    if (uHasAuroras) {
        effectMask = smoothstep(0.5, 0.9, abs(vPosition.y));
    }
    if (uIsSelected) {
        // When selected, the effect is stronger and more global
        effectMask = max(effectMask, 0.5); 
    }

    if (effectMask > 0.01) {
        // Animate noise coordinates on multiple axes for a more dynamic flow
        vec3 p = vec3(vPosition.x * 2.0, vPosition.y * 0.5 + uTime * 0.1, vPosition.z * 2.0 + uTime * 0.2);
        float auroraNoise = fbm(p, 4);
        
        // Add vertical bands that move
        auroraNoise *= sin(vPosition.x * 5.0 + uTime * 0.5) * 0.5 + 0.5;
        
        // Clamp and shape the noise to create sharp ribbons
        auroraNoise = smoothstep(0.4, 0.6, auroraNoise);
        
        // Define aurora color that shifts from green to purple
        vec3 auroraColor = mix(vec3(0.1, 0.8, 0.4), vec3(0.5, 0.2, 0.9), sin(vPosition.x * 2.0));
        
        // Add to the final color, modulated by the mask and fresnel
        finalColor.rgb += auroraColor * auroraNoise * effectMask * fresnel * 2.0;
    }

    gl_FragColor = finalColor;
  }
`;
