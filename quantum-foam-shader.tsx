import React, { useRef } from 'react';
import * as THREE from 'three';
// FIX: Extend THREE.ShaderMaterial to make <shaderMaterial> available in JSX.
import { useFrame, extend } from '@react-three/fiber';

extend({ ShaderMaterial: THREE.ShaderMaterial });

interface QuantumFoamShaderProps {
  moodIntensity?: number;
  resonance?: number;
  baseColor?: string;
  flickerColor?: string;
}

const QuantumFoamShader: React.FC<QuantumFoamShaderProps> = ({
  moodIntensity = 0.5,
  resonance = 1.0,
  baseColor = '#111122',
  flickerColor = '#00ffff',
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
          baseColor: { value: new THREE.Color(baseColor) },
          flickerColor: { value: new THREE.Color(flickerColor) },
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
          uniform vec3 baseColor;
          uniform vec3 flickerColor;
          varying vec2 vUv;

          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);
          }

          void main() {
            float flicker = sin(time * resonance + vUv.x * 10.0 + vUv.y * 10.0) * 0.5 + 0.5;
            float foam = noise(vUv * 40.0 + time * 0.2);
            vec3 color = mix(baseColor, flickerColor, foam * flicker * moodIntensity);
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

export default QuantumFoamShader;