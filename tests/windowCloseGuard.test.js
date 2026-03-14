import test from 'node:test';
import assert from 'node:assert/strict';

import { createWindowCloseGuard } from '../windowCloseGuard.js';

test('first close attempt requests renderer confirmation', () => {
  const guard = createWindowCloseGuard();

  const decision = guard.handleCloseAttempt({ isWindowDestroyed: false });

  assert.deepEqual(decision, {
    allowClose: false,
    preventDefault: true,
    requestRendererConfirmation: true
  });
});

test('close attempt while confirmation is pending does not request renderer again', () => {
  const guard = createWindowCloseGuard();

  guard.handleCloseAttempt({ isWindowDestroyed: false });
  const decision = guard.handleCloseAttempt({ isWindowDestroyed: false });

  assert.deepEqual(decision, {
    allowClose: false,
    preventDefault: true,
    requestRendererConfirmation: false
  });
});

test('approved close allows next close attempt without recursion', () => {
  const guard = createWindowCloseGuard();

  guard.handleCloseAttempt({ isWindowDestroyed: false });
  guard.approveClose();

  const decision = guard.handleCloseAttempt({ isWindowDestroyed: false });

  assert.deepEqual(decision, {
    allowClose: true,
    preventDefault: false,
    requestRendererConfirmation: false
  });

  const nextDecision = guard.handleCloseAttempt({ isWindowDestroyed: false });
  assert.equal(nextDecision.requestRendererConfirmation, true);
});

test('cancel close clears pending state and allows a new confirmation cycle', () => {
  const guard = createWindowCloseGuard();

  guard.handleCloseAttempt({ isWindowDestroyed: false });
  guard.cancelClose();

  const decision = guard.handleCloseAttempt({ isWindowDestroyed: false });

  assert.deepEqual(decision, {
    allowClose: false,
    preventDefault: true,
    requestRendererConfirmation: true
  });
});
