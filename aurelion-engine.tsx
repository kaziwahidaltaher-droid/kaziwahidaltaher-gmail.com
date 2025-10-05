import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, Canvas } from '@react-three/fiber';
import { galaxyVertexShader, galaxyFragmentShader } from './galaxy-point-shaders';

interface GalaxyConfig {
  numStars: number;
  radius: number;
  starColors?: THREE.Color[];
  moodIntensity?: number;
  resonance?: number;
}

interface AurelionEngineProps {
  config: GalaxyConfig;
  isTransition?: boolean;
}

const AurelionEngine: React.FC<AurelionEngineProps> = ({ config, isTransition = false }) => {
  const starfieldRef = useRef<THREE.Points>(null);
  const starPositions = useRef<Float32Array>(new Float32Array(config.numStars * 3));

  useEffect(() => {
    const { numStars, radius } = config;
    let i3 = 0;
    for (let i = 0; i < numStars; i++) {
      starPositions.current[i3] = (Math.random() - 0.5) * radius * 2;
      starPositions.current[i3 + 1] = (Math.random() - 0.5) * radius * 2;
      starPositions.current[i3 + 2] = (Math.random() - 0.5) * radius * 2;
      i3 += 3;
    }
  }, [config]);

  const Starfield = () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(starPositions.current, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        moodIntensity: { value: config.moodIntensity || 0.5 },
        resonanceFrequency: { value: config.resonance || 1.0 },
      },
      vertexShader: galaxyVertexShader,
      fragmentShader: galaxyFragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      transparent: true,
    });

    useFrame(({ clock }) => {
      if (starfieldRef.current) {
        (starfieldRef.current.material as THREE.ShaderMaterial).uniforms.time.value = clock.getElapsedTime();
      }
    });

    return <points ref={starfieldRef} geometry={geometry} material={material} />;
  };

  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <Starfield />
    </Canvas>
  );
};

export default AurelionEngine;