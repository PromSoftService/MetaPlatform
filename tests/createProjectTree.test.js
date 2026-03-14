import test from 'node:test';
import assert from 'node:assert/strict';

import { createProjectTree } from '../renderer/ui/createProjectTree.js';

class FakeClassList {
  constructor() {
    this.tokens = new Set();
  }

  add(token) {
    if (typeof token !== 'string' || /\s/.test(token)) {
      throw new Error(
        `The token provided ('${token}') contains HTML space characters, which are not valid in tokens.`
      );
    }
    this.tokens.add(token);
  }

  contains(token) {
    return this.tokens.has(token);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.classList = new FakeClassList();
    this.eventHandlers = {};
    this.textContent = '';
    this.type = undefined;
    this.title = undefined;
    this._innerHTML = '';
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  addEventListener(eventName, handler) {
    this.eventHandlers[eventName] = handler;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
    this.textContent = '';
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

function createFakeDocument() {
  const nodesById = new Map();
  const treeRoot = new FakeElement('div');
  const projectPanelTitle = new FakeElement('div');
  nodesById.set('project-tree', treeRoot);

  return {
    treeRoot,
    projectPanelTitle,
    document: {
      createElement(tagName) {
        return new FakeElement(tagName);
      },
      getElementById(id) {
        return nodesById.get(id) || null;
      },
      querySelector(selector) {
        if (selector === '#project-panel-title') {
          return projectPanelTitle;
        }
        return null;
      }
    }
  };
}

function createProjectManagerFixture({ project, documentsByModule }) {
  return {
    getCurrentProject: () => project,
    getDocumentsByModule: (moduleId) => documentsByModule[moduleId] || [],
    getNextMetaGenDefaultName: () => 'Новый компонент',
    createDocument: async () => {},
    deleteDocument: async () => {},
    subscribe: () => {}
  };
}

function createLoggerFixture() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {}
  };
}

test('tree row render accepts multiple classes as separate tokens', async () => {
  const originalDocument = global.document;
  const { document, treeRoot } = createFakeDocument();
  global.document = document;

  try {
    const tree = createProjectTree({
      logger: createLoggerFixture(),
      projectManager: createProjectManagerFixture({
        project: { name: 'Demo Project' },
        documentsByModule: {
          metagen: [],
          metalab: [],
          metaview: []
        }
      }),
      tabs: {
        startTemporaryDocumentCreation: async () => {},
        closeTab: () => {},
        openOrActivateDocument: async () => {}
      }
    });

    await assert.doesNotReject(async () => {
      await tree.render();
    });

    const moduleBlock = treeRoot.children[1];
    const sectionHeaderRow = moduleBlock.children[0];

    assert.equal(sectionHeaderRow.classList.contains('tree-section-header'), true);
    assert.equal(sectionHeaderRow.classList.contains('tree-node-row'), true);
  } finally {
    global.document = originalDocument;
  }
});

test('module node render path does not pass combined class token with spaces', async () => {
  const originalDocument = global.document;
  const { document, treeRoot } = createFakeDocument();
  global.document = document;

  try {
    const tree = createProjectTree({
      logger: createLoggerFixture(),
      projectManager: createProjectManagerFixture({
        project: { name: 'Demo Project' },
        documentsByModule: {
          metagen: [
            {
              moduleId: 'metagen',
              path: '/tmp/metagen/component-a.yaml',
              document: { component: { name: 'Component A' } }
            }
          ],
          metalab: [],
          metaview: []
        }
      }),
      tabs: {
        startTemporaryDocumentCreation: async () => {},
        closeTab: () => {},
        openOrActivateDocument: async () => {}
      }
    });

    await assert.doesNotReject(async () => {
      await tree.render();
    });

    const metagenModuleBlock = treeRoot.children[1];
    assert.ok(metagenModuleBlock, 'module block should be rendered');

    const sectionHeaderRow = metagenModuleBlock.children[0];
    assert.equal(sectionHeaderRow.dataset.nodeType, 'module');
    assert.equal(sectionHeaderRow.classList.contains('tree-section-header'), true);
    assert.equal(sectionHeaderRow.classList.contains('tree-node-row'), true);
  } finally {
    global.document = originalDocument;
  }
});

test('rendering project tree for new project no longer crashes', async () => {
  const originalDocument = global.document;
  const { document, treeRoot } = createFakeDocument();
  global.document = document;

  try {
    const tree = createProjectTree({
      logger: createLoggerFixture(),
      projectManager: createProjectManagerFixture({
        project: { name: 'New Project' },
        documentsByModule: {
          metagen: [],
          metalab: [],
          metaview: []
        }
      }),
      tabs: {
        startTemporaryDocumentCreation: async () => {},
        closeTab: () => {},
        openOrActivateDocument: async () => {}
      }
    });

    await assert.doesNotReject(async () => {
      await tree.render();
    });

    assert.equal(treeRoot.children.length > 0, true);
  } finally {
    global.document = originalDocument;
  }
});
