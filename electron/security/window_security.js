import { app } from 'electron';
import { logger } from '../../backend/src/utils/logger.js';

export function configureWindowSecurity(mainWindow) {
  // Prevent all external navigation within the app window
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const isDev = !app.isPackaged;
    const isLocalhost = parsedUrl.origin === 'http://localhost:5173' || parsedUrl.origin === 'http://127.0.0.1:5173';

    if (isDev && isLocalhost) {
      return; // Allow Vite dev server
    }

    if (parsedUrl.protocol === 'file:') {
      return; // Allow local bundled files
    }

    event.preventDefault();
    logger.warn(`Blocked unauthorized navigation attempt to: ${navigationUrl}`);
  });

  // Block opening new windows (target="_blank" or window.open)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    logger.warn(`Blocked window.open attempt to: ${url}`);
    return { action: 'deny' };
  });

  // Prevent webview creation
  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
    logger.warn('Blocked webview attachment attempt');
  });
}
