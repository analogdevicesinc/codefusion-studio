import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths relative to this file's location (packages/cli/test/)
export const CFS_PLUGINS_PATH = path.resolve(
  __dirname,
  './fixtures/plugins'
);

export const CFS_DATA_MODELS_PATH = path.resolve(
  __dirname,
  '../../cfs-data-models/socs'
);
