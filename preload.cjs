const path = require('path');
const { contextBridge, ipcRenderer } = require('electron');
const IPC_CONFIG = require(path.join(__dirname, 'config', 'ipc-config.cjs'));

contextBridge.exposeInMainWorld('MetaPlatformFS', {
  openProjectFileDialog: () => ipcRenderer.invoke(IPC_CONFIG.handlers.openProjectDialog),
  saveProjectFileAsDialog: (defaultPath) => ipcRenderer.invoke(IPC_CONFIG.handlers.saveProjectAsDialog, defaultPath),
  requestAppQuit: () => ipcRenderer.invoke(IPC_CONFIG.handlers.appQuit),
  approveWindowClose: () => ipcRenderer.invoke(IPC_CONFIG.handlers.windowCloseApproved),
  cancelWindowClose: () => ipcRenderer.invoke(IPC_CONFIG.handlers.windowCloseCancelled),
  ensureDir: (targetPath) => ipcRenderer.invoke(IPC_CONFIG.handlers.fsEnsureDir, targetPath),
  exists: (targetPath) => ipcRenderer.invoke(IPC_CONFIG.handlers.fsExists, targetPath),
  readText: (targetPath) => ipcRenderer.invoke(IPC_CONFIG.handlers.fsReadText, targetPath),
  writeText: (targetPath, text) => ipcRenderer.invoke(IPC_CONFIG.handlers.fsWriteText, targetPath, text),
  rename: (fromPath, toPath) => ipcRenderer.invoke(IPC_CONFIG.handlers.fsRename, fromPath, toPath),
  deleteFile: (targetPath) => ipcRenderer.invoke(IPC_CONFIG.handlers.fsDeleteFile, targetPath),
  deleteDir: (targetPath) => ipcRenderer.invoke(IPC_CONFIG.handlers.fsDeleteDir, targetPath),
  listFiles: (targetDir, extensions) => ipcRenderer.invoke(IPC_CONFIG.handlers.fsListFiles, targetDir, extensions),
  onWindowCloseRequested: (listener) => {
    const wrapped = () => listener();
    ipcRenderer.on(IPC_CONFIG.channels.windowCloseRequested, wrapped);
    return () => ipcRenderer.off(IPC_CONFIG.channels.windowCloseRequested, wrapped);
  },
  onMenuAction: (listener) => {
    const wrapped = (_event, action) => listener(action);
    const menuEventChannel = IPC_CONFIG.channels.menuAction;
    ipcRenderer.on(menuEventChannel, wrapped);
    return () => ipcRenderer.off(menuEventChannel, wrapped);
  }
});
