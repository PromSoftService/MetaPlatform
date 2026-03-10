export function createMetaGenGeneratorBridge() {
  return {
    async generate() {
      throw new Error('MetaGen generator bridge is reserved for the next step');
    }
  };
}