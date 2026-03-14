import { APP_CONFIG } from '../../config/app-config.js';
import { slugifyDocumentName } from './naming.js';

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

export function setDocumentName(documentRecord, nextName) {
  const value = normalizeDocumentName(nextName);
  const slug = slugifyDocumentName(value);

  if (documentRecord?.document?.component) {
    documentRecord.document.component.name = value;

    if ('id' in documentRecord.document.component) {
      documentRecord.document.component.id = slug || 'new_component';
    }

    if (documentRecord.document?.generation?.output) {
      documentRecord.document.generation.output.fileName = `${slug || 'new_component'}.st`;
    }

    return value;
  }

  if (documentRecord?.document?.scenario) {
    documentRecord.document.scenario.name = value;

    if ('id' in documentRecord.document.scenario) {
      documentRecord.document.scenario.id = slug || 'new_scenario';
    }

    return value;
  }

  if (documentRecord?.document?.screen) {
    documentRecord.document.screen.name = value;

    if ('id' in documentRecord.document.screen) {
      documentRecord.document.screen.id = slug || 'new_screen';
    }

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

export function getDocumentSemanticKey(documentRecord) {
  const moduleId = String(documentRecord?.moduleId || '').trim();
  const documentName = getDocumentName(documentRecord);

  if (!moduleId || !documentName) {
    return '';
  }

  return `${moduleId}::${documentName}`;
}
