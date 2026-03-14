import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { APP_CONFIG } from './config/app-config.js';

function createAppMenu(mainWindow) {
  const sendAction = (action) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('menu:action', action);
    }
  };

  const template = [
    {
      label: 'Файл',
      submenu: [
        { label: 'Создать проект', click: () => sendAction('new-project') },
        { label: 'Открыть проект', click: () => sendAction('open-project') },
        { label: 'Закрыть проект', click: () => sendAction('close-project') },
        { type: 'separator' },
        { label: 'Сохранить', click: () => sendAction('save') },
        { label: 'Сохранить как', click: () => sendAction('save-as') },
        { type: 'separator' },
        { label: 'Выход', click: () => sendAction('exit') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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

  win.loadURL(APP_CONFIG.platform.window.devServerUrl);
}

app.whenReady().then(() => {
  ipcMain.handle('dialog:open-project', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Открыть проект',
      properties: ['openFile'],
      filters: [
        { name: 'Project YAML', extensions: ['yaml', 'yml'] }
      ]
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('dialog:save-project-as', async (_event, defaultPath) => {
    const result = await dialog.showSaveDialog({
      title: 'Сохранить проект как',
      defaultPath,
      buttonLabel: 'Сохранить',
      filters: [
        { name: 'YAML', extensions: ['yaml', 'yml'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return result.filePath;
  });

  ipcMain.handle('app:quit', async () => {
    app.quit();
    return true;
  });

  ipcMain.handle('fs:ensure-dir', async (_event, targetPath) => {
    await fs.mkdir(targetPath, { recursive: true });
    return true;
  });

  ipcMain.handle('fs:exists', async (_event, targetPath) => {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('fs:read-text', async (_event, targetPath) => {
    return fs.readFile(targetPath, 'utf-8');
  });

  ipcMain.handle('fs:write-text', async (_event, targetPath, text) => {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, text, 'utf-8');
    return true;
  });

  ipcMain.handle('fs:rename', async (_event, fromPath, toPath) => {
    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.rename(fromPath, toPath);
    return true;
  });

  ipcMain.handle('fs:delete-file', async (_event, targetPath) => {
    await fs.rm(targetPath, { force: true });
    return true;
  });

  ipcMain.handle('fs:delete-dir', async (_event, targetPath) => {
    await fs.rm(targetPath, { recursive: true, force: true });
    return true;
  });

  ipcMain.handle('fs:list-files', async (_event, targetDir, extensions = []) => {
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

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== APP_CONFIG.platform.runtime.mac) {
    app.quit();
  }
});
