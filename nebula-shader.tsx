import React, { useRef } from 'react';
import * as THREE from 'three';
// FIX: Extend THREE.ShaderMaterial to make <shaderMaterial> available in JSX.
import { useFrame, extend } from '@react-three/fiber';

extend({ ShaderMaterial: THREE.ShaderMaterial });

interface NebulaShaderProps {
  moodIntensity?: number;
  resonance?: number;
  baseColor?: string;
  pulseColor?: string;
  swirlSpeed?: number;
}

const NebulaShader: React.FC<NebulaShaderProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  baseColor = '#220044',
  pulseColor = '#ff66cc',
  swirlSpeed = 0.3,
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
          swirlSpeed: { value: swirlSpeed },
          baseColor: { value: new THREE.Color(baseColor) },
          pulseColor: { value: new THREE.Color(pulseColor) },
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
          uniform float swirlSpeed;
          uniform vec3 baseColor;
          uniform vec3 pulseColor;
          varying vec2 vUv;

          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);
          }

          void main() {
            float swirl = sin(vUv.x * 10.0 + time * swirlSpeed) * 0.5 + 0.5;
            float pulse = sin(time * resonance + vUv.y * 5.0) * 0.5 + 0.5;
            float nebula = noise(vUv * 10.0 + time * 0.1);
            vec3 color = mix(baseColor, pulseColor, pulse * moodIntensity * swirl * nebula);
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

export default NebulaShader;