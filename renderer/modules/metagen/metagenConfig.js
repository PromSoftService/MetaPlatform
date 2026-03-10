export const METAGEN_CONFIG = {
  moduleId: 'metagen',
  moduleName: 'MetaGen',

  documentKind: 'metagen.component',
  defaultType: 'template',

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
  }
};