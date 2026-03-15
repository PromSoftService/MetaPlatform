import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { APP_CONFIG } from '../config/app-config.js';
import IPC_CONFIG from '../config/ipc-config.cjs';

const MAIN_FILE = 'main.js';
const PRELOAD_FILE = 'preload.cjs';

test('platform IPC config is a single source of truth for main/preload wiring', async () => {
  const mainSource = await fs.readFile(MAIN_FILE, 'utf-8');
  const preloadSource = await fs.readFile(PRELOAD_FILE, 'utf-8');

  assert.equal(APP_CONFIG.platform.ipc.channels.menuAction, IPC_CONFIG.channels.menuAction);
  assert.equal(APP_CONFIG.platform.ipc.channels.windowCloseRequested, IPC_CONFIG.channels.windowCloseRequested);

  assert.match(mainSource, /APP_CONFIG\.platform\.ipc\.channels\.windowCloseRequested/);
  assert.match(mainSource, /APP_CONFIG\.platform\.ipc\.handlers\.fsListFiles/);

  assert.match(preloadSource, /IPC_CONFIG\.channels\.menuAction/);
  assert.match(preloadSource, /IPC_CONFIG\.channels\.windowCloseRequested/);
  assert.match(preloadSource, /IPC_CONFIG\.handlers\.fsListFiles/);

  assert.doesNotMatch(preloadSource, /['"]menu:action['"]/);
  assert.doesNotMatch(preloadSource, /['"]window:close-requested['"]/);
});
