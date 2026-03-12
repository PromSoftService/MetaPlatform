import path from 'node:path';
import { APP_CONFIG } from '../../config/app-config.js';
import { createDocumentLoader } from '../runtime/documentLoader.js';

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

function getDocumentName(documentRecord) {
  return normalizeDocumentName(
    documentRecord?.document?.component?.name
    || documentRecord?.document?.scenario?.name
    || documentRecord?.document?.screen?.name
    || documentRecord?.document?.name
    || ''
  );
}

function setDocumentName(documentRecord, nextName) {
  const value = normalizeDocumentName(nextName);

  if (documentRecord?.document?.component) {
    documentRecord.document.component.name = value;
    return;
  }

  if (documentRecord?.document?.scenario) {
    documentRecord.document.scenario.name = value;
    return;
  }

  if (documentRecord?.document?.screen) {
    documentRecord.document.screen.name = value;
    return;
  }

  if (documentRecord?.document) {
    documentRecord.document.name = value;
  }
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

    output.sort((a, b) =>
      String(a.document?.component?.name || a.document?.name || '').localeCompare(
        String(b.document?.component?.name || b.document?.name || '')
      )
    );

    return output;
  }

  async function ensureProjectDirectories(projectRoot) {
    await fileSystem.ensureDir(projectRoot);
    await fileSystem.ensureDir(joinPaths(projectRoot, APP_CONFIG.project.folders.metagen));
    await fileSystem.ensureDir(joinPaths(projectRoot, APP_CONFIG.project.folders.metalab));
    await fileSystem.ensureDir(joinPaths(projectRoot, APP_CONFIG.project.folders.metaview));
    await fileSystem.ensureDir(joinPaths(projectRoot, APP_CONFIG.project.folders.generated));
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

  async function openProject(projectRoot) {
    const projectFilePath = buildProjectFilePath(projectRoot);
    const exists = await fileSystem.exists(projectFilePath);

    if (!exists) {
      throw new Error(`project.yaml не найден: ${projectRoot}`);
    }

    const projectFile = await documentLoader.loadYaml(projectFilePath);

    currentProject = createProjectRuntime({
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

    currentProject.documents.metagen = await scanModuleDocuments(currentProject.rootPath, APP_CONFIG.project.folders.metagen, 'metagen');
    currentProject.documents.metalab = await scanModuleDocuments(currentProject.rootPath, APP_CONFIG.project.folders.metalab, 'metalab');
    currentProject.documents.metaview = await scanModuleDocuments(currentProject.rootPath, APP_CONFIG.project.folders.metaview, 'metaview');

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

  function isMetaGenNameTaken(name, excludePath = null) {
    if (!currentProject) {
      return false;
    }

    const normalizedTarget = normalizeDocumentName(name);

    if (!normalizedTarget) {
      return false;
    }

    return currentProject.documents.metagen.some((record) => {
      if (excludePath && record.path === excludePath) {
        return false;
      }

      return getDocumentName(record) === normalizedTarget;
    });
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

    const resolvedName = moduleId === 'metagen'
      ? normalizeDocumentName(name || getNextMetaGenDefaultName())
      : normalizeDocumentName(name);

    if (moduleId === 'metagen' && (!resolvedName || isMetaGenNameTaken(resolvedName))) {
      logger.warn('project', 'Имя компонента уже занято', { name: resolvedName });
      return null;
    }

    const document = module.createDefaultDocument({ name: resolvedName || name });
    const virtualPath = currentProject.rootPath
      ? joinPaths(currentProject.rootPath, getModuleFolder(moduleId), module.getFileName(document))
      : `unsaved://${moduleId}/${++unsavedCounter}.yaml`;

    const record = { moduleId, path: virtualPath, document };
    currentProject.documents[moduleId].push(record);
    currentProject.documents[moduleId].sort((a, b) =>
      String(a.document?.component?.name || a.document?.name || '').localeCompare(
        String(b.document?.component?.name || b.document?.name || '')
      )
    );

    setDirty(true);
    logger.info('project', 'Создан документ', { moduleId, path: virtualPath, name });
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

    if (record.moduleId === 'metagen' && isMetaGenNameTaken(resolvedName, targetPath)) {
      logger.warn('project', 'Имя компонента уже занято', { name: resolvedName });
      return null;
    }

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

  async function saveProjectToRoot(targetRoot, openDocuments = []) {
    if (!currentProject) {
      throw new Error('Project is not opened');
    }

    const recordsByPath = new Map(getAllDocuments().map((record) => [record.path, record]));

    for (const record of openDocuments) {
      if (record?.path && record?.document) {
        recordsByPath.set(record.path, record);
      }
    }

    const docs = Array.from(recordsByPath.values());

    await ensureProjectDirectories(targetRoot);
    await documentLoader.saveYaml(buildProjectFilePath(targetRoot), {
      ...currentProject.raw,
      project: currentProject.project
    });

    const occupied = new Set();
    const pathMap = new Map();

    for (const record of docs) {
      const module = moduleRegistry.getModule(record.moduleId);
      const moduleFolder = getModuleFolder(record.moduleId);
      let fileName = module.getFileName(record.document);
      const ext = path.extname(fileName) || '.yaml';
      const base = ext ? fileName.slice(0, -ext.length) : fileName;
      let index = 1;

      while (occupied.has(`${moduleFolder}/${fileName}`)) {
        fileName = `${base}-${index}${ext}`;
        index += 1;
      }

      occupied.add(`${moduleFolder}/${fileName}`);

      const nextPath = joinPaths(targetRoot, moduleFolder, fileName);
      pathMap.set(record.path, nextPath);
      record.path = nextPath;
      await documentLoader.saveYaml(nextPath, record.document);
    }

    currentProject.rootPath = targetRoot;
    currentProject.projectFilePath = buildProjectFilePath(targetRoot);
    currentProject.isUnsaved = false;
    currentProject.isDirty = false;

    currentProject.documents.metagen = docs.filter((entry) => entry.moduleId === 'metagen');
    currentProject.documents.metalab = docs.filter((entry) => entry.moduleId === 'metalab');
    currentProject.documents.metaview = docs.filter((entry) => entry.moduleId === 'metaview');

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

    const result = await saveProjectToRoot(currentProject.rootPath, openDocuments);
    return result;
  }

  async function saveProjectAs(newProjectRoot, openDocuments = []) {
    const result = await saveProjectToRoot(newProjectRoot, openDocuments);
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
    saveDocument,
    saveProject,
    saveProjectAs,
    deleteDocument,
    markDocumentDirty,
    hasDirtyProject: () => Boolean(currentProject?.isDirty),
    clearDirty
  };
}
