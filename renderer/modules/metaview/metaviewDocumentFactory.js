import { METAVIEW_CONFIG } from './metaviewConfig.js';
import { slugifyDocumentName } from '../../runtime/naming.js';

export function createMetaViewDocument({ name = 'Новый экран' } = {}) {
  const safeName = String(name || 'Новый экран').trim();
  const baseId = slugifyDocumentName(safeName) || 'new_screen';
  const uniqueSuffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  return {
    kind: METAVIEW_CONFIG.documentKind,
    version: 1,
    screen: {
      id: `${baseId}_${uniqueSuffix}`,
      name: safeName
    }
  };
}
