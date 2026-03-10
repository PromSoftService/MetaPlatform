import { APP_CONFIG } from '../../config/app-config.js';

export function createLogger() {
  const output = document.getElementById(APP_CONFIG.ui.dom.logContainerId);

  function normalizeDetails(details) {
    if (details == null) {
      return '';
    }

    if (typeof details === 'string') {
      return details;
    }

    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }

  function write(level, source, message, details = null) {
    const ts = new Date().toLocaleTimeString(APP_CONFIG.platform.locale);
    const line = `[${ts}] [${source}] ${level.toUpperCase()} ${message}`;

    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const lineNode = document.createElement('div');
    lineNode.className = 'log-line';
    lineNode.textContent = line;
    entry.appendChild(lineNode);

    if (details != null) {
      const detailsNode = document.createElement('pre');
      detailsNode.className = 'log-details';
      detailsNode.textContent = normalizeDetails(details);
      entry.appendChild(detailsNode);
    }

    output?.appendChild(entry);
    output?.scrollTo({ top: output.scrollHeight });
  }

  return {
    debug: (source, message, details = null) => write('debug', source, message, details),
    info: (source, message, details = null) => write('info', source, message, details),
    warn: (source, message, details = null) => write('warn', source, message, details),
    error: (source, message, details = null) => write('error', source, message, details)
  };
}