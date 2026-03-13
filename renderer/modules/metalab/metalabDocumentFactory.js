import { METALAB_CONFIG } from './metalabConfig.js';
import { slugifyDocumentName } from '../../runtime/naming.js';
import { createTransientEntityId } from '../../runtime/idFactory.js';

export function createMetaLabDocument({ name = 'Новый сценарий' } = {}) {
  const safeName = String(name || 'Новый сценарий').trim();
  const baseId = slugifyDocumentName(safeName) || 'new_scenario';

  return {
    kind: METALAB_CONFIG.documentKind,
    version: 1,
    scenario: {
      id: createTransientEntityId(baseId, 'new_scenario'),
      name: safeName
    }
  };
}
