import { METALAB_CONFIG } from './metalabConfig.js';
import { slugifyDocumentName } from '../../runtime/naming.js';

export function createMetaLabDocument({ name = 'Новый сценарий' } = {}) {
  const safeName = String(name || 'Новый сценарий').trim();
  const baseId = slugifyDocumentName(safeName) || 'new_scenario';
  const uniqueSuffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  return {
    kind: METALAB_CONFIG.documentKind,
    version: 1,
    scenario: {
      id: `${baseId}_${uniqueSuffix}`,
      name: safeName
    }
  };
}
