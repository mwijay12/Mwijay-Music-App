import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Menu
} from 'electron';
import * as path from 'path';

const isDev = process.env.NODE_ENV === 'development' ||
  process.env.ELECTRON_DEV === 'true';

const DEV_SERVER_URL = 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,

    title: 'Mwijay Music',
    icon: path.join(__dirname, '../public/icon.ico'),

    frame: true,
    show: false,
    backgroundColor: '#0a0a0a',

    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),

      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,

      autoplayPolicy: 'no-user-gesture-required',

      devTools: isDev,
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '../dist/index.html')
    );
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://accounts.google.com',
      `https://${process.env.VITE_FIREBASE_AUTH_DOMAIN}`,
    ];
    const isAllowed = allowedOrigins.some(
      origin => url.startsWith(origin)
    );
    if (!isAllowed) {
      event.preventDefault();
    }
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Mwijay',
      submenu: [
        { label: 'About Mwijay Music', role: 'about' },
        { type: 'separator' },
        { label: 'Quit', role: 'quit' }
      ]
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play / Pause',
          accelerator: 'Space',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'play-pause');
          }
        },
        {
          label: 'Next Track',
          accelerator: 'CmdOrCtrl+Right',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'next-track');
          }
        },
        {
          label: 'Previous Track',
          accelerator: 'CmdOrCtrl+Left',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'prev-track');
          }
        },
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Developer',
      submenu: [
        { role: 'toggleDevTools' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

app.whenReady().then(() => {
  createMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (e) => {
    e.preventDefault();
  });
});
