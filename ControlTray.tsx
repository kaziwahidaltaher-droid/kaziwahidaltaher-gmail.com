import React from 'react';

interface ControlTrayProps {
  moodIntensity: number;
  resonance: number;
  poeticOverlay: boolean;
  lensType: 'nebula' | 'quantumFoam' | 'signalSphere' | 'sunCore';
  onUpdate: (updates: Partial<ControlTrayProps>) => void;
}

const ControlTray: React.FC<ControlTrayProps> = ({
  moodIntensity,
  resonance,
  poeticOverlay,
  lensType,
  onUpdate,
}) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      right: 20,
      background: '#111',
      color: '#eee',
      padding: 16,
      borderRadius: 12,
      width: 280,
      fontFamily: 'sans-serif',
      boxShadow: '0 0 12px rgba(0,0,0,0.5)',
    }}>
      <h3>Control Tray</h3>

      <label>Mood Intensity: {moodIntensity.toFixed(2)}</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={moodIntensity}
        onChange={e => onUpdate({ moodIntensity: parseFloat(e.target.value) })}
      />

      <label>Resonance: {resonance.toFixed(2)}</label>
      <input
        type="range"
        min={0.5}
        max={2.0}
        step={0.01}
        value={resonance}
        onChange={e => onUpdate({ resonance: parseFloat(e.target.value) })}
      />

      <label>Lens Type:</label>
      <select
        value={lensType}
        onChange={e => onUpdate({ lensType: e.target.value as ControlTrayProps['lensType'] })}
      >
        <option value="nebula">Nebula</option>
        <option value="quantumFoam">Quantum Foam</option>
        <option value="signalSphere">Signal Sphere</option>
        <option value="sunCore">Sun Core</option>
      </select>

      <label>
        <input
          type="checkbox"
          checked={poeticOverlay}
          onChange={e => onUpdate({ poeticOverlay: e.target.checked })}
        />
        Poetic Overlay
      </label>
    </div>
  );
};

export default ControlTray;
