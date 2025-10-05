import React, { useState } from 'react';

interface AiConfig {
  moodIntensity: number;
  resonance: number;
  poeticOverlay: boolean;
  voiceTone: 'gentle' | 'assertive' | 'playful' | 'poetic' | 'neutral';
}

interface AiConfigPanelProps {
  initialConfig?: AiConfig;
  onChange?: (config: AiConfig) => void;
}

const AiConfigPanel: React.FC<AiConfigPanelProps> = ({
  initialConfig = {
    moodIntensity: 0.5,
    resonance: 1.0,
    poeticOverlay: true,
    voiceTone: 'poetic',
  },
  onChange,
}) => {
  const [config, setConfig] = useState<AiConfig>(initialConfig);

  const updateConfig = (key: keyof AiConfig, value: any) => {
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
      width: 320,
      fontFamily: 'sans-serif',
    }}>
      <h2>AI Core Configuration</h2>

      <label>Mood Intensity: {config.moodIntensity.toFixed(2)}</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={config.moodIntensity}
        onChange={e => updateConfig('moodIntensity', parseFloat(e.target.value))}
      />

      <label>Resonance: {config.resonance.toFixed(2)}</label>
      <input
        type="range"
        min={0.5}
        max={2.0}
        step={0.01}
        value={config.resonance}
        onChange={e => updateConfig('resonance', parseFloat(e.target.value))}
      />

      <label>Voice Tone:</label>
      <select
        value={config.voiceTone}
        onChange={e => updateConfig('voiceTone', e.target.value as AiConfig['voiceTone'])}
      >
        <option value="gentle">Gentle</option>
        <option value="assertive">Assertive</option>
        <option value="playful">Playful</option>
        <option value="poetic">Poetic</option>
        <option value="neutral">Neutral</option>
      </select>

      <label>
        <input
          type="checkbox"
          checked={config.poeticOverlay}
          onChange={e => updateConfig('poeticOverlay', e.target.checked)}
        />
        Poetic Overlay
      </label>
    </div>
  );
};

export default AiConfigPanel;
