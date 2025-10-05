import React from 'react';
import BasicFaceRender from './basic-face-render';

export interface BasicFaceProps {
  moodIntensity?: number;
  resonance?: number;
  faceColor?: string;
  auraColor?: string;
  glowColor?: string;
  fullScreen?: boolean;
}

const BasicFace: React.FC<BasicFaceProps> = ({
  moodIntensity = 0.6,
  resonance = 1.2,
  faceColor = '#ff66cc',
  auraColor = '#00ffff',
  glowColor = '#88ccff',
  fullScreen = true,
}) => {
  const containerStyle: React.CSSProperties = fullScreen
    ? { width: '100vw', height: '100vh', background: '#000' }
    : { width: '100%', height: '100%', background: '#000' };

  return (
    <div style={containerStyle}>
      <BasicFaceRender
        moodIntensity={moodIntensity}
        resonance={resonance}
        faceColor={faceColor}
        auraColor={auraColor}
        glowColor={glowColor}
      />
    </div>
  );
};

export default BasicFace;
