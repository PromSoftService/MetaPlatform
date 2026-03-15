import test from 'node:test';
import assert from 'node:assert/strict';

import { APP_CONFIG } from '../config/app-config.js';
import {
  TREE_NODE_TYPES,
  TREE_ACTION_IDS,
  buildProjectTreeNodes,
  createTreeBehaviorConfig,
  createTreeInteractionController,
  getNodeActions
} from '../renderer/ui/projectTree/treeAdapter.js';

function createProjectFixture() {
  return {
    project: { name: 'Demo' },
    documents: {
      metagen: [
        {
          moduleId: 'metagen',
          path: '/tmp/metagen/a.yaml',
          document: { component: { name: 'Component A' } }
        }
      ],
      metalab: [],
      metaview: []
    }
  };
}

function createModuleSections() {
  return [
    { moduleId: 'metagen', moduleName: 'metagen' },
    { moduleId: 'metalab', moduleName: 'metalab' },
    { moduleId: 'metaview', moduleName: 'metaview' }
  ];
}



test('tree adapter constants stay wired to config-backed node and action ids', () => {
  assert.deepEqual(TREE_NODE_TYPES, APP_CONFIG.project.tree.nodeTypes);
  assert.deepEqual(TREE_ACTION_IDS, APP_CONFIG.project.tree.actionIds);
});


test('document single click activates existing tab if already open', async () => {
  const calls = [];
  const controller = createTreeInteractionController({
    tabs: {
      openOrActivateDocument: async (documentRecord) => {
        calls.push({ type: 'activate', path: documentRecord.path });
      }
    }
  });

  const documentNode = {
    nodeType: TREE_NODE_TYPES.document,
    documentRecord: { path: '/tmp/metagen/a.yaml' }
  };

  const result = await controller.onNodePrimaryClick(documentNode);
  assert.equal(result.handled, true);
  assert.deepEqual(calls, [{ type: 'activate', path: '/tmp/metagen/a.yaml' }]);
});

test('document single click opens document if tab not open', async () => {
  const calls = [];
  const controller = createTreeInteractionController({
    tabs: {
      openOrActivateDocument: async (documentRecord) => {
        calls.push({ type: 'open-or-activate', path: documentRecord.path });
      }
    }
  });

  const result = await controller.onNodePrimaryClick({
    nodeType: TREE_NODE_TYPES.document,
    documentRecord: { path: '/tmp/metagen/new.yaml' }
  });

  assert.equal(result.handled, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/tmp/metagen/new.yaml');
});

test('module and project node click does not open document', async () => {
  let openCalls = 0;
  const controller = createTreeInteractionController({
    tabs: {
      openOrActivateDocument: async () => {
        openCalls += 1;
      }
    }
  });

  const projectResult = await controller.onNodePrimaryClick({ nodeType: TREE_NODE_TYPES.project });
  const moduleResult = await controller.onNodePrimaryClick({ nodeType: TREE_NODE_TYPES.module });

  assert.equal(projectResult.handled, false);
  assert.equal(moduleResult.handled, false);
  assert.equal(openCalls, 0);
});

test('module nodes expose create action and route callback with moduleId and node payload', async () => {
  const createCalls = [];
  const nodeData = {
    nodeType: TREE_NODE_TYPES.module,
    moduleId: 'metagen',
    label: 'metagen'
  };

  const actions = getNodeActions(nodeData);
  assert.equal(actions.some((action) => action.id === TREE_ACTION_IDS.createComponent), true);

  const controller = createTreeInteractionController({
    tabs: { openOrActivateDocument: async () => {} },
    onCreateComponentRequest: async (moduleId, nodePayload) => {
      createCalls.push({ moduleId, nodePayload });
    }
  });

  await controller.onNodeActionClick({ actionId: TREE_ACTION_IDS.createComponent, nodeData });
  assert.equal(createCalls.length, 1);
  assert.equal(createCalls[0].moduleId, 'metagen');
  assert.equal(createCalls[0].nodePayload, nodeData);
});

test('document nodes expose delete action and route callback with document payload', async () => {
  const deleteCalls = [];
  const documentRecord = { path: '/tmp/metagen/a.yaml', moduleId: 'metagen' };
  const nodeData = {
    nodeType: TREE_NODE_TYPES.document,
    documentRecord
  };

  const actions = getNodeActions(nodeData);
  assert.equal(actions.some((action) => action.id === TREE_ACTION_IDS.deleteComponent), true);

  const controller = createTreeInteractionController({
    tabs: { openOrActivateDocument: async () => {} },
    onDeleteComponentRequest: async (record, nodePayload) => {
      deleteCalls.push({ record, nodePayload });
    }
  });

  await controller.onNodeActionClick({ actionId: TREE_ACTION_IDS.deleteComponent, nodeData });
  assert.equal(deleteCalls.length, 1);
  assert.equal(deleteCalls[0].record, documentRecord);
  assert.equal(deleteCalls[0].nodePayload, nodeData);
});

test('action button click isolates DOM event and does not trigger node activation flow', async () => {
  let prevented = false;
  let stopped = false;
  let openCalls = 0;

  const controller = createTreeInteractionController({
    tabs: {
      openOrActivateDocument: async () => {
        openCalls += 1;
      }
    },
    onDeleteComponentRequest: async () => {}
  });

  await controller.onNodeActionClick({
    actionId: TREE_ACTION_IDS.deleteComponent,
    nodeData: {
      nodeType: TREE_NODE_TYPES.document,
      documentRecord: { path: '/tmp/metagen/a.yaml' }
    },
    event: {
      preventDefault: () => {
        prevented = true;
      },
      stopPropagation: () => {
        stopped = true;
      }
    }
  });

  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(openCalls, 0);
});

test('rename via slow double click is disabled at tree behavior config layer', () => {
  const config = createTreeBehaviorConfig();

  assert.equal(config.inlineRenameEnabled, false);
  assert.equal(config.slowDoubleClickRenameEnabled, false);
});

test('tree node mapping keeps node typing and metadata for future context menu support', () => {
  const project = createProjectFixture();
  const nodes = buildProjectTreeNodes({
    project,
    moduleSections: createModuleSections(),
    getDocumentsByModule: (moduleId) => project.documents[moduleId] || []
  });

  assert.equal(nodes[0].nodeType, TREE_NODE_TYPES.project);
  const moduleNode = nodes.find((node) => node.nodeType === TREE_NODE_TYPES.module && node.moduleId === 'metagen');
  assert.ok(moduleNode);
  assert.equal(moduleNode.label, 'metagen');
  assert.equal(moduleNode.children.length, 1);
  assert.equal(moduleNode.children[0].nodeType, TREE_NODE_TYPES.document);
  assert.equal(moduleNode.children[0].path, '/tmp/metagen/a.yaml');
});


test('unsupported action returns no-op result and does not call handlers', async () => {
  let createCalls = 0;
  let deleteCalls = 0;

  const controller = createTreeInteractionController({
    tabs: { openOrActivateDocument: async () => {} },
    onCreateComponentRequest: async () => {
      createCalls += 1;
    },
    onDeleteComponentRequest: async () => {
      deleteCalls += 1;
    }
  });

  const result = await controller.onNodeActionClick({
    actionId: 'unknown-action',
    nodeData: { nodeType: TREE_NODE_TYPES.module, moduleId: 'metagen' }
  });

  assert.equal(result.handled, false);
  assert.equal(result.reason, 'unsupported-action');
  assert.equal(createCalls, 0);
  assert.equal(deleteCalls, 0);
});

test('tree document node identity is based on document GUID and remains stable for path changes', () => {
  const project = {
    project: { name: 'Demo' },
    documents: {
      metagen: [{ moduleId: 'metagen', path: '/tmp/metagen/a.yaml', document: { component: { id: '11111111-1111-4111-8111-111111111111', name: 'A' } } }],
      metalab: [],
      metaview: []
    }
  };

  const firstNodes = buildProjectTreeNodes({
    project,
    moduleSections: createModuleSections(),
    getDocumentsByModule: (moduleId) => project.documents[moduleId] || []
  });
  const firstDocumentNode = firstNodes.find((node) => node.moduleId === 'metagen').children[0];

  project.documents.metagen[0].path = '/tmp/metagen/a-renamed.yaml';
  const secondNodes = buildProjectTreeNodes({
    project,
    moduleSections: createModuleSections(),
    getDocumentsByModule: (moduleId) => project.documents[moduleId] || []
  });
  const secondDocumentNode = secondNodes.find((node) => node.moduleId === 'metagen').children[0];

  assert.equal(firstDocumentNode.id, secondDocumentNode.id);
});
