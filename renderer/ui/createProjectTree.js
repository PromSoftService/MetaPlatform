import { APP_CONFIG } from '../../config/app-config.js';
import { METAGEN_CONFIG } from '../modules/metagen/metagenConfig.js';
import { METALAB_CONFIG } from '../modules/metalab/metalabConfig.js';
import { METAVIEW_CONFIG } from '../modules/metaview/metaviewConfig.js';
import {
  TREE_NODE_TYPES,
  buildProjectTreeNodes,
  createTreeBehaviorConfig,
  createTreeInteractionController,
  getNodeActions
} from './projectTree/treeAdapter.js';

function normalizeClassNames(classNames = []) {
  const normalizedClassNames = Array.isArray(classNames) ? classNames : [classNames];

  return normalizedClassNames.filter(Boolean).map((className) => {
    if (/\s/.test(className)) {
      throw new TypeError(
        `Invalid class token "${className}". Pass class names as separate tokens.`
      );
    }

    return className;
  });
}

function createElement(tagName, classNames = []) {
  const node = document.createElement(tagName);
  normalizeClassNames(classNames).forEach((className) => node.classList.add(className));
  return node;
}

export function createProjectTree({
  logger,
  projectManager,
  tabs,
  onCreateComponentRequest,
  onDeleteComponentRequest
}) {
  const treeRoot = document.getElementById(APP_CONFIG.ui.dom.projectTreeId);
  const projectPanelTitleNode = document.querySelector(APP_CONFIG.ui.dom.projectPanelTitleSelector);
  const unsavedMarker = '●';

  const moduleSections = [
    {
      moduleId: METAGEN_CONFIG.moduleId,
      moduleName: METAGEN_CONFIG.moduleName,
      getDefaultName: () => projectManager.getNextMetaGenDefaultName()
    },
    {
      moduleId: METALAB_CONFIG.moduleId,
      moduleName: METALAB_CONFIG.moduleName,
      getDefaultName: () => 'Новый сценарий'
    },
    {
      moduleId: METAVIEW_CONFIG.moduleId,
      moduleName: METAVIEW_CONFIG.moduleName,
      getDefaultName: () => 'Новый экран'
    }
  ];

  const behaviorConfig = createTreeBehaviorConfig();
  const treeSelectionState = {
    selectedNodeId: null
  };

  function getProjectPanelTitle(project) {
    if (!project) {
      return APP_CONFIG.ui.panelHeaders.project;
    }

    const projectName = String(project.project?.name || APP_CONFIG.ui.text.untitled).trim() || APP_CONFIG.ui.text.untitled;
    return project.isUnsaved ? `${projectName} ${unsavedMarker}` : projectName;
  }

  async function startDocumentCreation(sectionConfig) {
    await tabs.startTemporaryDocumentCreation({
      moduleId: sectionConfig.moduleId,
      defaultName: sectionConfig.getDefaultName(),
      onCommit: async ({ moduleId, confirmedName }) => {
        return projectManager.createDocument(moduleId, confirmedName);
      }
    });
  }

  const interactionController = createTreeInteractionController({
    tabs,
    onCreateComponentRequest: onCreateComponentRequest || (async (moduleId, nodeData) => {
      const sectionConfig = moduleSections.find((section) => section.moduleId === moduleId);

      if (!sectionConfig) {
        logger.warn('project-tree', 'Не найден модуль для создания компонента', {
          moduleId,
          nodeData
        });
        return;
      }

      await startDocumentCreation(sectionConfig);
    }),
    onDeleteComponentRequest: onDeleteComponentRequest || (async (documentRecord) => {
      tabs.closeTab(documentRecord.path);
      await projectManager.deleteDocument(documentRecord.path);
    })
  });

  function renderNodeRow(nodeData, rowClassNames = ['tree-node-row']) {
    const row = createElement('div', rowClassNames);
    row.dataset.nodeType = nodeData.nodeType;
    row.dataset.nodeId = nodeData.id;

    const label = createElement('button', ['tree-node-label']);
    label.type = 'button';
    label.textContent = nodeData.label;

    label.addEventListener('click', async (event) => {
      event.preventDefault();

      treeSelectionState.selectedNodeId = nodeData.id;
      await interactionController.onNodePrimaryClick(nodeData);
      await render();
    });

    row.appendChild(label);

    const actions = getNodeActions(nodeData);

    if (actions.length > 0) {
      const actionsContainer = createElement('div', ['tree-node-actions']);

      for (const action of actions) {
        if (!action.visible) {
          continue;
        }

        const actionButton = createElement('button', ['tree-node-action-button']);
        actionButton.type = 'button';
        actionButton.title = action.title;
        actionButton.setAttribute('aria-label', action.title);
        actionButton.textContent = action.icon;

        actionButton.addEventListener('click', async (event) => {
          await interactionController.onNodeActionClick({
            actionId: action.id,
            nodeData,
            event
          });
        });

        actionsContainer.appendChild(actionButton);
      }

      row.appendChild(actionsContainer);
    }

    if (treeSelectionState.selectedNodeId === nodeData.id) {
      row.classList.add('is-selected');
    }

    return row;
  }

  async function render() {
    const project = projectManager.getCurrentProject();

    treeRoot.innerHTML = '';

    if (projectPanelTitleNode) {
      projectPanelTitleNode.textContent = getProjectPanelTitle(project);
    }

    if (!project) {
      return;
    }

    const treeNodes = buildProjectTreeNodes({
      project,
      moduleSections,
      getDocumentsByModule: (moduleId) => projectManager.getDocumentsByModule(moduleId)
    });

    for (const nodeData of treeNodes) {
      if (nodeData.nodeType === TREE_NODE_TYPES.module) {
        const moduleBlock = createElement('div', ['tree-module-block']);
        moduleBlock.appendChild(renderNodeRow(nodeData, ['tree-section-header', 'tree-node-row']));

        const documentsContainer = createElement('div', ['tree-module-children']);

        for (const documentNode of nodeData.children || []) {
          const item = createElement('div', [APP_CONFIG.ui.classNames.treeItem]);
          item.appendChild(renderNodeRow(documentNode));
          documentsContainer.appendChild(item);
        }

        moduleBlock.appendChild(documentsContainer);
        treeRoot.appendChild(moduleBlock);
      }
    }

    logger.info('project-tree', 'Дерево проекта обновлено', {
      inlineRenameEnabled: behaviorConfig.inlineRenameEnabled,
      slowDoubleClickRenameEnabled: behaviorConfig.slowDoubleClickRenameEnabled
    });
  }

  projectManager.subscribe(() => {
    render().catch((error) => {
      logger.error('project-tree', 'Ошибка рендера дерева проекта', {
        message: error?.message || String(error)
      });
    });
  });

  return { render, getProjectPanelTitle };
}
