import React from 'react';
import { Canvas } from '@react-three/fiber';
import SignalSphereShader from './signal-sphere-shader';

interface SignalSphereVisualizerProps {
  moodIntensity?: number;
  resonance?: number;
  coreColor?: string;
  pulseColor?: string;
}

const SignalSphereVisualizer: React.FC<SignalSphereVisualizerProps> = ({
  moodIntensity = 0.7,
  resonance = 1.5,
  coreColor = '#ff66cc',
  pulseColor = '#00ffff',
}) => {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <mesh>
          <sphereGeometry args={[2, 64, 64]} />
          <SignalSphereShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            coreColor={coreColor}
            pulseColor={pulseColor}
          />
        </mesh>
      </Canvas>
    </div>
  );
};

export default SignalSphereVisualizer;
