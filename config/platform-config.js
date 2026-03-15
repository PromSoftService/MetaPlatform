export const PLATFORM_CONFIG = {
  locale: 'ru-RU',

  runtime: {
    mac: 'darwin'
  },

  window: {
    width: 1600,
    height: 980,
    devServerUrl: 'http://127.0.0.1:5173/'
  },

  app: {
    title: 'MetaPlatform',
    topPanelTitle: '⚡ MetaPlatform',
    menu: {
      fileLabel: 'Файл',
      actionIds: {
        newProject: 'new-project',
        openProject: 'open-project',
        closeProject: 'close-project',
        save: 'save',
        saveAs: 'save-as',
        exit: 'exit'
      }
    }
  },

  logging: {
    defaultSource: 'app',
    level: 'info',
    mirrorToConsole: false,
    captureGlobalErrors: true
  }
};
