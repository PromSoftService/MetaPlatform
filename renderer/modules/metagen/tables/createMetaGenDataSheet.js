import { createMetaGenSimpleSheet } from './createMetaGenSimpleSheet.js';
import { readTableDocument, trimTrailingEmptyRows } from './sheetSnapshot.js';

function buildHiddenMenuConfig(commands) {
  return Object.fromEntries(commands.map((command) => [command, { hidden: true }]));
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function applyHeaderConfig({ sheet, headers, headerConfig, retryConfig, logger, source, logMessages }) {
  if (!sheet || typeof sheet.customizeColumnHeader !== 'function') {
    logger.warn(source, logMessages.headerMethodUnavailable);
    return false;
  }

  const applyConfig = () => {
    if (!headerConfig || headerConfig.mode === 'default') {
      sheet.customizeColumnHeader({ columnsCfg: {} });
      logger.info(source, logMessages.defaultHeadersApplied);
      return;
    }

    const columnsCfg = headers.reduce((accumulator, text, index) => {
      if (text != null && text !== '') {
        accumulator[index] = text;
      }
      return accumulator;
    }, {});

    sheet.customizeColumnHeader({
      columnsCfg,
      headerStyle: headerConfig.headerStyle || {}
    });

    logger.info(source, logMessages.customHeadersApplied);
  };

  for (let attemptIndex = 0; attemptIndex < retryConfig.retryCount; attemptIndex += 1) {
    try {
      applyConfig();
      return true;
    } catch (error) {
      const message = error?.message || String(error);

      if (!message.includes('Render Unit with unitId')) {
        throw error;
      }

      logger.warn(
        source,
        `${logMessages.headerApplyRetryPrefix} (${attemptIndex + 1}/${retryConfig.retryCount})`
      );
      await sleep(retryConfig.retryDelayMs);
    }
  }

  logger.warn(source, logMessages.headerApplyFailed);
  return false;
}

async function applyDataSheetPermissions({ univerAPI, sheet, permissions, logger, source, logMessages }) {
  const worksheetPermission = sheet.getWorksheetPermission();

  await worksheetPermission.protect();
  await worksheetPermission.setPoint(
    univerAPI.Enum.WorksheetPermissionPoint.SetCellValue,
    permissions.allowSetCellValue
  );
  await worksheetPermission.setPoint(
    univerAPI.Enum.WorksheetPermissionPoint.InsertColumn,
    permissions.allowInsertColumn
  );
  await worksheetPermission.setPoint(
    univerAPI.Enum.WorksheetPermissionPoint.DeleteColumn,
    permissions.allowDeleteColumn
  );

  logger.info(source, logMessages.dataColumnsProtectionApplied);
}

function applyCheckboxValidation({ univerAPI, sheet, rowCount, headers, checkboxColumns, logger, source, logMessages }) {
  try {
    checkboxColumns
      .map((columnName) => headers.indexOf(columnName))
      .filter((index) => index !== -1)
      .forEach((columnIndex) => {
        const range = sheet.getRange(0, columnIndex, rowCount, 1);
        const checkboxRule = univerAPI.newDataValidation().requireCheckbox().build();
        range.setDataValidation(checkboxRule);
      });

    logger.info(source, logMessages.checkboxColumnsConfigured);
  } catch (error) {
    logger.warn(source, logMessages.checkboxColumnsFailed, error);
  }
}

function writeDataDocumentToSheet(sheet, dataDocument, columnCount) {
  if (!Array.isArray(dataDocument?.rows)) {
    return;
  }

  dataDocument.rows.forEach((rowValues, rowIndex) => {
    if (!Array.isArray(rowValues) || rowValues.length === 0) {
      return;
    }

    const limited = rowValues.slice(0, columnCount);
    sheet.getRange(rowIndex, 0, 1, limited.length).setValues([limited]);
  });
}

function extractRows(sheet, rowCount, columnCount) {
  return trimTrailingEmptyRows(readTableDocument(sheet, {
    maxRows: rowCount,
    maxColumns: columnCount,
    columns: []
  }).rows);
}

export async function createMetaGenDataSheet({
  container,
  locale,
  logger,
  source,
  workbookId,
  workbookName,
  sheetId,
  sheetName,
  dataValidationPreset,
  tableConfig,
  hiddenMenuCommands,
  logMessages,
  dataDocument
}) {
  const sheetRuntime = createMetaGenSimpleSheet({
    container,
    locale,
    menu: buildHiddenMenuConfig(hiddenMenuCommands),
    workbookId,
    workbookName,
    sheetId,
    sheetName,
    rowCount: tableConfig.rows,
    columnCount: tableConfig.headers.length,
    logger,
    source,
    logMessages,
    extraPresets: typeof dataValidationPreset === 'function' ? [dataValidationPreset()] : []
  });

  if (!sheetRuntime) {
    return null;
  }

  writeDataDocumentToSheet(sheetRuntime.sheet, dataDocument, tableConfig.headers.length);

  await applyDataSheetPermissions({
    univerAPI: sheetRuntime.univerAPI,
    sheet: sheetRuntime.sheet,
    permissions: tableConfig.permissions,
    logger,
    source,
    logMessages
  });

  applyCheckboxValidation({
    univerAPI: sheetRuntime.univerAPI,
    sheet: sheetRuntime.sheet,
    rowCount: tableConfig.rows,
    headers: tableConfig.headers,
    checkboxColumns: tableConfig.checkboxColumns,
    logger,
    source,
    logMessages
  });

  await applyHeaderConfig({
    sheet: sheetRuntime.sheet,
    headers: tableConfig.headers,
    headerConfig: tableConfig.headerConfig,
    retryConfig: tableConfig.headerApply,
    logger,
    source,
    logMessages
  });

  return {
    ...sheetRuntime,
    extractDocumentValue() {
      return {
        format: 'table',
        columns: [...tableConfig.headers],
        rows: extractRows(sheetRuntime.sheet, tableConfig.rows, tableConfig.headers.length)
      };
    }
  };
}
