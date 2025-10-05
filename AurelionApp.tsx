import React, { useState } from 'react';
import AurelionEngine from './aurelion-engine';
import AiConfigPanel from './AiConfigPanel';
import ArtisticLensPanel from './ArtisticLensPanel';

const AurelionApp: React.FC = () => {
  const [moodIntensity, setMoodIntensity] = useState(0.75);
  const [resonance, setResonance] = useState(1.4);
  const [sunColor, setSunColor] = useState('#ffcc33');
  const [foamColor, setFoamColor] = useState('#88ffff');
  const [shieldColor, setShieldColor] = useState('#220044');
  const [signalColor, setSignalColor] = useState('#00ffcc');

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', background: '#000' }}>
      {/* Control Panel */}
      <div style={{ width: '360px', padding: '20px', background: '#111', color: '#eee' }}>
        <h1>Aurelion Control</h1>

        <AiConfigPanel
          initialConfig={{
            moodIntensity,
            resonance,
            poeticOverlay: true,
            voiceTone: 'poetic',
          }}
          onChange={(config) => {
            setMoodIntensity(config.moodIntensity);
            setResonance(config.resonance);
          }}
        />

        <ArtisticLensPanel
          initialConfig={{
            lensType: 'sunCore',
            moodIntensity,
            resonance,
            colorPrimary: sunColor,
            colorSecondary: foamColor,
            poeticOverlay: true,
          }}
          onChange={(lens) => {
            setMoodIntensity(lens.moodIntensity);
            setResonance(lens.resonance);
            setSunColor(lens.colorPrimary);
            setFoamColor(lens.colorSecondary);
          }}
        />
      </div>

      {/* Visual Engine */}
      <div style={{ flex: 1 }}>
        <AurelionEngine
          moodIntensity={moodIntensity}
          resonance={resonance}
          sunColor={sunColor}
          foamColor={foamColor}
          shieldColor={shieldColor}
          signalColor={signalColor}
        />
      </div>
    </div>
  );
};

export default AurelionApp;
