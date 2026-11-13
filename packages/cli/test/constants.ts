import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths relative to this file's location (packages/cli/test/)
const TEST_FIXTURES_ROOT = path.resolve(
  __dirname,
  '../../../test-fixtures/plugins'
);

export const CFS_PROJECT_PLUGINS_PATH = path.resolve(
  TEST_FIXTURES_ROOT,
  'project'
);

export const CFS_WORKSPACE_TEMPLATES_PATH = path.resolve(
  TEST_FIXTURES_ROOT,
  'workspace-templates'
);

export const CFS_AI_WORKSPACE_TEMPLATES_PATH = path.resolve(
  TEST_FIXTURES_ROOT,
  'ai-workspace-templates'
);

/** @deprecated Use CFS_PROJECT_PLUGINS_PATH and CFS_WORKSPACE_TEMPLATES_PATH */
export const CFS_PLUGINS_PATH = CFS_PROJECT_PLUGINS_PATH;

// Real MAX32690/MAX32655/MAX32657/MAX78002/ADSP-SC835 SoC files copied
// verbatim from packages/cfs-data-models/socs, shared with the IDE's
// ui-test-workspace-creation suite instead of depending on that package.
export const CFS_DATA_MODELS_PATH = path.resolve(
  __dirname,
  '../../../test-fixtures/cfs-data-model/socs'
);
