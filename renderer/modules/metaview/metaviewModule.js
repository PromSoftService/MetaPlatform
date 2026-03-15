import { APP_CONFIG } from '../../../config/app-config.js';
import { METAVIEW_CONFIG } from './metaviewConfig.js';
import { createMetaViewDocument } from './metaviewDocumentFactory.js';
import { createMetaViewEditor } from '../../editors/metaview/createMetaViewEditor.js';
import { slugifyDocumentName } from '../../runtime/naming.js';

export function createMetaViewModule() {
  return {
    id: METAVIEW_CONFIG.moduleId,
    name: METAVIEW_CONFIG.moduleName,
    documentKinds: [METAVIEW_CONFIG.documentKind],

    getDefaultName() {
      return METAVIEW_CONFIG.defaults.newDocumentName;
    },

    createDefaultDocument({ name }) {
      return createMetaViewDocument({ name });
    },

    getFileName(document) {
      return `${slugifyDocumentName(document?.screen?.name || METAVIEW_CONFIG.defaults.newDocumentName)}${APP_CONFIG.project.fileExtensions.default}`;
    },

    async openDocument({ documentRecord, mountElement }) {
      return createMetaViewEditor({ documentRecord, mountElement });
    }
  };
}
