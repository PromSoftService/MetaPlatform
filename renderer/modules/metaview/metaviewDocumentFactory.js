import { METAVIEW_CONFIG } from './metaviewConfig.js';
import { slugifyDocumentName } from '../../runtime/naming.js';
import { createTransientEntityId } from '../../runtime/idFactory.js';

export function createMetaViewDocument({ name = 'Новый экран' } = {}) {
  const safeName = String(name || 'Новый экран').trim();
  const baseId = slugifyDocumentName(safeName) || 'new_screen';

  return {
    kind: METAVIEW_CONFIG.documentKind,
    version: 1,
    screen: {
      id: createTransientEntityId(baseId, 'new_screen'),
      name: safeName
    }
  };
}
