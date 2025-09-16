/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const vs = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec2 vUv;

  void main() {
    vUv = uv;
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
  
  uniform vec3 uAtmosphereColor;
  uniform float uTime;

  // Simple 2D noise
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    // Calculate the fresnel effect
    float fresnel = 1.0 - dot(vNormal, vViewDirection);
    fresnel = pow(fresnel, 4.0);
    
    // Add dynamic, shimmering noise
    float noise = random(vUv * 5.0 + uTime * 0.1);
    fresnel *= (0.8 + noise * 0.4);

    float alpha = smoothstep(0.0, 1.0, fresnel);

    gl_FragColor = vec4(uAtmosphereColor, alpha);
  }
`;