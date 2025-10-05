import React, { useRef } from 'react';
import * as THREE from 'three';
// FIX: Extend THREE.ShaderMaterial to make <shaderMaterial> available in JSX.
import { useFrame, extend } from '@react-three/fiber';

extend({ ShaderMaterial: THREE.ShaderMaterial });

interface ProbeShaderProps {
  moodIntensity?: number;
  resonance?: number;
  coreColor?: string;
  pulseColor?: string;
  scanSpeed?: number;
}

const ProbeShader: React.FC<ProbeShaderProps> = ({
  moodIntensity = 0.7,
  resonance = 1.4,
  coreColor = '#00ffcc',
  pulseColor = '#ff66cc',
  scanSpeed = 0.5,
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
          scanSpeed: { value: scanSpeed },
          coreColor: { value: new THREE.Color(coreColor) },
          pulseColor: { value: new THREE.Color(pulseColor) },
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
          uniform float scanSpeed;
          uniform vec3 coreColor;
          uniform vec3 pulseColor;
          varying vec3 vPosition;

          void main() {
            float r = length(vPosition);
            float scan = sin(time * scanSpeed + r * 4.0) * 0.5 + 0.5;
            float pulse = sin(time * resonance + r * 2.0) * 0.5 + 0.5;
            float glow = smoothstep(1.5, 0.3, r) * scan * pulse * moodIntensity;
            vec3 color = mix(coreColor, pulseColor, glow);
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