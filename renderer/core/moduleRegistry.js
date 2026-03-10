export function createModuleRegistry({ logger }) {
  const modulesById = new Map();
  const documentKindToModuleId = new Map();

  function registerModule(module) {
    if (!module?.id) {
      throw new Error('Module id is required');
    }

    modulesById.set(module.id, module);

    for (const kind of module.documentKinds || []) {
      documentKindToModuleId.set(kind, module.id);
    }

    logger.info('module-registry', 'Модуль зарегистрирован', {
      id: module.id,
      name: module.name,
      documentKinds: module.documentKinds || []
    });
  }

  function getModule(moduleId) {
    return modulesById.get(moduleId) || null;
  }

  function getAllModules() {
    return [...modulesById.values()];
  }

  function findModuleByDocumentKind(kind) {
    const moduleId = documentKindToModuleId.get(kind);
    return moduleId ? getModule(moduleId) : null;
  }

  return {
    registerModule,
    getModule,
    getAllModules,
    findModuleByDocumentKind
  };
}