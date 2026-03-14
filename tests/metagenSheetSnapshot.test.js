import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readHeaderPlusRowsDocument,
  readTableDocument,
  getSheetActualRowCount,
  getSheetActualColumnCount
} from '../renderer/modules/metagen/tables/sheetSnapshot.js';

function createFakeSheet(matrix) {
  return {
    getRange(startRow, startColumn, rowCount, columnCount) {
      return {
        getValues() {
          const output = [];

          for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
            const row = [];
            for (let columnOffset = 0; columnOffset < columnCount; columnOffset += 1) {
              row.push(matrix[startRow + rowOffset]?.[startColumn + columnOffset] ?? '');
            }
            output.push(row);
          }

          return output;
        }
      };
    }
  };
}

test('params snapshot uses actual sheet dimensions instead of fixed runtime bounds', () => {
  const sheet = createFakeSheet([
    ['A', 'B', '', '', ''],
    ['1', '2', '', '', ''],
    ['', '', '', '', '']
  ]);

  const snapshot = readHeaderPlusRowsDocument(sheet, { maxRows: 100, maxColumns: 10 });

  assert.deepEqual(snapshot, {
    format: 'header-plus-rows',
    header: ['A', 'B'],
    rows: [['1', '2']]
  });
});

test('params snapshot trims trailing empty rows and trailing empty cells', () => {
  const sheet = createFakeSheet([
    ['name', 'type', '', ''],
    ['p1', 'int', '', ''],
    ['p2', '', '', ''],
    ['', '', '', ''],
    ['', '', '', '']
  ]);

  const snapshot = readHeaderPlusRowsDocument(sheet, { maxRows: 100, maxColumns: 10 });

  assert.deepEqual(snapshot.header, ['name', 'type']);
  assert.deepEqual(snapshot.rows, [['p1', 'int'], ['p2']]);
});

test('empty params sheet serializes to stable empty header-plus-rows payload', () => {
  const sheet = createFakeSheet([
    ['', '', ''],
    ['', '', '']
  ]);

  const snapshot = readHeaderPlusRowsDocument(sheet, { maxRows: 100, maxColumns: 10 });

  assert.deepEqual(snapshot, {
    format: 'header-plus-rows',
    header: [],
    rows: []
  });
});

test('data snapshot trims trailing empty rows and keeps config columns contract', () => {
  const sheet = createFakeSheet([
    ['BOOL', 'Main', 'x', '1'],
    ['', '', '', ''],
    ['', '', '', '']
  ]);

  const snapshot = readTableDocument(sheet, {
    maxRows: 100,
    maxColumns: 4,
    columns: ['Тип', 'Блок данных', 'Имя переменной', 'Значение']
  });

  assert.deepEqual(snapshot.columns, ['Тип', 'Блок данных', 'Имя переменной', 'Значение']);
  assert.deepEqual(snapshot.rows, [['BOOL', 'Main', 'x', '1']]);
});

test('actual row/column detection returns 0 for fully empty sheet', () => {
  const sheet = createFakeSheet([
    ['', '', ''],
    ['', '', '']
  ]);

  assert.equal(getSheetActualRowCount(sheet, { maxRows: 100, maxColumns: 10 }), 0);
  assert.equal(getSheetActualColumnCount(sheet, { maxRows: 100, maxColumns: 10 }), 0);
});
