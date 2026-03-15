import { APP_CONFIG } from '../../config/app-config.js';

const LOG_ENTRY_CLASS = APP_CONFIG.ui.classNames.logEntry;
const LOG_LINE_CLASS = APP_CONFIG.ui.classNames.logLine;
const LOG_DETAILS_CLASS = APP_CONFIG.ui.classNames.logDetails;

export function normalizeLogDetails(details) {
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

export function createDomLogSink({ output }) {
  return {
    write(entry) {
      if (!output) {
        return;
      }

      const node = document.createElement('div');
      node.className = LOG_ENTRY_CLASS;

      const lineNode = document.createElement('div');
      lineNode.className = LOG_LINE_CLASS;
      lineNode.textContent = entry.line;
      node.appendChild(lineNode);

      if (entry.detailsText) {
        const detailsNode = document.createElement('pre');
        detailsNode.className = LOG_DETAILS_CLASS;
        detailsNode.textContent = entry.detailsText;
        node.appendChild(detailsNode);
      }

      output.appendChild(node);
      output.scrollTo({ top: output.scrollHeight });
    },
    clear() {
      if (output) {
        output.innerHTML = '';
      }
    }
  };
}

export function createConsoleLogSink({ mirrorToConsole = APP_CONFIG.platform?.logging?.mirrorToConsole } = {}) {
  return {
    write(entry) {
      if (!mirrorToConsole) {
        return;
      }

      const methodName = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
      const method = console[methodName]?.bind(console) ?? console.log.bind(console);
      method(entry.line);

      if (entry.detailsText) {
        method(entry.detailsText);
      }
    },
    clear() {}
  };
}

export function createMemoryLogSink() {
  const entries = [];

  return {
    write(entry) {
      entries.push(entry);
    },
    clear() {
      entries.length = 0;
    },
    getEntries() {
      return [...entries];
    }
  };
}
