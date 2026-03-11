import { createUniver, LocaleType } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';

export function createMetaGenSimpleSheet({
  container,
  locale,
  menu,
  workbookId,
  workbookName,
  sheetId,
  sheetName,
  rowCount,
  columnCount,
  logger,
  source,
  logMessages,
  extraPresets = []
}) {
  try {
    const { univerAPI } = createUniver({
      locale: LocaleType.RU_RU,
      locales: {
        [LocaleType.RU_RU]: locale
      },
      presets: [
        UniverSheetsCorePreset({
          container,
          header: true,
          toolbar: true,
          contextMenu: true,
          footer: false,
          ...(menu ? { menu } : {})
        }),
        ...extraPresets
      ]
    });

    const workbook = univerAPI.createWorkbook({
      id: workbookId,
      name: workbookName,
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          name: sheetName,
          rowCount,
          columnCount
        }
      }
    });

    const sheet = workbook.getActiveSheet();

    logger.info(source, logMessages.tableCreated, {
      workbookId,
      sheetId,
      sheetName
    });

    return {
      univerAPI,
      workbook,
      sheet,
      dispose() {
        if (typeof univerAPI.dispose === 'function') {
          univerAPI.dispose();
        }
      }
    };
  } catch (error) {
    logger.error(source, logMessages.tableCreateFailed, error);
    return null;
  }
}
