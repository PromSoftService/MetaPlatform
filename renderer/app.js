import { APP_CONFIG } from '../config/app-config.js';
import { applyStaticText } from './ui/applyStaticText.js';
import { createLogger } from './core/logger.js';
import { createCommandBus } from './core/commandBus.js';
import { createModuleRegistry } from './core/moduleRegistry.js';
import { createProjectManager } from './core/projectManager.js';
import { createFileSystemBridge } from './runtime/fileSystemBridge.js';
import { initWorkbenchLayout } from './core/layout.js';
import { createWorkbenchTabs } from './ui/createWorkbenchTabs.js';
import { createProjectTree } from './ui/createProjectTree.js';

import { createMetaGenModule } from './modules/metagen/metagenModule.js';
import { createMetaLabModule } from './modules/metalab/metalabModule.js';
import { createMetaViewModule } from './modules/metaview/metaviewModule.js';

function dirnameOf(targetPath) {
  const normalized = String(targetPath || '').replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index > 0 ? normalized.slice(0, index) : normalized;
}

document.addEventListener('DOMContentLoaded', async () => {
  applyStaticText();

  const logger = createLogger();
  const commandBus = createCommandBus({ logger });
  const moduleRegistry = createModuleRegistry({ logger });
  const fileSystem = createFileSystemBridge();
  const workbenchLayout = initWorkbenchLayout();

  window.MetaPlatformRuntime = window.MetaPlatformRuntime || {};

  let projectManager = null;
  const getProjectManager = () => projectManager;

  const metaGenModule = createMetaGenModule({ logger, getProjectManager });
  const metaLabModule = createMetaLabModule({ logger, getProjectManager });
  const metaViewModule = createMetaViewModule({ logger, getProjectManager });

  moduleRegistry.registerModule(metaGenModule);
  moduleRegistry.registerModule(metaLabModule);
  moduleRegistry.registerModule(metaViewModule);

  const projectTitle = document.querySelector(APP_CONFIG.ui.dom.projectTitleSelector);
  const tabs = createWorkbenchTabs({
    logger,
    openEditor: async ({ documentRecord, mountElement }) => {
      const module = moduleRegistry.findModuleByDocumentKind(documentRecord.document?.kind);

      if (!module) {
        throw new Error(`Не найден модуль для kind=${documentRecord.document?.kind}`);
      }

      return module.openDocument({ documentRecord, mountElement });
    }
  });

  projectManager = createProjectManager({
    logger,
    fileSystem,
    moduleRegistry,
    onProjectLoaded: ({ projectRuntime }) => {
      if (projectTitle) {
        projectTitle.textContent = `• ${projectRuntime.project.name}`;
      }

      window.MetaPlatformRuntime.activeProject = projectRuntime;
    },
    onProjectClosed: () => {
      if (projectTitle) {
        projectTitle.textContent = '';
      }

      window.MetaPlatformRuntime.activeProject = null;
    }
  });

  const tree = createProjectTree({
    logger,
    projectManager,
    tabs
  });

  async function openProjectFlow() {
    const selectedPath = await fileSystem.openProjectDialog();

    if (!selectedPath) {
      return;
    }

    tabs.closeAllTabs();
    await projectManager.openProject(selectedPath);
  }

  async function closeProjectFlow() {
    tabs.closeAllTabs();
    await projectManager.closeProject();
    logger.clear();
  }

  async function saveFlow() {
    const activeDocument = tabs.getActiveDocumentRecord();

    if (!activeDocument) {
      logger.warn('project', 'Нет активного документа для сохранения');
      return;
    }

    await projectManager.saveDocument(activeDocument);
  }

  async function saveAsFlow() {
    const project = projectManager.getCurrentProject();

    if (!project) {
      logger.warn('project', 'Нет открытого проекта для сохранения как');
      return;
    }

    const suggestedPath = `${dirnameOf(project.rootPath)}/${project.project.name || 'project'}-copy`;
    const targetRoot = await fileSystem.saveProjectAsDialog(suggestedPath);

    if (!targetRoot) {
      return;
    }

    tabs.closeAllTabs();
    await projectManager.saveProjectAs(targetRoot);
  }

  fileSystem.onMenuAction(async (action) => {
    try {
      if (action === 'open-project') {
        await openProjectFlow();
      }

      if (action === 'close-project') {
        await closeProjectFlow();
      }

      if (action === 'save') {
        await saveFlow();
      }

      if (action === 'save-as') {
        await saveAsFlow();
      }
    } catch (error) {
      logger.error('menu', 'Ошибка выполнения команды меню', {
        action,
        message: error?.message || String(error)
      });
    }
  });

  logger.info(APP_CONFIG.platform.logging.defaultSource, 'Инициализация MetaPlatform...');
  const defaultProjectRoot = await fileSystem.getDefaultProjectRoot();
  await projectManager.openProject(defaultProjectRoot);
  await tree.render();
  logger.info(APP_CONFIG.platform.logging.defaultSource, 'Проект открыт');

  window.MetaPlatformRuntime = {
    logger,
    commandBus,
    moduleRegistry,
    projectManager,
    fileSystem,
    workbenchLayout,
    tabs,
    activeProject: projectManager.getCurrentProject()
  };
});
