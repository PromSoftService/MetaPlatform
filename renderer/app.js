import { applyStaticText } from './ui/applyStaticText.js';
import { createLogger } from './core/logger.js';
import { createCommandBus } from './core/commandBus.js';
import { createModuleRegistry } from './core/moduleRegistry.js';
import { createProjectManager } from './core/projectManager.js';
import { createFileSystemBridge } from './runtime/fileSystemBridge.js';
import { initWorkbenchLayout } from './core/layout.js';
import { createWorkbenchTabs } from './ui/createWorkbenchTabs.js';
import { createProjectTree } from './ui/createProjectTree.js';
import { showSaveChangesDialog } from './ui/dialogs.js';

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

  const legacyProjectTitlePlaceholder = document.querySelector('#legacy-project-title-placeholder');
  const tabs = createWorkbenchTabs({
    logger,
    projectManager: {
      renameDocument: async (...args) => projectManager?.renameDocument(...args),
      replaceDocumentRecord: async (...args) => projectManager?.replaceDocumentRecord(...args)
    },
    openEditor: async ({ documentRecord, mountElement }) => {
      const module = moduleRegistry.findModuleByDocumentKind(documentRecord.document?.kind);

      if (!module) {
        throw new Error(`Не найден модуль для kind=${documentRecord.document?.kind}`);
      }

      return module.openDocument({
        documentRecord,
        mountElement,
        onDirty: () => projectManager?.markDocumentDirty(documentRecord.path)
      });
    }
  });

  // Элемент оставлен в шапке как legacy-placeholder от старого двойного отображения имени проекта.
  // Фактическое имя проекта рендерится в другом месте интерфейса.
  // Здесь placeholder намеренно очищается, это не баг.
  function clearLegacyProjectTitlePlaceholder() {
    if (!legacyProjectTitlePlaceholder) {
      return;
    }

    legacyProjectTitlePlaceholder.textContent = '';
  }

  projectManager = createProjectManager({
    logger,
    fileSystem,
    moduleRegistry,
    onProjectLoaded: ({ projectRuntime }) => {
      window.MetaPlatformRuntime.activeProject = projectRuntime;
      clearLegacyProjectTitlePlaceholder();
    },
    onProjectClosed: () => {
      window.MetaPlatformRuntime.activeProject = null;
      clearLegacyProjectTitlePlaceholder();
    }
  });

  projectManager.subscribe(() => {
    clearLegacyProjectTitlePlaceholder();
  });

  const tree = createProjectTree({ logger, projectManager, tabs });

  async function saveProjectFlow({ forceSaveAs = false } = {}) {
    const project = projectManager.getCurrentProject();

    if (!project) {
      logger.warn('project', 'Нет открытого проекта для сохранения');
      return false;
    }

    const openDocuments = await tabs.collectOpenDocumentRecords();

    if (project.isUnsaved || forceSaveAs) {
      const suggestedPath = `${dirnameOf(project.rootPath || '.')}/${project.project.name || 'project'}`;
      const targetRoot = await fileSystem.saveProjectAsDialog(suggestedPath);

      if (!targetRoot) {
        return false;
      }

      const result = await projectManager.saveProjectAs(targetRoot, openDocuments);
      tabs.updateTabPaths(result?.pathMap);
      await tree.render();
      logger.clear();
      clearLegacyProjectTitlePlaceholder();
      return true;
    }

    const result = await projectManager.saveProject(openDocuments);
    tabs.updateTabPaths(result?.pathMap);
    await tree.render();
    logger.clear();
    clearLegacyProjectTitlePlaceholder();
    return true;
  }

  async function confirmSaveIfDirty() {
    if (!projectManager.hasDirtyProject()) {
      return 'continue';
    }

    const decision = await showSaveChangesDialog({
      title: 'Сохранить изменения в текущем проекте?'
    });

    if (decision === 'cancel') {
      return 'cancel';
    }

    if (decision === 'discard') {
      return 'continue';
    }

    const saved = await saveProjectFlow();
    return saved ? 'continue' : 'cancel';
  }

  async function newProjectFlow() {
    const canContinue = await confirmSaveIfDirty();

    if (canContinue === 'cancel') {
      return;
    }

    await tabs.closeAllTabs();
    logger.clear();
    await projectManager.createNewProject();
  }

  async function openProjectFlow() {
    const canContinue = await confirmSaveIfDirty();

    if (canContinue === 'cancel') {
      return;
    }

    const selectedPath = await fileSystem.openProjectDialog();

    if (!selectedPath) {
      return;
    }

    await tabs.closeAllTabs();
    logger.clear();
    await projectManager.openProject(selectedPath);
  }

  async function closeProjectFlow() {
    if (!projectManager.getCurrentProject()) {
      return;
    }

    const canContinue = await confirmSaveIfDirty();

    if (canContinue === 'cancel') {
      return;
    }

    await tabs.closeAllTabs();
    logger.clear();
    await projectManager.closeProject();
  }

  async function exitFlow() {
    const canContinue = await confirmSaveIfDirty();

    if (canContinue === 'cancel') {
      return;
    }

    await fileSystem.requestAppQuit();
  }

  fileSystem.onMenuAction(async (action) => {
    try {
      if (action === 'new-project') await newProjectFlow();
      if (action === 'open-project') await openProjectFlow();
      if (action === 'close-project') await closeProjectFlow();
      if (action === 'save') await saveProjectFlow();
      if (action === 'save-as') await saveProjectFlow({ forceSaveAs: true });
      if (action === 'exit') await exitFlow();
    } catch (error) {
      logger.error('menu', 'Ошибка выполнения команды меню', {
        action,
        message: error?.message || String(error)
      });
    }
  });

  logger.info('platform', 'Инициализация MetaPlatform...');
  await tree.render();

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
