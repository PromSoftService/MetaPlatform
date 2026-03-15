import { APP_CONFIG } from '../../../config/app-config.js';
import { METALAB_CONFIG } from './metalabConfig.js';
import { createMetaLabDocument } from './metalabDocumentFactory.js';
import { createMetaLabEditor } from '../../editors/metalab/createMetaLabEditor.js';
import { slugifyDocumentName } from '../../runtime/naming.js';

export function createMetaLabModule() {
  return {
    id: METALAB_CONFIG.moduleId,
    name: METALAB_CONFIG.moduleName,
    documentKinds: [METALAB_CONFIG.documentKind],

    getDefaultName() {
      return METALAB_CONFIG.defaults.newDocumentName;
    },

    createDefaultDocument({ name }) {
      return createMetaLabDocument({ name });
    },

    getFileName(document) {
      return `${slugifyDocumentName(document?.scenario?.name || METALAB_CONFIG.defaults.newDocumentName)}${APP_CONFIG.project.fileExtensions.default}`;
    },

    async openDocument({ documentRecord, mountElement }) {
      return createMetaLabEditor({ documentRecord, mountElement });
    }
  };
}
