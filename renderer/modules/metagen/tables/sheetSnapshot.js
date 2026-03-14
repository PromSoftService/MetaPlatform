export function serializeSheetCellValue(cellValue) {
  if (cellValue == null) {
    return '';
  }

  if (typeof cellValue === 'object' && 'v' in cellValue) {
    return serializeSheetCellValue(cellValue.v);
  }

  if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
    return cellValue;
  }

  return String(cellValue);
}

export function readSheetMatrix(sheet, startRow, rowCount, columnCount) {
  const rows = [];

  for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
    const rowValues = sheet.getRange(startRow + rowOffset, 0, 1, columnCount).getValues()?.[0] || [];
    const snapshotRow = [];

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      snapshotRow.push(serializeSheetCellValue(rowValues[columnIndex]));
    }

    rows.push(snapshotRow);
  }

  return rows;
}

function isEmptyCellValue(value) {
  return value === '';
}

function isEmptyRow(row = []) {
  return !Array.isArray(row) || row.every((cell) => isEmptyCellValue(cell));
}

export function trimTrailingEmptyCells(row = []) {
  if (!Array.isArray(row) || row.length === 0) {
    return [];
  }

  let endIndex = row.length;

  while (endIndex > 0 && isEmptyCellValue(row[endIndex - 1])) {
    endIndex -= 1;
  }

  return row.slice(0, endIndex);
}

export function trimTrailingEmptyRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  let endIndex = rows.length;

  while (endIndex > 0 && isEmptyRow(rows[endIndex - 1])) {
    endIndex -= 1;
  }

  return rows.slice(0, endIndex);
}

export function getSheetActualRowCount(sheet, { maxRows = 0, maxColumns = 0 } = {}) {
  if (!sheet || maxRows <= 0 || maxColumns <= 0) {
    return 0;
  }

  for (let rowIndex = maxRows - 1; rowIndex >= 0; rowIndex -= 1) {
    const [rowValues] = readSheetMatrix(sheet, rowIndex, 1, maxColumns);

    if (!isEmptyRow(rowValues)) {
      return rowIndex + 1;
    }
  }

  return 0;
}

export function getSheetActualColumnCount(sheet, { maxRows = 0, maxColumns = 0 } = {}) {
  if (!sheet || maxRows <= 0 || maxColumns <= 0) {
    return 0;
  }

  for (let columnIndex = maxColumns - 1; columnIndex >= 0; columnIndex -= 1) {
    let hasValue = false;

    for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
      const [rowValues] = readSheetMatrix(sheet, rowIndex, 1, maxColumns);

      if (!isEmptyCellValue(rowValues[columnIndex] ?? '')) {
        hasValue = true;
        break;
      }
    }

    if (hasValue) {
      return columnIndex + 1;
    }
  }

  return 0;
}

export function readTrimmedSheetMatrix(sheet, { maxRows = 0, maxColumns = 0 } = {}) {
  const actualRowCount = getSheetActualRowCount(sheet, { maxRows, maxColumns });

  if (actualRowCount <= 0) {
    return [];
  }

  const actualColumnCount = getSheetActualColumnCount(sheet, { maxRows: actualRowCount, maxColumns });

  if (actualColumnCount <= 0) {
    return [];
  }

  const matrix = readSheetMatrix(sheet, 0, actualRowCount, actualColumnCount);
  const rowsWithoutTrailingEmptyRows = trimTrailingEmptyRows(matrix);

  return rowsWithoutTrailingEmptyRows.map((row) => trimTrailingEmptyCells(row));
}

export function readHeaderPlusRowsDocument(sheet, { maxRows = 0, maxColumns = 0 } = {}) {
  const matrix = readTrimmedSheetMatrix(sheet, { maxRows, maxColumns });

  if (matrix.length === 0) {
    return {
      format: 'header-plus-rows',
      header: [],
      rows: []
    };
  }

  return {
    format: 'header-plus-rows',
    header: trimTrailingEmptyCells(matrix[0] || []),
    rows: trimTrailingEmptyRows((matrix.slice(1) || []).map((row) => trimTrailingEmptyCells(row)))
  };
}

export function readTableDocument(sheet, { maxRows = 0, maxColumns = 0, columns = [] } = {}) {
  const matrix = readTrimmedSheetMatrix(sheet, { maxRows, maxColumns });
  const normalizedColumns = Array.isArray(columns) ? [...columns] : [];

  return {
    format: 'table',
    columns: normalizedColumns,
    rows: trimTrailingEmptyRows(matrix)
  };
}
