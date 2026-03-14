const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('MetaPlatformFS', {
  openProjectFileDialog: () => ipcRenderer.invoke('dialog:open-project'),
  saveProjectFileAsDialog: (defaultPath) => ipcRenderer.invoke('dialog:save-project-as', defaultPath),
  requestAppQuit: () => ipcRenderer.invoke('app:quit'),
  approveWindowClose: () => ipcRenderer.invoke('window:close-approved'),
  cancelWindowClose: () => ipcRenderer.invoke('window:close-cancelled'),
  ensureDir: (targetPath) => ipcRenderer.invoke('fs:ensure-dir', targetPath),
  exists: (targetPath) => ipcRenderer.invoke('fs:exists', targetPath),
  readText: (targetPath) => ipcRenderer.invoke('fs:read-text', targetPath),
  writeText: (targetPath, text) => ipcRenderer.invoke('fs:write-text', targetPath, text),
  rename: (fromPath, toPath) => ipcRenderer.invoke('fs:rename', fromPath, toPath),
  deleteFile: (targetPath) => ipcRenderer.invoke('fs:delete-file', targetPath),
  deleteDir: (targetPath) => ipcRenderer.invoke('fs:delete-dir', targetPath),
  listFiles: (targetDir, extensions) => ipcRenderer.invoke('fs:list-files', targetDir, extensions),
  onWindowCloseRequested: (listener) => {
    const wrapped = () => listener();
    ipcRenderer.on('window:close-requested', wrapped);
    return () => ipcRenderer.off('window:close-requested', wrapped);
  },
  onMenuAction: (listener) => {
    const wrapped = (_event, action) => listener(action);
    ipcRenderer.on('menu:action', wrapped);
    return () => ipcRenderer.off('menu:action', wrapped);
  }
});
