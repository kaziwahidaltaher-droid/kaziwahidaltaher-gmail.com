import React from 'react';
// FIX: The `extend` function from react-three-fiber should not be called with the entire THREE namespace.
// Built-in THREE components are available in JSX by default with R3F.
// Removed `extend(THREE)` and unused `extend` import.
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SphereShader from './sphere-shader';
import * as THREE from 'three';

interface SunVisualizerProps {
  moodIntensity?: number;
  resonance?: number;
  innerColor?: string;
  outerColor?: string;
  pulseSpeed?: number;
  radius?: number;
  fullScreen?: boolean;
}

const SunVisualizer: React.FC<SunVisualizerProps> = ({
  moodIntensity = 0.8,
  resonance = 1.6,
  innerColor = '#ffcc00',
  outerColor = '#ff3300',
  pulseSpeed = 0.5,
  radius = 3.5,
  fullScreen = true,
}) => {
  const containerStyle: React.CSSProperties = fullScreen
    ? { width: '100vw', height: '100vh', background: '#000' }
    : { width: '100%', height: '100%', background: '#000' };

  return (
    <div style={containerStyle}>
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <mesh>
          <sphereGeometry args={[radius, 128, 128]} />
          <SphereShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            innerColor={innerColor}
            outerColor={outerColor}
            pulseSpeed={pulseSpeed}
          />
        </mesh>
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.4} />
      </Canvas>
    </div>
  );
};

export default SunVisualizer;