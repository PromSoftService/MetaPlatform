import { APP_CONFIG } from '../../config/app-config.js';

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

function setDocumentLabel(documentRecord, title) {
  if (documentRecord?.document?.component) {
    documentRecord.document.component.name = title;
    return;
  }

  if (documentRecord?.document?.scenario) {
    documentRecord.document.scenario.name = title;
    return;
  }

  if (documentRecord?.document?.screen) {
    documentRecord.document.screen.name = title;
    return;
  }

  if (documentRecord?.document) {
    documentRecord.document.name = title;
  }
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

export function createWorkbenchTabs({ logger, openEditor, projectManager }) {
  const tabsList = document.getElementById(APP_CONFIG.ui.dom.tabsListId);
  const editorHost = document.getElementById(APP_CONFIG.ui.dom.editorHostId);
  const tabs = new Map();
  let activeTabId = null;
  let temporaryCounter = 0;

  function activateTab(tabId) {
    activeTabId = tabId;
    for (const entry of tabs.values()) {
      entry.tabNode.classList.toggle(APP_CONFIG.ui.classNames.tabActive, entry.tabId === tabId);
      entry.pageNode.classList.toggle(APP_CONFIG.ui.classNames.pageActive, entry.tabId === tabId);
    }
  }

  function updateTabTitle(entry) {
    const titleNode = entry.tabNode.querySelector(`.${APP_CONFIG.ui.classNames.tabTitle}`);
    if (titleNode) {
      titleNode.textContent = getDocumentLabel(entry.documentRecord);
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

    if (activeTabId === tabId) {
      activeTabId = null;
    }

    const fallback = orderedEntries[index + 1] || orderedEntries[index - 1];

    if (fallback && tabs.has(fallback.tabId)) {
      activateTab(fallback.tabId);
    }
  }

  function createTemporaryTabEntry({ tabId, initialTitle }) {
    const tabNode = createElement('button', [APP_CONFIG.ui.classNames.tab]);
    tabNode.type = 'button';

    const titleNode = buildTabTitleNode(initialTitle || APP_CONFIG.ui.text.untitled);
    tabNode.appendChild(titleNode);

    const closeButton = buildCloseButtonNode(initialTitle || APP_CONFIG.ui.text.untitled);
    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeTab(tabId);
    });
    tabNode.appendChild(closeButton);

    const pageNode = createElement('div', [APP_CONFIG.ui.classNames.page]);
    pageNode.dataset.tabId = tabId;
    editorHost.appendChild(pageNode);

    const entry = {
      tabId,
      tabNode,
      pageNode,
      runtime: null,
      documentRecord: {
        moduleId: 'temporary',
        path: tabId,
        document: { name: initialTitle || APP_CONFIG.ui.text.untitled }
      },
      isTemporary: true
    };

    tabNode.addEventListener('click', () => activateTab(entry.tabId));
    tabsList.appendChild(tabNode);
    tabs.set(tabId, entry);
    activateTab(tabId);

    return entry;
  }

  async function startTemporaryDocumentCreation({ moduleId, defaultName = '', onCommit }) {
    const tabId = `temporary://${moduleId}/${++temporaryCounter}`;
    const entry = createTemporaryTabEntry({ tabId, initialTitle: defaultName || APP_CONFIG.ui.text.untitled });

    const titleNode = entry.tabNode.querySelector(`.${APP_CONFIG.ui.classNames.tabTitle}`);

    if (!titleNode) {
      return null;
    }

    const input = createElement('input', ['workbench-inline-rename-input']);
    input.type = 'text';
    input.value = defaultName;
    titleNode.replaceWith(input);
    input.focus();
    input.select();

    let finalized = false;

    const cancel = () => {
      if (finalized) {
        return null;
      }

      finalized = true;
      closeTab(tabId);
      return null;
    };

    const commit = async () => {
      if (finalized) {
        return null;
      }

      const nextName = normalizeName(input.value);

      if (!nextName) {
        return cancel();
      }

      const created = await onCommit?.({ moduleId, confirmedName: nextName });

      if (!created) {
        logger.warn('tabs', 'Создание документа отклонено', { moduleId, name: nextName });
        input.focus();
        input.select();
        return null;
      }

      finalized = true;
      closeTab(tabId);
      await openDocument(created);
      return created;
    };

    input.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        await commit();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    });

    input.addEventListener('blur', async () => {
      if (!normalizeName(input.value)) {
        cancel();
        return;
      }

      await commit();
    });

    return entry;
  }

  function closeAllTabs() {
    for (const tabId of Array.from(tabs.keys())) {
      closeTab(tabId);
    }
  }

  function getActiveDocumentRecord() {
    if (!activeTabId || !tabs.has(activeTabId)) {
      return null;
    }

    return tabs.get(activeTabId).documentRecord;
  }

  async function startRename(tabId) {
    const entry = tabs.get(tabId);

    if (!entry) {
      return false;
    }

    const titleNode = entry.tabNode.querySelector(`.${APP_CONFIG.ui.classNames.tabTitle}`);

    if (!titleNode || titleNode.dataset.renaming === '1') {
      return false;
    }

    titleNode.dataset.renaming = '1';

    const previousName = getDocumentLabel(entry.documentRecord);
    const input = createElement('input', ['workbench-inline-rename-input']);
    input.type = 'text';
    input.value = previousName;

    titleNode.replaceWith(input);
    input.focus();
    input.select();

    let finalized = false;

    const finalize = async (commit) => {
      if (finalized) {
        return false;
      }

      finalized = true;
      const nextName = normalizeName(input.value);
      let updatedTabId = tabId;

      if (commit) {
        if (!nextName) {
          logger.warn('tabs', 'Пустое имя отклонено');
        } else {
          const renamed = await projectManager.renameDocument(tabId, nextName);

          if (!renamed) {
            logger.warn('tabs', 'Переименование отклонено', { name: nextName });
          } else {
            setDocumentLabel(entry.documentRecord, nextName);

            if (renamed.nextPath !== renamed.previousPath) {
              tabs.delete(renamed.previousPath);
              entry.tabId = renamed.nextPath;
              entry.documentRecord.path = renamed.nextPath;
              tabs.set(renamed.nextPath, entry);

              if (activeTabId === renamed.previousPath) {
                activeTabId = renamed.nextPath;
              }

              entry.pageNode.dataset.tabId = renamed.nextPath;
              updatedTabId = renamed.nextPath;
            }

            updateTabTitle(entry);
          }
        }
      }

      const restoredTitle = buildTabTitleNode(getDocumentLabel(entry.documentRecord));
      restoredTitle.dataset.renaming = '0';
      input.replaceWith(restoredTitle);

      return updatedTabId;
    };

    input.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const updatedTabId = await finalize(true);
        if (updatedTabId) {
          activateTab(updatedTabId);
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        const updatedTabId = await finalize(false);
        if (updatedTabId) {
          activateTab(updatedTabId);
        }
      }
    });

    input.addEventListener('blur', async () => {
      const updatedTabId = await finalize(true);
      if (updatedTabId) {
        activateTab(updatedTabId);
      }
    });

    return true;
  }

  async function openDocument(documentRecord, { startRenameMode = false } = {}) {
    const tabId = documentRecord.path;

    if (tabs.has(tabId)) {
      activateTab(tabId);
      if (startRenameMode) {
        await startRename(tabId);
      }
      return tabs.get(tabId);
    }

    const tabNode = createElement('button', [APP_CONFIG.ui.classNames.tab]);
    tabNode.type = 'button';

    const tabTitle = getDocumentLabel(documentRecord);
    tabNode.appendChild(buildTabTitleNode(tabTitle));

    const closeButton = buildCloseButtonNode(tabTitle);
    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeTab(tabId);
    });
    tabNode.appendChild(closeButton);

    const pageNode = createElement('div', [APP_CONFIG.ui.classNames.page]);
    pageNode.dataset.tabId = tabId;
    editorHost.appendChild(pageNode);

    const runtime = await openEditor({
      documentRecord,
      mountElement: pageNode
    });

    const entry = { tabId, tabNode, pageNode, runtime, documentRecord };
    tabs.set(tabId, entry);

    tabNode.addEventListener('click', () => activateTab(entry.tabId));
    tabNode.addEventListener('dblclick', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await startRename(entry.tabId);
    });

    tabsList.appendChild(tabNode);
    activateTab(tabId);

    if (startRenameMode) {
      await startRename(entry.tabId);
    }

    logger.info('tabs', 'Открыта вкладка', { tabId });
    return entry;
  }

  async function collectOpenDocumentRecords() {
    const output = [];

    for (const entry of tabs.values()) {
      if (typeof entry.runtime?.collectDocumentRecord === 'function') {
        const nextRecord = await entry.runtime.collectDocumentRecord();
        entry.documentRecord = nextRecord;
      }

      output.push(entry.documentRecord);
    }

    return output;
  }

  function updateTabPaths(pathMap) {
    if (!pathMap || typeof pathMap.entries !== 'function') {
      return;
    }

    for (const [previousPath, nextPath] of pathMap.entries()) {
      if (!tabs.has(previousPath)) {
        continue;
      }

      const entry = tabs.get(previousPath);
      tabs.delete(previousPath);
      entry.tabId = nextPath;
      entry.documentRecord.path = nextPath;
      entry.pageNode.dataset.tabId = nextPath;
      tabs.set(nextPath, entry);

      if (activeTabId === previousPath) {
        activeTabId = nextPath;
      }
    }
  }

  return {
    openDocument,
    activateTab,
    closeTab,
    closeAllTabs,
    getActiveDocumentRecord,
    collectOpenDocumentRecords,
    startRename,
    updateTabPaths,
    startTemporaryDocumentCreation
  };
}
