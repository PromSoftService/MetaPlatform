import { METAVIEW_CONFIG } from './metaviewConfig.js';

export function createMetaViewCommands() {
  return {
    [METAVIEW_CONFIG.commands.createScreen]: async () => {
      throw new Error(`${METAVIEW_CONFIG.commands.createScreen} будет подключена на следующем шаге`);
    }
  };
}