import React from 'react';
// FIX: The `extend` function from react-three-fiber should not be called with the entire THREE namespace.
// Built-in THREE components are available in JSX by default with R3F.
// Removed `extend(THREE)` and unused `extend` import.
import { Canvas } from '@react-three/fiber';
import QuantumFoamShader from './quantum-foam-shader';
import * as THREE from 'three';

interface QuantumFoamVisualizerProps {
  moodIntensity?: number;
  resonance?: number;
  baseColor?: string;
  flickerColor?: string;
  fullScreen?: boolean;
}

const QuantumFoamVisualizer: React.FC<QuantumFoamVisualizerProps> = ({
  moodIntensity = 0.5,
  resonance = 1.0,
  baseColor = '#111122',
  flickerColor = '#00ffff',
  fullScreen = true,
}) => {
  const containerStyle: React.CSSProperties = fullScreen
    ? { width: '100vw', height: '100vh', background: '#000' }
    : { width: '100%', height: '100%', background: '#000' };

  return (
    <div style={containerStyle}>
      <Canvas>
        <ambientLight intensity={0.4} />
        <mesh>
          <planeGeometry args={[1000, 1000]} />
          <QuantumFoamShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            baseColor={baseColor}
            flickerColor={flickerColor}
          />
        </mesh>
      </Canvas>
    </div>
  );
};

export default QuantumFoamVisualizer;