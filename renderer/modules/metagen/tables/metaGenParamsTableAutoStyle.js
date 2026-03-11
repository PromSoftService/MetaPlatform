function normalizeCellValue(cellValue) {
  if (cellValue == null) {
    return '';
  }

  if (typeof cellValue === 'object') {
    if ('v' in cellValue) {
      return normalizeCellValue(cellValue.v);
    }

    return '';
  }

  return String(cellValue).trim();
}

function isRowEmpty(rowValues) {
  return rowValues.every((cellValue) => normalizeCellValue(cellValue) === '');
}

function canAccessCell(sheet, rowIndex, columnIndex) {
  try {
    sheet.getRange(rowIndex, columnIndex, 1, 1);
    return true;
  } catch {
    return false;
  }
}

function resolveActualRowCount(sheet, currentHint) {
  let count = Math.max(1, currentHint);

  while (count > 1 && !canAccessCell(sheet, count - 1, 0)) {
    count -= 1;
  }

  while (canAccessCell(sheet, count, 0)) {
    count += 1;
  }

  return count;
}

function resolveActualColumnCount(sheet, currentHint) {
  let count = Math.max(1, currentHint);

  while (count > 1 && !canAccessCell(sheet, 0, count - 1)) {
    count -= 1;
  }

  while (canAccessCell(sheet, 0, count)) {
    count += 1;
  }

  return count;
}

function getRowValues(sheet, rowIndex, actualColumnCount) {
  const safeColumnCount = Math.max(1, actualColumnCount);
  const range = sheet.getRange(rowIndex, 0, 1, safeColumnCount);
  const values = range.getValues();

  if (!Array.isArray(values) || !Array.isArray(values[0])) {
    return new Array(safeColumnCount).fill('');
  }

  return values[0];
}

function applyRowStyle(univerAPI, sheet, rowIndex, actualColumnCount, rowStyle, borderConfig) {
  const rowRange = sheet.getRange(rowIndex, 0, 1, Math.max(1, actualColumnCount));

  rowRange
    .setBackgroundColor(rowStyle.backgroundColor)
    .setFontWeight(rowStyle.fontWeight)
    .setHorizontalAlignment(rowStyle.horizontalAlignment)
    .setVerticalAlignment(rowStyle.verticalAlignment)
    .setBorder(
      univerAPI.Enum.BorderType[borderConfig.type],
      univerAPI.Enum.BorderStyleTypes[borderConfig.style],
      borderConfig.color
    );
}

function createDebouncedExecutor(delayMs, callback) {
  let timeoutId = null;

  return {
    schedule() {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        callback();
      }, delayMs);
    },

    dispose() {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  };
}

function mergeBounds(currentBounds, nextBounds) {
  if (!currentBounds) {
    return { ...nextBounds };
  }

  return {
    startRow: Math.min(currentBounds.startRow, nextBounds.startRow),
    endRow: Math.max(currentBounds.endRow, nextBounds.endRow)
  };
}

function isFullRefreshCommand(commandId, config) {
  const normalizedCommandId = String(commandId || '').toLowerCase();

  return config.fullRefreshCommandIdIncludes.some((fragment) =>
    normalizedCommandId.includes(fragment)
  );
}

function collectRowBoundsFromUnknownShape(value, depthLeft, rowBoundsList) {
  if (depthLeft < 0 || value == null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectRowBoundsFromUnknownShape(item, depthLeft - 1, rowBoundsList));
    return;
  }

  if (typeof value !== 'object') {
    return;
  }

  const hasRange = Number.isInteger(value.startRow) && Number.isInteger(value.endRow);

  if (hasRange) {
    rowBoundsList.push({ startRow: value.startRow, endRow: value.endRow });
  } else if (Number.isInteger(value.row)) {
    rowBoundsList.push({ startRow: value.row, endRow: value.row });
  }

  Object.values(value).forEach((nestedValue) => {
    collectRowBoundsFromUnknownShape(nestedValue, depthLeft - 1, rowBoundsList);
  });
}

function getFallbackBoundsFromActiveSelection(workbook) {
  try {
    const activeSheet = workbook.getActiveSheet();
    const activeRange = activeSheet.getActiveRange();

    if (!activeRange) {
      return null;
    }

    const rangeInfo = activeRange.getRange();

    if (rangeInfo && Number.isInteger(rangeInfo.startRow) && Number.isInteger(rangeInfo.endRow)) {
      return {
        startRow: rangeInfo.startRow,
        endRow: rangeInfo.endRow
      };
    }
  } catch {
    return null;
  }

  return null;
}

function extractAffectedBounds(command, workbook, rowCountHint, config) {
  const commandId = String(command?.id || '');

  if (isFullRefreshCommand(commandId, config)) {
    return {
      startRow: 0,
      endRow: Math.max(0, rowCountHint - 1)
    };
  }

  const rowBoundsList = [];
  collectRowBoundsFromUnknownShape(command?.params, config.maxRecursiveRangeDepth, rowBoundsList);

  if (rowBoundsList.length === 0) {
    const fallbackBounds = getFallbackBoundsFromActiveSelection(workbook);
    if (fallbackBounds) {
      return fallbackBounds;
    }

    return {
      startRow: 0,
      endRow: Math.max(0, rowCountHint - 1)
    };
  }

  const merged = rowBoundsList.reduce((accumulator, currentBounds) => ({
    startRow: Math.min(accumulator.startRow, currentBounds.startRow),
    endRow: Math.max(accumulator.endRow, currentBounds.endRow)
  }));

  return {
    startRow: Math.max(0, merged.startRow),
    endRow: Math.max(0, merged.endRow)
  };
}

function buildRowCategorySnapshot({
  sheet,
  startRow,
  endRow,
  actualColumnCount,
  rowCategoryConfig
}) {
  const snapshot = new Map();
  let previousRowIsNonEmpty = false;

  if (startRow > 0) {
    const previousRowValues = getRowValues(sheet, startRow - 1, actualColumnCount);
    previousRowIsNonEmpty = !isRowEmpty(previousRowValues);
  }

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const rowValues = getRowValues(sheet, rowIndex, actualColumnCount);
    const rowIsEmpty = isRowEmpty(rowValues);

    if (rowIsEmpty) {
      snapshot.set(rowIndex, rowCategoryConfig.empty);
      previousRowIsNonEmpty = false;
      continue;
    }

    snapshot.set(rowIndex, previousRowIsNonEmpty ? rowCategoryConfig.value : rowCategoryConfig.key);
    previousRowIsNonEmpty = true;
  }

  return snapshot;
}

function ensureRowStatesLength(rowStates, targetLength, emptyCategory) {
  while (rowStates.length < targetLength) {
    rowStates.push(emptyCategory);
  }

  if (rowStates.length > targetLength) {
    rowStates.length = targetLength;
  }
}

function trimTrailingEmptyCells(rowValues) {
  const normalized = rowValues.map((value) => normalizeCellValue(value));

  while (normalized.length > 0 && normalized[normalized.length - 1] === '') {
    normalized.pop();
  }

  return normalized;
}

function buildStructuredBlocks(sheet, actualRowCount, actualColumnCount, rowCategoryConfig, rowStates) {
  const blocks = [];
  let currentBlock = null;

  for (let rowIndex = 0; rowIndex < actualRowCount; rowIndex += 1) {
    const category = rowStates[rowIndex] || rowCategoryConfig.empty;
    const rowValues = trimTrailingEmptyCells(getRowValues(sheet, rowIndex, actualColumnCount));

    if (category === rowCategoryConfig.empty) {
      currentBlock = null;
      continue;
    }

    if (category === rowCategoryConfig.key) {
      currentBlock = {
        keyRowIndex: rowIndex,
        valueRowIndexes: [],
        keyValues: rowValues,
        valueRows: []
      };
      blocks.push(currentBlock);
      continue;
    }

    if (currentBlock) {
      currentBlock.valueRowIndexes.push(rowIndex);
      currentBlock.valueRows.push(rowValues);
    }
  }

  return blocks;
}

export function createMetaGenParamsTableAutoStyle({
  univerAPI,
  workbook,
  sheet,
  logger,
  source,
  logMessages,
  rowCount,
  columnCount,
  autoStyleConfig
}) {
  const rowCategoryConfig = autoStyleConfig.rowCategory;

  let actualRowCount = Math.max(1, rowCount);
  let actualColumnCount = Math.max(1, columnCount);
  let rowStates = Array.from({ length: actualRowCount }, () => rowCategoryConfig.empty);

  let pendingBounds = null;
  let disposed = false;

  function syncActualDimensions() {
    actualRowCount = resolveActualRowCount(sheet, actualRowCount);
    actualColumnCount = resolveActualColumnCount(sheet, actualColumnCount);
    ensureRowStatesLength(rowStates, actualRowCount, rowCategoryConfig.empty);
  }

  function applyRowCategoryStyle(rowIndex, rowCategory) {
    const nextStyle = rowCategory === rowCategoryConfig.key
      ? autoStyleConfig.rowStyles.key
      : autoStyleConfig.rowStyles.normal;

    applyRowStyle(univerAPI, sheet, rowIndex, actualColumnCount, nextStyle, autoStyleConfig.border);
  }

  function refreshBounds(bounds) {
    if (disposed || !bounds) {
      return;
    }

    try {
      syncActualDimensions();

      const clampedBounds = {
        startRow: Math.max(0, Math.min(bounds.startRow, actualRowCount - 1)),
        endRow: Math.max(0, Math.min(bounds.endRow, actualRowCount - 1))
      };

      const snapshot = buildRowCategorySnapshot({
        sheet,
        startRow: clampedBounds.startRow,
        endRow: clampedBounds.endRow,
        actualColumnCount,
        rowCategoryConfig
      });

      let changedRowsCount = 0;

      for (const [rowIndex, nextCategory] of snapshot.entries()) {
        if (rowStates[rowIndex] !== nextCategory) {
          rowStates[rowIndex] = nextCategory;
          applyRowCategoryStyle(rowIndex, nextCategory);
          changedRowsCount += 1;
        }
      }

      logger.info(source, logMessages.paramsAutoStyleApplied, {
        bounds: clampedBounds,
        changedRowsCount,
        actualRowCount,
        actualColumnCount
      });
    } catch (error) {
      logger.error(source, logMessages.paramsAutoStyleFailed, error);
    }
  }

  const debouncedRefresh = createDebouncedExecutor(autoStyleConfig.debounceDelayMs, () => {
    const boundsToRefresh = pendingBounds || {
      startRow: 0,
      endRow: Math.max(0, actualRowCount - 1)
    };

    pendingBounds = null;
    refreshBounds(boundsToRefresh);
  });

  function scheduleRefresh(bounds, reason = 'unknown') {
    pendingBounds = mergeBounds(pendingBounds, {
      startRow: Math.max(0, bounds.startRow),
      endRow: Math.max(0, bounds.endRow)
    });

    logger.info(source, logMessages.paramsAutoStyleRefreshScheduled, { reason, bounds: pendingBounds });
    debouncedRefresh.schedule();
  }

  const commandDisposable = workbook.onCommandExecuted((command) => {
    const affectedBounds = extractAffectedBounds(command, workbook, actualRowCount, autoStyleConfig);
    scheduleRefresh(affectedBounds, String(command?.id || 'unknown'));
  });

  scheduleRefresh({ startRow: 0, endRow: Math.max(0, rowCount - 1) }, 'init');
  logger.info(source, logMessages.paramsAutoStyleInit);

  function getRowCategory(rowIndex) {
    return rowStates[rowIndex] || rowCategoryConfig.empty;
  }

  function getStructuredBlocks() {
    syncActualDimensions();
    return buildStructuredBlocks(sheet, actualRowCount, actualColumnCount, rowCategoryConfig, rowStates);
  }

  function refreshAll() {
    scheduleRefresh({ startRow: 0, endRow: Math.max(0, actualRowCount - 1) }, 'manual-refresh');
  }

  function dispose() {
    disposed = true;
    commandDisposable?.dispose?.();
    debouncedRefresh.dispose();
  }

  return {
    getRowCategory,
    getStructuredBlocks,
    refreshAll,
    dispose
  };
}
