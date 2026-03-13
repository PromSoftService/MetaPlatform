import { APP_CONFIG } from '../../config/app-config.js';
import { createDocumentLoader } from '../runtime/documentLoader.js';
import { slugifyDocumentName } from '../runtime/naming.js';

function joinPaths(...parts) {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/');
}

function buildProjectFilePath(projectRoot) {
  return joinPaths(projectRoot, APP_CONFIG.project.projectFileName);
}

function getFileExtension(fileName) {
  const normalized = String(fileName || '');
  const lastDotIndex = normalized.lastIndexOf('.');
  return lastDotIndex > 0 ? normalized.slice(lastDotIndex) : '';
}

function stripFileExtension(fileName) {
  const normalized = String(fileName || '');
  const lastDotIndex = normalized.lastIndexOf('.');
  return lastDotIndex > 0 ? normalized.slice(0, lastDotIndex) : normalized;
}

function getModuleFolder(moduleId) {
  const folderMap = {
    metagen: APP_CONFIG.project.folders.metagen,
    metalab: APP_CONFIG.project.folders.metalab,
    metaview: APP_CONFIG.project.folders.metaview
  };

  return folderMap[moduleId] || null;
}

function normalizeDocumentName(name) {
  return String(name ?? '').trim();
}

function getProjectNameFromRoot(targetRoot) {
  const normalized = String(targetRoot || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const lastSegment = normalized.split('/').pop();
  return normalizeDocumentName(lastSegment || '');
}

function getDocumentName(documentRecord) {
  return normalizeDocumentName(
    documentRecord?.document?.component?.name
    || documentRecord?.document?.scenario?.name
    || documentRecord?.document?.screen?.name
    || documentRecord?.document?.name
    || ''
  );
}

function getDocumentIdentityKey(documentRecord) {
  if (!documentRecord?.document) {
    return '';
  }

  const moduleId = String(documentRecord.moduleId || '');
  const kind = String(documentRecord.document.kind || '');

  const componentId = String(documentRecord.document?.component?.id || '').trim();
  const scenarioId = String(documentRecord.document?.scenario?.id || '').trim();
  const screenId = String(documentRecord.document?.screen?.id || '').trim();

  // Для Save As идентичность документа определяется логическим id сущности, а не path.
  // Для новых документов id должен быть уникальным уже на этапе factory, иначе разные документы могут схлопнуться.
  const name = getDocumentName(documentRecord);
  const entityId = componentId || scenarioId || screenId || name;

  return `${moduleId}::${kind}::${entityId}`;
}

function syncDocumentIdentityFromName(documentRecord, nextName) {
  const value = normalizeDocumentName(nextName);
  const slug = slugifyDocumentName(value);

  if (documentRecord?.document?.component) {
    const nextId = slug || 'new_component';
    documentRecord.document.component.name = value;

    if ('id' in documentRecord.document.component) {
      documentRecord.document.component.id = nextId;
    }

    if (documentRecord.document?.generation?.output) {
      documentRecord.document.generation.output.fileName = `${nextId}.st`;
    }

    return;
  }

  if (documentRecord?.document?.scenario) {
    const nextId = slug || 'new_scenario';
    documentRecord.document.scenario.name = value;
    documentRecord.document.scenario.id = nextId;
    return;
  }

  if (documentRecord?.document?.screen) {
    const nextId = slug || 'new_screen';
    documentRecord.document.screen.name = value;
    documentRecord.document.screen.id = nextId;
    return;
  }

  if (documentRecord?.document) {
    documentRecord.document.name = value;
  }
}

function setDocumentName(documentRecord, nextName) {
  syncDocumentIdentityFromName(documentRecord, nextName);
}

function createDefaultProjectRaw() {
  return {
    kind: APP_CONFIG.project.projectKinds.root,
    version: 1,
    project: {
      id: `project_${Date.now()}`,
      name: 'Новый проект',
      description: ''
    },
    modules: ['MetaGen', 'MetaLab', 'MetaView'],
    paths: {
      metagen: APP_CONFIG.project.folders.metagen,
      metalab: APP_CONFIG.project.folders.metalab,
      metaview: APP_CONFIG.project.folders.metaview,
      generated: APP_CONFIG.project.folders.generated
    }
  };
}

export function createProjectManager({ logger, fileSystem, moduleRegistry, onProjectLoaded, onProjectClosed }) {
  const documentLoader = createDocumentLoader({ fileSystem });
  let currentProject = null;
  const listeners = new Set();
  let unsavedCounter = 0;

  function emitChange() {
    for (const listener of listeners) {
      listener(currentProject);
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setDirty(value = true) {
    if (!currentProject) {
      return;
    }

    currentProject.isDirty = Boolean(value);
    emitChange();
  }

  function clearDirty() {
    setDirty(false);
  }

  function getAllDocuments() {
    if (!currentProject) {
      return [];
    }

    return [
      ...currentProject.documents.metagen,
      ...currentProject.documents.metalab,
      ...currentProject.documents.metaview
    ];
  }

  async function scanModuleDocuments(projectRoot, moduleFolder, moduleId) {
    const dir = joinPaths(projectRoot, moduleFolder);
    const paths = await fileSystem.listFiles(dir, APP_CONFIG.project.fileExtensions.yaml);
    const output = [];

    for (const filePath of paths) {
      try {
        const loaded = await documentLoader.loadYaml(filePath);

        if (!loaded.data || typeof loaded.data !== 'object') {
          continue;
        }

        const module = moduleRegistry.findModuleByDocumentKind(loaded.data.kind);

        if (!module || module.id !== moduleId) {
          continue;
        }

        output.push({ moduleId, path: filePath, document: loaded.data });
      } catch (error) {
        logger.warn('project', 'Ошибка чтения документа, файл пропущен', {
          path: filePath,
          message: error?.message || String(error)
        });
      }
    }

    // Используем общий helper имени документа, чтобы MetaGen / MetaLab / MetaView сортировались согласованно.
    output.sort((a, b) => getDocumentName(a).localeCompare(getDocumentName(b)));

    return output;
  }

  async function ensureProjectDirectories(projectRoot) {
    await fileSystem.ensureDir(projectRoot);
    await fileSystem.ensureDir(joinPaths(projectRoot, APP_CONFIG.project.folders.metagen));
    await fileSystem.ensureDir(joinPaths(projectRoot, APP_CONFIG.project.folders.metalab));
    await fileSystem.ensureDir(joinPaths(projectRoot, APP_CONFIG.project.folders.metaview));
    await fileSystem.ensureDir(joinPaths(projectRoot, APP_CONFIG.project.folders.generated));
  }

  function buildSaveStagingRoot(targetRoot) {
    return joinPaths(targetRoot, '.save-staging');
  }

  function buildModuleStagingDir(targetRoot, moduleFolder) {
    return joinPaths(targetRoot, '.save-staging', moduleFolder);
  }

  function buildModuleBackupDir(targetRoot, moduleFolder) {
    return joinPaths(targetRoot, `.backup-${moduleFolder}`);
  }

  async function removeDirectoryIfExists(targetPath) {
    const exists = await fileSystem.exists(targetPath);

    if (!exists) {
      return true;
    }

    await fileSystem.deleteDir(targetPath);
    return true;
  }

  async function replaceModuleDirectoryFromStaging(targetRoot, moduleFolder) {
    const moduleDir = joinPaths(targetRoot, moduleFolder);
    const stagingDir = buildModuleStagingDir(targetRoot, moduleFolder);
    const backupDir = buildModuleBackupDir(targetRoot, moduleFolder);

    await removeDirectoryIfExists(backupDir);

    const moduleExists = await fileSystem.exists(moduleDir);

    if (moduleExists) {
      await fileSystem.rename(moduleDir, backupDir);
    }

    try {
      await fileSystem.rename(stagingDir, moduleDir);
    } catch (error) {
      if (moduleExists) {
        try {
          await fileSystem.rename(backupDir, moduleDir);
        } catch (rollbackError) {
          throw rollbackError;
        }
      }

      throw error;
    }

    await removeDirectoryIfExists(backupDir);
  }

  function createProjectRuntime({ rootPath, raw, documents, isUnsaved = false, isDirty = false }) {
    return {
      rootPath,
      projectFilePath: rootPath ? buildProjectFilePath(rootPath) : null,
      raw,
      project: raw.project,
      documents,
      isUnsaved,
      isDirty
    };
  }

  async function createNewProject() {
    const raw = createDefaultProjectRaw();
    currentProject = createProjectRuntime({
      rootPath: null,
      raw,
      documents: { metagen: [], metalab: [], metaview: [] },
      isUnsaved: true,
      isDirty: false
    });

    onProjectLoaded?.({ projectRuntime: currentProject });
    emitChange();
    return currentProject;
  }

  async function hydrateProjectRuntimeFromDisk(projectRoot) {
    const projectFilePath = buildProjectFilePath(projectRoot);
    const exists = await fileSystem.exists(projectFilePath);

    if (!exists) {
      throw new Error(`project.yaml не найден: ${projectRoot}`);
    }

    const projectFile = await documentLoader.loadYaml(projectFilePath);

    return createProjectRuntime({
      rootPath: projectRoot,
      raw: projectFile.data,
      documents: {
        metagen: await scanModuleDocuments(projectRoot, APP_CONFIG.project.folders.metagen, 'metagen'),
        metalab: await scanModuleDocuments(projectRoot, APP_CONFIG.project.folders.metalab, 'metalab'),
        metaview: await scanModuleDocuments(projectRoot, APP_CONFIG.project.folders.metaview, 'metaview')
      },
      isUnsaved: false,
      isDirty: false
    });
  }

  async function openProject(projectRoot) {
    currentProject = await hydrateProjectRuntimeFromDisk(projectRoot);

    onProjectLoaded?.({ projectRuntime: currentProject });
    emitChange();
    return currentProject;
  }

  async function closeProject() {
    currentProject = null;
    emitChange();
    onProjectClosed?.();
  }

  async function refresh() {
    if (!currentProject || currentProject.isUnsaved || !currentProject.rootPath) {
      emitChange();
      return currentProject;
    }

    const hydrated = await hydrateProjectRuntimeFromDisk(currentProject.rootPath);
    currentProject.documents = hydrated.documents;
    currentProject.raw = hydrated.raw;
    currentProject.project = hydrated.project;

    emitChange();
    return currentProject;
  }

  function getDocumentsByModule(moduleId) {
    if (!currentProject) {
      return [];
    }

    return currentProject.documents[moduleId] || [];
  }

  function getDocumentByPath(targetPath) {
    return getAllDocuments().find((entry) => entry.path === targetPath) || null;
  }

  function isDocumentNameTaken(moduleId, name, excludePath = null) {
    if (!currentProject) {
      return false;
    }

    const normalizedTarget = normalizeDocumentName(name);

    if (!normalizedTarget) {
      return false;
    }

    return getDocumentsByModule(moduleId).some((record) => {
      if (excludePath && record.path === excludePath) {
        return false;
      }

      return getDocumentName(record) === normalizedTarget;
    });
  }

  function isMetaGenNameTaken(name, excludePath = null) {
    return isDocumentNameTaken('metagen', name, excludePath);
  }

  function getNextMetaGenDefaultName() {
    let index = 1;

    while (true) {
      const candidate = `Новый компонент ${index}`;

      if (!isMetaGenNameTaken(candidate)) {
        return candidate;
      }

      index += 1;
    }
  }

  async function createDocument(moduleId, name = null) {
    if (!currentProject) {
      throw new Error('Project is not opened');
    }

    const module = moduleRegistry.getModule(moduleId);

    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    const fallbackName = moduleId === 'metagen'
      ? getNextMetaGenDefaultName()
      : APP_CONFIG.ui.text.untitled;
    const resolvedName = normalizeDocumentName(name || fallbackName);

    if (!resolvedName) {
      logger.warn('project', 'Пустое имя документа отклонено', { moduleId });
      return null;
    }

    if (isDocumentNameTaken(moduleId, resolvedName)) {
      logger.warn('project', 'Имя документа уже занято', { moduleId, name: resolvedName });
      return null;
    }

    const document = module.createDefaultDocument({ name: resolvedName });
    const virtualPath = currentProject.rootPath
      ? joinPaths(currentProject.rootPath, getModuleFolder(moduleId), module.getFileName(document))
      : `unsaved://${moduleId}/${++unsavedCounter}.yaml`;

    const record = { moduleId, path: virtualPath, document };
    currentProject.documents[moduleId].push(record);
    currentProject.documents[moduleId].sort((a, b) => getDocumentName(a).localeCompare(getDocumentName(b)));

    setDirty(true);
    logger.info('project', 'Создан документ', { moduleId, path: virtualPath, name: resolvedName });
    return record;
  }

  async function renameDocument(targetPath, nextName) {
    if (!currentProject) {
      return null;
    }

    const record = getDocumentByPath(targetPath);

    if (!record) {
      return null;
    }

    const resolvedName = normalizeDocumentName(nextName);

    if (!resolvedName) {
      return null;
    }

    if (isDocumentNameTaken(record.moduleId, resolvedName, targetPath)) {
      logger.warn('project', 'Имя документа уже занято', { moduleId: record.moduleId, name: resolvedName });
      return null;
    }

    // При rename синхронизируем не только display name, но и внутренние id/связанные поля,
    // чтобы документ не входил в рассинхронизированное состояние.
    const previousPath = record.path;
    setDocumentName(record, resolvedName);

    if (currentProject.rootPath && !String(record.path).startsWith('unsaved://')) {
      const module = moduleRegistry.getModule(record.moduleId);
      const moduleFolder = getModuleFolder(record.moduleId);
      const nextFileName = module.getFileName(record.document);
      const nextPath = joinPaths(currentProject.rootPath, moduleFolder, nextFileName);

      if (nextPath !== record.path) {
        await fileSystem.rename(record.path, nextPath);
        record.path = nextPath;
      }
    }

    currentProject.documents[record.moduleId].sort((a, b) => getDocumentName(a).localeCompare(getDocumentName(b)));
    setDirty(true);

    return {
      record,
      previousPath,
      nextPath: record.path
    };
  }

  function markDocumentDirty() {
    setDirty(true);
  }

  // ВАЖНО:
  // Эта функция записывает YAML-файл конкретного документа на диск.
  // Она НЕ означает, что весь state проекта синхронизирован и НЕ сбрасывает общий dirty-state проекта.
  // Полный сброс dirty-state выполняется только через saveProject()/saveProjectAs().
  async function writeDocumentFile(documentRecord) {
    if (!documentRecord?.path || !documentRecord?.document) {
      throw new Error('Invalid document record');
    }

    if (!currentProject?.rootPath) {
      setDirty(true);
      return true;
    }

    await documentLoader.saveYaml(documentRecord.path, documentRecord.document);
    setDirty(true);
    return true;
  }

  async function deleteDocument(targetPath) {
    if (!currentProject) {
      return false;
    }

    const record = getDocumentByPath(targetPath);

    if (!record) {
      return false;
    }

    currentProject.documents[record.moduleId] = currentProject.documents[record.moduleId].filter((entry) => entry.path !== targetPath);

    if (currentProject.rootPath && !String(targetPath).startsWith('unsaved://')) {
      await fileSystem.deleteFile(targetPath);
    }

    setDirty(true);
    logger.info('project', 'Документ удалён', { path: targetPath });
    return true;
  }

  async function saveProjectToRoot(targetRoot, openDocuments = [], { renameProjectFromRoot = false } = {}) {
    if (!currentProject) {
      throw new Error('Project is not opened');
    }

    const recordsByIdentity = new Map();

    for (const record of getAllDocuments()) {
      const identityKey = getDocumentIdentityKey(record);

      if (!identityKey) {
        continue;
      }

      recordsByIdentity.set(identityKey, record);
    }

    for (const record of openDocuments) {
      if (!record?.document) {
        continue;
      }

      const identityKey = getDocumentIdentityKey(record);

      if (!identityKey) {
        continue;
      }

      recordsByIdentity.set(identityKey, record);
    }

    const docs = Array.from(recordsByIdentity.values());

    await ensureProjectDirectories(targetRoot);

    const targetProjectName = getProjectNameFromRoot(targetRoot);
    const shouldReplaceDefaultName = currentProject.isUnsaved
      && normalizeDocumentName(currentProject.project?.name) === 'Новый проект';
    const shouldRenameProject = renameProjectFromRoot || shouldReplaceDefaultName;

    if (shouldRenameProject && targetProjectName) {
      currentProject.project.name = targetProjectName;
      currentProject.raw.project = {
        ...(currentProject.raw.project || {}),
        ...currentProject.project,
        name: targetProjectName
      };
    }

    const finalProjectPayload = {
      ...currentProject.raw,
      project: currentProject.project
    };
    const stagingRoot = buildSaveStagingRoot(targetRoot);
    const pathMap = new Map();
    const stagingPathMap = new Map();
    const occupied = new Set();

    // Не удаляем текущие YAML заранее.
    // Сначала полностью пишем новое состояние в staging, затем подменяем папки модулей.
    // Это снижает риск частично пустого проекта при ошибке записи.
    await removeDirectoryIfExists(stagingRoot);

    await fileSystem.ensureDir(buildModuleStagingDir(targetRoot, APP_CONFIG.project.folders.metagen));
    await fileSystem.ensureDir(buildModuleStagingDir(targetRoot, APP_CONFIG.project.folders.metalab));
    await fileSystem.ensureDir(buildModuleStagingDir(targetRoot, APP_CONFIG.project.folders.metaview));

    for (const record of docs) {
      if (!record?.document) {
        continue;
      }

      const module = moduleRegistry.getModule(record.moduleId);
      const moduleFolder = getModuleFolder(record.moduleId);

      if (!module || !moduleFolder) {
        continue;
      }

      let fileName = module.getFileName(record.document);
      const ext = getFileExtension(fileName) || '.yaml';
      const base = stripFileExtension(fileName);
      let index = 1;

      while (occupied.has(`${moduleFolder}/${fileName}`)) {
        fileName = `${base}-${index}${ext}`;
        index += 1;
      }

      occupied.add(`${moduleFolder}/${fileName}`);

      const finalPath = joinPaths(targetRoot, moduleFolder, fileName);
      const stagingPath = joinPaths(stagingRoot, moduleFolder, fileName);

      await documentLoader.saveYaml(stagingPath, record.document);
      pathMap.set(record.path, finalPath);
      stagingPathMap.set(record.path, stagingPath);
    }

    const stagingProjectFilePath = joinPaths(stagingRoot, APP_CONFIG.project.projectFileName);
    await documentLoader.saveYaml(stagingProjectFilePath, finalProjectPayload);

    await replaceModuleDirectoryFromStaging(targetRoot, APP_CONFIG.project.folders.metagen);
    await replaceModuleDirectoryFromStaging(targetRoot, APP_CONFIG.project.folders.metalab);
    await replaceModuleDirectoryFromStaging(targetRoot, APP_CONFIG.project.folders.metaview);

    const finalProjectFilePath = buildProjectFilePath(targetRoot);
    const backupProjectFilePath = joinPaths(targetRoot, '.backup-project.yaml');
    const finalProjectExists = await fileSystem.exists(finalProjectFilePath);

    await fileSystem.deleteFile(backupProjectFilePath);

    if (finalProjectExists) {
      await fileSystem.rename(finalProjectFilePath, backupProjectFilePath);
    }

    try {
      await fileSystem.rename(stagingProjectFilePath, finalProjectFilePath);
    } catch (error) {
      logger.error('project', 'Не удалось заменить project.yaml из staging', {
        targetRoot,
        message: error?.message || String(error)
      });

      if (finalProjectExists) {
        try {
          await fileSystem.rename(backupProjectFilePath, finalProjectFilePath);
        } catch (rollbackError) {
          throw rollbackError;
        }
      }

      throw error;
    }

    await fileSystem.deleteFile(backupProjectFilePath);
    await removeDirectoryIfExists(stagingRoot);

    const hydrated = await hydrateProjectRuntimeFromDisk(targetRoot);
    currentProject = hydrated;

    emitChange();
    return {
      project: currentProject,
      pathMap
    };
  }

  async function saveProject(openDocuments = []) {
    if (!currentProject) {
      throw new Error('Project is not opened');
    }

    if (!currentProject.rootPath) {
      return null;
    }

    const result = await saveProjectToRoot(currentProject.rootPath, openDocuments, { renameProjectFromRoot: false });
    return result;
  }

  async function saveProjectAs(newProjectRoot, openDocuments = []) {
    const result = await saveProjectToRoot(newProjectRoot, openDocuments, { renameProjectFromRoot: true });
    logger.info('project', 'Проект сохранен как', { to: newProjectRoot });
    return result;
  }

  return {
    createNewProject,
    openProject,
    closeProject,
    refresh,
    subscribe,
    scanProjectDocuments: refresh,
    getCurrentProject: () => currentProject,
    getMetaGenDocuments: () => currentProject?.documents?.metagen || [],
    getDocumentsByModule,
    getDocumentByPath,
    createDocument,
    renameDocument,
    getNextMetaGenDefaultName,
    isMetaGenNameTaken,
    writeDocumentFile,
    saveProject,
    saveProjectAs,
    deleteDocument,
    markDocumentDirty,
    hasDirtyProject: () => Boolean(currentProject?.isDirty),
    clearDirty
  };
}
