const { app, BrowserWindow, shell, Menu, nativeTheme } = require('electron');
const path = require('path');

const APP_URL = process.env.ALBNET_URL || 'https://albneti.vercel.app';
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    title: 'AlbNet',
    backgroundColor: '#000000',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.setUserAgent(
    mainWindow.webContents.getUserAgent() + ' AlbNetDesktop/1.0'
  );

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_URL) && !url.startsWith('http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

const menuTemplate = [
  {
    label: 'AlbNet',
    submenu: [
      { label: 'Rifresko', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
      { type: 'separator' },
      { role: 'quit', label: 'Mbyll' },
    ],
  },
  {
    label: 'Shiko',
    submenu: [
      { role: 'reload', label: 'Rifresko' },
      { role: 'togglefullscreen', label: 'Ekran i plotë' },
      { type: 'separator' },
      { role: 'zoomIn', label: 'Zmadho' },
      { role: 'zoomOut', label: 'Zvogëlo' },
      { role: 'resetZoom', label: 'Rivendos' },
    ],
  },
  {
    label: 'Navigim',
    submenu: [
      { label: 'Kryefaja', click: () => mainWindow?.loadURL(`${APP_URL}/feed`) },
      { label: 'Reels', click: () => mainWindow?.loadURL(`${APP_URL}/reels`) },
      { label: 'Mesazhe', click: () => mainWindow?.loadURL(`${APP_URL}/mesazhe`) },
      { label: 'Chat Global', click: () => mainWindow?.loadURL(`${APP_URL}/chat-global`) },
      { label: 'Komuniteti', click: () => mainWindow?.loadURL(`${APP_URL}/komuniteti`) },
    ],
  },
];

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
