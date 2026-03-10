import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { APP_CONFIG } from './config/app-config.js';

function resolveProjectRoot(projectPath) {
  if (!projectPath) {
    return path.join(process.cwd(), APP_CONFIG.project.defaultProjectRelativePath);
  }

  return path.resolve(projectPath);
}

function createWindow() {
  const win = new BrowserWindow({
    width: APP_CONFIG.platform.window.width,
    height: APP_CONFIG.platform.window.height,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(process.cwd(), 'preload.js')
    }
  });

  win.loadURL(APP_CONFIG.platform.window.devServerUrl);
}

app.whenReady().then(() => {
  ipcMain.handle('fs:get-default-project-root', async () => {
    return resolveProjectRoot();
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
  if (process.platform !== APP_CONFIG.platform.platform.mac) {
    app.quit();
  }
});