const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('dotenv').config();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In a real app, you might want a menu. For this project, it's cleaner without.
  mainWindow.setMenu(null);

  mainWindow.loadFile('index.html');

  // Uncomment to open the DevTools for debugging.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  // Set up an IPC handler to securely provide the API key to the renderer process.
  ipcMain.handle('get-api-key', () => {
    return process.env.API_KEY;
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
