import { APP_CONFIG } from '../../../config/app-config.js';
import { getDocumentLabel, getDocumentIdentityKey } from '../../runtime/documentRecordIdentity.js';

export const TREE_NODE_TYPES = APP_CONFIG.project.tree.nodeTypes;
export const TREE_ACTION_IDS = APP_CONFIG.project.tree.actionIds;

const TREE_CLASS_NAMES = APP_CONFIG.ui.classNames;

const MODULE_ROW_CLASS_BY_MODULE = {
  [APP_CONFIG.project.moduleIds.metagen]: TREE_CLASS_NAMES.treeNodeModuleMetagen,
  [APP_CONFIG.project.moduleIds.metalab]: TREE_CLASS_NAMES.treeNodeModuleMetalab,
  [APP_CONFIG.project.moduleIds.metaview]: TREE_CLASS_NAMES.treeNodeModuleMetaview
};

const DOCUMENT_ROW_CLASS_BY_MODULE = {
  [APP_CONFIG.project.moduleIds.metagen]: TREE_CLASS_NAMES.treeNodeDocumentMetagen,
  [APP_CONFIG.project.moduleIds.metalab]: TREE_CLASS_NAMES.treeNodeDocumentMetalab,
  [APP_CONFIG.project.moduleIds.metaview]: TREE_CLASS_NAMES.treeNodeDocumentMetaview
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
      id: `${APP_CONFIG.project.identity.treeProjectPrefix}${project.project?.id || APP_CONFIG.project.defaults.unnamedProject}`,
      label: APP_CONFIG.project.tree.labels.root,
      project
    },
    ...moduleSections.map((sectionConfig) => ({
      nodeType: TREE_NODE_TYPES.module,
      id: `${APP_CONFIG.project.identity.treeModulePrefix}${sectionConfig.moduleId}`,
      moduleId: sectionConfig.moduleId,
      moduleName: sectionConfig.moduleName,
      label: sectionConfig.moduleName,
      sectionConfig,
      children: getDocumentsByModule(sectionConfig.moduleId).map((documentRecord) => ({
        nodeType: TREE_NODE_TYPES.document,
        id: getDocumentIdentityKey(documentRecord),
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
    return [{
      id: TREE_ACTION_IDS.createComponent,
      title: APP_CONFIG.ui.tree.actions.createComponent.title,
      icon: APP_CONFIG.ui.tree.actions.createComponent.icon,
      visible: true
    }];
  }

  if (nodeData?.nodeType === TREE_NODE_TYPES.document) {
    return [{
      id: TREE_ACTION_IDS.deleteComponent,
      title: APP_CONFIG.ui.tree.actions.deleteComponent.title,
      icon: APP_CONFIG.ui.tree.actions.deleteComponent.icon,
      visible: true
    }];
  }

  return [];
}

export function getNodeRowClassNames(nodeData) {
  if (nodeData?.nodeType === TREE_NODE_TYPES.project) {
    return [TREE_CLASS_NAMES.treeNodeProjectRow];
  }

  if (nodeData?.nodeType === TREE_NODE_TYPES.module) {
    return [MODULE_ROW_CLASS_BY_MODULE[nodeData.moduleId]].filter(Boolean);
  }

  if (nodeData?.nodeType === TREE_NODE_TYPES.document) {
    return [DOCUMENT_ROW_CLASS_BY_MODULE[nodeData.moduleId]].filter(Boolean);
  }

  return [];
}

export function createTreeInteractionController({ tabs, onCreateComponentRequest, onDeleteComponentRequest }) {
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
      return { handled: true, reason: TREE_ACTION_IDS.createComponent };
    }

    if (actionId === TREE_ACTION_IDS.deleteComponent && nodeData?.nodeType === TREE_NODE_TYPES.document) {
      await onDeleteComponentRequest?.(nodeData.documentRecord, nodeData);
      return { handled: true, reason: TREE_ACTION_IDS.deleteComponent };
    }

    return { handled: false, reason: 'unsupported-action' };
  }

  return { onNodePrimaryClick, onNodeActionClick };
}
