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
