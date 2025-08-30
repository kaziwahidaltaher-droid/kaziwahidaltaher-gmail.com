/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './AurelionApp.tsx';
import { AurelionEngine } from './aurelion-engine.tsx';

// --- Bootstrap 3D Engine and React App ---
const canvas = document.getElementById('bg') as HTMLCanvasElement;
const reactContainer = document.getElementById('react-root');

if (canvas && reactContainer) {
  // Initialize the 3D engine
  const engine = new AurelionEngine(canvas);
  engine.init();

  // Render the React UI
  const root = createRoot(reactContainer);
  root.render(<App />);
} else {
  console.error('Essential DOM elements (canvas or react-root) not found. The application cannot start.');
}
