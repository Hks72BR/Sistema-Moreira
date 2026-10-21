const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, protocol, net, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

let mainWindow;
let tray;

const isDev = !app.isPackaged;
const isOfflineDemo = require('../package.json').offlineDemo === true ||
  (isDev && process.env.MOREIRA_OFFLINE_DEMO === '1');
const iconPath = path.join(__dirname, '..', isOfflineDemo ? 'dist-offline' : 'public', 'icon.ico');

if (isOfflineDemo) {
  app.setPath('userData', path.join(app.getPath('appData'), 'Moreira-Demo-Offline'));
  protocol.registerSchemesAsPrivileged([{
    scheme: 'moreira-demo',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  }]);
}

// ── Auto-Update Configuration ──
if (!isDev && !isOfflineDemo) {
  autoUpdater.checkForUpdatesAndNotify();
}

// ── Pasta de fotos local ──
const PHOTOS_DIR = isDev
  ? path.join(__dirname, '..', 'data', 'photos')
  : path.join(app.getPath('userData'), 'photos');

if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

// ── IPC Handlers para fotos locais ──
ipcMain.handle('photo:save', async (_event, fileName, dataBase64) => {
  const filePath = path.join(PHOTOS_DIR, fileName);
  const buffer = Buffer.from(dataBase64, 'base64');
  fs.writeFileSync(filePath, buffer);
  return { success: true, fileName };
});

ipcMain.handle('photo:read', async (_event, fileName) => {
  const filePath = path.join(PHOTOS_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
});

ipcMain.handle('photo:delete', async (_event, fileName) => {
  const filePath = path.join(PHOTOS_DIR, fileName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return { success: true };
});

ipcMain.handle('photo:list', async () => {
  return fs.readdirSync(PHOTOS_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: isOfflineDemo ? 'Moreira - Demonstracao Offline' : 'Moreira Direções - Sistema de Gestão',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  if (isOfflineDemo) {
    mainWindow.loadURL('moreira-demo://app/');
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      const target = new URL(url);
      if (target.protocol === 'https:' && ['wa.me', 'api.whatsapp.com'].includes(target.hostname)) {
        shell.openExternal(url).catch(error => console.error('Falha ao abrir WhatsApp:', error));
        return { action: 'deny' };
      }
      return { action: target.protocol === 'blob:' ? 'allow' : 'deny' };
    });
  } else if (isDev) {
    // Tenta 5173, fallback 5174
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadURL('http://localhost:5174');
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    tray = new Tray(iconPath);
  } catch {
    // If icon not found, continue without tray icon
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Moreira Direções',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'Verificar Atualizações',
      visible: !isOfflineDemo,
      click: () => {
        autoUpdater.checkForUpdatesAndNotify();
      }
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        mainWindow?.destroy();
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Moreira Direções - Sistema de Gestão');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── Auto-Update Event Listeners ──
function setupAutoUpdater() {
  if (isDev || isOfflineDemo) return;

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização Disponível',
      message: 'Uma nova versão está disponível!',
      detail: 'A atualização será baixada em background. O app será reiniciado quando concluir.',
      buttons: ['OK']
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização Pronta',
      message: 'Atualização baixada e pronta para instalar!',
      detail: 'O app será reiniciado para aplicar as mudanças.',
      buttons: ['Reiniciar Agora', 'Depois']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error);
  });

  // Verificar atualizações a cada 1 hora
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 3600000);
}

app.whenReady().then(() => {
  if (isOfflineDemo) {
    const root = path.resolve(__dirname, '..', 'dist-offline');
    protocol.handle('moreira-demo', request => {
      const url = new URL(request.url);
      if (url.hostname !== 'app') return new Response('Not found', { status: 404 });
      const requested = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) {
        return new Response('Forbidden', { status: 403 });
      }
      const file = path.extname(requested) ? requested : path.join(root, 'index.html');
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    });
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      (_details, callback) => callback({ cancel: true }),
    );
  }
  setupAutoUpdater();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // Keep running in tray on Windows
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
  mainWindow?.destroy();
});
