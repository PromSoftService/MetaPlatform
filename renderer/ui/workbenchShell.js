import { APP_CONFIG } from '../../config/app-config.js';

export function createWorkbenchShell() {
  return {
    projectTreeId: APP_CONFIG.ui.dom.projectTreeId,
    tabsListId: APP_CONFIG.ui.dom.tabsListId,
    editorHostId: APP_CONFIG.ui.dom.editorHostId
  };
}