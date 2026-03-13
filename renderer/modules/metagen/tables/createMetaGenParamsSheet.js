import { createMetaGenSimpleSheet } from './createMetaGenSimpleSheet.js';
import { createMetaGenParamsTableAutoStyle } from './metaGenParamsTableAutoStyle.js';
import { readSheetMatrix } from './sheetSnapshot.js';

function writeParamsDocumentToSheet(sheet, paramsDocument, columnCount) {
  const rows = [];

  if (Array.isArray(paramsDocument?.header) && paramsDocument.header.length > 0) {
    rows.push(paramsDocument.header);
  }

  if (Array.isArray(paramsDocument?.rows)) {
    rows.push(...paramsDocument.rows);
  }

  rows.forEach((rowValues, rowIndex) => {
    if (!Array.isArray(rowValues) || rowValues.length === 0) {
      return;
    }

    const limited = rowValues.slice(0, columnCount);
    sheet.getRange(rowIndex, 0, 1, limited.length).setValues([limited]);
  });
}

function extractHeader(sheet, columnCount) {
  return readSheetMatrix(sheet, 0, 1, columnCount)[0] || [];
}

function extractBodyRows(sheet, rowCount, columnCount) {
  if (rowCount <= 1) {
    return [];
  }

  return readSheetMatrix(sheet, 1, rowCount - 1, columnCount);
}

export function createMetaGenParamsSheet({
  container,
  locale,
  logger,
  source,
  autoStyleSource,
  workbookId,
  workbookName,
  sheetId,
  sheetName,
  tableConfig,
  logMessages,
  paramsDocument
}) {
  const sheetRuntime = createMetaGenSimpleSheet({
    container,
    locale,
    workbookId,
    workbookName,
    sheetId,
    sheetName,
    rowCount: tableConfig.rows,
    columnCount: tableConfig.defaultColumns,
    logger,
    source,
    logMessages
  });

  if (!sheetRuntime) {
    return null;
  }

  writeParamsDocumentToSheet(sheetRuntime.sheet, paramsDocument, tableConfig.defaultColumns);

  const autoStyleController = createMetaGenParamsTableAutoStyle({
    univerAPI: sheetRuntime.univerAPI,
    workbook: sheetRuntime.workbook,
    sheet: sheetRuntime.sheet,
    logger,
    source: autoStyleSource,
    logMessages,
    rowCount: tableConfig.rows,
    columnCount: tableConfig.defaultColumns,
    autoStyleConfig: tableConfig.autoStyle
  });

  return {
    ...sheetRuntime,
    ...autoStyleController,
    extractDocumentValue() {
      return {
        format: 'header-plus-rows',
        header: extractHeader(sheetRuntime.sheet, tableConfig.defaultColumns),
        rows: extractBodyRows(sheetRuntime.sheet, tableConfig.rows, tableConfig.defaultColumns)
      };
    },
    dispose() {
      autoStyleController?.dispose?.();
      sheetRuntime?.dispose?.();
    }
  };
}
