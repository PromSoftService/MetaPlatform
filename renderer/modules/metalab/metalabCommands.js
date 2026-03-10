export function createMetaLabCommands() {
  return {
    CREATE_SCENARIO: async () => {
      throw new Error('CREATE_SCENARIO будет подключена на следующем шаге');
    },
    RUN_SCENARIO: async () => {
      throw new Error('RUN_SCENARIO будет подключена на следующем шаге');
    },
    STOP_SCENARIO: async () => {
      throw new Error('STOP_SCENARIO будет подключена на следующем шаге');
    }
  };
}