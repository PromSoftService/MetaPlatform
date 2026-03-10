import YAML from 'yaml';

export function createDocumentLoader({ fileSystem }) {
  return {
    async loadYaml(targetPath) {
      const text = await fileSystem.readText(targetPath);
      return {
        rawText: text,
        data: YAML.parse(text)
      };
    },

    async saveYaml(targetPath, value) {
      const text = YAML.stringify(value);
      await fileSystem.writeText(targetPath, text);
      return text;
    }
  };
}