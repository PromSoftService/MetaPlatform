import { slugifyDocumentName } from '../../runtime/naming.js';
import { METAGEN_CONFIG } from './metagenConfig.js';

export function createMetaGenDocument({ name }) {
  const safeName = String(name || METAGEN_CONFIG.defaults.newDocumentName).trim();
  const safeId = slugifyDocumentName(safeName) || 'new_component';

  return {
    kind: METAGEN_CONFIG.documentKind,
    version: 1,
    component: {
      id: safeId,
      name: safeName,
      type: METAGEN_CONFIG.defaultType,
      module: METAGEN_CONFIG.moduleName,
      description: ''
    },
    params: {
      format: 'header-plus-rows',
      header: [],
      rows: []
    },
    data: {
      format: 'table',
      columns: [],
      rows: []
    },
    instances: {
      format: 'list',
      rows: []
    },
    code: {
      format: 'template-text',
      language: 'st-template',
      text: ''
    },
    generation: {
      engine: METAGEN_CONFIG.generation.defaultEngine,
      entrypoint: METAGEN_CONFIG.generation.defaultEntrypoint,
      mode: METAGEN_CONFIG.generation.defaultMode,
      output: {
        language: METAGEN_CONFIG.generation.defaultOutputLanguage,
        fileName: `${safeId}.st`
      }
    },
    meta: {
      author: '',
      importedFrom: '',
      importedSheet: ''
    }
  };
}