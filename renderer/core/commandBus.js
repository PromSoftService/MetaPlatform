import { APP_CONFIG } from '../../config/app-config.js';

const COMMAND_BUS_LOG_SOURCE = APP_CONFIG.ui.runtime.loggerSources.commandBus;

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
      logger.warn(COMMAND_BUS_LOG_SOURCE, `Не найден обработчик команды: ${type}`);
      return null;
    }

    logger.info(COMMAND_BUS_LOG_SOURCE, `Выполнение команды: ${type}`, command?.meta || null);

    try {
      const result = await handler(command);
      logger.info(COMMAND_BUS_LOG_SOURCE, `Команда выполнена: ${type}`);
      return result;
    } catch (error) {
      logger.error(COMMAND_BUS_LOG_SOURCE, `Ошибка команды: ${type}`, {
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
