import test from 'node:test';
import assert from 'node:assert/strict';

import { finalizeEditingBeforeTabSwitch } from '../renderer/ui/tabEditLifecycle.js';

function createLogger() {
  const calls = [];
  return {
    calls,
    error(source, message, details) {
      calls.push({ level: 'error', source, message, details });
    }
  };
}

test('switching away from active tab finalizes pending table edit before activation', async () => {
  const calls = [];
  const result = await finalizeEditingBeforeTabSwitch({
    activeEntry: {
      tabId: 'tab-A',
      runtime: {
        finishActiveTableEditing: async () => {
          calls.push('finalized');
        }
      }
    },
    nextTabId: 'tab-B',
    logger: createLogger()
  });

  assert.equal(result, true);
  assert.deepEqual(calls, ['finalized']);
});

test('switching tabs does not keep hidden pending state in old tab when no runtime finalizer exists', async () => {
  const result = await finalizeEditingBeforeTabSwitch({
    activeEntry: {
      tabId: 'tab-A',
      runtime: {}
    },
    nextTabId: 'tab-B',
    logger: createLogger()
  });

  assert.equal(result, true);
});

test('switch to the same tab is a no-op and does not re-finalize', async () => {
  let finalizeCalls = 0;

  const result = await finalizeEditingBeforeTabSwitch({
    activeEntry: {
      tabId: 'tab-A',
      runtime: {
        finishActiveTableEditing: async () => {
          finalizeCalls += 1;
        }
      }
    },
    nextTabId: 'tab-A',
    logger: createLogger()
  });

  assert.equal(result, true);
  assert.equal(finalizeCalls, 0);
});

test('failed finalization is handled predictably by blocking tab switch and logging error', async () => {
  const logger = createLogger();

  const result = await finalizeEditingBeforeTabSwitch({
    activeEntry: {
      tabId: 'tab-A',
      runtime: {
        finishActiveTableEditing: async () => {
          throw new Error('cannot finalize');
        }
      }
    },
    nextTabId: 'tab-B',
    logger
  });

  assert.equal(result, false);
  assert.equal(logger.calls.length, 1);
  assert.match(logger.calls[0].message, /Ошибка завершения редактирования перед переключением вкладки/);
});
