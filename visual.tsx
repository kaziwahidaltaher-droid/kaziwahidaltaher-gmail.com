import React from 'react';
import { Canvas } from '@react-three/fiber';

interface VisualProps {
  children: React.ReactNode;
  backgroundColor?: string;
  ambientIntensity?: number;
  fullScreen?: boolean;
}

const Visual: React.FC<VisualProps> = ({
  children,
  backgroundColor = '#000000',
  ambientIntensity = 0.5,
  fullScreen = true,
}) => {
  const containerStyle: React.CSSProperties = fullScreen
    ? { width: '100vw', height: '100vh', background: backgroundColor }
    : { width: '100%', height: '100%', background: backgroundColor };

  return (
    <div style={containerStyle}>
      <Canvas>
        <ambientLight intensity={ambientIntensity} />
        {children}
      </Canvas>
    </div>
  );
};

export default Visual;
