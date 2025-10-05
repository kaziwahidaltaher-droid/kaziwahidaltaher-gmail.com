import React from 'react';
// FIX: The `extend` function from react-three-fiber should not be called with the entire THREE namespace.
// Built-in THREE components are available in JSX by default with R3F.
// Removed `extend(THREE)` and unused `extend` import.
import { Canvas } from '@react-three/fiber';
// FIX: Import SphereShader instead of SunShader, as sun-shader.tsx is not a component.
import SphereShader from './sphere-shader';
import QuantumFoamShader from './quantum-foam-shader';
import ShieldingShader from './shielding-shader';
import SignalSphereShader from './signal-sphere-shader';
import * as THREE from 'three';

interface AurelionEngineProps {
  moodIntensity?: number;
  resonance?: number;
  sunColor?: string;
  foamColor?: string;
  shieldColor?: string;
  signalColor?: string;
}

const AurelionEngine: React.FC<AurelionEngineProps> = ({
  moodIntensity = 0.75,
  resonance = 1.4,
  sunColor = '#ffcc33',
  foamColor = '#88ffff',
  shieldColor = '#220044',
  signalColor = '#00ffcc',
}) => {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas>
        <ambientLight intensity={0.5} />

        {/* Quantum Foam Layer */}
        <mesh>
          <planeGeometry args={[1000, 1000]} />
          <QuantumFoamShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            baseColor="#111122"
            flickerColor={foamColor}
          />
        </mesh>

        {/* Shielding Layer */}
        <mesh>
          <sphereGeometry args={[3.5, 64, 64]} />
          {/* FIX: Corrected prop names for ShieldingShader. `innerColor` should be `shieldColor`. */}
          <ShieldingShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            shieldColor={shieldColor}
          />
        </mesh>

        {/* Signal Sphere */}
        <mesh>
          <sphereGeometry args={[3.0, 64, 64]} />
          <SignalSphereShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            coreColor={signalColor}
            pulseColor="#ffffff"
          />
        </mesh>

        {/* Sun Core */}
        {/* FIX: Replaced SunShader component with SphereShader and mapped props correctly. */}
        <mesh>
          <sphereGeometry args={[2.5, 64, 64]} />
          <SphereShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            innerColor={sunColor}
            outerColor="#ff6600"
          />
        </mesh>
      </Canvas>
    </div>
  );
};

export default AurelionEngine;