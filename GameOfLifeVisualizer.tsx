import React, { useRef, useEffect, useState } from 'react';
import { GameOfLife } from './Conway.GameOfLife';

interface VisualizerProps {
  rows?: number;
  cols?: number;
  cellSize?: number;
  interval?: number; // milliseconds between steps
}

const GameOfLifeVisualizer: React.FC<VisualizerProps> = ({
  rows = 50,
  cols = 50,
  cellSize = 10,
  interval = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game] = useState(() => new GameOfLife(rows, cols));
  const [running, setRunning] = useState(true);

  useEffect(() => {
    game.randomize();
    drawGrid();
  }, []);

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      game.step();
      drawGrid();
    }, interval);

    return () => clearInterval(timer);
  }, [running, interval]);

  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grid = game.getGrid();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const alive = grid[r][c] === 1;
        ctx.fillStyle = alive ? '#00ffcc' : '#111111';
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  };

  const toggleRunning = () => setRunning(prev => !prev);
  const resetGrid = () => {
    game.clear();
    game.randomize();
    drawGrid();
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        width={cols * cellSize}
        height={rows * cellSize}
        style={{ border: '1px solid #333', background: '#000' }}
      />
      <div style={{ marginTop: 10 }}>
        <button onClick={toggleRunning}>
          {running ? 'Pause' : 'Resume'}
        </button>
        <button onClick={resetGrid} style={{ marginLeft: 10 }}>
          Reset
        </button>
      </div>
    </div>
  );
};

export default GameOfLifeVisualizer;
