const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process (the web app).
// This avoids exposing powerful Node.js APIs directly to the web content.
contextBridge.exposeInMainWorld('electronAPI', {
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
});
