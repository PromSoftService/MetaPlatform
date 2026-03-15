import { APP_CONFIG } from '../../config/app-config.js';

export function joinProjectPath(...parts) {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/');
}

export function getFileExtension(fileName) {
  const normalized = String(fileName || '');
  const lastDotIndex = normalized.lastIndexOf('.');
  return lastDotIndex > 0 ? normalized.slice(lastDotIndex) : '';
}

export function stripFileExtension(fileName) {
  const normalized = String(fileName || '');
  const lastDotIndex = normalized.lastIndexOf('.');
  return lastDotIndex > 0 ? normalized.slice(0, lastDotIndex) : normalized;
}

export function dirnameOf(targetPath) {
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

export function normalizeProjectFilePath(projectFilePath) {
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

export function getProjectRootFromProjectFile(projectFilePath) {
  const root = dirnameOf(projectFilePath);
  return root || '.';
}

export function buildProjectFilePath(projectRoot, projectFileName = APP_CONFIG.project.defaultProjectFileName) {
  return joinProjectPath(projectRoot, projectFileName);
}

export function getDefaultProjectModuleDirectories(projectRoot) {
  return {
    metagen: joinProjectPath(projectRoot, APP_CONFIG.project.folders[APP_CONFIG.project.moduleIds.metagen]),
    metalab: joinProjectPath(projectRoot, APP_CONFIG.project.folders[APP_CONFIG.project.moduleIds.metalab]),
    metaview: joinProjectPath(projectRoot, APP_CONFIG.project.folders[APP_CONFIG.project.moduleIds.metaview])
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
