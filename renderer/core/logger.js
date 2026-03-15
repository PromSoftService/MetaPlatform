import { APP_CONFIG } from '../../config/app-config.js';
import {
  createConsoleLogSink,
  createDomLogSink,
  normalizeLogDetails
} from './loggerSinks.js';

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

export function createCoreLogger({ sinks = [] } = {}) {
  function write(level, source, message, details = null) {
    if (!shouldWrite(level)) {
      return;
    }

    const ts = new Date().toLocaleTimeString(APP_CONFIG.platform.locale);
    const line = `[${ts}] [${source}] ${level.toUpperCase()} ${message}`;
    const detailsText = details != null ? normalizeLogDetails(details) : '';
    const entry = { level, source, message, line, details, detailsText, ts };

    sinks.forEach((sink) => sink?.write?.(entry));
  }

  function clear() {
    sinks.forEach((sink) => sink?.clear?.());
  }

  return {
    debug: (source, message, details = null) => write('debug', source, message, details),
    info: (source, message, details = null) => write('info', source, message, details),
    warn: (source, message, details = null) => write('warn', source, message, details),
    error: (source, message, details = null) => write('error', source, message, details),
    clear
  };
}

export function createLogger() {
  const output = document.getElementById(APP_CONFIG.ui.dom.logContainerId);
  const sinks = [
    createDomLogSink({ output }),
    createConsoleLogSink()
  ];

  return createCoreLogger({ sinks });
}

export { shouldWrite };
