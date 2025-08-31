/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './AurelionApp.tsx';
import { AurelionEngine } from './aurelion-engine.tsx';

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').then(registration => {
      console.log('Service Worker registered with scope:', registration.scope);
    }).catch(error => {
      console.error('Service Worker registration failed:', error);
    });
  });
}


// --- Bootstrap 3D Engine and React App ---
const canvas = document.getElementById('bg') as HTMLCanvasElement;
const reactContainer = document.getElementById('react-root');

if (canvas && reactContainer) {
  // Initialize the 3D engine
  const engine = new AurelionEngine(canvas);
  (window as any).aurelionEngine = engine; // Expose engine for React components
  engine.init();

  // Render the React UI
  const root = createRoot(reactContainer);
  root.render(<App />);
} else {
  console.error('Essential DOM elements (canvas or react-root) not found. The application cannot start.');
}