import { APP_CONFIG } from '../../config/app-config.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fallbackUuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
}

export function createDocumentGuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return fallbackUuidV4();
}

export function normalizeDocumentName(name) {
  return String(name ?? '').trim();
}

export function getDocumentName(documentRecord) {
  return normalizeDocumentName(
    documentRecord?.document?.component?.name
    || documentRecord?.document?.scenario?.name
    || documentRecord?.document?.screen?.name
    || documentRecord?.document?.name
    || ''
  );
}

function getDocumentIdentityContainer(documentRecord) {
  if (documentRecord?.document?.component) {
    return documentRecord.document.component;
  }

  if (documentRecord?.document?.scenario) {
    return documentRecord.document.scenario;
  }

  if (documentRecord?.document?.screen) {
    return documentRecord.document.screen;
  }

  return documentRecord?.document || null;
}

export function getDocumentId(documentRecord) {
  const value = getDocumentIdentityContainer(documentRecord)?.id;
  return typeof value === 'string' ? value.trim() : '';
}

export function isValidDocumentGuid(value) {
  return UUID_REGEX.test(String(value || '').trim());
}

export function ensureDocumentId(documentRecord, { force = false } = {}) {
  const container = getDocumentIdentityContainer(documentRecord);

  if (!container) {
    return '';
  }

  const currentId = getDocumentId(documentRecord);

  if (!force && isValidDocumentGuid(currentId)) {
    return currentId;
  }

  const nextId = createDocumentGuid();
  container.id = nextId;
  return nextId;
}

export function getDocumentIdentityKey(documentRecord) {
  const documentId = ensureDocumentId(documentRecord);
  return documentId ? `${APP_CONFIG.project.identity.documentPrefix}${documentId}` : '';
}

export function setDocumentName(documentRecord, nextName) {
  const value = normalizeDocumentName(nextName);

  if (documentRecord?.document?.component) {
    documentRecord.document.component.name = value;
    return value;
  }

  if (documentRecord?.document?.scenario) {
    documentRecord.document.scenario.name = value;
    return value;
  }

  if (documentRecord?.document?.screen) {
    documentRecord.document.screen.name = value;
    return value;
  }

  if (documentRecord?.document) {
    documentRecord.document.name = value;
  }

  return value;
}

export function getDocumentLabel(documentRecord) {
  return getDocumentName(documentRecord) || APP_CONFIG.ui.text.untitled;
}

export function isUnsavedDocumentPath(targetPath) {
  return String(targetPath || '').startsWith(APP_CONFIG.project.unsavedDocumentPathPrefix);
}
