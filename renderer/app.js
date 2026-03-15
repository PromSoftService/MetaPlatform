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
import { getDocumentIdentityKey } from './runtime/documentRecordIdentity.js';
import { createAppCloseCoordinator } from './runtime/appCloseCoordinator.js';

import { createMetaGenModule } from './modules/metagen/metagenModule.js';
import { createMetaLabModule } from './modules/metalab/metalabModule.js';
import { createMetaViewModule } from './modules/metaview/metaviewModule.js';
import { APP_CONFIG } from '../config/app-config.js';
import { buildProjectFilePath } from './runtime/projectPaths.js';

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
        onDirty: () => projectManager?.markDocumentDirty(getDocumentIdentityKey(documentRecord))
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
      [APP_CONFIG.project.moduleIds.metagen]: () => projectManager.getNextMetaGenDefaultName(),
      [APP_CONFIG.project.moduleIds.metalab]: () => metaLabModule.getDefaultName(),
      [APP_CONFIG.project.moduleIds.metaview]: () => metaViewModule.getDefaultName()
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
    const documentIdentity = getDocumentIdentityKey(documentRecord);
    await projectManager.deleteDocument(documentIdentity);
    await tabs.closeTab(documentIdentity, { skipProjectSync: true });
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
      logger.warn(APP_CONFIG.ui.runtime.loggerSources.project, 'Нет открытого проекта для сохранения');
      return false;
    }

    const openDocuments = await tabs.collectOpenDocumentRecords();

    if (project.isUnsaved || forceSaveAs) {
      const projectStem = String(project.project?.name || APP_CONFIG.project.defaultProjectName).trim() || APP_CONFIG.project.defaultProjectName;
      const suggestedPath = project.projectFilePath
        || buildProjectFilePath(project.rootPath || '.', `${projectStem}${APP_CONFIG.project.fileExtensions.default}`);
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
      title: APP_CONFIG.ui.text.saveChangesTitle
    });

    if (decision === APP_CONFIG.ui.runtime.dialogResults.cancel) {
      return 'cancel';
    }

    if (decision === APP_CONFIG.ui.runtime.dialogResults.discard) {
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
      logger.error(APP_CONFIG.ui.runtime.loggerSources.windowClose, 'Ошибка обработки запроса закрытия окна', {
        message: error?.message || String(error)
      });

      try {
        await fileSystem.cancelWindowClose();
      } catch (cancelError) {
        logger.error(APP_CONFIG.ui.runtime.loggerSources.windowClose, 'Ошибка отмены закрытия окна', {
          message: cancelError?.message || String(cancelError)
        });
      }
    }
  });

  fileSystem.onMenuAction(async (action) => {
    try {
      const transitionResult = await tabs.finalizeActiveEditorContextBeforeTransition({
        reason: `${APP_CONFIG.ui.runtime.transitionReasons.menuActionPrefix}${action}`,
        blockOnFailure: true
      });

      if (!transitionResult.continued) {
        logger.error(APP_CONFIG.ui.runtime.loggerSources.menu, 'Действие меню заблокировано: не удалось завершить редактирование перед сменой контекста', {
          action,
          outcome: transitionResult.outcome,
          reason: transitionResult.reason
        });
        return;
      }

      if (action === APP_CONFIG.platform.app.menu.actionIds.newProject) await newProjectFlow();
      if (action === APP_CONFIG.platform.app.menu.actionIds.openProject) await openProjectFlow();
      if (action === APP_CONFIG.platform.app.menu.actionIds.closeProject) await closeProjectFlow();
      if (action === APP_CONFIG.platform.app.menu.actionIds.save) await saveProjectFlow();
      if (action === APP_CONFIG.platform.app.menu.actionIds.saveAs) await saveProjectFlow({ forceSaveAs: true });
      if (action === APP_CONFIG.platform.app.menu.actionIds.exit) await exitFlow();
    } catch (error) {
      logger.error(APP_CONFIG.ui.runtime.loggerSources.menu, 'Ошибка выполнения команды меню', {
        action,
        message: error?.message || String(error)
      });
    }
  });

  logger.info(APP_CONFIG.ui.runtime.loggerSources.platform, 'Инициализация MetaPlatform...');
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
