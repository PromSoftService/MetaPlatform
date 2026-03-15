import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { APP_CONFIG } from '../config/app-config.js';

const MAIN_FILE = 'main.js';
const PRELOAD_FILE = 'preload.cjs';

const EXPECTED_IPC = {
  channels: {
    menuAction: 'menu:action',
    windowCloseRequested: 'window:close-requested'
  },
  handlers: {
    openProjectDialog: 'dialog:open-project',
    saveProjectAsDialog: 'dialog:save-project-as',
    appQuit: 'app:quit',
    windowCloseApproved: 'window:close-approved',
    windowCloseCancelled: 'window:close-cancelled',
    fsEnsureDir: 'fs:ensure-dir',
    fsExists: 'fs:exists',
    fsReadText: 'fs:read-text',
    fsWriteText: 'fs:write-text',
    fsRename: 'fs:rename',
    fsDeleteFile: 'fs:delete-file',
    fsDeleteDir: 'fs:delete-dir',
    fsListFiles: 'fs:list-files'
  }
};

test('platform IPC config and preload IPC object stay aligned for main/preload wiring', async () => {
  const mainSource = await fs.readFile(MAIN_FILE, 'utf-8');
  const preloadSource = await fs.readFile(PRELOAD_FILE, 'utf-8');

  assert.deepEqual(APP_CONFIG.platform.ipc, EXPECTED_IPC);

  assert.match(mainSource, /APP_CONFIG\.platform\.ipc\.channels\.windowCloseRequested/);
  assert.match(mainSource, /APP_CONFIG\.platform\.ipc\.handlers\.fsListFiles/);

  assert.match(preloadSource, /const IPC = \{/);
  assert.match(preloadSource, /menuAction:\s*'menu:action'/);
  assert.match(preloadSource, /windowCloseRequested:\s*'window:close-requested'/);
  assert.match(preloadSource, /openProjectDialog:\s*'dialog:open-project'/);
  assert.match(preloadSource, /fsListFiles:\s*'fs:list-files'/);
});