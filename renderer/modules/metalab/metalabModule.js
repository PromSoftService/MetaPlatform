import { METALAB_CONFIG } from './metalabConfig.js';
import { createMetaLabDocument } from './metalabDocumentFactory.js';

export function createMetaLabModule() {
  return {
    id: METALAB_CONFIG.moduleId,
    name: METALAB_CONFIG.moduleName,
    documentKinds: [METALAB_CONFIG.documentKind],

    createDefaultDocument() {
      return createMetaLabDocument();
    },

    getFileName() {
      return 'new_scenario.yaml';
    },

    async openDocument() {
      return {
        dispose() {}
      };
    }
  };
}