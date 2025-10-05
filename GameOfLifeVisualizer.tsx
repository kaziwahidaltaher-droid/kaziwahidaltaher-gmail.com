import React, { useRef, useEffect } from 'react';
import { GameOfLife } from './Conway.GameOfLife';

interface GameOfLifeVisualizerProps {
  width?: number;
  height?: number;
  cellSize?: number;
  tickRate?: number; // milliseconds per frame
  aliveColor?: string;
  deadColor?: string;
}

const GameOfLifeVisualizer: React.FC<GameOfLifeVisualizerProps> = ({
  width = 100,
  height = 100,
  cellSize = 6,
  tickRate = 100,
  aliveColor = '#00ffcc',
  deadColor = '#111111',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameOfLife>(new GameOfLife(width, height));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const game = gameRef.current;
    game.randomize();

    const render = () => {
      if (!ctx || !canvas) return;
      const grid = game.getGrid();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          ctx.fillStyle = grid[y][x] ? aliveColor : deadColor;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    };

    const loop = () => {
      game.step();
      render();
    };

    const interval = setInterval(loop, tickRate);
    return () => clearInterval(interval);
  }, [width, height, cellSize, tickRate, aliveColor, deadColor]);

  return (
    <canvas
      ref={canvasRef}
      width={width * cellSize}
      height={height * cellSize}
      style={{ display: 'block', background: '#000' }}
    />
  );
};

export default GameOfLifeVisualizer;
