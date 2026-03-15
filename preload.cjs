const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CONFIG } = require('./config/ipc-config.cjs');

const IPC = IPC_CONFIG;

contextBridge.exposeInMainWorld('MetaPlatformFS', {
  openProjectFileDialog: () => ipcRenderer.invoke(IPC.handlers.openProjectDialog),
  saveProjectFileAsDialog: (defaultPath) => ipcRenderer.invoke(IPC.handlers.saveProjectAsDialog, defaultPath),
  requestAppQuit: () => ipcRenderer.invoke(IPC.handlers.appQuit),
  approveWindowClose: () => ipcRenderer.invoke(IPC.handlers.windowCloseApproved),
  cancelWindowClose: () => ipcRenderer.invoke(IPC.handlers.windowCloseCancelled),
  ensureDir: (targetPath) => ipcRenderer.invoke(IPC.handlers.fsEnsureDir, targetPath),
  exists: (targetPath) => ipcRenderer.invoke(IPC.handlers.fsExists, targetPath),
  readText: (targetPath) => ipcRenderer.invoke(IPC.handlers.fsReadText, targetPath),
  writeText: (targetPath, text) => ipcRenderer.invoke(IPC.handlers.fsWriteText, targetPath, text),
  rename: (fromPath, toPath) => ipcRenderer.invoke(IPC.handlers.fsRename, fromPath, toPath),
  deleteFile: (targetPath) => ipcRenderer.invoke(IPC.handlers.fsDeleteFile, targetPath),
  deleteDir: (targetPath) => ipcRenderer.invoke(IPC.handlers.fsDeleteDir, targetPath),
  listFiles: (targetDir, extensions) => ipcRenderer.invoke(IPC.handlers.fsListFiles, targetDir, extensions),
  onWindowCloseRequested: (listener) => {
    const wrapped = () => listener();
    ipcRenderer.on(IPC.channels.windowCloseRequested, wrapped);
    return () => ipcRenderer.off(IPC.channels.windowCloseRequested, wrapped);
  },
  onMenuAction: (listener) => {
    const wrapped = (_event, action) => listener(action);
    const menuEventChannel = IPC.channels.menuAction;
    ipcRenderer.on(menuEventChannel, wrapped);
    return () => ipcRenderer.off(menuEventChannel, wrapped);
  }
});
