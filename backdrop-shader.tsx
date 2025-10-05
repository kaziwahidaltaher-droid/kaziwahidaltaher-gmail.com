import React, { useRef } from 'react';
import * as THREE from 'three';
// FIX: Extend THREE.ShaderMaterial to make <shaderMaterial> available in JSX.
import { useFrame, extend } from '@react-three/fiber';

extend({ ShaderMaterial: THREE.ShaderMaterial });

interface BackdropShaderProps {
  moodIntensity?: number;
  resonance?: number;
  colorStart?: string;
  colorEnd?: string;
}

const BackdropShader: React.FC<BackdropShaderProps> = ({
  moodIntensity = 0.5,
  resonance = 1.0,
  colorStart = '#220044',
  colorEnd = '#00ffff',
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
          colorStart: { value: new THREE.Color(colorStart) },
          colorEnd: { value: new THREE.Color(colorEnd) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float moodIntensity;
          uniform float resonance;
          uniform vec3 colorStart;
          uniform vec3 colorEnd;
          varying vec2 vUv;

          void main() {
            float pulse = sin(time * resonance + vUv.y * 5.0) * 0.5 + 0.5;
            vec3 color = mix(colorStart, colorEnd, vUv.y + pulse * moodIntensity * 0.3);
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

export default BackdropShader;