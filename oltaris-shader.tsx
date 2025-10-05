import React, { useRef } from 'react';
import * as THREE from 'three';
// FIX: Extend THREE.ShaderMaterial to make <shaderMaterial> available in JSX.
import { useFrame, extend } from '@react-three/fiber';

extend({ ShaderMaterial: THREE.ShaderMaterial });

interface OltarisShaderProps {
  moodIntensity?: number;
  resonance?: number;
  starColor?: string;
  pulseColor?: string;
  density?: number;
}

const OltarisShader: React.FC<OltarisShaderProps> = ({
  moodIntensity = 0.7,
  resonance = 1.3,
  starColor = '#ffffff',
  pulseColor = '#ff66cc',
  density = 0.8,
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
          density: { value: density },
          starColor: { value: new THREE.Color(starColor) },
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
          uniform float density;
          uniform vec3 starColor;
          uniform vec3 pulseColor;
          varying vec2 vUv;

          float star(vec2 p) {
            float flicker = sin(dot(p, vec2(12.9898, 78.233)) + time * resonance) * 0.5 + 0.5;
            return step(1.0 - density, fract(sin(dot(p, vec2(43.2321, 21.123))) * 43758.5453)) * flicker;
          }

          void main() {
            float s = star(vUv * 100.0);
            vec3 color = mix(starColor, pulseColor, moodIntensity * s);
            gl_FragColor = vec4(color * s, 1.0);
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