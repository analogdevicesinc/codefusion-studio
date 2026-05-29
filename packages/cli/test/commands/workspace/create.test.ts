import {test, expect} from '@oclif/test';
import type {CfsWorkspace} from 'cfs-types';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  CFS_PLUGINS_PATH,
  CFS_DATA_MODELS_PATH
} from '../../constants.js';

/**
 * Test suite for workspace:create command. Check:
 * - Creating a workspace from an existing .cfsworkspace file (-w).
 * - Creating a workspace from command line arguments (-o, --name, etc.).
 * - That specifying -w and (-o, --name, --soc, --board, or --template-id) causes an error.
 * - There's an error when -o is specified and (--board, --name or --template-id) is missing.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsPath = path.resolve(__dirname, '..', CFS_PLUGINS_PATH);
const dataModelsPath = CFS_DATA_MODELS_PATH;
const workspaceFilenamePath = path.resolve(
  __dirname,
  'sample.cfsworkspace'
);
const workspaceName = 'myWorkspace';
const fullWorkspacePath = path.resolve(__dirname, workspaceName);

describe('workspace:create', () => {
  describe('create workspace from existing file', () => {
    let cfsworkspace: CfsWorkspace;

    before(async () => {
      try {
        cfsworkspace = JSON.parse(
          fs.readFileSync(workspaceFilenamePath, 'utf8')
        );
      } catch (error) {
        console.log('Error inside test before', error);
        throw error;
      }
    });

    after(async () => {
      try {
        fs.rmSync(
          path.resolve(
            __dirname,
            path.basename(cfsworkspace.location)
          ),
          {
            recursive: true,
            force: true
          }
        );
      } catch (error) {
        console.log('Error inside test after', error);
        throw error;
      }
    });

    test
      .stderr({print: true})
      .command(
        [
          'workspace:create',
          '--workspace-file-path',
          workspaceFilenamePath,
          '--search-path',
          pluginsPath,
          '--search-path',
          dataModelsPath
        ],
        {
          root: '..'
        }
      )
      .it('should create a workspace.', (ctx) => {
        expect(ctx.stderr, 'stderr should be empty').to.be.empty;
        expect(fs.statSync(cfsworkspace.location).isDirectory()).to.be
          .true;
      });
  });

  describe('create workspace from command line args', () => {
    const pluginsPath = path.resolve(
      __dirname,
      '..',
      CFS_PLUGINS_PATH
    );

    after(async () => {
      try {
        fs.rmSync(path.resolve(__dirname, fullWorkspacePath), {
          recursive: true,
          force: true
        });
      } catch (error) {
        console.log('Error inside test after', error);
        throw error;
      }
    });

    test
      .stderr({print: true})
      .command(
        [
          'workspace:create',
          '-o=' + __dirname,
          '--name=' + workspaceName,
          '--board=ADSPSC835-EV-SOM',
          '--soc=ADSP-SC835',
          '--search-path',
          pluginsPath,
          '--search-path',
          dataModelsPath,
          '--template-id=com.analog.sharcfx.mock.example'
        ],
        {
          root: '..'
        }
      )
      .it('should create a workspace from parameters', (ctx) => {
        expect(ctx.stderr, 'stderr should be empty').to.be.empty;
        expect(fs.statSync(fullWorkspacePath).isDirectory()).to.be
          .true;
      });
  });

  describe('error handling - incompatible flag combinations', () => {
    // Define a selection of invalid flag combinations and expected error messages
    const invalidCombinations = [
      {
        // Specify  --soc with --workspace-file-path
        flags: [
          '--soc=ADSP-SC835',
          '--workspace-file-path',
          workspaceFilenamePath
        ],
        errorMessages: [
          'should not be used when generating a workspace using workspace file'
        ],
        description:
          'shows error when both -w and --soc are specified'
      },
      {
        // Missing --board
        flags: [
          '-o=' + __dirname,
          '--name=' + workspaceName,
          '--soc=ADSP-SC835',
          '--template-id=com.analog.sharcfx.mock.example'
        ],
        errorMessages: [
          '--board is required when creating a new workspace'
        ],
        description: 'shows error when --board is missing'
      },
      {
        // Missing --name
        flags: [
          '-o=' + __dirname,
          '--board=ADSPSC835-EV-SOM',
          '--soc=ADSP-SC835',
          '--template-id=com.analog.sharcfx.mock.example'
        ],
        errorMessages: [
          '--name is required when creating a new workspace'
        ],
        description: 'shows error when --name is missing'
      },
      {
        // Invalid board name
        flags: [
          '-o=' + __dirname,
          '--name=' + workspaceName,
          '--soc=ADSP-SC835',
          '--template-id=com.analog.sharcfx.mock.example',
          '--board=madeupboard'
        ],
        errorMessages: ["Board 'madeupboard' not found for"],
        description: 'shows error when invalid board is specified'
      },
      {
        // Multiple missing items: --name, --soc and --template-id
        flags: ['-o=' + __dirname, '--board=ADSPSC835-EV-SOM'],
        errorMessages: [
          '--name is required when creating a new workspace',
          '--template-id is required when creating a new workspace',
          '--soc is required when creating a new workspace'
        ],
        description:
          'shows error when --name, --soc and --template are missing'
      }
    ];

    invalidCombinations.forEach(
      ({flags, errorMessages, description}) => {
        test
          .stderr({print: true})
          .command(
            [
              'workspace:create',
              ...flags,
              '--search-path',
              pluginsPath,
              '--search-path',
              dataModelsPath
            ],
            {root: '..'}
          )
          .catch((error) => {
            // Check that expected error messages are present
            for (const errorMessage of errorMessages) {
              expect(error.message).to.contain(errorMessage);
            }
          })
          .it(description);
      }
    );
  });
});
