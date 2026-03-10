export function createCommandBus({ logger }) {
  const handlers = new Map();

  function register(commandType, handler) {
    handlers.set(commandType, handler);
  }

  async function execute(command) {
    const type = command?.type;

    if (!type) {
      throw new Error('Command type is required');
    }

    const handler = handlers.get(type);

    if (!handler) {
      logger.warn('command-bus', `Не найден обработчик команды: ${type}`);
      return null;
    }

    logger.info('command-bus', `Выполнение команды: ${type}`, command?.meta || null);

    try {
      const result = await handler(command);
      logger.info('command-bus', `Команда выполнена: ${type}`);
      return result;
    } catch (error) {
      logger.error('command-bus', `Ошибка команды: ${type}`, {
        message: error?.message || String(error)
      });
      throw error;
    }
  }

  return {
    register,
    execute
  };
}