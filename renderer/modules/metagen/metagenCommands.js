export function createMetaGenCommands() {
  return {
    CREATE_METAGEN_DOCUMENT: async () => {
      throw new Error('CREATE_METAGEN_DOCUMENT будет подключена на следующем шаге');
    },
    GENERATE_METAGEN_CODE: async () => {
      throw new Error('GENERATE_METAGEN_CODE будет подключена на следующем шаге');
    },
    VALIDATE_METAGEN_DOCUMENT: async () => {
      throw new Error('VALIDATE_METAGEN_DOCUMENT будет подключена на следующем шаге');
    }
  };
}