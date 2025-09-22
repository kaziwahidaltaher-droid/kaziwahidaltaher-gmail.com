import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SphereShaderProps {
  moodIntensity?: number;
  resonance?: number;
  coreColor?: string;
  auraColor?: string;
}

const SphereShader: React.FC<SphereShaderProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  coreColor = '#ff66cc',
  auraColor = '#00ffff',
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
          coreColor: { value: new THREE.Color(coreColor) },
          auraColor: { value: new THREE.Color(auraColor) },
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
          uniform vec3 coreColor;
          uniform vec3 auraColor;
          varying vec3 vPosition;

          void main() {
            float r = length(vPosition);
            float pulse = sin(time * resonance + r * 5.0) * 0.5 + 0.5;
            vec3 color = mix(coreColor, auraColor, pulse * moodIntensity);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        transparent: false,
        depthWrite: true,
        side: THREE.FrontSide,
      }]}
    />
  );
};

export default SphereShader;
