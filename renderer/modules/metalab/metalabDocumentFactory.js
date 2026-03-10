import { METALAB_CONFIG } from './metalabConfig.js';

export function createMetaLabDocument({ name = 'Новый сценарий' } = {}) {
  return {
    kind: METALAB_CONFIG.documentKind,
    version: 1,
    scenario: {
      id: 'new_scenario',
      name
    }
  };
}
