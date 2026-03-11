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

document.addEventListener('DOMContentLoaded', async () => {
  applyStaticText();

  const logger = createLogger();
  const commandBus = createCommandBus({ logger });
  const moduleRegistry = createModuleRegistry({ logger });
  const fileSystem = createFileSystemBridge();
  const workbenchLayout = initWorkbenchLayout();

  let projectManager = null;
  const getProjectManager = () => projectManager;

  const metaGenModule = createMetaGenModule({ logger, getProjectManager });
  const metaLabModule = createMetaLabModule({ logger, getProjectManager });
  const metaViewModule = createMetaViewModule({ logger, getProjectManager });

  moduleRegistry.registerModule(metaGenModule);
  moduleRegistry.registerModule(metaLabModule);
  moduleRegistry.registerModule(metaViewModule);

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
      const projectTitle = document.querySelector(APP_CONFIG.ui.dom.projectTitleSelector);
      if (projectTitle) {
        projectTitle.textContent = `• ${projectRuntime.project.name}`;
      }
    }
  });

  createProjectTree({
    logger,
    projectManager,
    tabs
  });

  logger.info(APP_CONFIG.platform.logging.defaultSource, 'Инициализация MetaPlatform...');
  const defaultProjectRoot = await fileSystem.getDefaultProjectRoot();
  await projectManager.openProject(defaultProjectRoot);
  logger.info(APP_CONFIG.platform.logging.defaultSource, 'Проект открыт');

  window.MetaPlatformRuntime = {
    logger,
    commandBus,
    moduleRegistry,
    projectManager,
    fileSystem,
    workbenchLayout,
    tabs
  };
});