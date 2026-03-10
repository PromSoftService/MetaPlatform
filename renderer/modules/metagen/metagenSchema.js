import { METAGEN_CONFIG } from './metagenConfig.js';

export function validateMetaGenDocument(document) {
  const errors = [];

  if (!document || document.kind !== METAGEN_CONFIG.documentKind) {
    errors.push(`kind должен быть ${METAGEN_CONFIG.documentKind}`);
  }

  if (!document?.component?.name) {
    errors.push('component.name обязателен');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}