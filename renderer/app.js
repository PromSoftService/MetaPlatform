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
import { createAppCloseCoordinator } from './runtime/appCloseCoordinator.js';

import { createMetaGenModule } from './modules/metagen/metagenModule.js';
import { createMetaLabModule } from './modules/metalab/metalabModule.js';
import { createMetaViewModule } from './modules/metaview/metaviewModule.js';
import { APP_CONFIG } from '../config/app-config.js';

function joinPaths(...parts) {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/');
}

function buildProjectFilePath(projectRoot, projectFileName = APP_CONFIG.project.defaultProjectFileName) {
  return joinPaths(projectRoot, projectFileName);
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


  projectManager = createProjectManager({
    logger,
    fileSystem,
    moduleRegistry,
    onProjectLoaded: ({ projectRuntime }) => {
      window.MetaPlatformRuntime.activeProject = projectRuntime;
    },
    onProjectClosed: () => {
      window.MetaPlatformRuntime.activeProject = null;
    }
  });

  async function handleCreateComponentRequest(moduleId) {
    const moduleDefaultNames = {
      metagen: () => projectManager.getNextMetaGenDefaultName(),
      metalab: () => 'Новый сценарий',
      metaview: () => 'Новый экран'
    };

    const getDefaultName = moduleDefaultNames[moduleId] || (() => APP_CONFIG.ui.text.untitled);

    await tabs.startTemporaryDocumentCreation({
      moduleId,
      defaultName: getDefaultName(),
      onCommit: async ({ moduleId: confirmedModuleId, confirmedName }) => {
        return projectManager.createDocument(confirmedModuleId, confirmedName);
      }
    });
  }

  async function handleDeleteComponentRequest(documentRecord) {
    await projectManager.deleteDocument(documentRecord.path);
    await tabs.closeTab(documentRecord.path, { skipProjectSync: true });
  }

  const tree = createProjectTree({
    logger,
    projectManager,
    tabs,
    onCreateComponentRequest: handleCreateComponentRequest,
    onDeleteComponentRequest: handleDeleteComponentRequest
  });

  async function saveProjectFlow({ forceSaveAs = false } = {}) {
    const project = projectManager.getCurrentProject();

    if (!project) {
      logger.warn('project', 'Нет открытого проекта для сохранения');
      return false;
    }

    const openDocuments = await tabs.collectOpenDocumentRecords();

    if (project.isUnsaved || forceSaveAs) {
      const projectStem = String(project.project?.name || 'project').trim() || 'project';
      const suggestedPath = project.projectFilePath
        || buildProjectFilePath(project.rootPath || '.', `${projectStem}.yaml`);
      const targetProjectFilePath = await fileSystem.saveProjectFileAsDialog(suggestedPath);

      if (!targetProjectFilePath) {
        return false;
      }

      const result = await projectManager.saveProjectAs(targetProjectFilePath, openDocuments);
      tabs.updateTabPaths(result?.pathMap);
      await tree.render();
      logger.clear();
      return true;
    }

    const result = await projectManager.saveProject(openDocuments);
    tabs.updateTabPaths(result?.pathMap);
    await tree.render();
    logger.clear();
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

    const selectedPath = await fileSystem.openProjectFileDialog();

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

  const appCloseCoordinator = createAppCloseCoordinator({
    confirmSaveIfDirty,
    requestAppQuit: () => fileSystem.requestAppQuit(),
    approveWindowClose: () => fileSystem.approveWindowClose(),
    cancelWindowClose: () => fileSystem.cancelWindowClose()
  });

  async function exitFlow() {
    await appCloseCoordinator.requestExit();
  }

  fileSystem.onWindowCloseRequested(async () => {
    try {
      await appCloseCoordinator.handleWindowCloseRequested();
    } catch (error) {
      logger.error('window-close', 'Ошибка обработки запроса закрытия окна', {
        message: error?.message || String(error)
      });

      try {
        await fileSystem.cancelWindowClose();
      } catch (cancelError) {
        logger.error('window-close', 'Ошибка отмены закрытия окна', {
          message: cancelError?.message || String(cancelError)
        });
      }
    }
  });

  fileSystem.onMenuAction(async (action) => {
    try {
      const transitionResult = await tabs.finalizeActiveEditorContextBeforeTransition({
        reason: `menu-action:${action}`,
        blockOnFailure: true
      });

      if (!transitionResult.continued) {
        logger.error('menu', 'Действие меню заблокировано: не удалось завершить редактирование перед сменой контекста', {
          action,
          outcome: transitionResult.outcome,
          reason: transitionResult.reason
        });
        return;
      }

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
