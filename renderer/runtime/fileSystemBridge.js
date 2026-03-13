export function createFileSystemBridge() {
  const api = window.MetaPlatformFS;

  if (!api) {
    throw new Error('MetaPlatformFS bridge is not available');
  }

  return {
    openProjectDialog: () => api.openProjectDialog(),
    requestAppQuit: () => api.requestAppQuit(),
    saveProjectAsDialog: (defaultPath) => api.saveProjectAsDialog(defaultPath),
    ensureDir: (targetPath) => api.ensureDir(targetPath),
    exists: (targetPath) => api.exists(targetPath),
    readText: (targetPath) => api.readText(targetPath),
    writeText: (targetPath, text) => api.writeText(targetPath, text),
    rename: (fromPath, toPath) => api.rename(fromPath, toPath),
    deleteFile: (targetPath) => api.deleteFile(targetPath),
    deleteDir: (targetPath) => api.deleteDir(targetPath),
    listFiles: (targetDir, extensions = []) => api.listFiles(targetDir, extensions),
    onMenuAction: (listener) => api.onMenuAction(listener)
  };
}
