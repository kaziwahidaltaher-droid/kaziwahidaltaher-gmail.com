import React from 'react';
import { Canvas } from '@react-three/fiber';
import QuantumFoamShader from './quantum-foam-shader';

interface QuantumFoamVisualizerProps {
  moodIntensity?: number;
  resonance?: number;
  baseColor?: string;
  flickerColor?: string;
}

const QuantumFoamVisualizer: React.FC<QuantumFoamVisualizerProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  baseColor = '#111122',
  flickerColor = '#88ffff',
}) => {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
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
