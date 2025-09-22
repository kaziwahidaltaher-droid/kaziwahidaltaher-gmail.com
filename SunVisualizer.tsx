import React from 'react';
import { Canvas } from '@react-three/fiber';
import SunShader from './sun-shader';

interface SunVisualizerProps {
  moodIntensity?: number;
  resonance?: number;
  coreColor?: string;
  flareColor?: string;
}

const SunVisualizer: React.FC<SunVisualizerProps> = ({
  moodIntensity = 0.8,
  resonance = 1.5,
  coreColor = '#ffcc33',
  flareColor = '#ff6600',
}) => {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <mesh>
          <sphereGeometry args={[2.5, 64, 64]} />
          <SunShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            coreColor={coreColor}
            flareColor={flareColor}
          />
        </mesh>
      </Canvas>
    </div>
  );
};

export default SunVisualizer;
