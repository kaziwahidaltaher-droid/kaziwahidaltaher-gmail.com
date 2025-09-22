import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface BackdropShaderProps {
  moodIntensity?: number;
  resonance?: number;
}

const BackdropShader: React.FC<BackdropShaderProps> = ({
  moodIntensity = 0.5,
  resonance = 1.0,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      moodIntensity: { value: moodIntensity },
      resonanceFrequency: { value: resonance },
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
      uniform float resonanceFrequency;
      varying vec2 vUv;

      void main() {
        float pulse = sin(time * resonanceFrequency) * 0.5 + 0.5;
        vec3 color = mix(vec3(0.05, 0.1, 0.2), vec3(0.3, 0.6, 1.0), moodIntensity * pulse);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: false,
  });

  useFrame(({ clock }) => {
    if (shaderMaterial.uniforms.time) {
      shaderMaterial.uniforms.time.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1000, 1000]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
};

export default BackdropShader;
