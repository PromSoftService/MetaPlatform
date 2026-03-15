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
  assert.match(preloadSource, /IPC\.channels\.menuAction/);
  assert.match(preloadSource, /IPC\.channels\.windowCloseRequested/);
  assert.match(preloadSource, /IPC\.handlers\.fsListFiles/);

  for (const [key, value] of Object.entries(EXPECTED_IPC.channels)) {
    assert.match(preloadSource, new RegExp(`\\b${key}: ['\"]${value}['\"]`));
  }

  for (const [key, value] of Object.entries(EXPECTED_IPC.handlers)) {
    assert.match(preloadSource, new RegExp(`\\b${key}: ['\"]${value}['\"]`));
  }

  assert.doesNotMatch(preloadSource, /IPC_CONFIG/);
  assert.doesNotMatch(preloadSource, /require\(\s*['\"]\.\/config\//);
});
