import React from 'react';
// FIX: The `extend` function from react-three-fiber should not be called with the entire THREE namespace.
// Built-in THREE components are available in JSX by default with R3F.
// Removed `extend(THREE)` and unused `extend` import.
import { Canvas } from '@react-three/fiber';
import SphereShader from './sphere-shader';
import ShieldingShader from './shielding-shader';
import PhantomGlowShader from './phantom-glow-shader';
import * as THREE from 'three';

interface BasicFaceRenderProps {
  moodIntensity?: number;
  resonance?: number;
  faceColor?: string;
  auraColor?: string;
  glowColor?: string;
}

const BasicFaceRender: React.FC<BasicFaceRenderProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  faceColor = '#ff66cc',
  auraColor = '#00ffff',
  glowColor = '#88ccff',
}) => {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas>
        <ambientLight intensity={0.5} />

        {/* Phantom Glow Layer */}
        <mesh>
          <sphereGeometry args={[3.2, 64, 64]} />
          <PhantomGlowShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            glowColor={glowColor}
            shadowColor="#000022"
          />
        </mesh>

        {/* Shielding Aura */}
        <mesh>
          <sphereGeometry args={[2.8, 64, 64]} />
          {/* FIX: Corrected prop names for ShieldingShader. `innerColor` should be `shieldColor`. */}
          <ShieldingShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            shieldColor={auraColor}
          />
        </mesh>

        {/* Core Face Sphere */}
        <mesh>
          <sphereGeometry args={[2.2, 64, 64]} />
          {/* FIX: Corrected prop names for SphereShader. `coreColor` should be `innerColor` and `auraColor` should be `outerColor`. */}
          <SphereShader
            moodIntensity={moodIntensity}
            resonance={resonance}
            innerColor={faceColor}
            outerColor={auraColor}
          />
        </mesh>
      </Canvas>
    </div>
  );
};

export default BasicFaceRender;