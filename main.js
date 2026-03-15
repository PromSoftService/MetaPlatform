import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { APP_CONFIG } from './config/app-config.js';
import { createWindowCloseGuard } from './main/runtime/windowCloseGuard.js';

function createAppMenu(mainWindow) {
  const sendAction = (action) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(APP_CONFIG.platform.app.menu.menuEventChannel, action);
    }
  };

  const template = [
    {
      label: APP_CONFIG.platform.app.menu.fileLabel,
      submenu: [
        { label: APP_CONFIG.platform.app.menu.items.newProject, click: () => sendAction(APP_CONFIG.platform.app.menu.actionIds.newProject) },
        { label: APP_CONFIG.platform.app.menu.items.openProject, click: () => sendAction(APP_CONFIG.platform.app.menu.actionIds.openProject) },
        { label: APP_CONFIG.platform.app.menu.items.closeProject, click: () => sendAction(APP_CONFIG.platform.app.menu.actionIds.closeProject) },
        { type: 'separator' },
        { label: APP_CONFIG.platform.app.menu.items.save, click: () => sendAction(APP_CONFIG.platform.app.menu.actionIds.save) },
        { label: APP_CONFIG.platform.app.menu.items.saveAs, click: () => sendAction(APP_CONFIG.platform.app.menu.actionIds.saveAs) },
        { type: 'separator' },
        { label: APP_CONFIG.platform.app.menu.items.exit, click: () => sendAction(APP_CONFIG.platform.app.menu.actionIds.exit) }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

let mainWindow = null;
const windowCloseGuard = createWindowCloseGuard();

function createWindow() {
  const win = new BrowserWindow({
    width: APP_CONFIG.platform.window.width,
    height: APP_CONFIG.platform.window.height,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(process.cwd(), 'preload.cjs')
    }
  });

  createAppMenu(win);

  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') {
      return;
    }

    const isCtrlShiftI = input.control && input.shift && String(input.key).toLowerCase() === 'i';

    if (isCtrlShiftI) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  win.on('close', (event) => {
    const decision = windowCloseGuard.handleCloseAttempt({
      isWindowDestroyed: win.isDestroyed()
    });

    if (decision.preventDefault) {
      event.preventDefault();
    }

    if (decision.requestRendererConfirmation) {
      win.webContents.send(APP_CONFIG.platform.ipc.channels.windowCloseRequested);
    }
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
      windowCloseGuard.reset();
    }
  });

  win.loadURL(APP_CONFIG.platform.window.devServerUrl);
  return win;
}

app.whenReady().then(() => {
  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.openProjectDialog, async () => {
    const result = await dialog.showOpenDialog({
      title: APP_CONFIG.platform.app.dialogs.openProjectTitle,
      properties: ['openFile'],
      filters: [
        {
          name: APP_CONFIG.platform.app.dialogs.projectFilterName,
          extensions: APP_CONFIG.platform.app.dialogs.yamlFilterExtensions
        }
      ]
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.saveProjectAsDialog, async (_event, defaultPath) => {
    const result = await dialog.showSaveDialog({
      title: APP_CONFIG.platform.app.dialogs.saveProjectAsTitle,
      defaultPath,
      buttonLabel: APP_CONFIG.platform.app.dialogs.saveButtonLabel,
      filters: [
        {
          name: APP_CONFIG.platform.app.dialogs.yamlFilterName,
          extensions: APP_CONFIG.platform.app.dialogs.yamlFilterExtensions
        }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return result.filePath;
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.appQuit, async () => {
    windowCloseGuard.approveClose();
    app.quit();
    return true;
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.windowCloseApproved, async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return false;
    }

    windowCloseGuard.approveClose();
    mainWindow.close();
    return true;
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.windowCloseCancelled, async () => {
    windowCloseGuard.cancelClose();
    return true;
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.fsEnsureDir, async (_event, targetPath) => {
    await fs.mkdir(targetPath, { recursive: true });
    return true;
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.fsExists, async (_event, targetPath) => {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.fsReadText, async (_event, targetPath) => {
    return fs.readFile(targetPath, 'utf-8');
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.fsWriteText, async (_event, targetPath, text) => {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, text, 'utf-8');
    return true;
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.fsRename, async (_event, fromPath, toPath) => {
    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.rename(fromPath, toPath);
    return true;
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.fsDeleteFile, async (_event, targetPath) => {
    await fs.rm(targetPath, { force: true });
    return true;
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.fsDeleteDir, async (_event, targetPath) => {
    await fs.rm(targetPath, { recursive: true, force: true });
    return true;
  });

  ipcMain.handle(APP_CONFIG.platform.ipc.handlers.fsListFiles, async (_event, targetDir, extensions = []) => {
    const output = [];

    async function walk(currentDir) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }

        if (!extensions.length) {
          output.push(fullPath);
          continue;
        }

        const normalized = entry.name.toLowerCase();

        if (extensions.some((ext) => normalized.endsWith(ext.toLowerCase()))) {
          output.push(fullPath);
        }
      }
    }

    const exists = await fs.access(targetDir).then(() => true).catch(() => false);

    if (!exists) {
      return [];
    }

    await walk(targetDir);
    return output;
  });

  mainWindow = createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== APP_CONFIG.platform.runtime.mac) {
    app.quit();
  }
});
