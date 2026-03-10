import { APP_CONFIG } from '../../config/app-config.js';

function createElement(tagName, classNames = []) {
  const node = document.createElement(tagName);
  classNames.forEach((className) => node.classList.add(className));
  return node;
}

export function createProjectTree({
  logger,
  projectManager,
  tabs
}) {
  const treeRoot = document.getElementById(APP_CONFIG.ui.dom.projectTreeId);

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

    const metagenSection = createElement('div');
    const header = createElement('div', ['tree-section-header']);
    header.textContent = APP_CONFIG.ui.text.metaGenSectionTitle;

    const addButton = createElement('button', ['tree-add-button']);
    addButton.type = 'button';
    addButton.textContent = APP_CONFIG.ui.text.addButtonLabel;
    addButton.addEventListener('click', async () => {
      const nextName = window.prompt(
        'Имя документа MetaGen',
        APP_CONFIG.ui.text.defaultMetaGenDocumentName
      );

      if (!nextName) {
        return;
      }

      const created = await projectManager.createDocument('metagen', nextName);

      if (created) {
        await tabs.openDocument(created);
      }
    });

    header.appendChild(addButton);
    metagenSection.appendChild(header);

    for (const documentRecord of projectManager.getMetaGenDocuments()) {
      const item = createElement('div', [APP_CONFIG.ui.classNames.treeItem]);
      const label = createElement('button', [APP_CONFIG.ui.classNames.treeItemLabel]);
      label.type = 'button';
      label.textContent =
        documentRecord.document?.component?.name || APP_CONFIG.ui.text.untitled;

      label.addEventListener('click', async () => {
        await tabs.openDocument(documentRecord);
      });

      item.appendChild(label);
      metagenSection.appendChild(item);
    }

    treeRoot.appendChild(metagenSection);
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