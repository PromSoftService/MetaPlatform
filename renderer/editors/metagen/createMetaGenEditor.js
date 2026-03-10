import { APP_CONFIG } from '../../../config/app-config.js';
import { METAGEN_CONFIG } from '../../modules/metagen/metagenConfig.js';
import { clearMountElement } from '../shared/editorHost.js';

function createElement(tagName, classNames = []) {
  const node = document.createElement(tagName);
  classNames.forEach((className) => node.classList.add(className));
  return node;
}

function buildEditor(documentRecord) {
  const root = createElement('div', [APP_CONFIG.ui.classNames.editorRoot]);
  const grid = createElement('div', [APP_CONFIG.ui.classNames.editorGrid]);

  const paramsPanel = createElement('div', [APP_CONFIG.ui.classNames.editorPanel]);
  const codePanel = createElement('div', [APP_CONFIG.ui.classNames.editorPanel]);
  const dataPanel = createElement('div', [APP_CONFIG.ui.classNames.editorPanel]);

  const paramsHeader = createElement('div', [APP_CONFIG.ui.classNames.editorPanelHeader]);
  const codeHeader = createElement('div', [APP_CONFIG.ui.classNames.editorPanelHeader]);
  const dataHeader = createElement('div', [APP_CONFIG.ui.classNames.editorPanelHeader]);

  paramsHeader.textContent = APP_CONFIG.ui.panelHeaders.params;
  codeHeader.textContent = APP_CONFIG.ui.panelHeaders.code;
  dataHeader.textContent = APP_CONFIG.ui.panelHeaders.data;

  const paramsTextarea = createElement('textarea', [APP_CONFIG.ui.classNames.editorTextarea]);
  const codeTextarea = createElement('textarea', [APP_CONFIG.ui.classNames.editorTextarea]);
  const dataTextarea = createElement('textarea', [APP_CONFIG.ui.classNames.editorTextarea]);

  paramsTextarea.value = JSON.stringify(documentRecord.document?.params || {}, null, 2);
  dataTextarea.value = JSON.stringify(documentRecord.document?.data || {}, null, 2);
  codeTextarea.value = documentRecord.document?.code?.text || '';

  paramsPanel.appendChild(paramsHeader);
  paramsPanel.appendChild(paramsTextarea);

  codePanel.appendChild(codeHeader);
  codePanel.appendChild(codeTextarea);

  dataPanel.appendChild(dataHeader);
  dataPanel.appendChild(dataTextarea);

  grid.appendChild(paramsPanel);
  grid.appendChild(codePanel);
  grid.appendChild(dataPanel);
  root.appendChild(grid);

  return {
    root,
    paramsTextarea,
    dataTextarea,
    codeTextarea
  };
}

export async function createMetaGenEditor({
  documentRecord,
  mountElement,
  onSave
}) {
  clearMountElement(mountElement);

  const { root, paramsTextarea, dataTextarea, codeTextarea } = buildEditor(documentRecord);
  mountElement.appendChild(root);

  function extractValue() {
    documentRecord.document.params = JSON.parse(paramsTextarea.value || '{}');
    documentRecord.document.data = JSON.parse(dataTextarea.value || '{}');
    documentRecord.document.code.text = codeTextarea.value;
    return documentRecord;
  }

  async function trySave() {
    try {
      const nextRecord = extractValue();
      await onSave(nextRecord);
    } catch (error) {
      window.alert(`Ошибка сохранения: ${error?.message || String(error)}`);
    }
  }

  function bindSaveShortcut(textarea) {
    textarea.addEventListener('keydown', async (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === METAGEN_CONFIG.editor.saveShortcutKey) {
        event.preventDefault();
        await trySave();
      }
    });
  }

  bindSaveShortcut(paramsTextarea);
  bindSaveShortcut(dataTextarea);
  bindSaveShortcut(codeTextarea);

  return {
    dispose() {
      clearMountElement(mountElement);
    }
  };
}