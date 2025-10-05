/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  uniform float uTime;
  uniform float uSize;
  uniform float uSpinRate;
  uniform vec3 uMousePos;
  uniform float uMouseInteraction;
  uniform float uGravityAmount;

  attribute float aScale;
  varying vec3 vColor;
  varying vec3 vPos; // Pass position to fragment shader

  void main() {
    vColor = color;
    vec3 pos = position;
    vPos = pos; // Pass position

    // Mouse interaction to create a "gravitational wave" effect.
    if (uMouseInteraction > 0.0) {
      float dist = length(pos.xz - uMousePos.xz); // 2D distance on the galaxy plane
      float force = smoothstep(5.0, 0.0, dist) * uMouseInteraction;
      
      // Push particles away from the mouse, but also slightly "up" for a 3D effect.
      vec3 direction = normalize(pos - uMousePos);
      direction.y += 0.5;
      pos += direction * force;
    }

    // Apply differential rotation. Inner particles spin faster than outer ones.
    if (uSpinRate > 0.0) {
      // Calculate distance from the galactic center on the XZ plane.
      float radius = length(pos.xz);

      // Angular velocity is inversely proportional to the radius, creating the differential effect.
      // The "+ 1.0" prevents division by zero and softens the effect at the very center.
      float angularVelocityFactor = 2.0 / (radius + 1.0);
      float angle = uTime * uSpinRate * angularVelocityFactor;

      // Apply 2D rotation on the XZ plane.
      mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      pos.xz = rotation * pos.xz;
    }

    // Gravity effect
    if (uGravityAmount > 0.0) {
      float dist = length(pos);
      // Inverse square falloff, tweaked to avoid extreme values near the center.
      float gravityForce = uGravityAmount * 5.0 / (dist * dist + 5.0);
      // Pull towards the center (0,0,0) and also slightly "down" on the y-axis to create a lensing/sagging effect.
      vec3 pullDirection = normalize(vec3(-pos.x, -pos.y * 0.5 - 0.1, -pos.z));
      pos += pullDirection * gravityForce;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    // Point size is attenuated by distance (perspective).
    gl_PointSize = uSize * aScale * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fs = `
  uniform float uTime;
  uniform vec3 uMousePos;
  uniform float uMouseInteraction;

  varying vec3 vColor;
  varying vec3 vPos;

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

  // Fractional Brownian Motion
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 2.0;
    for (int i = 0; i < 4; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
  }


  void main() {
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    if (d > 0.5) discard;

    vec3 finalColor = vColor;

    // 1. Nebulae
    // Use a lower frequency noise for large, slow-swirling gas clouds
    float nebulaNoise = fbm(vPos * 0.15 + uTime * 0.05);
    nebulaNoise = (nebulaNoise + 1.0) * 0.5; // map to 0-1
    nebulaNoise = smoothstep(0.4, 0.7, nebulaNoise);
    vec3 nebulaColor = mix(vec3(0.4, 0.1, 0.5), vec3(0.8, 0.2, 0.3), vColor.r); // Purples and reds
    finalColor = mix(finalColor, nebulaColor, nebulaNoise * 0.7);

    // 2. Star Formation Regions (H II regions)
    // Use a higher frequency noise for smaller, brighter pockets of star birth
    float formationNoise = fbm(vPos * 0.8 + 0.5);
    formationNoise = (formationNoise + 1.0) * 0.5; // map to 0-1
    float formationMask = smoothstep(0.65, 0.75, formationNoise);
    vec3 formationColor = vec3(1.0, 0.2, 0.5); // Bright pink/magenta
    finalColor = mix(finalColor, formationColor, formationMask * 0.9);

    // 3. Core Glow & Light Pollution
    // Make particles near the center significantly brighter to simulate density
    float distToCenter = length(vPos);
    float coreGlow = 1.0 - smoothstep(0.0, 15.0, distToCenter); // Glow within 15 units of center
    finalColor += finalColor * pow(coreGlow, 2.0) * 2.0;

    // 4. Interaction Highlight
    // When the user interacts, create a bright, scanning glow
    float distToMouse = length(vPos.xz - uMousePos.xz);
    float interactionGlow = (1.0 - smoothstep(0.0, 6.0, distToMouse)) * uMouseInteraction;
    finalColor += vec3(0.5, 0.8, 1.0) * interactionGlow * 1.5; // Bright cyan glow on interaction

    // Final alpha calculation based on point sprite shape and interaction
    float strength = pow(1.0 - d * 2.0, 2.0);
    float brightness = (vColor.r + vColor.g + vColor.b) / 3.0;
    float alpha = strength * (0.2 + brightness * 0.8) + interactionGlow * 0.5;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;
