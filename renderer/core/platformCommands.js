const PLATFORM_COMMAND_PREFIX = 'PLATFORM_';

const PLATFORM_COMMAND_TOKENS = {
  createProject: 'CREATE_PROJECT',
  openProject: 'OPEN_PROJECT',
  saveProject: 'SAVE_PROJECT',
  closeProject: 'CLOSE_PROJECT',
  openDocument: 'OPEN_DOCUMENT',
  renameDocument: 'RENAME_DOCUMENT',
  deleteDocument: 'DELETE_DOCUMENT',
  activateTab: 'ACTIVATE_TAB',
  closeTab: 'CLOSE_TAB'
};

export const PLATFORM_COMMANDS = Object.fromEntries(
  Object.entries(PLATFORM_COMMAND_TOKENS).map(([key, token]) => [key, `${PLATFORM_COMMAND_PREFIX}${token}`])
);
