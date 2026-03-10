export const METAGEN_CONFIG = {
  moduleId: 'metagen',
  moduleName: 'MetaGen',

  documentKind: 'metagen.component',
  defaultType: 'template',

  commands: {
    createDocument: 'METAGEN_CREATE_DOCUMENT',
    generateCode: 'METAGEN_GENERATE_CODE',
    validateDocument: 'METAGEN_VALIDATE_DOCUMENT'
  },

  generation: {
    defaultEngine: 'python',
    defaultEntrypoint: 'gen_v2.py',
    defaultMode: 'external',
    defaultOutputLanguage: 'st'
  },

  editor: {
    saveShortcutKey: 's'
  },

  defaults: {
    newDocumentName: 'Новый компонент'
  },

  ui: {
    createPromptTitle: 'Имя документа MetaGen'
  }
};