import { METAVIEW_CONFIG } from './metaviewConfig.js';
import { createDocumentGuid } from '../../runtime/documentRecordIdentity.js';

export function createMetaViewDocument({ name = METAVIEW_CONFIG.defaults.newDocumentName } = {}) {
  const safeName = String(name || METAVIEW_CONFIG.defaults.newDocumentName).trim();

  return {
    kind: METAVIEW_CONFIG.documentKind,
    version: 1,
    screen: {
      id: createDocumentGuid(),
      name: safeName
    }
  };
}
