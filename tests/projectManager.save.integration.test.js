import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import YAML from 'yaml';

import { createProjectManager } from '../renderer/core/projectManager.js';
import { createModuleRegistry } from '../renderer/core/moduleRegistry.js';
import { createMetaGenDocument } from '../renderer/modules/metagen/metagenDocumentFactory.js';
import { createMetaLabDocument } from '../renderer/modules/metalab/metalabDocumentFactory.js';
import { createMetaViewDocument } from '../renderer/modules/metaview/metaviewDocumentFactory.js';
import { slugifyDocumentName } from '../renderer/runtime/naming.js';

function createLogger() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {}
  };
}

function createFileSystem({ failRename } = {}) {
  return {
    openProjectDialog: async () => null,
    requestAppQuit: async () => true,
    saveProjectAsDialog: async () => null,
    ensureDir: async (targetPath) => fs.mkdir(targetPath, { recursive: true }),
    exists: async (targetPath) => {
      try {
        await fs.access(targetPath);
        return true;
      } catch {
        return false;
      }
    },
    readText: async (targetPath) => fs.readFile(targetPath, 'utf-8'),
    writeText: async (targetPath, text) => {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, text, 'utf-8');
    },
    rename: async (fromPath, toPath) => {
      if (failRename?.(fromPath, toPath)) {
        throw new Error(`Injected rename failure: ${fromPath} -> ${toPath}`);
      }
      await fs.rename(fromPath, toPath);
    },
    deleteFile: async (targetPath) => {
      await fs.rm(targetPath, { force: true });
    },
    deleteDir: async (targetPath) => {
      await fs.rm(targetPath, { recursive: true, force: true });
    },
    listFiles: async (targetDir, extensions = []) => {
      const entries = await fs.readdir(targetDir, { withFileTypes: true }).catch(() => []);
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(targetDir, entry.name))
        .filter((filePath) => {
          if (!extensions.length) return true;
          return extensions.some((ext) => filePath.endsWith(ext));
        });
    },
    onMenuAction: () => () => {}
  };
}

async function createFixtureProject(root, { metagenDescription = 'before-save' } = {}) {
  await fs.mkdir(path.join(root, 'metagen'), { recursive: true });
  await fs.mkdir(path.join(root, 'metalab'), { recursive: true });
  await fs.mkdir(path.join(root, 'metaview'), { recursive: true });
  await fs.mkdir(path.join(root, 'generated'), { recursive: true });

  const project = {
    kind: 'metaplatform.project',
    version: 1,
    project: { id: 'p1', name: 'Fixture project', description: '' },
    modules: ['MetaGen', 'MetaLab', 'MetaView'],
    paths: { metagen: 'metagen', metalab: 'metalab', metaview: 'metaview', generated: 'generated' }
  };

  const metagenDoc = {
    kind: 'metagen.component',
    version: 1,
    component: { id: 'pump', name: 'Pump', type: 'FB', module: 'Main', description: metagenDescription },
    params: { format: 'header-plus-rows', header: [], rows: [] },
    data: { format: 'table', columns: [], rows: [] },
    instances: { format: 'list', rows: [] },
    code: { format: 'template-text', language: 'st-template', text: '' },
    generation: { engine: 'structured-text', entrypoint: 'Main', mode: 'component', output: { language: 'st', fileName: 'pump.st' } },
    meta: { author: '', importedFrom: '', importedSheet: '' }
  };

  const metalabDoc = { kind: 'metalab.scenario', version: 1, scenario: { id: 'startup', name: 'Startup' } };
  const metaviewDoc = { kind: 'metaview.screen', version: 1, screen: { id: 'main', name: 'Main' } };

  await fs.writeFile(path.join(root, 'project.yaml'), YAML.stringify(project), 'utf-8');
  await fs.writeFile(path.join(root, 'metagen', 'pump.yaml'), YAML.stringify(metagenDoc), 'utf-8');
  await fs.writeFile(path.join(root, 'metalab', 'startup.yaml'), YAML.stringify(metalabDoc), 'utf-8');
  await fs.writeFile(path.join(root, 'metaview', 'main.yaml'), YAML.stringify(metaviewDoc), 'utf-8');
}

function createManager({ failRename } = {}) {
  const logger = createLogger();
  const moduleRegistry = createModuleRegistry({ logger });
  moduleRegistry.registerModule({
    id: 'metagen',
    name: 'MetaGen',
    documentKinds: ['metagen.component'],
    createDefaultDocument: ({ name }) => createMetaGenDocument({ name }),
    getFileName: (document) => `${slugifyDocumentName(document?.component?.name || 'new_component')}.yaml`
  });
  moduleRegistry.registerModule({
    id: 'metalab',
    name: 'MetaLab',
    documentKinds: ['metalab.scenario'],
    createDefaultDocument: ({ name }) => createMetaLabDocument({ name }),
    getFileName: (document) => `${slugifyDocumentName(document?.scenario?.name || 'new_scenario')}.yaml`
  });
  moduleRegistry.registerModule({
    id: 'metaview',
    name: 'MetaView',
    documentKinds: ['metaview.screen'],
    createDefaultDocument: ({ name }) => createMetaViewDocument({ name }),
    getFileName: (document) => `${slugifyDocumentName(document?.screen?.name || 'new_screen')}.yaml`
  });

  return createProjectManager({
    logger,
    fileSystem: createFileSystem({ failRename }),
    moduleRegistry,
    onProjectLoaded: () => {},
    onProjectClosed: () => {}
  });
}

test('save existing project updates disk and reopens clean runtime', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-existing-'));
  await createFixtureProject(root);

  const manager = createManager();
  await manager.openProject(root);
  const record = manager.getDocumentsByModule('metagen')[0];
  record.document.component.description = 'after-save';

  await manager.saveProject();

  const savedText = await fs.readFile(path.join(root, 'metagen', 'pump.yaml'), 'utf-8');
  assert.match(savedText, /after-save/);

  await manager.closeProject();
  await manager.openProject(root);
  const reopened = manager.getDocumentsByModule('metagen')[0];
  assert.equal(reopened.document.component.description, 'after-save');
  assert.equal(manager.hasDirtyProject(), false);
});

test('save as writes project into new root', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-as-src-'));
  const targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-as-dst-'));
  await createFixtureProject(root);

  const manager = createManager();
  await manager.openProject(root);
  const record = manager.getDocumentsByModule('metalab')[0];
  record.document.scenario.name = 'Startup updated';

  await manager.saveProjectAs(targetRoot);

  const newProjectText = await fs.readFile(path.join(targetRoot, 'project.yaml'), 'utf-8');
  const newScenarioText = await fs.readFile(path.join(targetRoot, 'metalab', 'startup_updated.yaml'), 'utf-8');
  assert.match(newProjectText, /project:/);
  assert.match(newScenarioText, /Startup updated/);
});

test('rollback restores promoted modules if module promote fails', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rollback-module-'));
  await createFixtureProject(root, { metagenDescription: 'stable-before-failure' });

  const manager = createManager({
    failRename: (fromPath) => fromPath.endsWith(path.join('.save-staging', 'metalab'))
  });

  await manager.openProject(root);
  const record = manager.getDocumentsByModule('metagen')[0];
  record.document.component.description = 'should-not-commit';

  await assert.rejects(() => manager.saveProject(), /Injected rename failure/);

  const metagenText = await fs.readFile(path.join(root, 'metagen', 'pump.yaml'), 'utf-8');
  assert.match(metagenText, /stable-before-failure/);
  assert.doesNotMatch(metagenText, /should-not-commit/);
});

test('rollback restores module changes if project.yaml promote fails', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rollback-project-file-'));
  await createFixtureProject(root, { metagenDescription: 'before-yaml-promote-failure' });

  const manager = createManager({
    failRename: (fromPath) => fromPath.endsWith(path.join('.save-staging', 'project.yaml'))
  });

  await manager.openProject(root);
  const record = manager.getDocumentsByModule('metagen')[0];
  record.document.component.description = 'must-be-rolled-back';

  await assert.rejects(() => manager.saveProject(), /Injected rename failure/);

  const metagenText = await fs.readFile(path.join(root, 'metagen', 'pump.yaml'), 'utf-8');
  assert.match(metagenText, /before-yaml-promote-failure/);
  assert.doesNotMatch(metagenText, /must-be-rolled-back/);
});

test('openDocuments snapshot overrides currentProject documents during save', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-open-doc-override-'));
  await createFixtureProject(root, { metagenDescription: 'disk-version' });

  const manager = createManager();
  await manager.openProject(root);
  const record = manager.getDocumentsByModule('metagen')[0];

  const openDocumentRecord = {
    moduleId: 'metagen',
    path: record.path,
    document: {
      ...record.document,
      component: {
        ...record.document.component,
        description: 'open-document-version'
      }
    }
  };

  await manager.saveProject([openDocumentRecord]);

  const metagenText = await fs.readFile(path.join(root, 'metagen', 'pump.yaml'), 'utf-8');
  assert.match(metagenText, /open-document-version/);
});
