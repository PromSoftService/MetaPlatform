import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import YAML from 'yaml';

import { createProjectManager, getProjectOwnedPaths } from '../renderer/core/projectManager.js';
import { createModuleRegistry } from '../renderer/core/moduleRegistry.js';
import { createMetaGenDocument } from '../renderer/modules/metagen/metagenDocumentFactory.js';
import { createMetaLabDocument } from '../renderer/modules/metalab/metalabDocumentFactory.js';
import { createMetaViewDocument } from '../renderer/modules/metaview/metaviewDocumentFactory.js';
import { slugifyDocumentName } from '../renderer/runtime/naming.js';
import { getDocumentIdentityKey } from '../renderer/runtime/documentRecordIdentity.js';
import { createWorkbenchTabs } from '../renderer/ui/createWorkbenchTabs.js';
import { APP_CONFIG } from '../config/app-config.js';

function createLogger() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {}
  };
}

function createFileSystem({ failRename, onRename } = {}) {
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
      onRename?.(fromPath, toPath);

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

async function createFixtureProject(root, { metagenDescription = 'before-save', projectFileName = APP_CONFIG.project.defaultProjectFileName } = {}) {
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

  await fs.writeFile(path.join(root, projectFileName), YAML.stringify(project), 'utf-8');
  await fs.writeFile(path.join(root, 'metagen', 'pump.yaml'), YAML.stringify(metagenDoc), 'utf-8');
  await fs.writeFile(path.join(root, 'metalab', 'startup.yaml'), YAML.stringify(metalabDoc), 'utf-8');
  await fs.writeFile(path.join(root, 'metaview', 'main.yaml'), YAML.stringify(metaviewDoc), 'utf-8');
}

function getProjectFilePath(root, fileName = APP_CONFIG.project.defaultProjectFileName) {
  return path.join(root, fileName);
}



function createFakeElement(tagName) {
  const node = {
    tagName,
    children: [],
    parentNode: null,
    dataset: {},
    textContent: '',
    type: '',
    tabIndex: 0,
    attributes: new Map(),
    listeners: new Map(),
    classList: {
      values: new Set(),
      add(className) {
        this.values.add(className);
      },
      toggle(className, force) {
        if (force) {
          this.values.add(className);
          return;
        }

        this.values.delete(className);
      }
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    remove() {
      if (!this.parentNode) {
        return;
      }

      this.parentNode.children = this.parentNode.children.filter((entry) => entry !== this);
      this.parentNode = null;
    },
    querySelector(selector) {
      if (!selector.startsWith('.')) {
        return null;
      }

      const className = selector.slice(1);
      const queue = [...this.children];

      while (queue.length) {
        const next = queue.shift();

        if (next.classList?.values?.has(className)) {
          return next;
        }

        queue.push(...(next.children || []));
      }

      return null;
    },
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    replaceWith(nextNode) {
      if (!this.parentNode) {
        return;
      }

      const index = this.parentNode.children.indexOf(this);

      if (index < 0) {
        return;
      }

      nextNode.parentNode = this.parentNode;
      this.parentNode.children[index] = nextNode;
      this.parentNode = null;
    },
    focus() {},
    select() {}
  };

  return node;
}

function createFakeDocument() {
  const nodesById = new Map();
  const tabsList = createFakeElement('div');
  const editorHost = createFakeElement('div');
  nodesById.set(APP_CONFIG.ui.dom.tabsListId, tabsList);
  nodesById.set(APP_CONFIG.ui.dom.editorHostId, editorHost);

  return {
    document: {
      createElement: (tagName) => createFakeElement(tagName),
      getElementById: (id) => nodesById.get(id) || null
    },
    tabsList,
    editorHost
  };
}

function createManager({ failRename, onRename } = {}) {
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
    fileSystem: createFileSystem({ failRename, onRename }),
    moduleRegistry,
    onProjectLoaded: () => {},
    onProjectClosed: () => {}
  });
}

test('save existing project preserves exact project file path', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-existing-'));
  await createFixtureProject(root, { projectFileName: 'qqq.yaml' });

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root, 'qqq.yaml'));
  const record = manager.getDocumentsByModule('metagen')[0];
  record.document.component.description = 'after-save';

  await manager.saveProject();

  const savedText = await fs.readFile(path.join(root, 'metagen', 'pump.yaml'), 'utf-8');
  assert.match(savedText, /after-save/);

  await manager.closeProject();
  await manager.openProject(getProjectFilePath(root, 'qqq.yaml'));
  const reopened = manager.getDocumentsByModule('metagen')[0];
  assert.equal(reopened.document.component.description, 'after-save');
  assert.equal(manager.hasDirtyProject(), false);
  assert.equal(manager.getCurrentProject().rootPath, root.replace(/\\/g, '/'));
  assert.equal(manager.getCurrentProject().projectFilePath, getProjectFilePath(root, 'qqq.yaml').replace(/\\/g, '/'));
  assert.equal(manager.getCurrentProject().project.name, 'qqq');
  assert.equal(await fs.access(path.join(root, 'project.yaml')).then(() => true).catch(() => false), false);
});

test('save as writes project into new root', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-as-src-'));
  const targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-as-dst-'));
  await createFixtureProject(root, { projectFileName: 'qqq.yaml' });

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root, 'qqq.yaml'));
  const record = manager.getDocumentsByModule('metalab')[0];
  record.document.scenario.name = 'Startup updated';

  await manager.saveProjectAs(getProjectFilePath(targetRoot));

  const newProjectText = await fs.readFile(path.join(targetRoot, 'project.yaml'), 'utf-8');
  const newScenarioText = await fs.readFile(path.join(targetRoot, 'metalab', 'startup_updated.yaml'), 'utf-8');
  assert.match(newProjectText, /project:/);
  assert.match(newScenarioText, /Startup updated/);
  assert.equal(manager.getCurrentProject().rootPath, targetRoot.replace(/\\/g, '/'));
  assert.equal(manager.getCurrentProject().projectFilePath, getProjectFilePath(targetRoot).replace(/\\/g, '/'));
});

test('openProject keeps exact selected project file name', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-open-file-path-'));
  await createFixtureProject(root, { projectFileName: 'qqq.yaml' });
  const manager = createManager();

  await manager.openProject(getProjectFilePath(root, 'qqq.yaml'));
  const current = manager.getCurrentProject();

  assert.equal(current.rootPath, root.replace(/\\/g, '/'));
  assert.equal(current.projectFilePath, getProjectFilePath(root, 'qqq.yaml').replace(/\\/g, '/'));
  assert.equal(current.project.name, 'qqq');
});

test('open/save-as reject folder-oriented ambiguity at project manager API', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-open-folder-reject-'));
  await createFixtureProject(root);
  const manager = createManager();

  await assert.rejects(() => manager.openProject(root), /must point to a YAML file/);
  await manager.openProject(getProjectFilePath(root));
  await assert.rejects(() => manager.saveProjectAs(root), /must point to a YAML file/);
});

test('save as preserves selected yaml file name', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-as-normalize-src-'));
  const targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-as-normalize-dst-'));
  await createFixtureProject(root);
  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const targetProjectFilePath = path.join(targetRoot, 'custom-name.yaml');
  await manager.saveProjectAs(targetProjectFilePath);

  const expectedProjectFile = targetProjectFilePath;
  const expectedMetaGenFile = path.join(targetRoot, 'metagen', 'pump.yaml');
  const expectedMetaLabFile = path.join(targetRoot, 'metalab', 'startup.yaml');
  const expectedMetaViewFile = path.join(targetRoot, 'metaview', 'main.yaml');

  assert.equal(await fs.access(expectedProjectFile).then(() => true).catch(() => false), true);
  assert.equal(await fs.access(expectedMetaGenFile).then(() => true).catch(() => false), true);
  assert.equal(await fs.access(expectedMetaLabFile).then(() => true).catch(() => false), true);
  assert.equal(await fs.access(expectedMetaViewFile).then(() => true).catch(() => false), true);
  assert.equal(manager.getCurrentProject().projectFilePath, expectedProjectFile.replace(/\\/g, '/'));
  assert.equal(await fs.access(path.join(targetRoot, 'project.yaml')).then(() => true).catch(() => false), false);
  assert.equal(manager.getCurrentProject().project.name, 'custom-name');
});



test('save as does not rename project from folder name', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-as-folder-name-src-'));
  const targetParent = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-as-folder-name-parent-'));
  const targetRoot = path.join(targetParent, '123');
  await fs.mkdir(targetRoot, { recursive: true });
  await createFixtureProject(root, { projectFileName: 'origin.yaml' });

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root, 'origin.yaml'));

  const targetPath = path.join(targetRoot, 'qqq.yaml');
  await manager.saveProjectAs(targetPath);

  assert.equal(manager.getCurrentProject().projectFilePath, targetPath.replace(/\\/g, '/'));
  assert.equal(manager.getCurrentProject().project.name, 'qqq');
});

test('getProjectOwnedPaths returns explicit project-owned contract', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-owned-contract-'));
  const projectFilePath = path.join(root, 'custom.yaml');

  const owned = getProjectOwnedPaths(projectFilePath);

  assert.equal(owned.rootPath, root.replace(/\\/g, '/'));
  assert.equal(owned.projectFileName, 'custom.yaml');
  assert.equal(owned.projectFilePath, projectFilePath.replace(/\\/g, '/'));
  assert.deepEqual(owned.moduleFolders, {
    metagen: 'metagen',
    metalab: 'metalab',
    metaview: 'metaview'
  });
  assert.deepEqual(owned.moduleDirectories, {
    metagen: path.join(root, 'metagen').replace(/\\/g, '/'),
    metalab: path.join(root, 'metalab').replace(/\\/g, '/'),
    metaview: path.join(root, 'metaview').replace(/\\/g, '/')
  });
  assert.equal('readmePath' in owned, false);
  assert.equal('manualPath' in owned, false);
});

test('save as replaces project-owned paths and keeps user-owned paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-owned-paths-src-'));
  const targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-owned-paths-dst-'));
  await createFixtureProject(root, { projectFileName: 'source.yaml' });

  await fs.writeFile(path.join(targetRoot, 'README.txt'), 'user-readme', 'utf-8');
  await fs.mkdir(path.join(targetRoot, 'manual'), { recursive: true });
  await fs.writeFile(path.join(targetRoot, 'manual', 'guide.txt'), 'user-guide', 'utf-8');

  await fs.mkdir(path.join(targetRoot, 'metagen'), { recursive: true });
  await fs.mkdir(path.join(targetRoot, 'metalab'), { recursive: true });
  await fs.mkdir(path.join(targetRoot, 'metaview'), { recursive: true });
  await fs.writeFile(path.join(targetRoot, 'metagen', 'old.yaml'), 'old', 'utf-8');
  await fs.writeFile(path.join(targetRoot, 'metalab', 'old.yaml'), 'old', 'utf-8');
  await fs.writeFile(path.join(targetRoot, 'metaview', 'old.yaml'), 'old', 'utf-8');
  await fs.writeFile(path.join(targetRoot, 'abc.yaml'), 'old-project', 'utf-8');

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root, 'source.yaml'));
  await manager.saveProjectAs(path.join(targetRoot, 'abc.yaml'));

  assert.equal(await fs.readFile(path.join(targetRoot, 'README.txt'), 'utf-8'), 'user-readme');
  assert.equal(await fs.readFile(path.join(targetRoot, 'manual', 'guide.txt'), 'utf-8'), 'user-guide');

  assert.equal(await fs.access(path.join(targetRoot, 'metagen', 'old.yaml')).then(() => true).catch(() => false), false);
  assert.equal(await fs.access(path.join(targetRoot, 'metalab', 'old.yaml')).then(() => true).catch(() => false), false);
  assert.equal(await fs.access(path.join(targetRoot, 'metaview', 'old.yaml')).then(() => true).catch(() => false), false);

  assert.equal(await fs.access(path.join(targetRoot, 'metagen', 'pump.yaml')).then(() => true).catch(() => false), true);
  assert.equal(await fs.access(path.join(targetRoot, 'metalab', 'startup.yaml')).then(() => true).catch(() => false), true);
  assert.equal(await fs.access(path.join(targetRoot, 'metaview', 'main.yaml')).then(() => true).catch(() => false), true);

  const projectText = await fs.readFile(path.join(targetRoot, 'abc.yaml'), 'utf-8');
  assert.match(projectText, /name: abc/);
});

test('save as does not do implicit full-root cleanup for unknown user-owned paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-no-root-cleanup-src-'));
  const targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-no-root-cleanup-dst-'));
  await createFixtureProject(root, { projectFileName: 'source.yaml' });

  await fs.writeFile(path.join(targetRoot, 'extra.txt'), 'keep-me', 'utf-8');
  await fs.mkdir(path.join(targetRoot, 'docs'), { recursive: true });
  await fs.writeFile(path.join(targetRoot, 'docs', 'manual.md'), 'keep-docs', 'utf-8');

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root, 'source.yaml'));
  await manager.saveProjectAs(path.join(targetRoot, 'target.yaml'));

  assert.equal(await fs.readFile(path.join(targetRoot, 'extra.txt'), 'utf-8'), 'keep-me');
  assert.equal(await fs.readFile(path.join(targetRoot, 'docs', 'manual.md'), 'utf-8'), 'keep-docs');
});


test('rename of unsaved component with future project path skips fs.rename and updates runtime path', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rename-unsaved-skip-fs-'));
  await createFixtureProject(root);

  const renameCalls = [];
  const manager = createManager({
    onRename: (fromPath, toPath) => renameCalls.push([fromPath, toPath])
  });

  await manager.openProject(getProjectFilePath(root));
  const created = await manager.createDocument('metagen', 'Future Component');
  const oldPath = created.path;

  assert.equal(await fs.access(oldPath).then(() => true).catch(() => false), false);

  const renamed = await manager.renameDocument(oldPath, 'Renamed Future Component');

  assert.ok(renamed);
  assert.equal(renamed.previousPath, oldPath);
  assert.notEqual(renamed.nextPath, oldPath);
  assert.equal(renameCalls.length, 0);

  const updatedRecord = manager.getDocumentByPath(renamed.nextPath);
  assert.ok(updatedRecord);
  assert.equal(updatedRecord.document.component.name, 'Renamed Future Component');
  assert.equal(await fs.access(oldPath).then(() => true).catch(() => false), false);
  assert.equal(await fs.access(renamed.nextPath).then(() => true).catch(() => false), false);
});

test('rename of unsaved component updates future save path and save persists only renamed file', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rename-unsaved-save-path-'));
  await createFixtureProject(root);

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const created = await manager.createDocument('metagen', 'Future Save Name');
  const oldPath = created.path;
  const renamed = await manager.renameDocument(oldPath, 'Future Saved Name');

  assert.ok(renamed);
  await manager.saveProject();

  const oldFileName = path.basename(oldPath);
  const nextFileName = path.basename(renamed.nextPath);

  assert.equal(await fs.access(path.join(root, 'metagen', oldFileName)).then(() => true).catch(() => false), false);
  assert.equal(await fs.access(path.join(root, 'metagen', nextFileName)).then(() => true).catch(() => false), true);

  const savedYaml = await fs.readFile(path.join(root, 'metagen', nextFileName), 'utf-8');
  assert.match(savedYaml, /Future Saved Name/);
});

test('rename of existing persisted component renames file on disk and updates path', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rename-persisted-'));
  await createFixtureProject(root);

  const renameCalls = [];
  const manager = createManager({
    onRename: (fromPath, toPath) => renameCalls.push([fromPath, toPath])
  });

  await manager.openProject(getProjectFilePath(root));
  const persisted = manager.getDocumentsByModule('metagen')[0];
  const oldPath = persisted.path;

  const renamed = await manager.renameDocument(oldPath, 'Pump Renamed');

  assert.ok(renamed);
  assert.equal(renameCalls.length, 1);
  assert.equal(renameCalls[0][0], oldPath);
  assert.equal(renameCalls[0][1], renamed.nextPath);
  assert.equal(await fs.access(oldPath).then(() => true).catch(() => false), false);
  assert.equal(await fs.access(renamed.nextPath).then(() => true).catch(() => false), true);

  const updated = manager.getDocumentByPath(renamed.nextPath);
  assert.equal(updated.document.component.name, 'Pump Renamed');
});

test('rename failure on persisted component leaves runtime and disk paths unchanged', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rename-failure-consistency-'));
  await createFixtureProject(root);

  const manager = createManager({
    failRename: (fromPath) => fromPath.endsWith('pump.yaml')
  });

  await manager.openProject(getProjectFilePath(root));
  const persisted = manager.getDocumentsByModule('metagen')[0];
  const oldPath = persisted.path;

  await assert.rejects(() => manager.renameDocument(oldPath, 'Pump Rename Fails'), /Injected rename failure/);

  const stillOld = manager.getDocumentByPath(oldPath);
  assert.ok(stillOld);
  assert.equal(stillOld.document.component.name, 'Pump');
  assert.equal(await fs.access(oldPath).then(() => true).catch(() => false), true);

  const failedPath = path.join(root, 'metagen', 'pump_rename_fails.yaml');
  assert.equal(await fs.access(failedPath).then(() => true).catch(() => false), false);
});

test('rollback restores promoted modules if module promote fails', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rollback-module-'));
  await createFixtureProject(root, { metagenDescription: 'stable-before-failure' });

  const manager = createManager({
    failRename: (fromPath) => fromPath.endsWith(path.join('.save-staging', 'metalab'))
  });

  await manager.openProject(getProjectFilePath(root));
  const record = manager.getDocumentsByModule('metagen')[0];
  record.document.component.description = 'should-not-commit';

  await assert.rejects(() => manager.saveProject(), /Injected rename failure/);

  const metagenText = await fs.readFile(path.join(root, 'metagen', 'pump.yaml'), 'utf-8');
  assert.match(metagenText, /stable-before-failure/);
  assert.doesNotMatch(metagenText, /should-not-commit/);
});

test('rollback restores module changes if dynamic project file promote fails', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rollback-project-file-'));
  await createFixtureProject(root, { metagenDescription: 'before-yaml-promote-failure', projectFileName: 'qqq.yaml' });

  const manager = createManager({
    failRename: (fromPath) => fromPath.endsWith(path.join('.save-staging', 'qqq.yaml'))
  });

  await manager.openProject(getProjectFilePath(root, 'qqq.yaml'));
  const record = manager.getDocumentsByModule('metagen')[0];
  record.document.component.description = 'must-be-rolled-back';

  await assert.rejects(() => manager.saveProject(), /Injected rename failure/);

  const metagenText = await fs.readFile(path.join(root, 'metagen', 'pump.yaml'), 'utf-8');
  assert.match(metagenText, /before-yaml-promote-failure/);
  assert.doesNotMatch(metagenText, /must-be-rolled-back/);
});

test('rollback keeps user-owned paths untouched while reverting project-owned paths', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rollback-user-owned-'));
  await createFixtureProject(root, { metagenDescription: 'rollback-user-owned-stable' });

  await fs.writeFile(path.join(root, 'README.txt'), 'user-owned-readme', 'utf-8');
  await fs.mkdir(path.join(root, 'notes'), { recursive: true });
  await fs.writeFile(path.join(root, 'notes', 'todo.txt'), 'user-owned-note', 'utf-8');

  const manager = createManager({
    failRename: (fromPath) => fromPath.endsWith(path.join('.save-staging', 'project.yaml'))
  });

  await manager.openProject(getProjectFilePath(root));
  const record = manager.getDocumentsByModule('metagen')[0];
  record.document.component.description = 'must-rollback-with-user-owned-intact';

  await assert.rejects(() => manager.saveProject(), /Injected rename failure/);

  const metagenText = await fs.readFile(path.join(root, 'metagen', 'pump.yaml'), 'utf-8');
  assert.match(metagenText, /rollback-user-owned-stable/);
  assert.doesNotMatch(metagenText, /must-rollback-with-user-owned-intact/);

  assert.equal(await fs.readFile(path.join(root, 'README.txt'), 'utf-8'), 'user-owned-readme');
  assert.equal(await fs.readFile(path.join(root, 'notes', 'todo.txt'), 'utf-8'), 'user-owned-note');
});

test('openDocuments snapshot overrides currentProject documents during save', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-open-doc-override-'));
  await createFixtureProject(root, { metagenDescription: 'disk-version' });

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));
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




test('deleting opened component and saving project does not resurrect deleted document', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-delete-opened-save-'));
  await createFixtureProject(root, { metagenDescription: 'to-delete' });

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));
  const record = manager.getDocumentsByModule('metagen')[0];

  const staleOpenRecord = {
    moduleId: 'metagen',
    path: record.path,
    document: {
      ...record.document,
      component: {
        ...record.document.component,
        description: 'stale-open-snapshot'
      }
    }
  };

  await manager.deleteDocument(record.path);
  await manager.saveProject([staleOpenRecord]);

  assert.equal(manager.getDocumentByPath(record.path), null);
  assert.equal(await fs.access(record.path).then(() => true).catch(() => false), false);

  await manager.refresh();
  assert.equal(manager.getDocumentByPath(record.path), null);
});

test('deleted existing component is absent after save and reopen', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-delete-existing-reopen-'));
  await createFixtureProject(root, { metagenDescription: 'delete-existing-reopen' });

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));
  const record = manager.getDocumentsByModule('metagen')[0];

  await manager.deleteDocument(record.path);
  await manager.saveProject();

  await manager.closeProject();
  await manager.openProject(getProjectFilePath(root));

  assert.equal(manager.getDocumentsByModule('metagen').length, 0);
  assert.equal(await fs.access(record.path).then(() => true).catch(() => false), false);
});

test('deleting unsaved/new component does not throw and does not survive save', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-delete-unsaved-'));
  await createFixtureProject(root);

  const manager = createManager();
  await manager.createNewProject();

  const created = await manager.createDocument('metagen', 'Temp Unsaved');
  assert.ok(created.path.startsWith('unsaved://'));

  await assert.doesNotReject(() => manager.deleteDocument(created.path));
  const targetProjectFilePath = path.join(root, 'target.yaml');
  await manager.saveProjectAs(targetProjectFilePath, [created]);

  assert.equal(manager.getDocumentsByModule('metagen').some((entry) => entry.document?.component?.name === 'Temp Unsaved'), false);
  const metagenFiles = await fs.readdir(path.join(root, 'metagen')).catch(() => []);
  assert.equal(metagenFiles.some((name) => name.includes('temp_unsaved')), false);
});
test('close tab syncs runtime snapshot to project and reopen reads fresh record', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-close-reopen-'));
  await createFixtureProject(root, { metagenDescription: 'before-close' });

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const baseRecord = manager.getDocumentsByModule('metagen')[0];
  const expectedDescription = 'after-close-runtime-sync';

  const { document } = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = document;

  let disposed = false;

  try {
    const tabs = createWorkbenchTabs({
      logger: createLogger(),
      projectManager: {
        renameDocument: async () => null,
        replaceDocumentRecord: async (...args) => manager.replaceDocumentRecord(...args)
      },
      openEditor: async ({ documentRecord }) => ({
        collectDocumentRecord: async () => ({
          ...documentRecord,
          document: {
            ...documentRecord.document,
            component: {
              ...documentRecord.document.component,
              description: expectedDescription
            }
          }
        }),
        dispose: () => {
          disposed = true;
        }
      })
    });

    await tabs.openDocument(baseRecord);
    await tabs.closeTab(baseRecord.path);

    assert.equal(disposed, true);

    const synced = manager.getCurrentProject().documents.metagen.find((entry) => entry.path === baseRecord.path);
    assert.equal(synced.document.component.description, expectedDescription);

    const reopenedRecord = manager.getDocumentByPath(baseRecord.path);
    assert.equal(reopenedRecord.document.component.description, expectedDescription);
  } finally {
    globalThis.document = previousDocument;
  }
});



test('closeTab with skipProjectSync does not call replaceDocumentRecord and prevents deleted record resurrection', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-close-skip-sync-'));
  await createFixtureProject(root, { metagenDescription: 'before-delete' });

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));
  const baseRecord = manager.getDocumentsByModule('metagen')[0];

  const { document } = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = document;

  const replaceCalls = [];

  try {
    const tabs = createWorkbenchTabs({
      logger: createLogger(),
      projectManager: {
        renameDocument: async () => null,
        replaceDocumentRecord: async (record) => {
          replaceCalls.push(record.path);
          return manager.replaceDocumentRecord(record);
        }
      },
      openEditor: async ({ documentRecord }) => ({
        collectDocumentRecord: async () => ({
          ...documentRecord,
          document: {
            ...documentRecord.document,
            component: {
              ...documentRecord.document.component,
              description: 'stale-collect'
            }
          }
        }),
        dispose: () => {}
      })
    });

    await tabs.openDocument(baseRecord);
    await manager.deleteDocument(baseRecord.path);
    await tabs.closeTab(baseRecord.path, { skipProjectSync: true });

    assert.deepEqual(replaceCalls, []);
    await manager.saveProject();
    assert.equal(manager.getDocumentByPath(baseRecord.path), null);
  } finally {
    globalThis.document = previousDocument;
  }
});
test('updateTabPaths remaps active tab and document path after save as pathMap', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-tabs-remap-'));
  await createFixtureProject(root);
  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const record = manager.getDocumentsByModule('metagen')[0];
  const documentIdentityKey = getDocumentIdentityKey(record);
  const nextPath = path.join(root, 'metagen', 'pump_remapped.yaml');

  const { document } = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = document;

  try {
    const tabs = createWorkbenchTabs({
      logger: createLogger(),
      projectManager: {
        renameDocument: async () => null,
        replaceDocumentRecord: async () => null
      },
      openEditor: async () => ({ dispose: () => {} })
    });

    await tabs.openDocument(record);
    tabs.updateTabPaths(new Map([[documentIdentityKey, nextPath]]));

    const active = tabs.getActiveDocumentRecord();
    assert.equal(active.path, nextPath);

    await tabs.closeTab(documentIdentityKey);
    assert.equal(tabs.getActiveDocumentRecord(), null);
  } finally {
    globalThis.document = previousDocument;
  }
});

test('collectOpenDocumentRecords uses runtime collectDocumentRecord and syncs project snapshot', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-collect-open-records-'));
  await createFixtureProject(root, { metagenDescription: 'before-runtime-collect' });
  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const record = manager.getDocumentsByModule('metagen')[0];
  const updatedDescription = 'after-runtime-collect';

  const { document } = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = document;

  try {
    const tabs = createWorkbenchTabs({
      logger: createLogger(),
      projectManager: {
        renameDocument: async () => null,
        replaceDocumentRecord: async (...args) => manager.replaceDocumentRecord(...args)
      },
      openEditor: async ({ documentRecord }) => ({
        collectDocumentRecord: async () => ({
          ...documentRecord,
          document: {
            ...documentRecord.document,
            component: {
              ...documentRecord.document.component,
              description: updatedDescription
            }
          }
        }),
        dispose: () => {}
      })
    });

    await tabs.openDocument(record);
    const openRecords = await tabs.collectOpenDocumentRecords();
    assert.equal(openRecords.length, 1);
    assert.equal(openRecords[0].document.component.description, updatedDescription);

    const synced = manager.getCurrentProject().documents.metagen.find((entry) => entry.path === record.path);
    assert.equal(synced.document.component.description, updatedDescription);
  } finally {
    globalThis.document = previousDocument;
  }
});




test('collectOpenDocumentRecords finalizes active editing before collectDocumentRecord', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-collect-finalize-before-collect-'));
  await createFixtureProject(root);
  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const record = manager.getDocumentsByModule('metagen')[0];
  const calls = [];

  const { document } = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = document;

  try {
    const tabs = createWorkbenchTabs({
      logger: createLogger(),
      projectManager: {
        renameDocument: async () => null,
        replaceDocumentRecord: async (...args) => manager.replaceDocumentRecord(...args)
      },
      openEditor: async ({ documentRecord }) => ({
        finalizeEditingBeforeContextLeave: async ({ reason }) => {
          calls.push(`finalize:${reason}`);
          return { continued: true, outcome: 'committed', reason };
        },
        collectDocumentRecord: async () => {
          calls.push('collect');
          return documentRecord;
        },
        dispose: () => {}
      })
    });

    await tabs.openDocument(record);
    await tabs.collectOpenDocumentRecords();

    assert.deepEqual(calls, ['finalize:collect-open-document-records', 'collect']);
  } finally {
    globalThis.document = previousDocument;
  }
});
test('menu/focus-triggered transition path on tabs uses shared finalize contract for active runtime', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-tabs-menu-finalize-'));
  await createFixtureProject(root);

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));
  const record = manager.getDocumentsByModule('metagen')[0];

  const { document } = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = document;

  const calls = [];

  try {
    const tabs = createWorkbenchTabs({
      logger: createLogger(),
      projectManager: {
        renameDocument: async () => null,
        replaceDocumentRecord: async () => null
      },
      openEditor: async () => ({
        finalizeEditingBeforeContextLeave: async ({ reason, blockOnFailure }) => {
          calls.push({ reason, blockOnFailure });
          return { continued: true, outcome: 'committed', reason };
        },
        dispose: () => {}
      })
    });

    await tabs.openDocument(record);

    const result = await tabs.finalizeActiveEditorContextBeforeTransition({
      reason: 'menu-action:open-project',
      blockOnFailure: true
    });

    assert.equal(result.continued, true);
    assert.equal(result.outcome, 'committed');
    assert.deepEqual(calls, [{ reason: 'menu-action:open-project', blockOnFailure: true }]);
  } finally {
    globalThis.document = previousDocument;
  }
});

test('opening and closing saved document without effective changes keeps project clean', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-open-close-clean-'));
  await createFixtureProject(root, { metagenDescription: 'clean-baseline' });
  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const record = manager.getDocumentsByModule('metagen')[0];
  const { document } = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = document;

  try {
    const tabs = createWorkbenchTabs({
      logger: createLogger(),
      projectManager: {
        renameDocument: async (...args) => manager.renameDocument(...args),
        replaceDocumentRecord: async (...args) => manager.replaceDocumentRecord(...args)
      },
      openEditor: async ({ documentRecord }) => ({
        collectDocumentRecord: async () => documentRecord,
        dispose: () => {}
      })
    });

    assert.equal(manager.hasDirtyProject(), false);
    await tabs.openDocument(record);
    await tabs.closeTab(record.path);
    assert.equal(manager.hasDirtyProject(), false);
  } finally {
    globalThis.document = previousDocument;
  }
});

test('collectOpenDocumentRecords with semantic no-op records keeps project clean', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-collect-clean-noop-'));
  await createFixtureProject(root);
  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const record = manager.getDocumentsByModule('metagen')[0];
  const { document } = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = document;

  try {
    const tabs = createWorkbenchTabs({
      logger: createLogger(),
      projectManager: {
        renameDocument: async (...args) => manager.renameDocument(...args),
        replaceDocumentRecord: async (...args) => manager.replaceDocumentRecord(...args)
      },
      openEditor: async ({ documentRecord }) => ({
        collectDocumentRecord: async () => ({
          ...documentRecord,
          document: structuredClone(documentRecord.document)
        }),
        dispose: () => {}
      })
    });

    await tabs.openDocument(record);
    await tabs.collectOpenDocumentRecords();

    assert.equal(manager.hasDirtyProject(), false);
  } finally {
    globalThis.document = previousDocument;
  }
});

test('save-as path remap keeps active tab closable and document renameable', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-remap-close-'));
  const targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-save-remap-close-target-'));
  await createFixtureProject(root, { projectFileName: 'source.yaml' });
  const manager = createManager();
  await manager.openProject(getProjectFilePath(root, 'source.yaml'));

  const record = manager.getDocumentsByModule('metagen')[0];

  const { document } = createFakeDocument();
  const previousDocument = globalThis.document;
  globalThis.document = document;

  try {
    const tabs = createWorkbenchTabs({
      logger: createLogger(),
      projectManager: {
        renameDocument: async (...args) => manager.renameDocument(...args),
        replaceDocumentRecord: async (...args) => manager.replaceDocumentRecord(...args)
      },
      openEditor: async ({ documentRecord }) => ({
        collectDocumentRecord: async () => documentRecord,
        dispose: () => {}
      })
    });

    await tabs.openDocument(record);
    const saveResult = await manager.saveProjectAs(getProjectFilePath(targetRoot, 'target.yaml'), await tabs.collectOpenDocumentRecords());
    tabs.updateTabPaths(saveResult.pathMap);

    const remappedActiveRecord = tabs.getActiveDocumentRecord();
    assert.ok(remappedActiveRecord);

    await tabs.closeTab(remappedActiveRecord.path);
    assert.equal(tabs.getActiveDocumentRecord(), null);

    const reopened = manager.getDocumentsByModule('metagen')[0];
    const renamed = await manager.renameDocument(reopened.path, 'Pump After Save As');
    assert.ok(renamed);
  } finally {
    globalThis.document = previousDocument;
  }
});

const UUID_LIKE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('new MetaGen document gets GUID id on create', async () => {
  const manager = createManager();
  await manager.createNewProject();

  const first = await manager.createDocument('metagen', 'Компонент A');
  const second = await manager.createDocument('metagen', 'Компонент B');

  assert.match(first.document.component.id, UUID_LIKE_REGEX);
  assert.match(second.document.component.id, UUID_LIKE_REGEX);
  assert.notEqual(first.document.component.id, second.document.component.id);
});

test('new MetaLab and MetaView documents get GUID id on create', async () => {
  const manager = createManager();
  await manager.createNewProject();

  const lab = await manager.createDocument('metalab', 'Сценарий A');
  const view = await manager.createDocument('metaview', 'Экран A');

  assert.match(lab.document.scenario.id, UUID_LIKE_REGEX);
  assert.match(view.document.screen.id, UUID_LIKE_REGEX);
});

test('rename does not change document ids and does not change MetaGen generation output fileName', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-rename-id-stable-'));
  await createFixtureProject(root);
  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const metaGenRecord = manager.getDocumentsByModule('metagen')[0];
  const metaLabRecord = manager.getDocumentsByModule('metalab')[0];
  const metaViewRecord = manager.getDocumentsByModule('metaview')[0];

  const mgId = metaGenRecord.document.component.id;
  const mlId = metaLabRecord.document.scenario.id;
  const mvId = metaViewRecord.document.screen.id;
  const generationFileName = metaGenRecord.document.generation.output.fileName;

  await manager.renameDocument(mgId, 'Pump Renamed');
  await manager.renameDocument(mlId, 'Scenario Renamed');
  await manager.renameDocument(mvId, 'Screen Renamed');

  assert.equal(manager.getDocumentById(mgId).document.component.id, mgId);
  assert.equal(manager.getDocumentById(mlId).document.scenario.id, mlId);
  assert.equal(manager.getDocumentById(mvId).document.screen.id, mvId);
  assert.equal(manager.getDocumentById(mgId).document.generation.output.fileName, generationFileName);
});

test('save-as remap and reopen preserve document id', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-id-save-as-src-'));
  const targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-id-save-as-dst-'));
  await createFixtureProject(root);

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const original = manager.getDocumentsByModule('metagen')[0];
  const originalId = original.document.component.id;

  await manager.saveProjectAs(path.join(targetRoot, 'project.yaml'));
  await manager.closeProject();
  await manager.openProject(path.join(targetRoot, 'project.yaml'));

  const reopened = manager.getDocumentsByModule('metagen')[0];
  assert.equal(reopened.document.component.id, originalId);
});

test('loading legacy document without id assigns runtime id and persists via save', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-legacy-id-'));
  await createFixtureProject(root);

  const legacyPath = path.join(root, 'metagen', 'legacy.yaml');
  const legacy = {
    kind: 'metagen.component',
    version: 1,
    component: { name: 'Legacy', type: 'FB', module: 'Main', description: '' },
    params: { format: 'header-plus-rows', header: [], rows: [] },
    data: { format: 'table', columns: [], rows: [] },
    instances: { format: 'list', rows: [] },
    code: { format: 'template-text', language: 'st-template', text: '' },
    generation: { engine: 'structured-text', entrypoint: 'Main', mode: 'component', output: { language: 'st', fileName: 'legacy.st' } },
    meta: { author: '', importedFrom: '', importedSheet: '' }
  };

  await fs.writeFile(legacyPath, YAML.stringify(legacy), 'utf-8');

  const manager = createManager();
  await manager.openProject(getProjectFilePath(root));

  const legacyRecord = manager.getDocumentsByModule('metagen').find((entry) => entry.path.endsWith('legacy.yaml'));
  assert.match(legacyRecord.document.component.id, UUID_LIKE_REGEX);

  await manager.saveProject();

  const persisted = YAML.parse(await fs.readFile(legacyPath, 'utf-8'));
  assert.equal(persisted.component.id, legacyRecord.document.component.id);
});
