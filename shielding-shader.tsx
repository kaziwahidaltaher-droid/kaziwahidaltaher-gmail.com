import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface ShieldingShaderProps {
  moodIntensity?: number;
  resonance?: number;
  innerColor?: string;
  outerColor?: string;
}

const ShieldingShader: React.FC<ShieldingShaderProps> = ({
  moodIntensity = 0.5,
  resonance = 1.0,
  innerColor = '#00ffff',
  outerColor = '#220044',
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
          innerColor: { value: new THREE.Color(innerColor) },
          outerColor: { value: new THREE.Color(outerColor) },
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
          uniform vec3 innerColor;
          uniform vec3 outerColor;
          varying vec2 vUv;

          float shield(vec2 p, float t) {
            float dist = length(p - 0.5);
            float wave = sin(t * resonance + dist * 20.0);
            return smoothstep(0.4, 0.0, dist) * (0.5 + 0.5 * wave);
          }

          void main() {
            float glow = shield(vUv, time) * moodIntensity;
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

export default ShieldingShader;
