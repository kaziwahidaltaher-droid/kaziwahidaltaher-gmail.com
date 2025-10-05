import React, { useRef } from 'react';
import * as THREE from 'three';
// FIX: Extend THREE.ShaderMaterial to make <shaderMaterial> available in JSX.
import { useFrame, extend } from '@react-three/fiber';

extend({ ShaderMaterial: THREE.ShaderMaterial });

interface PhantomGlowShaderProps {
  moodIntensity?: number;
  resonance?: number;
  glowColor?: string;
  shadowColor?: string;
}

const PhantomGlowShader: React.FC<PhantomGlowShaderProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  glowColor = '#88ccff',
  shadowColor = '#000022',
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
          glowColor: { value: new THREE.Color(glowColor) },
          shadowColor: { value: new THREE.Color(shadowColor) },
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
          uniform vec3 glowColor;
          uniform vec3 shadowColor;
          varying vec3 vPosition;

          void main() {
            float r = length(vPosition);
            float pulse = sin(time * resonance + r * 2.0) * 0.5 + 0.5;
            float glow = smoothstep(1.5, 0.5, r) * pulse * moodIntensity;
            vec3 color = mix(shadowColor, glowColor, glow);
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

export default PhantomGlowShader;