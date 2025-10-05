import React, { useState } from 'react';
import AurelionEngine from './aurelion-engine';

const defaultConfig = {
  numStars: 10000,
  radius: 500,
  starColors: [], // Optional: can be used for mood tinting
  moodIntensity: 0.7,
  resonance: 1.2,
};

const AurelionApp: React.FC = () => {
  const [config, setConfig] = useState(defaultConfig);
  const [isTransition, setIsTransition] = useState(false);

  const handleMoodChange = (intensity: number, resonance: number) => {
    setConfig(prev => ({
      ...prev,
      moodIntensity: intensity,
      resonance: resonance,
    }));
    setIsTransition(true);
    setTimeout(() => setIsTransition(false), 1000); // Reset transition flag
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <AurelionEngine config={config} isTransition={isTransition} />
      {/* Optional mood controls */}
      <div style={{ position: 'absolute', top: 20, left: 20, color: '#fff' }}>
        <button onClick={() => handleMoodChange(0.3, 0.8)}>Calm</button>
        <button onClick={() => handleMoodChange(0.7, 1.2)}>Neutral</button>
        <button onClick={() => handleMoodChange(1.0, 2.0)}>Intense</button>
      </div>
    </div>
  );
};

export default AurelionApp;
