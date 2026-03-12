import { APP_CONFIG } from '../../config/app-config.js';

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  none: 50
};

function resolveConfigLevel() {
  return APP_CONFIG.platform?.logging?.level || 'info';
}

function shouldWrite(level) {
  const targetLevel = resolveConfigLevel();
  const targetPriority = LEVELS[targetLevel] ?? LEVELS.info;
  const entryPriority = LEVELS[level] ?? LEVELS.info;
  return entryPriority >= targetPriority && targetPriority < LEVELS.none;
}

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

  function writeToConsole(level, line, detailsText) {
    if (!APP_CONFIG.platform?.logging?.mirrorToConsole) {
      return;
    }

    const methodName = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    const method = console[methodName]?.bind(console) ?? console.log.bind(console);
    method(line);

    if (detailsText) {
      method(detailsText);
    }
  }

  function write(level, source, message, details = null) {
    if (!shouldWrite(level)) {
      return;
    }

    const ts = new Date().toLocaleTimeString(APP_CONFIG.platform.locale);
    const line = `[${ts}] [${source}] ${level.toUpperCase()} ${message}`;
    const detailsText = details != null ? normalizeDetails(details) : '';

    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const lineNode = document.createElement('div');
    lineNode.className = 'log-line';
    lineNode.textContent = line;
    entry.appendChild(lineNode);

    if (details != null) {
      const detailsNode = document.createElement('pre');
      detailsNode.className = 'log-details';
      detailsNode.textContent = detailsText;
      entry.appendChild(detailsNode);
    }

    output?.appendChild(entry);
    output?.scrollTo({ top: output.scrollHeight });
    writeToConsole(level, line, detailsText);
  }

  function clear() {
    if (output) {
      output.innerHTML = '';
    }
  }

  return {
    debug: (source, message, details = null) => write('debug', source, message, details),
    info: (source, message, details = null) => write('info', source, message, details),
    warn: (source, message, details = null) => write('warn', source, message, details),
    error: (source, message, details = null) => write('error', source, message, details),
    clear
  };
}