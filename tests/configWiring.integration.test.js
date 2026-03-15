import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { APP_CONFIG } from '../config/app-config.js';
import IPC_CONFIG from '../config/ipc-config.json' with { type: 'json' };

const MAIN_FILE = 'main.js';
const PRELOAD_FILE = 'preload.cjs';
const IPC_CONFIG_FILE = 'config/ipc-config.json';

const EXPECTED_IPC = IPC_CONFIG;

test('platform IPC config and preload IPC object stay aligned for main/preload wiring', async () => {
  const mainSource = await fs.readFile(MAIN_FILE, 'utf-8');
  const preloadSource = await fs.readFile(PRELOAD_FILE, 'utf-8');
  const ipcConfigSource = await fs.readFile(IPC_CONFIG_FILE, 'utf-8');

  assert.deepEqual(APP_CONFIG.platform.ipc, EXPECTED_IPC);

  assert.match(mainSource, /APP_CONFIG\.platform\.ipc\.channels\.windowCloseRequested/);
  assert.match(mainSource, /APP_CONFIG\.platform\.ipc\.handlers\.fsListFiles/);

  assert.match(preloadSource, /const IPC = require\('\.\/config\/ipc-config\.json'\);/);
  assert.match(preloadSource, /IPC\.channels\.menuAction/);
  assert.match(preloadSource, /IPC\.channels\.windowCloseRequested/);
  assert.match(preloadSource, /IPC\.handlers\.fsListFiles/);

  for (const [key, value] of Object.entries(EXPECTED_IPC.channels)) {
    assert.ok(ipcConfigSource.includes(`"${key}": "${value}"`));
  }

  for (const [key, value] of Object.entries(EXPECTED_IPC.handlers)) {
    assert.ok(ipcConfigSource.includes(`"${key}": "${value}"`));
  }
});
