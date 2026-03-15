import { METALAB_CONFIG } from './metalabConfig.js';
import { createDocumentGuid } from '../../runtime/documentRecordIdentity.js';

export function createMetaLabDocument({ name = METALAB_CONFIG.defaults.newDocumentName } = {}) {
  const safeName = String(name || METALAB_CONFIG.defaults.newDocumentName).trim();

  return {
    kind: METALAB_CONFIG.documentKind,
    version: 1,
    scenario: {
      id: createDocumentGuid(),
      name: safeName
    }
  };
}
