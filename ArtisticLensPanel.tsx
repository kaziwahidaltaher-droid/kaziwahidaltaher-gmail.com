import React, { useState } from 'react';

interface ArtisticLensConfig {
  lensType: 'nebula' | 'quantumFoam' | 'signalSphere' | 'sunCore';
  moodIntensity: number;
  resonance: number;
  colorPrimary: string;
  colorSecondary: string;
  poeticOverlay: boolean;
}

interface ArtisticLensPanelProps {
  initialConfig?: ArtisticLensConfig;
  onChange?: (config: ArtisticLensConfig) => void;
}

const ArtisticLensPanel: React.FC<ArtisticLensPanelProps> = ({
  initialConfig = {
    lensType: 'nebula',
    moodIntensity: 0.6,
    resonance: 1.2,
    colorPrimary: '#ff66cc',
    colorSecondary: '#00ffff',
    poeticOverlay: true,
  },
  onChange,
}) => {
  const [config, setConfig] = useState<ArtisticLensConfig>(initialConfig);

  const update = (key: keyof ArtisticLensConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    if (onChange) onChange(newConfig);
  };

  return (
    <div style={{
      background: '#111',
      color: '#eee',
      padding: 20,
      borderRadius: 12,
      width: 340,
      fontFamily: 'sans-serif',
    }}>
      <h2>Artistic Lens Panel</h2>

      <label>Lens Type:</label>
      <select
        value={config.lensType}
        onChange={e => update('lensType', e.target.value as ArtisticLensConfig['lensType'])}
      >
        <option value="nebula">Nebula</option>
        <option value="quantumFoam">Quantum Foam</option>
        <option value="signalSphere">Signal Sphere</option>
        <option value="sunCore">Sun Core</option>
      </select>

      <label>Mood Intensity: {config.moodIntensity.toFixed(2)}</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={config.moodIntensity}
        onChange={e => update('moodIntensity', parseFloat(e.target.value))}
      />

      <label>Resonance: {config.resonance.toFixed(2)}</label>
      <input
        type="range"
        min={0.5}
        max={2.0}
        step={0.01}
        value={config.resonance}
        onChange={e => update('resonance', parseFloat(e.target.value))}
      />

      <label>Primary Color:</label>
      <input
        type="color"
        value={config.colorPrimary}
        onChange={e => update('colorPrimary', e.target.value)}
      />

      <label>Secondary Color:</label>
      <input
        type="color"
        value={config.colorSecondary}
        onChange={e => update('colorSecondary', e.target.value)}
      />

      <label>
        <input
          type="checkbox"
          checked={config.poeticOverlay}
          onChange={e => update('poeticOverlay', e.target.checked)}
        />
        Poetic Overlay
      </label>
    </div>
  );
};

export default ArtisticLensPanel;
