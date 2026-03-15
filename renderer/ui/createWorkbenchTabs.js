import { APP_CONFIG } from '../../config/app-config.js';
import { finalizeEditingBeforeTabSwitch } from './tabEditLifecycle.js';
import { finalizeEditingBeforeContextTransition } from './editorContextLifecycle.js';
import { getDocumentLabel, getDocumentIdentityKey } from '../runtime/documentRecordIdentity.js';

function createElement(tagName, classNames = []) {
  const node = document.createElement(tagName);
  classNames.forEach((className) => node.classList.add(className));
  return node;
}

function normalizeName(name) {
  return String(name ?? '').trim();
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
  closeButtonNode.setAttribute('aria-label', `${APP_CONFIG.ui.text.closeAriaPrefix} ${label}`);
  return closeButtonNode;
}

export function createWorkbenchTabs({ logger, openEditor, projectManager }) {
  const tabsList = document.getElementById(APP_CONFIG.ui.dom.tabsListId);
  const editorHost = document.getElementById(APP_CONFIG.ui.dom.editorHostId);
  const tabs = new Map();
  let activeTabId = null;
  let temporaryCounter = 0;


  async function finalizeActiveEditorContextBeforeTransition({ reason, blockOnFailure = true } = {}) {
    const currentEntry = activeTabId && tabs.has(activeTabId) ? tabs.get(activeTabId) : null;
    const result = await finalizeEditingBeforeContextTransition({
      activeEntry: currentEntry,
      logger,
      source: APP_CONFIG.ui.runtime.loggerSources.tabs,
      reason,
      blockOnFailure
    });

    return result;
  }

  async function activateTab(tabId) {
    const currentEntry = activeTabId && tabs.has(activeTabId) ? tabs.get(activeTabId) : null;
    const canActivate = await finalizeEditingBeforeTabSwitch({
      activeEntry: currentEntry,
      nextTabId: tabId,
      logger
    });

    if (!canActivate) {
      return false;
    }

    activeTabId = tabId;
    for (const entry of tabs.values()) {
      entry.tabNode.classList.toggle(APP_CONFIG.ui.classNames.tabActive, entry.tabId === tabId);
      entry.pageNode.classList.toggle(APP_CONFIG.ui.classNames.pageActive, entry.tabId === tabId);
    }

    return true;
  }

  function updateTabTitle(entry) {
    const titleNode = entry.tabNode.querySelector(`.${APP_CONFIG.ui.classNames.tabTitle}`);
    if (titleNode) {
      titleNode.textContent = getDocumentLabel(entry.documentRecord);
    }
  }


  async function syncEntryDocumentRecordToProject(entry) {
    if (!entry) {
      return null;
    }

    let nextRecord = entry.documentRecord;

    if (typeof entry.runtime?.collectDocumentRecord === 'function') {
      nextRecord = await entry.runtime.collectDocumentRecord();

      if (nextRecord?.moduleId && nextRecord?.path && nextRecord?.document) {
        entry.documentRecord = nextRecord;
      } else {
        nextRecord = entry.documentRecord;
      }
    }

    if (nextRecord?.moduleId && nextRecord?.path && nextRecord?.document) {
      await projectManager?.replaceDocumentRecord?.(nextRecord);
    }

    return nextRecord;
  }

  function resolveTabId(targetIdentity) {
    if (tabs.has(targetIdentity)) {
      return targetIdentity;
    }

    const identityKeyFromRecord = targetIdentity && typeof targetIdentity === 'object'
      ? getDocumentIdentityKey(targetIdentity)
      : '';

    for (const [candidateTabId, candidateEntry] of tabs.entries()) {
      const candidateIdentityKey = getDocumentIdentityKey(candidateEntry.documentRecord);

      if (identityKeyFromRecord && candidateIdentityKey === identityKeyFromRecord) {
        return candidateTabId;
      }

      if (candidateIdentityKey && candidateIdentityKey === targetIdentity) {
        return candidateTabId;
      }

      if (candidateEntry.documentRecord === targetIdentity) {
        return candidateTabId;
      }

      if (candidateEntry.documentRecord?.path === targetIdentity) {
        return candidateTabId;
      }
    }

    return null;
  }


  async function closeTab(tabId, options = {}) {
    const resolvedTabId = resolveTabId(tabId);
    const entry = resolvedTabId ? tabs.get(resolvedTabId) : null;

    if (!entry) {
      return;
    }

    const orderedEntries = Array.from(tabs.values());
    const index = orderedEntries.findIndex((tabEntry) => tabEntry.tabId === resolvedTabId);

    await finalizeEditingBeforeContextTransition({
      activeEntry: entry,
      logger,
      source: APP_CONFIG.ui.runtime.loggerSources.tabs,
      reason: APP_CONFIG.ui.runtime.transitionReasons.tabClose,
      blockOnFailure: false
    });

    if (!options.skipProjectSync) {
      try {
        await syncEntryDocumentRecordToProject(entry);
      } catch (error) {
        logger.error(APP_CONFIG.ui.runtime.loggerSources.tabs, 'Ошибка синхронизации snapshot перед закрытием вкладки', {
          tabId: resolvedTabId,
          message: error?.message || String(error)
        });
      }
    }

    entry.runtime?.dispose?.();
    entry.pageNode.remove();
    entry.tabNode.remove();
    tabs.delete(resolvedTabId);

    if (activeTabId === resolvedTabId) {
      activeTabId = null;
    }

    const fallback = orderedEntries[index + 1] || orderedEntries[index - 1];

    if (fallback && tabs.has(fallback.tabId)) {
      await activateTab(fallback.tabId);
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
        moduleId: APP_CONFIG.project.moduleIds.temporary,
        path: tabId,
        document: { name: initialTitle || APP_CONFIG.ui.text.untitled }
      },
      isTemporary: true
    };

    tabNode.addEventListener('click', async () => {
      await activateTab(entry.tabId);
    });
    tabsList.appendChild(tabNode);
    tabs.set(tabId, entry);
    void activateTab(tabId);

    return entry;
  }

  async function startTemporaryDocumentCreation({ moduleId, defaultName = '', onCommit }) {
    const tabId = `${APP_CONFIG.project.temporaryDocumentPathPrefix}${moduleId}/${++temporaryCounter}`;
    const entry = createTemporaryTabEntry({ tabId, initialTitle: defaultName || APP_CONFIG.ui.text.untitled });

    const titleNode = entry.tabNode.querySelector(`.${APP_CONFIG.ui.classNames.tabTitle}`);

    if (!titleNode) {
      return null;
    }

    const input = createElement('input', [APP_CONFIG.ui.classNames.inlineRenameInput]);
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
        logger.warn(APP_CONFIG.ui.runtime.loggerSources.tabs, 'Создание документа отклонено', { moduleId, name: nextName });
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

  async function closeAllTabs(options = {}) {
    for (const tabId of Array.from(tabs.keys())) {
      await closeTab(tabId, options);
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
    const input = createElement('input', [APP_CONFIG.ui.classNames.inlineRenameInput]);
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
          logger.warn(APP_CONFIG.ui.runtime.loggerSources.tabs, 'Пустое имя отклонено');
        } else {
          const renamed = await projectManager.renameDocument(getDocumentIdentityKey(entry.documentRecord), nextName);

          if (!renamed) {
            logger.warn(APP_CONFIG.ui.runtime.loggerSources.tabs, 'Переименование отклонено', { name: nextName });
          } else {
            if (renamed.nextPath !== renamed.previousPath) {
              entry.documentRecord.path = renamed.nextPath;
            }

            updatedTabId = entry.tabId;
            entry.pageNode.dataset.tabId = entry.tabId;
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
          await activateTab(updatedTabId);
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        const updatedTabId = await finalize(false);
        if (updatedTabId) {
          await activateTab(updatedTabId);
        }
      }
    });

    input.addEventListener('blur', async () => {
      const updatedTabId = await finalize(true);
      if (updatedTabId) {
        await activateTab(updatedTabId);
      }
    });

    return true;
  }


  function findTabByDocument(documentRecord) {
    const identityKey = getDocumentIdentityKey(documentRecord);

    if (!identityKey) {
      return null;
    }

    for (const entry of tabs.values()) {
      if (getDocumentIdentityKey(entry.documentRecord) === identityKey) {
        return entry;
      }
    }

    return null;
  }

  async function openOrActivateDocument(documentRecord, options = {}) {
    const existingEntry = findTabByDocument(documentRecord);

    if (existingEntry) {
      await activateTab(existingEntry.tabId);
      return existingEntry;
    }

    return openDocument(documentRecord, options);
  }

  async function openDocument(documentRecord, { startRenameMode = false } = {}) {
    const tabId = getDocumentIdentityKey(documentRecord);

    const existingEntry = tabs.get(tabId) || findTabByDocument(documentRecord);
    if (existingEntry) {
      void activateTab(existingEntry.tabId);
      if (startRenameMode) {
        await startRename(existingEntry.tabId);
      }
      return existingEntry;
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

    tabNode.addEventListener('click', async () => {
      await activateTab(entry.tabId);
    });
    tabNode.addEventListener('dblclick', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await startRename(entry.tabId);
    });

    tabsList.appendChild(tabNode);
    void activateTab(tabId);

    if (startRenameMode) {
      await startRename(entry.tabId);
    }

    logger.info(APP_CONFIG.ui.runtime.loggerSources.tabs, 'Открыта вкладка', { tabId });
    return entry;
  }

  async function collectOpenDocumentRecords() {
    const output = [];

    await finalizeActiveEditorContextBeforeTransition({
      reason: APP_CONFIG.ui.runtime.transitionReasons.collectOpenDocumentRecords,
      blockOnFailure: false
    });

    for (const entry of tabs.values()) {
      try {
        const nextRecord = await syncEntryDocumentRecordToProject(entry);
        output.push(nextRecord || entry.documentRecord);
      } catch (error) {
        logger.error(APP_CONFIG.ui.runtime.loggerSources.tabs, 'Ошибка синхронизации snapshot открытого документа', {
          tabId: entry.tabId,
          message: error?.message || String(error)
        });
        output.push(entry.documentRecord);
      }
    }

    return output;
  }

  function updateTabPaths(pathMap) {
    if (!pathMap || typeof pathMap.entries !== 'function') {
      return;
    }

    for (const [identityKey, nextPath] of pathMap.entries()) {
      if (!tabs.has(identityKey)) {
        continue;
      }

      const entry = tabs.get(identityKey);
      entry.documentRecord.path = nextPath;
      entry.pageNode.dataset.tabId = identityKey;
    }
  }

  return {
    openDocument,
    openOrActivateDocument,
    findTabByDocument,
    activateTab,
    closeTab,
    closeAllTabs,
    getActiveDocumentRecord,
    collectOpenDocumentRecords,
    startRename,
    updateTabPaths,
    startTemporaryDocumentCreation,
    finalizeActiveEditorContextBeforeTransition
  };
}
