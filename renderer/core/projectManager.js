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

function buildModuleDir(projectRoot, moduleFolder) {
  return joinPaths(projectRoot, moduleFolder);
}

function getModuleFolder(moduleId) {
  const folderMap = {
    metagen: APP_CONFIG.project.folders.metagen,
    metalab: APP_CONFIG.project.folders.metalab,
    metaview: APP_CONFIG.project.folders.metaview
  };

  return folderMap[moduleId] || null;
}

export function createProjectManager({
  logger,
  fileSystem,
  moduleRegistry,
  onProjectLoaded,
  onProjectClosed
}) {
  const documentLoader = createDocumentLoader({ fileSystem });
  let currentProject = null;
  const listeners = new Set();

  function emitChange() {
    for (const listener of listeners) {
      listener(currentProject);
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  async function ensureProjectStructure(projectRoot) {
    await fileSystem.ensureDir(projectRoot);
    await fileSystem.ensureDir(buildModuleDir(projectRoot, APP_CONFIG.project.folders.metagen));
    await fileSystem.ensureDir(buildModuleDir(projectRoot, APP_CONFIG.project.folders.metalab));
    await fileSystem.ensureDir(buildModuleDir(projectRoot, APP_CONFIG.project.folders.metaview));
    await fileSystem.ensureDir(buildModuleDir(projectRoot, APP_CONFIG.project.folders.generated));

    const projectFilePath = buildProjectFilePath(projectRoot);
    const exists = await fileSystem.exists(projectFilePath);

    if (!exists) {
      await documentLoader.saveYaml(projectFilePath, {
        kind: APP_CONFIG.project.projectKinds.root,
        version: 1,
        project: {
          id: 'demo_feedmill',
          name: 'Demo Feedmill',
          description: 'Demo project for MetaPlatform'
        },
        modules: ['MetaGen', 'MetaLab', 'MetaView'],
        paths: {
          metagen: APP_CONFIG.project.folders.metagen,
          metalab: APP_CONFIG.project.folders.metalab,
          metaview: APP_CONFIG.project.folders.metaview,
          generated: APP_CONFIG.project.folders.generated
        }
      });
    }
  }

  async function scanModuleDocuments(projectRoot, moduleFolder, moduleId) {
    const dir = buildModuleDir(projectRoot, moduleFolder);
    const paths = await fileSystem.listFiles(dir, APP_CONFIG.project.fileExtensions.yaml);
    const output = [];

    for (const filePath of paths) {
      try {
        const loaded = await documentLoader.loadYaml(filePath);

        if (!loaded.data || typeof loaded.data !== 'object') {
          logger.warn('project', 'Пропущен пустой документ', { path: filePath });
          continue;
        }

        const module = moduleRegistry.findModuleByDocumentKind(loaded.data.kind);

        if (!module) {
          logger.warn('project', 'Пропущен документ с неизвестным kind', {
            path: filePath,
            kind: loaded.data.kind
          });
          continue;
        }

        if (module.id !== moduleId) {
          continue;
        }

        output.push({
          moduleId,
          path: filePath,
          document: loaded.data
        });
      } catch (error) {
        logger.warn('project', 'Ошибка чтения документа, файл пропущен', {
          path: filePath,
          message: error?.message || String(error)
        });
      }
    }

    output.sort((a, b) =>
      String(a.document?.component?.name || a.document?.name || '')
        .localeCompare(String(b.document?.component?.name || b.document?.name || ''))
    );

    return output;
  }

  async function openProject(projectRoot) {
    await ensureProjectStructure(projectRoot);

    const projectFilePath = buildProjectFilePath(projectRoot);
    const projectFile = await documentLoader.loadYaml(projectFilePath);

    currentProject = {
      rootPath: projectRoot,
      projectFilePath,
      project: projectFile.data.project,
      raw: projectFile.data,
      documents: {
        metagen: await scanModuleDocuments(projectRoot, APP_CONFIG.project.folders.metagen, 'metagen'),
        metalab: await scanModuleDocuments(projectRoot, APP_CONFIG.project.folders.metalab, 'metalab'),
        metaview: await scanModuleDocuments(projectRoot, APP_CONFIG.project.folders.metaview, 'metaview')
      }
    };

    if (typeof onProjectLoaded === 'function') {
      onProjectLoaded({ projectRuntime: currentProject });
    }

    emitChange();
    return currentProject;
  }

  async function closeProject() {
    currentProject = null;
    emitChange();

    if (typeof onProjectClosed === 'function') {
      onProjectClosed();
    }
  }

  async function refresh() {
    if (!currentProject) {
      return null;
    }

    currentProject.documents.metagen = await scanModuleDocuments(
      currentProject.rootPath,
      APP_CONFIG.project.folders.metagen,
      'metagen'
    );

    currentProject.documents.metalab = await scanModuleDocuments(
      currentProject.rootPath,
      APP_CONFIG.project.folders.metalab,
      'metalab'
    );

    currentProject.documents.metaview = await scanModuleDocuments(
      currentProject.rootPath,
      APP_CONFIG.project.folders.metaview,
      'metaview'
    );

    emitChange();
    return currentProject;
  }

  async function scanProjectDocuments() {
    return refresh();
  }

  function getDocumentsByModule(moduleId) {
    if (!currentProject) {
      return [];
    }

    return currentProject.documents[moduleId] || [];
  }

  async function createDocument(moduleId, name) {
    if (!currentProject) {
      throw new Error('Project is not opened');
    }

    const module = moduleRegistry.getModule(moduleId);

    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    const document = module.createDefaultDocument({ name });
    const fileName = module.getFileName(document);
    const moduleFolder = getModuleFolder(moduleId);

    if (!moduleFolder) {
      throw new Error(`Unsupported module id: ${moduleId}`);
    }

    const fullPath = joinPaths(currentProject.rootPath, moduleFolder, fileName);

    await documentLoader.saveYaml(fullPath, document);
    logger.info('project', 'Создан документ', { moduleId, path: fullPath, name });

    await refresh();
    return getDocumentByPath(fullPath);
  }

  function getDocumentByPath(targetPath) {
    if (!currentProject) {
      return null;
    }

    const allDocuments = [
      ...currentProject.documents.metagen,
      ...currentProject.documents.metalab,
      ...currentProject.documents.metaview
    ];

    return allDocuments.find((entry) => entry.path === targetPath) || null;
  }

  async function saveDocument(documentRecord) {
    if (!documentRecord?.path || !documentRecord?.document) {
      throw new Error('Invalid document record');
    }

    await documentLoader.saveYaml(documentRecord.path, documentRecord.document);
    logger.info('project', 'Документ сохранён', { path: documentRecord.path });
    await refresh();
    return true;
  }

  async function deleteDocument(targetPath) {
    const record = getDocumentByPath(targetPath);

    if (!record) {
      return false;
    }

    await fileSystem.deleteFile(record.path);
    logger.info('project', 'Документ удалён', { path: record.path });
    await refresh();
    return true;
  }

  async function saveProjectAs(newProjectRoot) {
    if (!currentProject) {
      throw new Error('Project is not opened');
    }

    const sourceRoot = currentProject.rootPath;
    await ensureProjectStructure(newProjectRoot);
    const sourceFiles = await fileSystem.listFiles(sourceRoot);

    for (const sourcePath of sourceFiles) {
      const relativePath = path.relative(sourceRoot, sourcePath);
      const targetPath = joinPaths(newProjectRoot, relativePath);
      const content = await fileSystem.readText(sourcePath);
      await fileSystem.writeText(targetPath, content);
    }

    await openProject(newProjectRoot);
    logger.info('project', 'Проект сохранен как', { from: sourceRoot, to: newProjectRoot });
    return currentProject;
  }

  return {
    openProject,
    closeProject,
    refresh,
    subscribe,
    scanProjectDocuments,
    getCurrentProject: () => currentProject,
    getMetaGenDocuments: () => currentProject?.documents?.metagen || [],
    getDocumentsByModule,
    getDocumentByPath,
    createDocument,
    saveDocument,
    saveProjectAs,
    deleteDocument
  };
}
