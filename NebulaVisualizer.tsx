import React, { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';

interface NebulaVisualizerProps {
  moodIntensity?: number;
  resonance?: number;
  colorA?: string;
  colorB?: string;
}

const NebulaShaderMaterial = ({
  moodIntensity = 0.6,
  resonance = 1.0,
  colorA = '#220044',
  colorB = '#ff66cc',
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
          colorA: { value: new THREE.Color(colorA) },
          colorB: { value: new THREE.Color(colorB) },
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
          uniform vec3 colorA;
          uniform vec3 colorB;
          varying vec2 vUv;

          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }

          void main() {
            float pulse = sin(time * resonance + vUv.x * 10.0) * 0.5 + 0.5;
            float grain = noise(vUv * time * 0.1);
            vec3 color = mix(colorA, colorB, moodIntensity * pulse + grain * 0.2);
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

const NebulaVisualizer: React.FC<NebulaVisualizerProps> = (props) => {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <mesh>
        <planeGeometry args={[1000, 1000]} />
        <NebulaShaderMaterial {...props} />
      </mesh>
    </Canvas>
  );
};

export default NebulaVisualizer;
