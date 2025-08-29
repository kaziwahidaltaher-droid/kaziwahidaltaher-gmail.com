/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useEffect } from 'react';
import { renderBasicFace } from './basic-face-render.tsx';

type BasicFaceComponentProps = {
  mouthScale: number;
  eyeScale: number;
  color?: string;
  width?: number;
  height?: number;
};

const BasicFace: React.FC<BasicFaceComponentProps> = ({
  mouthScale,
  eyeScale,
  color = 'white',
  width = 200,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    renderBasicFace({
      ctx,
      mouthScale,
      eyeScale,
      color,
    });
  }, [mouthScale, eyeScale, color, width, height]);

  return <canvas ref={canvasRef} />;
};

export default BasicFace;