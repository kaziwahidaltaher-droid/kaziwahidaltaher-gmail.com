import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SphereShaderProps {
  moodIntensity?: number;
  resonance?: number;
  coreColor?: THREE.ColorRepresentation;
  auraColor?: THREE.ColorRepresentation;
}

const SphereShader: React.FC<SphereShaderProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  coreColor = '#ff66cc',
  // FIX: 'aura' was a shorthand property with no declaration. Changed to 'auraColor' to match the interface and provided a default value.
  auraColor = '#61faff',
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
          auraColor: { value: new THREE.Color(auraColor) },
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
          uniform vec3 auraColor;
          varying vec3 vPosition;

          float pulse(vec3 p, float t) {
            float r = length(p);
            float wave = sin(t * resonance + r * 5.0);
            return smoothstep(0.8, 0.0, r) * (0.5 + 0.5 * wave);
          }

          void main() {
            float glow = pulse(vPosition, time) * moodIntensity;
            vec3 color = mix(coreColor, auraColor, glow);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
      }]}
    />
  );
};

export default SphereShader;
