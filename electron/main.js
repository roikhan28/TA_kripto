import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { configureWindowSecurity } from './security/window_security.js';
import { registerSystemIPC } from './ipc/system.ipc.js';
import { logger } from '../backend/src/utils/logger.js';
import { testConnection } from '../backend/src/database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0D0F12',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  configureWindowSecurity(mainWindow);

  // Register IPC handlers
  registerSystemIPC();

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    const devUrl = 'http://localhost:5173';
    logger.info(`Loading development URL: ${devUrl}`);
    await mainWindow.loadURL(devUrl);
    // mainWindow.webContents.openDevTools();
  } else {
    const prodPath = path.join(__dirname, '../dist/index.html');
    logger.info(`Loading production file: ${prodPath}`);
    await mainWindow.loadFile(prodPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    logger.info('Main window displayed successfully.');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    logger.info('GYMVAULT V2.0 application booting...');
    
    // Test database connection at startup
    const dbStatus = await testConnection();
    if (!dbStatus.ok) {
      logger.error('CRITICAL: Database connection failed during startup:', dbStatus.error);
    } else {
      logger.info('Database connection established during startup.');
    }

    await createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
