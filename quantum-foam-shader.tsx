import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface QuantumFoamShaderProps {
  moodIntensity?: number;
  resonance?: number;
  baseColor?: string;
  flickerColor?: string;
}

const QuantumFoamShader: React.FC<QuantumFoamShaderProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  baseColor = '#111122',
  flickerColor = '#88ffff',
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

          float foam(vec2 p, float t) {
            float grain = fract(sin(dot(p * t, vec2(12.9898, 78.233))) * 43758.5453);
            float pulse = sin(t * resonance + p.x * 10.0 + p.y * 10.0);
            return grain * pulse;
          }

          void main() {
            float flicker = foam(vUv, time) * moodIntensity;
            vec3 color = mix(baseColor, flickerColor, flicker);
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
