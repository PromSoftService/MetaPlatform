import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('MetaPlatformFS', {
  getDefaultProjectRoot: () => ipcRenderer.invoke('fs:get-default-project-root'),
  ensureDir: (targetPath) => ipcRenderer.invoke('fs:ensure-dir', targetPath),
  exists: (targetPath) => ipcRenderer.invoke('fs:exists', targetPath),
  readText: (targetPath) => ipcRenderer.invoke('fs:read-text', targetPath),
  writeText: (targetPath, text) => ipcRenderer.invoke('fs:write-text', targetPath, text),
  rename: (fromPath, toPath) => ipcRenderer.invoke('fs:rename', fromPath, toPath),
  deleteFile: (targetPath) => ipcRenderer.invoke('fs:delete-file', targetPath),
  listFiles: (targetDir, extensions) => ipcRenderer.invoke('fs:list-files', targetDir, extensions)
});