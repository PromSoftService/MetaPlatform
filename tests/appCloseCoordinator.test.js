import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppCloseCoordinator } from '../renderer/runtime/appCloseCoordinator.js';

function createDeferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

function createHarness({ confirmResults = [] } = {}) {
  const calls = {
    confirmSaveIfDirty: 0,
    requestAppQuit: 0,
    approveWindowClose: 0,
    cancelWindowClose: 0
  };

  const decisions = [...confirmResults];

  const coordinator = createAppCloseCoordinator({
    confirmSaveIfDirty: async () => {
      calls.confirmSaveIfDirty += 1;
      return decisions.shift() ?? 'continue';
    },
    requestAppQuit: async () => {
      calls.requestAppQuit += 1;
      return true;
    },
    approveWindowClose: async () => {
      calls.approveWindowClose += 1;
      return true;
    },
    cancelWindowClose: async () => {
      calls.cancelWindowClose += 1;
      return true;
    }
  });

  return { coordinator, calls };
}

test('window close request uses the same dirty confirmation flow as exit', async () => {
  const { coordinator, calls } = createHarness({ confirmResults: ['continue', 'continue'] });

  await coordinator.requestExit();
  await coordinator.handleWindowCloseRequested();

  assert.equal(calls.confirmSaveIfDirty, 2);
  assert.equal(calls.requestAppQuit, 1);
  assert.equal(calls.approveWindowClose, 1);
  assert.equal(calls.cancelWindowClose, 0);
});

test('close approved after successful save flow', async () => {
  const { coordinator, calls } = createHarness({ confirmResults: ['continue'] });

  const approved = await coordinator.handleWindowCloseRequested();

  assert.equal(approved, true);
  assert.equal(calls.approveWindowClose, 1);
  assert.equal(calls.cancelWindowClose, 0);
});

test('close cancelled when save flow is cancelled', async () => {
  const { coordinator, calls } = createHarness({ confirmResults: ['cancel'] });

  const approved = await coordinator.handleWindowCloseRequested();

  assert.equal(approved, false);
  assert.equal(calls.approveWindowClose, 0);
  assert.equal(calls.cancelWindowClose, 1);
});

test('close cancelled when user cancels save-changes dialog', async () => {
  const { coordinator, calls } = createHarness({ confirmResults: ['cancel'] });

  await coordinator.handleWindowCloseRequested();

  assert.equal(calls.approveWindowClose, 0);
  assert.equal(calls.cancelWindowClose, 1);
});

test('close approved when user discards unsaved changes', async () => {
  const { coordinator, calls } = createHarness({ confirmResults: ['continue'] });

  await coordinator.handleWindowCloseRequested();

  assert.equal(calls.approveWindowClose, 1);
  assert.equal(calls.cancelWindowClose, 0);
});

test('clean project close request is approved without extra branching', async () => {
  const { coordinator, calls } = createHarness({ confirmResults: ['continue'] });

  await coordinator.handleWindowCloseRequested();

  assert.equal(calls.confirmSaveIfDirty, 1);
  assert.equal(calls.approveWindowClose, 1);
  assert.equal(calls.cancelWindowClose, 0);
});

test('window close waits for confirm/save lifecycle before approve signal', async () => {
  const gate = createDeferred();
  const calls = [];
  const coordinator = createAppCloseCoordinator({
    confirmSaveIfDirty: async () => {
      calls.push('confirm-start');
      const result = await gate.promise;
      calls.push(`confirm-end:${result}`);
      return result;
    },
    requestAppQuit: async () => {
      calls.push('request-quit');
      return true;
    },
    approveWindowClose: async () => {
      calls.push('approve-close');
      return true;
    },
    cancelWindowClose: async () => {
      calls.push('cancel-close');
      return true;
    }
  });

  const pending = coordinator.handleWindowCloseRequested();
  await Promise.resolve();
  assert.deepEqual(calls, ['confirm-start']);

  gate.resolve('continue');
  const approved = await pending;

  assert.equal(approved, true);
  assert.deepEqual(calls, ['confirm-start', 'confirm-end:continue', 'approve-close']);
});

test('approved close does not trigger repeated confirm calls inside one close request', async () => {
  const { coordinator, calls } = createHarness({ confirmResults: ['continue'] });

  const approved = await coordinator.handleWindowCloseRequested();

  assert.equal(approved, true);
  assert.equal(calls.confirmSaveIfDirty, 1);
  assert.equal(calls.approveWindowClose, 1);
  assert.equal(calls.cancelWindowClose, 0);
});
