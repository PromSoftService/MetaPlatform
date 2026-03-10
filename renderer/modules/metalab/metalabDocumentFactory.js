import { METALAB_CONFIG } from './metalabConfig.js';

export function createMetaLabDocument() {
  return {
    kind: METALAB_CONFIG.documentKind,
    version: 1
  };
}