export function createMetaViewCommands() {
  return {
    CREATE_SCREEN: async () => {
      throw new Error('CREATE_SCREEN будет подключена на следующем шаге');
    }
  };
}