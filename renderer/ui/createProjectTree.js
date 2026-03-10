import { APP_CONFIG } from '../../config/app-config.js';
import { METAGEN_CONFIG } from '../modules/metagen/metagenConfig.js';
import { METALAB_CONFIG } from '../modules/metalab/metalabConfig.js';
import { METAVIEW_CONFIG } from '../modules/metaview/metaviewConfig.js';

function createElement(tagName, classNames = []) {
  const node = document.createElement(tagName);
  classNames.forEach((className) => node.classList.add(className));
  return node;
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

  const moduleSections = [
    {
      moduleId: METAGEN_CONFIG.moduleId,
      moduleName: METAGEN_CONFIG.moduleName,
      createPromptTitle: METAGEN_CONFIG.ui.createPromptTitle,
      defaultName: METAGEN_CONFIG.defaults.newDocumentName
    },
    {
      moduleId: METALAB_CONFIG.moduleId,
      moduleName: METALAB_CONFIG.moduleName,
      createPromptTitle: 'Имя сценария MetaLab',
      defaultName: 'Новый сценарий'
    },
    {
      moduleId: METAVIEW_CONFIG.moduleId,
      moduleName: METAVIEW_CONFIG.moduleName,
      createPromptTitle: 'Имя экрана MetaView',
      defaultName: 'Новый экран'
    }
  ];

  async function render() {
    const project = projectManager.getCurrentProject();

    if (!project) {
      treeRoot.innerHTML = '';
      return;
    }

    treeRoot.innerHTML = '';

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
        const nextName = window.prompt(sectionConfig.createPromptTitle, sectionConfig.defaultName);

        if (!nextName) {
          return;
        }

        const created = await projectManager.createDocument(sectionConfig.moduleId, nextName);

        if (created) {
          await tabs.openDocument(created);
        }
      });

      header.appendChild(addButton);
      section.appendChild(header);

      const moduleDocuments = projectManager.getDocumentsByModule(sectionConfig.moduleId);

      for (const documentRecord of moduleDocuments) {
        const item = createElement('div', [APP_CONFIG.ui.classNames.treeItem]);
        const label = createElement('button', [APP_CONFIG.ui.classNames.treeItemLabel]);
        label.type = 'button';
        label.textContent = getDocumentLabel(documentRecord);

        label.addEventListener('click', async () => {
          await tabs.openDocument(documentRecord);
        });

        item.appendChild(label);
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
