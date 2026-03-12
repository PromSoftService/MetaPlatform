import { APP_CONFIG } from '../../config/app-config.js';
import { METAGEN_CONFIG } from '../modules/metagen/metagenConfig.js';
import { METALAB_CONFIG } from '../modules/metalab/metalabConfig.js';
import { METAVIEW_CONFIG } from '../modules/metaview/metaviewConfig.js';

function createElement(tagName, classNames = []) {
  const node = document.createElement(tagName);
  classNames.forEach((className) => node.classList.add(className));
  return node;
}

function normalizeName(name) {
  return String(name ?? '').trim();
}

function getDocumentLabel(documentRecord) {
  return (
    documentRecord.document?.component?.name ||
    documentRecord.document?.scenario?.name ||
    documentRecord.document?.screen?.name ||
    documentRecord.document?.name ||
    APP_CONFIG.ui.text.untitled
  );
}

export function createProjectTree({
  logger,
  projectManager,
  tabs
}) {
  const treeRoot = document.getElementById(APP_CONFIG.ui.dom.projectTreeId);
  const projectPanelTitleNode = document.querySelector(APP_CONFIG.ui.dom.projectPanelTitleSelector);

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

  const clickGestureState = {
    path: null,
    at: 0
  };

  async function startTreeInlineRename({ record, labelNode }) {
    const previousName = getDocumentLabel(record);
    const input = createElement('input', ['tree-inline-rename-input']);
    input.type = 'text';
    input.value = previousName;

    labelNode.replaceWith(input);
    input.focus();
    input.select();

    let finalized = false;

    const finalize = async (commit) => {
      if (finalized) {
        return;
      }

      finalized = true;

      if (commit) {
        const nextName = normalizeName(input.value);
        if (!nextName) {
          logger.warn('project-tree', 'Пустое имя отклонено');
        } else {
          const renamed = await projectManager.renameDocument(record.path, nextName);
          if (!renamed) {
            logger.warn('project-tree', 'Переименование отклонено', { name: nextName });
          }
        }
      }

      await render();
    };

    input.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        await finalize(true);
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        await finalize(false);
      }
    });

    input.addEventListener('blur', async () => {
      await finalize(true);
    });
  }

  function createTreeLabelClickHandler(documentRecord, labelNode) {
    const quickDoubleClickMs = 300;
    const renameMinDelayMs = 450;
    const renameMaxDelayMs = 900;

    return async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const now = Date.now();
      const isSameTarget = clickGestureState.path === documentRecord.path;
      const delta = isSameTarget ? now - clickGestureState.at : Number.POSITIVE_INFINITY;

      if (!isSameTarget || delta > renameMaxDelayMs) {
        clickGestureState.path = documentRecord.path;
        clickGestureState.at = now;
        return;
      }

      clickGestureState.path = null;
      clickGestureState.at = 0;

      if (delta <= quickDoubleClickMs) {
        await tabs.openDocument(documentRecord);
        return;
      }

      if (delta >= renameMinDelayMs) {
        await startTreeInlineRename({ record: documentRecord, labelNode });
      }
    };
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

  async function render() {
    const project = projectManager.getCurrentProject();

    treeRoot.innerHTML = '';

    if (projectPanelTitleNode) {
      projectPanelTitleNode.textContent = '';
    }

    if (!project) {
      return;
    }

    const projectNode = createElement('div', [APP_CONFIG.ui.classNames.projectNode]);
    projectNode.textContent = project.project.name;
    treeRoot.appendChild(projectNode);

    for (const sectionConfig of moduleSections) {
      const section = createElement('div');
      const header = createElement('div', ['tree-section-header']);
      header.textContent = sectionConfig.moduleName;

      const addButton = createElement('button', ['tree-add-button']);
      addButton.type = 'button';
      addButton.textContent = '+';
      addButton.addEventListener('click', async () => {
        await startDocumentCreation(sectionConfig);
      });

      header.appendChild(addButton);
      section.appendChild(header);

      const moduleDocuments = projectManager.getDocumentsByModule(sectionConfig.moduleId);

      for (const documentRecord of moduleDocuments) {
        const item = createElement('div', [APP_CONFIG.ui.classNames.treeItem]);
        const label = createElement('button', [APP_CONFIG.ui.classNames.treeItemLabel]);
        label.type = 'button';
        label.textContent = getDocumentLabel(documentRecord);

        const onLabelClick = createTreeLabelClickHandler(documentRecord, label);
        label.addEventListener('click', onLabelClick);

        const deleteButton = createElement('button', ['tree-item-delete']);
        deleteButton.type = 'button';
        deleteButton.textContent = '🗑';
        deleteButton.title = 'Удалить документ';
        deleteButton.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          tabs.closeTab(documentRecord.path);
          await projectManager.deleteDocument(documentRecord.path);
        });

        item.appendChild(label);
        item.appendChild(deleteButton);
        section.appendChild(item);
      }

      treeRoot.appendChild(section);
    }

    logger.info('project-tree', 'Дерево проекта обновлено');
  }

  projectManager.subscribe(() => {
    render().catch((error) => {
      logger.error('project-tree', 'Ошибка рендера дерева проекта', {
        message: error?.message || String(error)
      });
    });
  });

  return { render };
}
