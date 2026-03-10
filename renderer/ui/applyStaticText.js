import { APP_CONFIG } from '../../config/app-config.js';

export function applyStaticText() {
  const titleNode = document.querySelector(APP_CONFIG.ui.dom.titleSelector);
  const topPanelTitleNode = document.querySelector(APP_CONFIG.ui.dom.topPanelTitleSelector);
  const logsHeaderNode = document.querySelector(APP_CONFIG.ui.dom.logsPanelHeaderSelector);

  if (titleNode) {
    titleNode.textContent = APP_CONFIG.platform.app.title;
  }

  if (topPanelTitleNode) {
    topPanelTitleNode.textContent = APP_CONFIG.platform.app.topPanelTitle;
  }

  if (logsHeaderNode) {
    logsHeaderNode.textContent = APP_CONFIG.ui.panelHeaders.logs;
  }
}