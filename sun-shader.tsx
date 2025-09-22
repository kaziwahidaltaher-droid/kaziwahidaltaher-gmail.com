import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SunShaderProps {
  moodIntensity?: number;
  resonance?: number;
  coreColor?: string;
  flareColor?: string;
}

const SunShader: React.FC<SunShaderProps> = ({
  moodIntensity = 0.8,
  resonance = 1.5,
  coreColor = '#ffcc33',
  flareColor = '#ff6600',
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
          coreColor: { value: new THREE.Color(coreColor) },
          flareColor: { value: new THREE.Color(flareColor) },
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
          uniform vec3 coreColor;
          uniform vec3 flareColor;
          varying vec3 vPosition;

          float flare(vec3 p, float t) {
            float r = length(p);
            float wave = sin(t * resonance + r * 10.0);
            return smoothstep(0.5, 0.0, r) * (0.5 + 0.5 * wave);
          }

          void main() {
            float glow = flare(vPosition, time) * moodIntensity;
            vec3 color = mix(coreColor, flareColor, glow);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        transparent: false,
        depthWrite: true,
        side: THREE.FrontSide,
      }]}
    />
  );
};

export default SunShader;
