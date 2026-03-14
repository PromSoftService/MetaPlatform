import test from 'node:test';
import assert from 'node:assert/strict';

import {
  finalizeActiveTableEditing,
  TABLE_EDIT_FINALIZE_RESULT
} from '../renderer/modules/metagen/tables/finalizeActiveTableEditing.js';

function createLogger() {
  const calls = [];
  return {
    calls,
    error(source, message, details) {
      calls.push({ level: 'error', source, message, details });
    }
  };
}

test('finalizeActiveTableEditing returns no-op when workbook is not editing', async () => {
  const logger = createLogger();
  const result = await finalizeActiveTableEditing({
    tableRuntime: {
      isCellEditing: () => false
    },
    logger,
    source: 'metagen.test'
  });

  assert.equal(result, TABLE_EDIT_FINALIZE_RESULT.NO_OP);
  assert.equal(logger.calls.length, 0);
});

test('finalizeActiveTableEditing commits active edit when commit succeeds', async () => {
  const result = await finalizeActiveTableEditing({
    tableRuntime: {
      isCellEditing: () => true,
      endEditingAsync: async () => true
    },
    source: 'metagen.test'
  });

  assert.equal(result, TABLE_EDIT_FINALIZE_RESULT.COMMITTED);
});

test('finalizeActiveTableEditing cancels edit when commit returns false but abort succeeds', async () => {
  const result = await finalizeActiveTableEditing({
    tableRuntime: {
      isCellEditing: () => true,
      endEditingAsync: async () => false,
      abortEditingAsync: async () => true
    },
    source: 'metagen.test'
  });

  assert.equal(result, TABLE_EDIT_FINALIZE_RESULT.CANCELLED);
});

test('finalizeActiveTableEditing returns failed and logs when commit and abort fail', async () => {
  const logger = createLogger();
  const result = await finalizeActiveTableEditing({
    tableRuntime: {
      isCellEditing: () => true,
      endEditingAsync: async () => {
        throw new Error('commit failed');
      },
      abortEditingAsync: async () => {
        throw new Error('abort failed');
      }
    },
    logger,
    source: 'metagen.test'
  });

  assert.equal(result, TABLE_EDIT_FINALIZE_RESULT.FAILED);
  assert.equal(logger.calls.length, 2);
  assert.match(logger.calls[0].message, /Ошибка завершения редактирования ячейки/);
  assert.match(logger.calls[1].message, /Ошибка отмены редактирования ячейки/);
});
