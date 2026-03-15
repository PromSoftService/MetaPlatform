import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const IPC_CONFIG = require('./ipc-config.json');

export default IPC_CONFIG;
