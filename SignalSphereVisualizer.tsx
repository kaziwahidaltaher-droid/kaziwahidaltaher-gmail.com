import React from 'react';
// FIX: The `extend` function from react-three-fiber should not be called with the entire THREE namespace.
// Built-in THREE components are available in JSX by default with R3F.
// Removed `extend(THREE)` and unused `extend` import.
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ProbeShader from './probe-shader';
import * as THREE from 'three';

interface SignalSphereVisualizerProps {
  moodIntensity?: number;
  resonance?: number;
  coreColor?: string;
  pulseColor?: string;
  scanSpeed?: number;
  radius?: number;
  fullScreen?: boolean;
}

const SignalSphereVisualizer: React.FC<SignalSphereVisualizerProps> = ({
  moodIntensity = 0.7,
  resonance = 1.4,
  coreColor = '#00ffcc',
  pulseColor = '#ff66cc',
  scanSpeed = 0.5,
  radius = 2.5,
  fullScreen = true,
}) => {
  const containerStyle: React.CSSProperties = fullScreen
    ? { width: '100vw', height: '100vh', background: '#000' }
    : { width: '100%', height: '100%', background: '#000' };

  return (
    <div style={containerStyle}>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <mesh>
          <sphereGeometry args={[radius, 128, 128]} />
          <ProbeShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            coreColor={coreColor}
            pulseColor={pulseColor}
            scanSpeed={scanSpeed}
          />
        </mesh>
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  );
};

export default SignalSphereVisualizer;