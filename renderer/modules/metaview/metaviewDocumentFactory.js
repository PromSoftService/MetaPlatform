import { METAVIEW_CONFIG } from './metaviewConfig.js';

export function createMetaViewDocument({ name = 'Новый экран' } = {}) {
  return {
    kind: METAVIEW_CONFIG.documentKind,
    version: 1,
    screen: {
      id: 'new_screen',
      name
    }
  };
}
