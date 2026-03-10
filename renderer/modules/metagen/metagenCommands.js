import { METAGEN_CONFIG } from './metagenConfig.js';

export function createMetaGenCommands() {
  return {
    [METAGEN_CONFIG.commands.createDocument]: async () => {
      throw new Error(`${METAGEN_CONFIG.commands.createDocument} будет подключена на следующем шаге`);
    },

    [METAGEN_CONFIG.commands.generateCode]: async () => {
      throw new Error(`${METAGEN_CONFIG.commands.generateCode} будет подключена на следующем шаге`);
    },

    [METAGEN_CONFIG.commands.validateDocument]: async () => {
      throw new Error(`${METAGEN_CONFIG.commands.validateDocument} будет подключена на следующем шаге`);
    }
  };
}