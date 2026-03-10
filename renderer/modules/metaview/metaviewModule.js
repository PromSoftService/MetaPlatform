import { METAVIEW_CONFIG } from './metaviewConfig.js';
import { createMetaViewDocument } from './metaviewDocumentFactory.js';

export function createMetaViewModule() {
  return {
    id: METAVIEW_CONFIG.moduleId,
    name: METAVIEW_CONFIG.moduleName,
    documentKinds: [METAVIEW_CONFIG.documentKind],

    createDefaultDocument() {
      return createMetaViewDocument();
    },

    getFileName() {
      return 'new_screen.yaml';
    },

    async openDocument() {
      return {
        dispose() {}
      };
    }
  };
}