import IPC_CONFIG from './ipc-config.cjs';

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
      menuEventChannel: IPC_CONFIG.channels.menuAction,
      items: {
        newProject: '🆕 Создать проект',
        openProject: '📂 Открыть проект',
        closeProject: '📁 Закрыть проект',
        save: '💾 Сохранить',
        saveAs: '📝 Сохранить как',
        exit: '🚪 Выход'
      },
      actionIds: {
        newProject: 'new-project',
        openProject: 'open-project',
        closeProject: 'close-project',
        save: 'save',
        saveAs: 'save-as',
        exit: 'exit'
      }
    },
    dialogs: {
      openProjectTitle: 'Открыть проект',
      saveProjectAsTitle: 'Сохранить проект как',
      saveButtonLabel: 'Сохранить',
      projectFilterName: 'Project YAML',
      yamlFilterName: 'YAML',
      yamlFilterExtensions: ['yaml', 'yml']
    }
  },

  ipc: IPC_CONFIG,

  logging: {
    defaultSource: 'app',
    level: 'info',
    mirrorToConsole: false,
    captureGlobalErrors: true
  }
};
