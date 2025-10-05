import React, { useRef } from 'react';
import * as THREE from 'three';
// FIX: Extend THREE.ShaderMaterial to make <shaderMaterial> available in JSX.
import { useFrame, extend } from '@react-three/fiber';

extend({ ShaderMaterial: THREE.ShaderMaterial });

interface ShieldingShaderProps {
  moodIntensity?: number;
  resonance?: number;
  shieldColor?: string;
  rippleColor?: string;
  pulseSpeed?: number;
}

const ShieldingShader: React.FC<ShieldingShaderProps> = ({
  moodIntensity = 0.8,
  resonance = 1.5,
  shieldColor = '#00ccff',
  rippleColor = '#ff66cc',
  pulseSpeed = 0.6,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime();
    }
  });

  return (
    <shaderMaterial
      ref={materialRef}
      attach="material"
      args={[{
        uniforms: {
          time: { value: 0 },
          moodIntensity: { value: moodIntensity },
          resonance: { value: resonance },
          pulseSpeed: { value: pulseSpeed },
          shieldColor: { value: new THREE.Color(shieldColor) },
          rippleColor: { value: new THREE.Color(rippleColor) },
        },
        vertexShader: `
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float moodIntensity;
          uniform float resonance;
          uniform float pulseSpeed;
          uniform vec3 shieldColor;
          uniform vec3 rippleColor;
          varying vec3 vPosition;

          float ripple(vec3 p) {
            float r = length(p);
            return sin(r * 10.0 - time * pulseSpeed) * 0.5 + 0.5;
          }

          void main() {
            float r = length(vPosition);
            float glow = smoothstep(1.2, 0.4, r);
            float pulse = ripple(vPosition) * moodIntensity;
            vec3 color = mix(shieldColor, rippleColor, pulse * glow);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        transparent: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }]}
    />
  );
};

export default ShieldingShader;