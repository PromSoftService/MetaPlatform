import { METAVIEW_CONFIG } from './metaviewConfig.js';

export function createMetaViewDocument() {
  return {
    kind: METAVIEW_CONFIG.documentKind,
    version: 1
  };
}