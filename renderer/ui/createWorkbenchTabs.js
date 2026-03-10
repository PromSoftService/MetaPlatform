import { APP_CONFIG } from '../../config/app-config.js';

function createElement(tagName, classNames = []) {
  const node = document.createElement(tagName);
  classNames.forEach((className) => node.classList.add(className));
  return node;
}

export function createWorkbenchTabs({ logger, moduleRegistry, openEditor }) {
  const tabsList = document.getElementById(APP_CONFIG.ui.dom.tabsListId);
  const editorHost = document.getElementById(APP_CONFIG.ui.dom.editorHostId);
  const tabs = new Map();

  function activateTab(tabId) {
    for (const entry of tabs.values()) {
      entry.tabNode.classList.toggle(APP_CONFIG.ui.classNames.tabActive, entry.tabId === tabId);
      entry.pageNode.classList.toggle(APP_CONFIG.ui.classNames.pageActive, entry.tabId === tabId);
    }
  }

  async function openDocument(documentRecord) {
    const tabId = documentRecord.path;

    if (tabs.has(tabId)) {
      activateTab(tabId);
      return tabs.get(tabId);
    }

    const tabNode = createElement('button', [APP_CONFIG.ui.classNames.tab]);
    tabNode.type = 'button';
    tabNode.textContent = documentRecord.document?.component?.name || APP_CONFIG.ui.text.untitled;

    const pageNode = createElement('div', [APP_CONFIG.ui.classNames.page]);
    editorHost.appendChild(pageNode);

    const runtime = await openEditor({
      documentRecord,
      mountElement: pageNode
    });

    const entry = { tabId, tabNode, pageNode, runtime, documentRecord };
    tabs.set(tabId, entry);

    tabNode.addEventListener('click', () => activateTab(tabId));
    tabsList.appendChild(tabNode);
    activateTab(tabId);

    logger.info('tabs', 'Открыта вкладка', { tabId });
    return entry;
  }

  return {
    openDocument,
    activateTab
  };
}