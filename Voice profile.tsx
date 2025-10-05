import React, { useState, useEffect } from 'react';
import { moodColor, poeticTime } from './utils';

interface VoiceProfileProps {
  pitch?: number;        // Hz
  tone?: number;         // -1 (low) to 1 (high)
  clarity?: number;      // 0–1
  resonance?: number;    // 0–1
  speciesTag?: string;
}

const VoiceProfile: React.FC<VoiceProfileProps> = ({
  pitch = 220,
  tone = 0.2,
  clarity = 0.8,
  resonance = 0.6,
  speciesTag = 'human_standard',
}) => {
  const [timestamp, setTimestamp] = useState(poeticTime());

  useEffect(() => {
    const interval = setInterval(() => setTimestamp(poeticTime()), 60000);
    return () => clearInterval(interval);
  }, []);

  const toneLabel =
    tone < -0.5 ? 'low' :
    tone < 0.2 ? 'neutral' :
    tone < 0.6 ? 'bright' : 'radiant';

  const resonanceLabel =
    resonance < 0.3 ? 'muted' :
    resonance < 0.7 ? 'harmonic' : 'amplified';

  const clarityLabel =
    clarity < 0.4 ? 'blurred' :
    clarity < 0.8 ? 'clear' : 'crystalline';

  const color = moodColor(resonance);

  return (
    <div style={{
      padding: '20px',
      background: '#111',
      borderRadius: '12px',
      boxShadow: `0 0 20px ${color}`,
      color: '#eee',
      fontFamily: 'Segoe UI, sans-serif',
      maxWidth: '400px'
    }}>
      <h2 style={{ color }}>{formatSpeciesTag(speciesTag)} Voice Profile</h2>
      <p><strong>Timestamp:</strong> {timestamp}</p>
      <p><strong>Pitch:</strong> {pitch.toFixed(1)} Hz</p>
      <p><strong>Tone:</strong> {toneLabel}</p>
      <p><strong>Clarity:</strong> {clarityLabel}</p>
      <p><strong>Resonance:</strong> {resonanceLabel}</p>
    </div>
  );
};

function formatSpeciesTag(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default VoiceProfile;
