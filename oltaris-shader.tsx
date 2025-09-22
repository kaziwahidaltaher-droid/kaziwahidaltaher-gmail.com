import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface OltarisShaderProps {
  moodIntensity?: number;
  resonance?: number;
  colorCore?: string;
  colorAura?: string;
}

const OltarisShader: React.FC<OltarisShaderProps> = ({
  moodIntensity = 0.5,
  resonance = 1.0,
  colorCore = '#ffccaa',
  colorAura = '#220044',
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
          colorCore: { value: new THREE.Color(colorCore) },
          colorAura: { value: new THREE.Color(colorAura) },
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
          uniform vec3 colorCore;
          uniform vec3 colorAura;
          varying vec2 vUv;

          float radial(vec2 p) {
            return smoothstep(0.0, 1.0, 1.0 - length(p - 0.5) * 2.0);
          }

          void main() {
            float pulse = sin(time * resonance + vUv.x * 3.0 + vUv.y * 3.0) * 0.5 + 0.5;
            float glow = radial(vUv) * moodIntensity;
            vec3 color = mix(colorAura, colorCore, glow * pulse);
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

export default OltarisShader;
