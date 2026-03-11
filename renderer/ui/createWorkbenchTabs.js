import { APP_CONFIG } from '../../config/app-config.js';

function createElement(tagName, classNames = []) {
  const node = document.createElement(tagName);
  classNames.forEach((className) => node.classList.add(className));
  return node;
}

function buildTabTitleNode(title) {
  const titleNode = createElement('span', [APP_CONFIG.ui.classNames.tabTitle]);
  titleNode.textContent = title;
  return titleNode;
}

function buildCloseButtonNode(label) {
  const closeButtonNode = createElement('button', [APP_CONFIG.ui.classNames.tabClose]);
  closeButtonNode.type = 'button';
  closeButtonNode.textContent = '×';
  closeButtonNode.tabIndex = -1;
  closeButtonNode.setAttribute('aria-label', `Закрыть ${label}`);
  return closeButtonNode;
}

export function createWorkbenchTabs({ logger, openEditor }) {
  const tabsList = document.getElementById(APP_CONFIG.ui.dom.tabsListId);
  const editorHost = document.getElementById(APP_CONFIG.ui.dom.editorHostId);
  const tabs = new Map();

  function activateTab(tabId) {
    for (const entry of tabs.values()) {
      entry.tabNode.classList.toggle(APP_CONFIG.ui.classNames.tabActive, entry.tabId === tabId);
      entry.pageNode.classList.toggle(APP_CONFIG.ui.classNames.pageActive, entry.tabId === tabId);
    }
  }

  function closeTab(tabId) {
    const entry = tabs.get(tabId);

    if (!entry) {
      return;
    }

    const orderedEntries = Array.from(tabs.values());
    const index = orderedEntries.findIndex((tabEntry) => tabEntry.tabId === tabId);

    entry.runtime?.dispose?.();
    entry.pageNode.remove();
    entry.tabNode.remove();
    tabs.delete(tabId);

    const fallback = orderedEntries[index + 1] || orderedEntries[index - 1];

    if (fallback && tabs.has(fallback.tabId)) {
      activateTab(fallback.tabId);
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

    const tabTitle = documentRecord.document?.component?.name || APP_CONFIG.ui.text.untitled;
    tabNode.appendChild(buildTabTitleNode(tabTitle));

    const closeButton = buildCloseButtonNode(tabTitle);
    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeTab(tabId);
    });
    tabNode.appendChild(closeButton);

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
    activateTab,
    closeTab
  };
}
