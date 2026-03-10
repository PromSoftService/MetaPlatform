import { METALAB_CONFIG } from './metalabConfig.js';

export function createMetaLabCommands() {
  return {
    [METALAB_CONFIG.commands.createScenario]: async () => {
      throw new Error(`${METALAB_CONFIG.commands.createScenario} будет подключена на следующем шаге`);
    },

    [METALAB_CONFIG.commands.runScenario]: async () => {
      throw new Error(`${METALAB_CONFIG.commands.runScenario} будет подключена на следующем шаге`);
    },

    [METALAB_CONFIG.commands.stopScenario]: async () => {
      throw new Error(`${METALAB_CONFIG.commands.stopScenario} будет подключена на следующем шаге`);
    }
  };
}