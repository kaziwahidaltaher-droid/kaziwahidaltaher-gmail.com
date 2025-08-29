/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './AurelionApp.tsx';

// --- Bootstrap React App ---
const container = document.getElementById('react-root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('React root container not found. The application cannot start.');
}