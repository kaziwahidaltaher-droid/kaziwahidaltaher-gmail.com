import React from 'react';
// FIX: The `extend` function from react-three-fiber should not be called with the entire THREE namespace.
// Built-in THREE components are available in JSX by default with R3F.
// Removed `extend(THREE)` and unused `extend` import.
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import QuantumFoamShader from './quantum-foam-shader';
import NebulaShader from './nebula-shader';
import ShieldingShader from './shielding-shader';
import SphereShader from './sphere-shader';

interface VisualProps {
  moodIntensity?: number;
  resonance?: number;
  fullScreen?: boolean;
}

const Visual: React.FC<VisualProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  fullScreen = true,
}) => {
  const containerStyle: React.CSSProperties = fullScreen
    ? { width: '100vw', height: '100vh', background: '#000' }
    : { width: '100%', height: '100%', background: '#000' };

  return (
    <div style={containerStyle}>
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />

        {/* Quantum Foam Base */}
        <mesh>
          <planeGeometry args={[1000, 1000]} />
          <QuantumFoamShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            baseColor="#111122"
            flickerColor="#00ffff"
          />
        </mesh>

        {/* Nebula Overlay */}
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[1000, 1000]} />
          <NebulaShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            baseColor="#220044"
            pulseColor="#ff66cc"
            swirlSpeed={0.3}
          />
        </mesh>

        {/* Shielding Aura */}
        <mesh>
          <sphereGeometry args={[3.5, 128, 128]} />
          <ShieldingShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            shieldColor="#00ccff"
            rippleColor="#ff66cc"
            pulseSpeed={0.6}
          />
        </mesh>

        {/* Emotional Core */}
        <mesh>
          <sphereGeometry args={[2.5, 128, 128]} />
          <SphereShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            innerColor="#00ffff"
            outerColor="#220044"
            pulseSpeed={0.4}
          />
        </mesh>

        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.4} />
      </Canvas>
    </div>
  );
};

export default Visual;