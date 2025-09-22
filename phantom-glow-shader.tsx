import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface PhantomGlowShaderProps {
  moodIntensity?: number;
  resonance?: number;
  glowColor?: string;
  shadowColor?: string;
}

const PhantomGlowShader: React.FC<PhantomGlowShaderProps> = ({
  moodIntensity = 0.5,
  resonance = 1.0,
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
          uniform vec3 glowColor;
          uniform vec3 shadowColor;
          varying vec2 vUv;

          float phantom(vec2 p) {
            float dist = length(p - 0.5);
            float wave = sin(time * resonance + dist * 10.0);
            return smoothstep(0.3, 0.0, dist) * (0.5 + 0.5 * wave);
          }

          void main() {
            float glow = phantom(vUv) * moodIntensity;
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
