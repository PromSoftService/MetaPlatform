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

function buildProjectFilePath(projectRoot, projectFileName = APP_CONFIG.project.defaultProjectFileName) {
  return joinPaths(projectRoot, projectFileName);
}

function getDefaultProjectModuleDirectories(projectRoot) {
  return {
    metagen: joinPaths(projectRoot, APP_CONFIG.project.folders.metagen),
    metalab: joinPaths(projectRoot, APP_CONFIG.project.folders.metalab),
    metaview: joinPaths(projectRoot, APP_CONFIG.project.folders.metaview)
  };
}

export function getProjectOwnedPaths(targetProjectFilePath) {
  const normalizedProjectFilePath = normalizeProjectFilePath(targetProjectFilePath);
  const targetRoot = getProjectRootFromProjectFile(normalizedProjectFilePath);
  const targetProjectFileName = normalizedProjectFilePath.split('/').pop();
  const moduleDirectories = getDefaultProjectModuleDirectories(targetRoot);

  return {
    rootPath: targetRoot,
    projectFileName: targetProjectFileName,
    projectFilePath: buildProjectFilePath(targetRoot, targetProjectFileName),
    moduleDirectories,
    moduleFolders: {
      metagen: APP_CONFIG.project.folders.metagen,
      metalab: APP_CONFIG.project.folders.metalab,
      metaview: APP_CONFIG.project.folders.metaview
    }
  };
}

function dirnameOf(targetPath) {
  const normalized = String(targetPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const index = normalized.lastIndexOf('/');

  if (index < 0) {
    return '';
  }

  if (index === 0) {
    return '/';
  }

  return normalized.slice(0, index);
}

function normalizeProjectFilePath(projectFilePath) {
  const normalized = String(projectFilePath || '').trim().replace(/\\/g, '/').replace(/\/+$/, '');

  if (!normalized) {
    throw new Error('Project file path is required');
  }

  const baseName = normalized.split('/').pop() || '';
  if (!baseName || !baseName.includes('.')) {
    throw new Error(`Project file path must point to a YAML file: ${projectFilePath}`);
  }

  const ext = getFileExtension(baseName).toLowerCase();
  const allowed = APP_CONFIG.project.allowedProjectFileExtensions || ['.yaml', '.yml'];

  if (!allowed.includes(ext)) {
    throw new Error(`Project file path must point to a YAML file: ${projectFilePath}`);
  }

  return normalized;
}

function getProjectRootFromProjectFile(projectFilePath) {
  const root = dirnameOf(projectFilePath);

  if (!root) {
    return '.';
  }

  return root;
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

function getProjectDisplayNameFromFilePath(projectFilePath) {
  const normalized = normalizeProjectFilePath(projectFilePath);
  const baseName = normalized.split('/').pop() || '';
  return normalizeDocumentName(stripFileExtension(baseName));
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

function cloneDocumentPayload(document) {
  if (typeof structuredClone === 'function') {
    return structuredClone(document);
  }

  return JSON.parse(JSON.stringify(document));
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
  let deletedDocumentIdentities = new Set();

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

    // Dirty-state относится к runtime state проекта в целом.
    // Только успешный full project save (saveProject/saveProjectAs) переводит проект в clean state.
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
    const moduleDirectories = getDefaultProjectModuleDirectories(projectRoot);
    await fileSystem.ensureDir(moduleDirectories.metagen);
    await fileSystem.ensureDir(moduleDirectories.metalab);
    await fileSystem.ensureDir(moduleDirectories.metaview);
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

  function buildProjectFileBackupPath(targetRoot, projectFileName) {
    return joinPaths(targetRoot, `.backup-${projectFileName}`);
  }

  async function removeDirectoryIfExists(targetPath) {
    const exists = await fileSystem.exists(targetPath);

    if (!exists) {
      return true;
    }

    await fileSystem.deleteDir(targetPath);
    return true;
  }

  async function promoteModuleDirectory(targetRoot, moduleFolder) {
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
      if (await fileSystem.exists(backupDir)) {
        try {
          await fileSystem.rename(backupDir, moduleDir);
        } catch (rollbackError) {
          throw rollbackError;
        }
      }

      throw error;
    }
  }

  async function rollbackPromotedModuleDirectory(targetRoot, moduleFolder) {
    const moduleDir = joinPaths(targetRoot, moduleFolder);
    const backupDir = buildModuleBackupDir(targetRoot, moduleFolder);

    if (await fileSystem.exists(moduleDir)) {
      await fileSystem.deleteDir(moduleDir);
    }

    if (await fileSystem.exists(backupDir)) {
      await fileSystem.rename(backupDir, moduleDir);
    }
  }

  async function promoteProjectFile(targetRoot, projectFileName) {
    const stagingProjectFilePath = joinPaths(buildSaveStagingRoot(targetRoot), projectFileName);
    const finalProjectFilePath = buildProjectFilePath(targetRoot, projectFileName);
    const backupProjectFilePath = buildProjectFileBackupPath(targetRoot, projectFileName);

    await fileSystem.deleteFile(backupProjectFilePath);

    if (await fileSystem.exists(finalProjectFilePath)) {
      await fileSystem.rename(finalProjectFilePath, backupProjectFilePath);
    }

    try {
      await fileSystem.rename(stagingProjectFilePath, finalProjectFilePath);
    } catch (error) {
      if (await fileSystem.exists(backupProjectFilePath)) {
        try {
          await fileSystem.rename(backupProjectFilePath, finalProjectFilePath);
        } catch (rollbackError) {
          throw rollbackError;
        }
      }

      throw error;
    }
  }

  async function rollbackPromotedProjectFile(targetRoot, projectFileName) {
    const finalProjectFilePath = buildProjectFilePath(targetRoot, projectFileName);
    const backupProjectFilePath = buildProjectFileBackupPath(targetRoot, projectFileName);

    if (await fileSystem.exists(finalProjectFilePath)) {
      await fileSystem.deleteFile(finalProjectFilePath);
    }

    if (await fileSystem.exists(backupProjectFilePath)) {
      await fileSystem.rename(backupProjectFilePath, finalProjectFilePath);
    }
  }

  async function cleanupSaveBackups(projectOwnedPaths) {
    for (const moduleFolder of Object.values(projectOwnedPaths.moduleFolders)) {
      await removeDirectoryIfExists(buildModuleBackupDir(projectOwnedPaths.rootPath, moduleFolder));
    }

    await fileSystem.deleteFile(buildProjectFileBackupPath(projectOwnedPaths.rootPath, projectOwnedPaths.projectFileName));
  }

  async function cleanupSaveStaging(targetRoot) {
    await removeDirectoryIfExists(buildSaveStagingRoot(targetRoot));
  }


  async function performSaveRollback(projectOwnedPaths, promotedModules, projectFilePromoted, originalError) {
    // При сбое commit пытаемся откатить максимум уже продвинутых сущностей.
    // Ошибки rollback не должны скрывать исходную причину сбоя, но и не должны обрывать остальные шаги отката.
    const rollbackErrors = [];

    if (projectFilePromoted) {
      try {
        await rollbackPromotedProjectFile(projectOwnedPaths.rootPath, projectOwnedPaths.projectFileName);
      } catch (error) {
        rollbackErrors.push(new Error(`project file rollback failed: ${error?.message || String(error)}`));
      }
    }

    for (const moduleFolder of [...promotedModules].reverse()) {
      try {
        await rollbackPromotedModuleDirectory(projectOwnedPaths.rootPath, moduleFolder);
      } catch (error) {
        rollbackErrors.push(new Error(`${moduleFolder} rollback failed: ${error?.message || String(error)}`));
      }
    }

    if (rollbackErrors.length === 0) {
      throw originalError;
    }

    const rollbackSummary = rollbackErrors
      .map((error, index) => `${index + 1}. ${error.message}`)
      .join(' | ');

    throw new Error(
      `Commit failed: ${originalError?.message || String(originalError)}. Rollback issues: ${rollbackSummary}`,
      { cause: originalError }
    );
  }

  function createProjectRuntime({ rootPath, projectFilePath = null, raw, documents, isUnsaved = false, isDirty = false }) {
    const normalizedRootPath = rootPath ? String(rootPath).replace(/\\/g, '/') : null;
    const resolvedProjectFilePath = projectFilePath ? normalizeProjectFilePath(projectFilePath) : null;

    if (resolvedProjectFilePath && raw?.project) {
      raw.project.name = getProjectDisplayNameFromFilePath(resolvedProjectFilePath);
    }

    return {
      rootPath: normalizedRootPath,
      projectFilePath: resolvedProjectFilePath,
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

    deletedDocumentIdentities = new Set();
    onProjectLoaded?.({ projectRuntime: currentProject });
    emitChange();
    return currentProject;
  }

  async function hydrateProjectRuntimeFromDisk(projectFilePath) {
    const normalizedProjectFilePath = normalizeProjectFilePath(projectFilePath);
    const projectRoot = getProjectRootFromProjectFile(normalizedProjectFilePath);
    const exists = await fileSystem.exists(normalizedProjectFilePath);

    if (!exists) {
      throw new Error(`Project file not found: ${normalizedProjectFilePath}`);
    }

    const projectFile = await documentLoader.loadYaml(normalizedProjectFilePath);

    return createProjectRuntime({
      rootPath: projectRoot,
      projectFilePath: normalizedProjectFilePath,
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

  async function openProject(projectFilePath) {
    const normalizedProjectFilePath = normalizeProjectFilePath(projectFilePath);
    currentProject = await hydrateProjectRuntimeFromDisk(normalizedProjectFilePath);
    deletedDocumentIdentities = new Set();

    onProjectLoaded?.({ projectRuntime: currentProject });
    emitChange();
    return currentProject;
  }

  async function closeProject() {
    currentProject = null;
    deletedDocumentIdentities = new Set();
    emitChange();
    onProjectClosed?.();
  }

  async function refresh() {
    if (!currentProject || currentProject.isUnsaved || !currentProject.rootPath) {
      emitChange();
      return currentProject;
    }

    const hydrated = await hydrateProjectRuntimeFromDisk(currentProject.projectFilePath);
    deletedDocumentIdentities = new Set();
    currentProject.documents = hydrated.documents;
    currentProject.raw = hydrated.raw;
    currentProject.project = hydrated.project;
    currentProject.projectFilePath = hydrated.projectFilePath;

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

  function replaceDocumentRecord(nextRecord) {
    if (!currentProject) {
      return null;
    }

    if (!nextRecord?.moduleId || !nextRecord?.path || !nextRecord?.document) {
      return null;
    }

    const moduleDocuments = currentProject.documents[nextRecord.moduleId];

    const nextIdentityKey = getDocumentIdentityKey(nextRecord);

    if (nextIdentityKey && deletedDocumentIdentities.has(nextIdentityKey)) {
      return null;
    }

    if (!Array.isArray(moduleDocuments)) {
      return null;
    }

    let index = moduleDocuments.findIndex((entry) => entry.path === nextRecord.path);

    if (index < 0 && nextIdentityKey) {
      index = moduleDocuments.findIndex((entry) => getDocumentIdentityKey(entry) === nextIdentityKey);
    }

    if (index < 0) {
      return null;
    }

    moduleDocuments[index] = nextRecord;
    moduleDocuments.sort((a, b) => getDocumentName(a).localeCompare(getDocumentName(b)));
    setDirty(true);
    return moduleDocuments.find((entry) => getDocumentIdentityKey(entry) === getDocumentIdentityKey(nextRecord) || entry.path === nextRecord.path) || null;
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

    const previousPath = record.path;
    let nextPath = previousPath;

    if (currentProject.rootPath && !String(previousPath).startsWith('unsaved://')) {
      const module = moduleRegistry.getModule(record.moduleId);
      const moduleFolder = getModuleFolder(record.moduleId);
      const renamedDocument = cloneDocumentPayload(record.document);
      setDocumentName({ document: renamedDocument }, resolvedName);

      const nextFileName = module.getFileName(renamedDocument);
      nextPath = joinPaths(currentProject.rootPath, moduleFolder, nextFileName);

      if (nextPath !== previousPath) {
        const hasPhysicalSource = await fileSystem.exists(previousPath);

        if (hasPhysicalSource) {
          await fileSystem.rename(previousPath, nextPath);
        }
      }
    }

    // Финализируем runtime только после того, как стало ясно,
    // что файловая операция либо не нужна, либо уже успешно выполнена.
    setDocumentName(record, resolvedName);

    if (nextPath !== previousPath) {
      record.path = nextPath;
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

  // INTERNAL:
  // saveDocument() сохраняет на диск YAML одного документа.
  // Это не пользовательская операция сохранения.
  // Она не выполняет project-level commit и не сбрасывает общий dirty-state проекта.
  // Clean state проекта устанавливается только после успешного saveProject()/saveProjectAs().
  async function saveDocument(documentRecord) {
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

  async function saveDocumentSnapshot(stagingPath, documentRecord) {
    if (!stagingPath || !documentRecord?.document) {
      throw new Error('Invalid save document snapshot payload');
    }

    await documentLoader.saveYaml(stagingPath, documentRecord.document);
  }

  async function deleteDocument(targetPath) {
    if (!currentProject) {
      return false;
    }

    const record = getDocumentByPath(targetPath);

    if (!record) {
      return false;
    }

    const identityKey = getDocumentIdentityKey(record);

    currentProject.documents[record.moduleId] = currentProject.documents[record.moduleId].filter((entry) => entry.path !== targetPath);

    if (identityKey) {
      deletedDocumentIdentities.add(identityKey);
    }

    if (currentProject.rootPath && !String(targetPath).startsWith('unsaved://')) {
      await fileSystem.deleteFile(targetPath);
    }

    setDirty(true);
    logger.info('project', 'Документ удалён', { path: targetPath });
    return true;
  }

  async function saveProjectToRoot(targetProjectFilePath, openDocuments = []) {
    if (!currentProject) {
      throw new Error('Project is not opened');
    }

    // Пользователь сохраняет проект целиком.
    // Project save orchestrates document-level saves for all current documents,
    // затем выполняет commit project state и переводит проект в clean state.

    // Critical transactional path:
    // project save stages document snapshots, commits module folders and project.yaml,
    // rolls back already promoted entities on failure, then hydrates runtime from disk.
    // Any changes here require save/save-as/rollback/reopen verification.

    // collect documents: openDocuments имеет приоритет над snapshot в currentProject.documents.
    const recordsByIdentity = new Map();

    const isDeletedRecord = (record) => {
      const identityKey = getDocumentIdentityKey(record);
      return Boolean(identityKey && deletedDocumentIdentities.has(identityKey));
    };

    for (const record of getAllDocuments()) {
      if (isDeletedRecord(record)) {
        continue;
      }
      const identityKey = getDocumentIdentityKey(record);

      if (!identityKey) {
        continue;
      }

      recordsByIdentity.set(identityKey, record);
    }

    for (const record of openDocuments) {
      if (!record?.document || isDeletedRecord(record)) {
        continue;
      }

      const identityKey = getDocumentIdentityKey(record);

      if (!identityKey) {
        continue;
      }

      recordsByIdentity.set(identityKey, record);
    }

    const docs = Array.from(recordsByIdentity.values());

    // prepare payload
    const projectOwnedPaths = getProjectOwnedPaths(targetProjectFilePath);
    const normalizedTargetProjectFilePath = projectOwnedPaths.projectFilePath;
    const targetRoot = projectOwnedPaths.rootPath;
    const targetProjectFileName = projectOwnedPaths.projectFileName;
    const moduleFolders = Object.values(projectOwnedPaths.moduleFolders);

    await ensureProjectDirectories(targetRoot);

    const targetProjectName = getProjectDisplayNameFromFilePath(normalizedTargetProjectFilePath);
    currentProject.project.name = targetProjectName;
    currentProject.raw.project = {
      ...(currentProject.raw.project || {}),
      ...currentProject.project,
      name: targetProjectName
    };

    const finalProjectPayload = {
      ...currentProject.raw,
      project: currentProject.project
    };

    // prepare staging
    const stagingRoot = buildSaveStagingRoot(targetRoot);
    const pathMap = new Map();
    const occupied = new Set();
    const promotedModules = [];
    let projectFilePromoted = false;

    // Не удаляем текущие YAML заранее.
    // Сначала полностью пишем новое состояние в staging, затем подменяем папки модулей.
    // Это снижает риск частично пустого проекта при ошибке записи.
    await removeDirectoryIfExists(stagingRoot);

    for (const moduleFolder of moduleFolders) {
      await fileSystem.ensureDir(buildModuleStagingDir(targetRoot, moduleFolder));
    }

    // stage document files
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

      await saveDocumentSnapshot(stagingPath, record);
      pathMap.set(record.path, finalPath);
    }

    // stage project.yaml
    const stagingProjectFilePath = joinPaths(stagingRoot, targetProjectFileName);
    await documentLoader.saveYaml(stagingProjectFilePath, finalProjectPayload);

    // commit promoted entities
    try {
      for (const moduleFolder of moduleFolders) {
        await promoteModuleDirectory(targetRoot, moduleFolder);
        promotedModules.push(moduleFolder);
      }

      await promoteProjectFile(targetRoot, targetProjectFileName);
      projectFilePromoted = true;
    } catch (error) {
      // rollback on failure
      await performSaveRollback(projectOwnedPaths, promotedModules, projectFilePromoted, error);
    }

    // cleanup (best-effort только после полного успешного commit)
    await cleanupSaveBackups(projectOwnedPaths).catch((error) => {
      logger.warn('project', 'Cleanup backup-файлов завершился с ошибкой', {
        targetRoot,
        message: error?.message || String(error)
      });
    });
    await cleanupSaveStaging(targetRoot).catch((error) => {
      logger.warn('project', 'Cleanup staging завершился с ошибкой', {
        targetRoot,
        message: error?.message || String(error)
      });
    });

    // hydrate runtime
    const hydrated = await hydrateProjectRuntimeFromDisk(normalizedTargetProjectFilePath);
    currentProject = hydrated;
    deletedDocumentIdentities = new Set();

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

    if (!currentProject.rootPath || !currentProject.projectFilePath) {
      return null;
    }

    const result = await saveProjectToRoot(currentProject.projectFilePath, openDocuments);
    return result;
  }

  async function saveProjectAs(newProjectFilePath, openDocuments = []) {
    const normalizedProjectFilePath = normalizeProjectFilePath(newProjectFilePath);

    const result = await saveProjectToRoot(normalizedProjectFilePath, openDocuments);
    logger.info('project', 'Проект сохранен как', {
      rootPath: getProjectRootFromProjectFile(normalizedProjectFilePath),
      projectFilePath: normalizedProjectFilePath
    });
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
    replaceDocumentRecord,
    createDocument,
    renameDocument,
    getNextMetaGenDefaultName,
    isMetaGenNameTaken,
    saveDocument,
    saveProject,
    saveProjectAs,
    deleteDocument,
    markDocumentDirty,
    hasDirtyProject: () => Boolean(currentProject?.isDirty),
    clearDirty
  };
}
