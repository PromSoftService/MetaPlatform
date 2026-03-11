import Split from 'split.js';
import { mergeLocales } from '@univerjs/presets';
import UniverPresetSheetsCoreRuRU from '@univerjs/preset-sheets-core/locales/ru-RU';
import { UniverSheetsDataValidationPreset } from '@univerjs/preset-sheets-data-validation';
import UniverPresetSheetsDataValidationRuRU from '@univerjs/preset-sheets-data-validation/locales/ru-RU';

import '@univerjs/sheets/facade';
import '@univerjs/sheets-ui/facade';

import '@univerjs/preset-sheets-core/lib/index.css';
import '@univerjs/preset-sheets-data-validation/lib/index.css';

import { APP_CONFIG } from '../../../config/app-config.js';
import { METAGEN_CONFIG } from '../../modules/metagen/metagenConfig.js';
import { clearMountElement } from '../shared/editorHost.js';
import { createMetaGenParamsSheet } from '../../modules/metagen/tables/createMetaGenParamsSheet.js';
import { createMetaGenDataSheet } from '../../modules/metagen/tables/createMetaGenDataSheet.js';

function createElement(tagName, classNames = []) {
  const node = document.createElement(tagName);
  classNames.forEach((className) => node.classList.add(className));
  return node;
}

function buildLocale() {
  const locale = mergeLocales(UniverPresetSheetsCoreRuRU, UniverPresetSheetsDataValidationRuRU);
  const labels = METAGEN_CONFIG.tableRuntime.contextMenuLabels;

  if (locale.rightClick) {
    locale.rightClick.copy = labels.copy;
    locale.rightClick.cut = labels.cut;
    locale.rightClick.paste = labels.paste;
    locale.rightClick.insertRowBefore = labels.insertRowBefore;
    locale.rightClick.insertColumnBefore = labels.insertColumnBefore;
  }

  return locale;
}

function createPanel({ headerText, panelClassName, contentNode }) {
  const panelNode = createElement('div', [panelClassName]);
  const headerNode = createElement('div', [APP_CONFIG.ui.classNames.editorPanelHeader]);
  const contentWrapperNode = createElement('div', ['metagen-editor-panel-content']);

  headerNode.textContent = headerText;
  contentWrapperNode.appendChild(contentNode);
  panelNode.appendChild(headerNode);
  panelNode.appendChild(contentWrapperNode);

  return panelNode;
}

function buildEditor(documentRecord) {
  const root = createElement('div', [APP_CONFIG.ui.classNames.editorRoot]);
  const grid = createElement('div', [APP_CONFIG.ui.classNames.editorGrid]);

  const paramsContainer = createElement('div', ['metagen-editor-table-container']);
  const codeTextarea = createElement('textarea', [APP_CONFIG.ui.classNames.editorTextarea]);
  const dataContainer = createElement('div', ['metagen-editor-table-container']);

  const uid = String(documentRecord.path || documentRecord.document?.component?.id || 'metagen').replace(/[^a-zA-Z0-9_-]/g, '_');

  paramsContainer.id = `metagen-params-${uid}`;
  dataContainer.id = `metagen-data-${uid}`;

  const paramsPanel = createPanel({
    headerText: APP_CONFIG.ui.panelHeaders.params,
    panelClassName: APP_CONFIG.ui.classNames.editorPanel,
    contentNode: paramsContainer
  });

  const codePanel = createPanel({
    headerText: APP_CONFIG.ui.panelHeaders.code,
    panelClassName: APP_CONFIG.ui.classNames.editorPanel,
    contentNode: codeTextarea
  });

  const dataPanel = createPanel({
    headerText: APP_CONFIG.ui.panelHeaders.data,
    panelClassName: APP_CONFIG.ui.classNames.editorPanel,
    contentNode: dataContainer
  });

  grid.appendChild(paramsPanel);
  grid.appendChild(codePanel);
  grid.appendChild(dataPanel);
  root.appendChild(grid);

  return {
    root,
    grid,
    paramsPanel,
    codePanel,
    dataPanel,
    paramsContainer,
    dataContainer,
    codeTextarea
  };
}

function bindSaveShortcut(textarea, trySave) {
  textarea.addEventListener('keydown', async (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === METAGEN_CONFIG.editor.saveShortcutKey) {
      event.preventDefault();
      await trySave();
    }
  });
}

export async function createMetaGenEditor({ documentRecord, mountElement, logger, onSave }) {
  clearMountElement(mountElement);

  const locale = buildLocale();
  const tableConfig = METAGEN_CONFIG.tableRuntime;
  const logMessages = tableConfig.logMessages;
  const loggerSource = `${METAGEN_CONFIG.moduleId}.editor`;
  const paramsSource = `${METAGEN_CONFIG.moduleId}.table.params`;
  const dataSource = `${METAGEN_CONFIG.moduleId}.table.data`;
  const autoStyleSource = `${METAGEN_CONFIG.moduleId}.table.params.auto-style`;

  const {
    root,
    grid,
    paramsPanel,
    codePanel,
    dataPanel,
    paramsContainer,
    dataContainer,
    codeTextarea
  } = buildEditor(documentRecord);

  codeTextarea.value = documentRecord.document?.code?.text || '';

  mountElement.appendChild(root);

  const split = Split([paramsPanel, codePanel, dataPanel], {
    sizes: METAGEN_CONFIG.editor.layout.sizes,
    minSize: METAGEN_CONFIG.editor.layout.minSize,
    gutterSize: METAGEN_CONFIG.editor.layout.gutterSize,
    cursor: METAGEN_CONFIG.editor.layout.cursor,
    elementStyle: (dimension, size, gutterSize) => ({
      'flex-basis': `calc(${size}% - ${gutterSize}px)`
    }),
    gutterStyle: (dimension, gutterSize) => ({
      'flex-basis': `${gutterSize}px`
    })
  });

  const documentComponentId = String(documentRecord.document?.component?.id || 'component');

  const paramsTable = createMetaGenParamsSheet({
    container: paramsContainer.id,
    locale,
    logger,
    source: paramsSource,
    autoStyleSource,
    workbookId: `wb_params_${documentComponentId}`,
    workbookName: tableConfig.workbooks.displayNames.params,
    sheetId: `sheet_params_${documentComponentId}_1`,
    sheetName: `params_sheet_${documentComponentId}_1`,
    tableConfig: tableConfig.tables.params,
    logMessages,
    paramsDocument: documentRecord.document?.params || {}
  });

  const dataTable = await createMetaGenDataSheet({
    container: dataContainer.id,
    locale,
    logger,
    source: dataSource,
    workbookId: `wb_data_${documentComponentId}`,
    workbookName: tableConfig.workbooks.displayNames.data,
    sheetId: `sheet_data_${documentComponentId}`,
    sheetName: `data_sheet_${documentComponentId}`,
    tableConfig: tableConfig.tables.data,
    hiddenMenuCommands: tableConfig.hiddenDataTableMenuCommands,
    logMessages,
    dataValidationPreset: UniverSheetsDataValidationPreset,
    dataDocument: documentRecord.document?.data || {}
  });

  async function extractValue() {
    documentRecord.document.params = paramsTable?.extractDocumentValue?.() || {
      format: 'header-plus-rows',
      header: [],
      rows: []
    };
    documentRecord.document.data = dataTable?.extractDocumentValue?.() || {
      format: 'table',
      columns: [],
      rows: []
    };
    documentRecord.document.code.text = codeTextarea.value;
    return documentRecord;
  }

  async function trySave() {
    try {
      const nextRecord = await extractValue();
      await onSave(nextRecord);
    } catch (error) {
      window.alert(`Ошибка сохранения: ${error?.message || String(error)}`);
    }
  }

  bindSaveShortcut(codeTextarea, trySave);

  logger?.info(loggerSource, 'MetaGen табличный редактор инициализирован');

  return {
    paramsTable,
    dataTable,
    dispose() {
      paramsTable?.dispose?.();
      dataTable?.dispose?.();
      split?.destroy?.();
      clearMountElement(mountElement);
    }
  };
}
