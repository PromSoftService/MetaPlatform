import { APP_CONFIG } from '../../config/app-config.js';

export function applyStaticText() {
  const titleNode = document.querySelector(APP_CONFIG.ui.dom.titleSelector);
  const topPanelTitleNode = document.querySelector(APP_CONFIG.ui.dom.topPanelTitleSelector);
  const projectPanelTitleNode = document.querySelector(APP_CONFIG.ui.dom.projectPanelTitleSelector);
  const logsHeaderNode = document.querySelector(APP_CONFIG.ui.dom.logsPanelHeaderSelector);

  if (titleNode) {
    titleNode.textContent = APP_CONFIG.platform.app.title;
  }

  if (topPanelTitleNode) {
    topPanelTitleNode.textContent = APP_CONFIG.platform.app.topPanelTitle;
  }

  if (projectPanelTitleNode) {
    projectPanelTitleNode.textContent = APP_CONFIG.ui.panelHeaders.project;
  }

  if (logsHeaderNode) {
    logsHeaderNode.textContent = APP_CONFIG.ui.panelHeaders.logs;
  }
}