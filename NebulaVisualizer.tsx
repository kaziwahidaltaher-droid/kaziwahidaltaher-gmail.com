import React from 'react';
// FIX: The `extend` function from react-three-fiber should not be called with the entire THREE namespace.
// Built-in THREE components are available in JSX by default with R3F.
// Removed `extend(THREE)` and unused `extend` import.
import { Canvas } from '@react-three/fiber';
import NebulaShader from './nebula-shader';
import * as THREE from 'three';

interface NebulaVisualizerProps {
  moodIntensity?: number;
  resonance?: number;
  baseColor?: string;
  pulseColor?: string;
  swirlSpeed?: number;
  fullScreen?: boolean;
}

const NebulaVisualizer: React.FC<NebulaVisualizerProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  baseColor = '#220044',
  pulseColor = '#ff66cc',
  swirlSpeed = 0.3,
  fullScreen = true,
}) => {
  const containerStyle: React.CSSProperties = fullScreen
    ? { width: '100vw', height: '100vh', background: '#000' }
    : { width: '100%', height: '100%', background: '#000' };

  return (
    <div style={containerStyle}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <mesh>
          <planeGeometry args={[1000, 1000]} />
          <NebulaShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            baseColor={baseColor}
            pulseColor={pulseColor}
            swirlSpeed={swirlSpeed}
          />
        </mesh>
      </Canvas>
    </div>
  );
};

export default NebulaVisualizer;