import React, { useRef } from 'react';
import * as THREE from 'three';
// FIX: Extend THREE.ShaderMaterial to make <shaderMaterial> available in JSX.
import { useFrame, extend } from '@react-three/fiber';

extend({ ShaderMaterial: THREE.ShaderMaterial });

interface SphereShaderProps {
  moodIntensity?: number;
  resonance?: number;
  innerColor?: string;
  outerColor?: string;
  pulseSpeed?: number;
}

const SphereShader: React.FC<SphereShaderProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  innerColor = '#00ffff',
  outerColor = '#220044',
  pulseSpeed = 0.4,
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
          innerColor: { value: new THREE.Color(innerColor) },
          outerColor: { value: new THREE.Color(outerColor) },
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
          uniform vec3 innerColor;
          uniform vec3 outerColor;
          varying vec3 vPosition;

          void main() {
            float r = length(vPosition);
            float pulse = sin(time * pulseSpeed + r * 5.0) * 0.5 + 0.5;
            float glow = smoothstep(1.2, 0.3, r) * pulse * moodIntensity;
            vec3 color = mix(outerColor, innerColor, glow);
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

export default SphereShader;