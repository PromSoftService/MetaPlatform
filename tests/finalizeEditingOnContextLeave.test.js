import test from 'node:test';
import assert from 'node:assert/strict';

import {
  finalizeEditingOnContextLeave,
  TABLE_CONTEXT_FINALIZE_FLOW
} from '../renderer/modules/metagen/tables/finalizeEditingOnContextLeave.js';
import { TABLE_EDIT_FINALIZE_RESULT } from '../renderer/modules/metagen/tables/finalizeActiveTableEditing.js';
import { APP_CONFIG } from '../config/app-config.js';

function createLogger() {
  const calls = [];
  return {
    calls,
    error(source, message, details) {
      calls.push({ level: 'error', source, message, details });
    }
  };
}

test('focus/context switch inside MetaGen finalizes pending edit with commit-first semantics', async () => {
  const calls = [];
  const result = await finalizeEditingOnContextLeave({
    tables: [
      {
        contextId: 'params',
        tableRuntime: {
          isCellEditing: () => true,
          endEditingAsync: async (commit) => {
            calls.push(`commit:${commit}`);
            return true;
          }
        }
      },
      {
        contextId: 'data',
        tableRuntime: {
          isCellEditing: () => false
        }
      }
    ],
    source: 'metagen.lifecycle',
    reason: 'internal-switch'
  });

  assert.equal(result.flow, TABLE_CONTEXT_FINALIZE_FLOW.CONTINUED);
  assert.equal(result.outcome, TABLE_EDIT_FINALIZE_RESULT.COMMITTED);
  assert.deepEqual(calls, ['commit:true']);
});

test('focus/context switch with no active edit is cheap no-op', async () => {
  const logger = createLogger();
  const result = await finalizeEditingOnContextLeave({
    tables: [
      { contextId: 'params', tableRuntime: { isCellEditing: () => false } },
      { contextId: 'data', tableRuntime: { isCellEditing: () => false } }
    ],
    logger,
    source: 'metagen.lifecycle',
    reason: 'table-to-code'
  });

  assert.equal(result.flow, TABLE_CONTEXT_FINALIZE_FLOW.CONTINUED);
  assert.equal(result.outcome, TABLE_EDIT_FINALIZE_RESULT.NO_OP);
  assert.equal(logger.calls.length, 0);
});

test('failed finalize blocks transition predictably and logs error', async () => {
  const logger = createLogger();
  const result = await finalizeEditingOnContextLeave({
    tables: [
      {
        contextId: 'params',
        tableRuntime: {
          isCellEditing: () => true,
          endEditingAsync: async () => false,
          abortEditingAsync: async () => false
        }
      }
    ],
    logger,
    source: 'metagen.lifecycle',
    reason: `${APP_CONFIG.ui.runtime.transitionReasons.menuActionPrefix}${APP_CONFIG.platform.app.menu.actionIds.openProject}`,
    blockOnFailure: true
  });

  assert.equal(result.flow, TABLE_CONTEXT_FINALIZE_FLOW.BLOCKED);
  assert.equal(result.outcome, TABLE_EDIT_FINALIZE_RESULT.FAILED);
  assert.equal(logger.calls.length, 1);
  assert.match(logger.calls[0].message, /Не удалось завершить редактирование при потере контекста/);
});
