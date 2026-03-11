import { createMetaGenSimpleSheet } from './createMetaGenSimpleSheet.js';
import { createMetaGenParamsTableAutoStyle } from './metaGenParamsTableAutoStyle.js';

function normalizeCellValue(cellValue) {
  if (cellValue == null) {
    return '';
  }

  if (typeof cellValue === 'object' && 'v' in cellValue) {
    return normalizeCellValue(cellValue.v);
  }

  return String(cellValue).trim();
}

function trimTrailingEmptyCells(rowValues) {
  const normalized = rowValues.map((value) => normalizeCellValue(value));

  while (normalized.length > 0 && normalized[normalized.length - 1] === '') {
    normalized.pop();
  }

  return normalized;
}

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

function collectRowsFromSheet(sheet, rowCount, columnCount) {
  const rows = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const rowValues = sheet.getRange(rowIndex, 0, 1, columnCount).getValues()?.[0] || [];
    const trimmed = trimTrailingEmptyCells(rowValues);

    if (trimmed.length > 0) {
      rows.push(trimmed);
    }
  }

  return rows;
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
      const rowValues = collectRowsFromSheet(
        sheetRuntime.sheet,
        tableConfig.rows,
        tableConfig.defaultColumns
      );

      return {
        format: 'header-plus-rows',
        header: rowValues[0] || [],
        rows: rowValues.slice(1)
      };
    },
    dispose() {
      autoStyleController?.dispose?.();
      sheetRuntime?.dispose?.();
    }
  };
}
