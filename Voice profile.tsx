import React from 'react';

export interface VoiceProfileConfig {
  id: string;
  name: string;
  tone: 'gentle' | 'assertive' | 'playful' | 'poetic' | 'neutral';
  cadence: 'slow' | 'medium' | 'fast';
  resonance: number; // 0.0 to 1.0
  pitch: number;     // 0.0 to 2.0
  language: string;
  poeticOverlay?: boolean;
}

interface VoiceProfileProps {
  profile: VoiceProfileConfig;
  onSelect?: (id: string) => void;
}

const VoiceProfile: React.FC<VoiceProfileProps> = ({ profile, onSelect }) => {
  const { id, name, tone, cadence, resonance, pitch, language, poeticOverlay } = profile;

  const handleClick = () => {
    if (onSelect) onSelect(id);
  };

  return (
    <div
      style={{
        border: '1px solid #444',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        background: '#111',
        color: '#eee',
        cursor: 'pointer',
      }}
      onClick={handleClick}
    >
      <h3>{name}</h3>
      <p><strong>Language:</strong> {language}</p>
      <p><strong>Tone:</strong> {tone}</p>
      <p><strong>Cadence:</strong> {cadence}</p>
      <p><strong>Resonance:</strong> {resonance.toFixed(2)}</p>
      <p><strong>Pitch:</strong> {pitch.toFixed(2)}</p>
      <p><strong>Poetic Overlay:</strong> {poeticOverlay ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
};

export default VoiceProfile;
