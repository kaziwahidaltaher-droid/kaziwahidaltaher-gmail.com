
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { glsl_noise_utils } from './shader-utils.tsx';

export const vs = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    vWorldNormal = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const fs = glsl_noise_utils + `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vWorldNormal;
  
  uniform vec3 uAtmosphereColor;
  uniform float uFresnelPower;
  uniform float uTime;
  uniform bool uHasAuroras;
  uniform bool uIsSelected;
  uniform bool uIsHovered;
  uniform vec3 uLightDirection;

  // Simple 2D noise for shimmering
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    // Calculate the fresnel effect (rim glow)
    float fresnel = 1.0 - dot(vNormal, vViewDirection);
    fresnel = pow(fresnel, uFresnelPower);
    
    // Calculate how much this point is lit by the star
    float lightIntensity = dot(vWorldNormal, uLightDirection);
    lightIntensity = smoothstep(-0.2, 0.5, lightIntensity); // Soft transition at terminator

    // Combine fresnel with light intensity for a scattering effect
    float scattering = fresnel * lightIntensity;

    // Add dynamic, shimmering noise
    float noise = random(vUv * 5.0 + uTime * 0.1);
    scattering *= (0.8 + noise * 0.4);

    // Use smoothstep for a softer edge
    float alpha = smoothstep(0.0, 1.0, scattering);

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
     if (uIsHovered) {
        effectMask = max(effectMask, 0.3);
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
