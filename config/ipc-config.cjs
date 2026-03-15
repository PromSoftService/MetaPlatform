const IPC_CONFIG = {
  channels: {
    menuAction: 'menu:action',
    windowCloseRequested: 'window:close-requested'
  },
  handlers: {
    openProjectDialog: 'dialog:open-project',
    saveProjectAsDialog: 'dialog:save-project-as',
    appQuit: 'app:quit',
    windowCloseApproved: 'window:close-approved',
    windowCloseCancelled: 'window:close-cancelled',
    fsEnsureDir: 'fs:ensure-dir',
    fsExists: 'fs:exists',
    fsReadText: 'fs:read-text',
    fsWriteText: 'fs:write-text',
    fsRename: 'fs:rename',
    fsDeleteFile: 'fs:delete-file',
    fsDeleteDir: 'fs:delete-dir',
    fsListFiles: 'fs:list-files'
  }
};

module.exports = {
  IPC_CONFIG
};
