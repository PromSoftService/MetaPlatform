import test from 'node:test';
import assert from 'node:assert/strict';

import { finalizeEditingBeforeContextTransition } from '../renderer/ui/editorContextLifecycle.js';
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

test('table to text/code transition uses shared finalize contract', async () => {
  const calls = [];
  const result = await finalizeEditingBeforeContextTransition({
    activeEntry: {
      tabId: 'tab-metagen',
      runtime: {
        finalizeEditingBeforeContextLeave: async ({ reason, blockOnFailure }) => {
          calls.push({ reason, blockOnFailure });
          return { continued: true, outcome: 'committed', reason };
        }
      }
    },
    logger: createLogger(),
    source: 'tabs',
    reason: 'table-to-code',
    blockOnFailure: true
  });

  assert.equal(result.continued, true);
  assert.equal(result.outcome, 'committed');
  assert.deepEqual(calls, [{ reason: 'table-to-code', blockOnFailure: true }]);
});

test('context transition falls back to legacy finishActiveTableEditing runtime hook', async () => {
  const calls = [];
  const result = await finalizeEditingBeforeContextTransition({
    activeEntry: {
      tabId: 'tab-metagen',
      runtime: {
        finishActiveTableEditing: async () => {
          calls.push('finishActiveTableEditing');
          return 'committed';
        }
      }
    },
    logger: createLogger(),
    source: 'tabs',
    reason: `${APP_CONFIG.ui.runtime.transitionReasons.menuActionPrefix}${APP_CONFIG.platform.app.menu.actionIds.save}`,
    blockOnFailure: true
  });

  assert.equal(result.continued, true);
  assert.equal(result.outcome, 'committed');
  assert.deepEqual(calls, ['finishActiveTableEditing']);
});

test('failed context finalization reports failed outcome and logs once', async () => {
  const logger = createLogger();
  const result = await finalizeEditingBeforeContextTransition({
    activeEntry: {
      tabId: 'tab-metagen',
      runtime: {
        finalizeEditingBeforeContextLeave: async () => {
          throw new Error('cannot finalize');
        }
      }
    },
    logger,
    source: 'tabs',
    reason: `${APP_CONFIG.ui.runtime.transitionReasons.menuActionPrefix}${APP_CONFIG.platform.app.menu.actionIds.openProject}`,
    blockOnFailure: true
  });

  assert.equal(result.continued, false);
  assert.equal(result.outcome, 'failed');
  assert.equal(logger.calls.length, 1);
  assert.match(logger.calls[0].message, /Ошибка завершения редактирования перед сменой контекста/);
});
