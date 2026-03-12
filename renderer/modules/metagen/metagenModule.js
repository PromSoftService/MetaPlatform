import { createMetaGenDocument } from './metagenDocumentFactory.js';
import { validateMetaGenDocument } from './metagenSchema.js';
import { createMetaGenEditor } from '../../editors/metagen/createMetaGenEditor.js';
import { slugifyDocumentName } from '../../runtime/naming.js';
import { METAGEN_CONFIG } from './metagenConfig.js';

export function createMetaGenModule({ logger }) {
  return {
    id: METAGEN_CONFIG.moduleId,
    name: METAGEN_CONFIG.moduleName,
    documentKinds: [METAGEN_CONFIG.documentKind],

    createDefaultDocument({ name }) {
      return createMetaGenDocument({ name });
    },

    getFileName(document) {
      return `${slugifyDocumentName(document?.component?.name || 'new_component')}.yaml`;
    },

    validate(document) {
      return validateMetaGenDocument(document);
    },

    async openDocument({ documentRecord, mountElement, onDirty }) {
      return createMetaGenEditor({
        documentRecord,
        mountElement,
        logger,
        onDirty,
        onSave: async (nextRecord) => {
          const validation = validateMetaGenDocument(nextRecord.document);

          if (!validation.isValid) {
            logger.warn(METAGEN_CONFIG.moduleId, 'Документ MetaGen не прошёл валидацию', validation.errors);
            throw new Error(validation.errors.join('; '));
          }

          return true;
        }
      });
    }
  };
}
