import React, { useEffect, useRef, useState } from 'react';

interface VolMeterProps {
  color?: string;
  background?: string;
  width?: number;
  height?: number;
}

const VolMeter: React.FC<VolMeterProps> = ({
  color = '#00ffcc',
  background = '#111',
  width = 300,
  height = 20,
}) => {
  const [volume, setVolume] = useState(0);
  const audioRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        source.connect(analyser);
        audioRef.current = source;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setVolume(avg / 256); // Normalize to 0–1
          requestAnimationFrame(update);
        };

        update();
      } catch (err) {
        console.error('Volume meter error:', err);
      }
    };

    initAudio();
    return () => {
      audioRef.current?.disconnect();
      analyserRef.current?.disconnect();
    };
  }, []);

  // FIX: Converted JSX to React.createElement to be valid in a .ts file.
  return React.createElement(
    'div',
    {
      style: {
        width,
        height,
        background,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: `0 0 12px ${color}`,
      },
    },
    React.createElement('div', {
      style: {
        width: `${volume * 100}%`,
        height: '100%',
        background: color,
        transition: 'width 0.1s ease-out',
      },
    }),
  );
};

export default VolMeter;