import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface ProbeShaderProps {
  moodIntensity?: number;
  resonance?: number;
  scanColor?: string;
  backgroundColor?: string;
}

const ProbeShader: React.FC<ProbeShaderProps> = ({
  moodIntensity = 0.5,
  resonance = 1.0,
  scanColor = '#00ffcc',
  backgroundColor = '#000022',
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
          scanColor: { value: new THREE.Color(scanColor) },
          backgroundColor: { value: new THREE.Color(backgroundColor) },
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
          uniform vec3 scanColor;
          uniform vec3 backgroundColor;
          varying vec2 vUv;

          float radialPulse(vec2 p, float t) {
            float dist = length(p - 0.5);
            float wave = sin(t * resonance - dist * 10.0);
            return smoothstep(0.2, 0.0, dist) * (0.5 + 0.5 * wave);
          }

          void main() {
            float pulse = radialPulse(vUv, time);
            vec3 color = mix(backgroundColor, scanColor, pulse * moodIntensity);
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

export default ProbeShader;
