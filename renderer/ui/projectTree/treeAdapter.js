import { APP_CONFIG } from '../../../config/app-config.js';
import { getDocumentLabel } from '../../runtime/documentRecordIdentity.js';

export const TREE_NODE_TYPES = {
  project: 'project',
  module: 'module',
  document: 'document'
};


export const TREE_ACTION_IDS = {
  createComponent: 'create-component',
  deleteComponent: 'delete-component'
};

export function createTreeBehaviorConfig() {
  return {
    inlineRenameEnabled: false,
    slowDoubleClickRenameEnabled: false
  };
}

export function buildProjectTreeNodes({ project, moduleSections, getDocumentsByModule }) {
  if (!project) {
    return [];
  }

  return [
    {
      nodeType: TREE_NODE_TYPES.project,
      id: `project:${project.project?.name || 'unnamed'}`,
      label: project.project?.name || APP_CONFIG.ui.text.untitled,
      project
    },
    ...moduleSections.map((sectionConfig) => ({
      nodeType: TREE_NODE_TYPES.module,
      id: `module:${sectionConfig.moduleId}`,
      moduleId: sectionConfig.moduleId,
      moduleName: sectionConfig.moduleName,
      label: sectionConfig.moduleName,
      sectionConfig,
      children: getDocumentsByModule(sectionConfig.moduleId).map((documentRecord) => ({
        nodeType: TREE_NODE_TYPES.document,
        id: `document:${documentRecord.path}`,
        label: getDocumentLabel(documentRecord),
        moduleId: sectionConfig.moduleId,
        path: documentRecord.path,
        documentRecord
      }))
    }))
  ];
}

export function getNodeActions(nodeData) {
  if (nodeData?.nodeType === TREE_NODE_TYPES.module) {
    return [
      {
        id: TREE_ACTION_IDS.createComponent,
        title: 'Добавить компонент',
        icon: '+',
        visible: true
      }
    ];
  }

  if (nodeData?.nodeType === TREE_NODE_TYPES.document) {
    return [
      {
        id: TREE_ACTION_IDS.deleteComponent,
        title: 'Удалить компонент',
        icon: '🗑',
        visible: true
      }
    ];
  }

  return [];
}

export function createTreeInteractionController({
  tabs,
  onCreateComponentRequest,
  onDeleteComponentRequest
}) {
  async function onNodePrimaryClick(nodeData) {
    if (nodeData?.nodeType !== TREE_NODE_TYPES.document) {
      return { handled: false, reason: 'non-document-node' };
    }

    await tabs.openOrActivateDocument(nodeData.documentRecord);
    return { handled: true, reason: 'document-open-or-activate' };
  }

  async function onNodeActionClick({ actionId, nodeData, event }) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (actionId === TREE_ACTION_IDS.createComponent && nodeData?.nodeType === TREE_NODE_TYPES.module) {
      await onCreateComponentRequest?.(nodeData.moduleId, nodeData);
      return { handled: true, reason: 'create-component' };
    }

    if (actionId === TREE_ACTION_IDS.deleteComponent && nodeData?.nodeType === TREE_NODE_TYPES.document) {
      await onDeleteComponentRequest?.(nodeData.documentRecord, nodeData);
      return { handled: true, reason: 'delete-component' };
    }

    return { handled: false, reason: 'unsupported-action' };
  }

  return {
    onNodePrimaryClick,
    onNodeActionClick
  };
}
