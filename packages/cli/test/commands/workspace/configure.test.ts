/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {test, expect} from '@oclif/test';
import type {CfsWorkspace, CfsProject} from 'cfs-types';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  CFS_DATA_MODELS_PATH,
  CFS_PLUGINS_PATH
} from '../../constants.js';

/**
 * Test suite for workspace:configure command. Check:
 * - Creating a .cfsconfig file with proper core/template pairs
 * - Validating core and template-id pairing
 * - Optional template version handling
 * - Multiple cores support
 * - Error handling for missing or mismatched flags
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsPath = path.resolve(__dirname, '..', CFS_PLUGINS_PATH);
const dataModelsPath = path.resolve(__dirname, CFS_DATA_MODELS_PATH);

const outputPath = __dirname;
const configFilePath = path.resolve(__dirname, 'cfsworkspace.json');

describe('workspace:configure', () => {
  afterEach(async () => {
    // Clean up generated config file after each test
    try {
      if (fs.existsSync(configFilePath)) {
        fs.unlinkSync(configFilePath);
      }
    } catch (error) {
      console.log('Error cleaning up test files', error);
    }
  });

  describe('successful configuration generation for SC835', () => {
    test
      .stdout()
      .stderr({print: true})
      .command(
        [
          'workspace:configure',
          '--soc=ADSP-SC835',
          '--board=ADSPSC835-EV-SOM',
          '--core=CM33',
          '--template-id=com.analog.project.sharcfx.mock.plugin',
          '--core=FX',
          '--template-id=com.analog.project.sharcfx.mock.plugin',
          '--name=test-workspace',
          '--output=' + outputPath,
          '-w=' + configFilePath,
          '--search-path',
          pluginsPath,
          '--search-path',
          dataModelsPath
        ],
        {
          root: '..'
        }
      )
      .it(
        'should create a cfsworkspace.json with projects for FX and CM33 cores',
        (ctx) => {
          expect(ctx.stderr, 'stderr should be empty').to.be.empty;
          expect(ctx.stdout).to.contain('generated successfully');
          expect(
            fs.existsSync(configFilePath),
            'config file should exist'
          ).to.be.true;

          const workspace: CfsWorkspace = JSON.parse(
            fs.readFileSync(configFilePath, 'utf8')
          );

          expect(workspace.Soc).to.equal('ADSP-SC835');
          expect(workspace.Board).to.equal('ADSPSC835-EV-SOM');
          expect(workspace.WorkspaceName).to.equal('test-workspace');
          expect(workspace.Package).to.equal('BGA_ED');

          expect(workspace.Projects).to.have.lengthOf(2);

          const projects =
            workspace.Projects as Partial<CfsProject>[];
          expect(projects[0].Core).to.equal('CM33');
          expect(projects[0].PluginId).to.equal(
            'com.analog.project.sharcfx.mock.plugin'
          );
          expect(projects[0].IsPrimary).to.equal(false);

          expect(projects[1].Core).to.equal('FX');
          expect(projects[1].PluginId).to.equal(
            'com.analog.project.sharcfx.mock.plugin'
          );
          expect(projects[1].IsPrimary).to.equal(true);
        }
      );

    test
      .stdout()
      .stderr({print: true})
      .command(
        [
          'workspace:configure',
          '--soc=ADSP-SC835',
          '--board=ADSPSC835-EV-SOM',
          '--core=CM33',
          '--template-id=com.analog.project.sharcfx.mock.plugin',
          '--template-version=1.0.0',
          '--name=versioned-workspace',
          '--output=' + outputPath,
          '-w=' + configFilePath,
          '--search-path',
          pluginsPath,
          '--search-path',
          dataModelsPath
        ],
        {
          root: '..'
        }
      )
      .it(
        'should create a cfsworkspace.json with template version',
        (ctx) => {
          expect(ctx.stderr, 'stderr should be empty').to.be.empty;
          expect(
            fs.existsSync(configFilePath),
            'config file should exist'
          ).to.be.true;

          const workspace = JSON.parse(
            fs.readFileSync(configFilePath, 'utf8')
          ) as CfsWorkspace;

          const project = (
            workspace.Projects as Partial<CfsProject>[]
          )[0];

          expect(project.PluginVersion).to.equal('1.0.0');
        }
      );

    test
      .stdout()
      .stderr({print: true})
      .command(
        [
          'workspace:configure',
          '--soc=ADSP-SC835',
          '--board=ADSPSC835-EV-SOM',
          '--package=BGA_ED',
          '--core=CM33',
          '--template-id=com.analog.project.sharcfx.mock.plugin',
          '--name=package-workspace',
          '--output=' + outputPath,
          '-w=' + configFilePath,
          '--search-path',
          pluginsPath,
          '--search-path',
          dataModelsPath
        ],
        {
          root: '..'
        }
      )
      .it(
        'should create a cfsworkspace.json with specified package',
        (ctx) => {
          expect(ctx.stderr, 'stderr should be empty').to.be.empty;
          expect(
            fs.existsSync(configFilePath),
            'config file should exist'
          ).to.be.true;

          const workspace: CfsWorkspace = JSON.parse(
            fs.readFileSync(configFilePath, 'utf8')
          );

          expect(workspace.Package).to.equal('BGA_ED');
        }
      );
  });
});

describe('successful configuration generation for MAX78002 Zephyr and MSDK', () => {
  test
    .stdout()
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=MAX78002',
        '--board=EvKit_V1',
        '--core=CM4',
        '--template-id=com.analog.project.zephyr.mock.plugin',
        '--core=RV',
        '--template-id=com.analog.project.msdk.mock.plugin',
        '--name=test-workspace',
        '--output=' + outputPath,
        '-w=' + configFilePath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .it(
      'should create a cfsworkspace.json with projects for CM4 and RV cores',
      (ctx) => {
        expect(ctx.stderr, 'stderr should be empty').to.be.empty;
        expect(ctx.stdout).to.contain('generated successfully');
        expect(
          fs.existsSync(configFilePath),
          'config file should exist'
        ).to.be.true;
        const workspace: CfsWorkspace = JSON.parse(
          fs.readFileSync(configFilePath, 'utf8')
        );
        expect(workspace.Soc).to.equal('MAX78002');
        expect(workspace.Board).to.equal('EvKit_V1');
        expect(workspace.WorkspaceName).to.equal('test-workspace');
        expect(workspace.Projects).to.have.lengthOf(2);

        const projects = workspace.Projects as Partial<CfsProject>[];

        expect(projects[0].IsPrimary).to.equal(true);
        expect(projects[0].Core).to.equal('CM4');
        expect(projects[0].PluginId).to.equal(
          'com.analog.project.zephyr.mock.plugin'
        );

        expect(projects[1].IsPrimary).to.equal(false);
        expect(projects[1].Core).to.equal('RV');
        expect(projects[1].PluginId).to.equal(
          'com.analog.project.msdk.mock.plugin'
        );
      }
    );
});

describe('error handling - flag validation', () => {
  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=ADSPSC835-EV-SOM',
        '--core=M33',
        // Missing --template-id
        '--name=invalid-workspace',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.contain(
        'Missing required flag template-id'
      );
    })
    .it('shows error when --template-id is missing after --core');

  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=ADSPSC835-EV-SOM',
        '--core=M33',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        '--core=FX',
        // Missing second --template-id
        '--name=mismatch-workspace',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.contain('Mismatch between --core');
      expect(error.message).to.contain('--template-id');
    })
    .it('shows error when core and template-id counts do not match');

  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=ADSPSC835-EV-SOM',
        // Missing both --core and --template-id
        '--name=no-core-workspace',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
       expect(error.message).to.contain('Missing required flag');
       expect(
         error.message.includes('core') || error.message.includes('template-id')
       ).to.be.true;
    })
    .it('shows error when no core/template-id pairs are specified');

  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=ADSPSC835-EV-SOM',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        '--core=M33',
        // Invalid order: template-id before core
        '--name=invalid-order-workspace',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.contain('Invalid flag order');
    })
    .it(
      'shows error when flags are in wrong order (template-id before core)'
    );

  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=ADSPSC835-EV-SOM',
        '--core=M33',
        '--core=FX',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        // Missing second template-id with two cores
        '--name=double-core-single-template',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.contain(
        '--template-id must immediately follow --core'
      );
    })
    .it(
      'shows error when multiple --core flags appear without intermediate --template-id'
    );

  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=ADSPSC835-EV-SOM',
        '--core=M33',
        '--template-version=1.0.0',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        '--name=version-without-template',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.contain('Invalid flag order');
      expect(error.message).to.contain(
        '--template-version must immediately follow --template-id'
      );
    })
    .it(
      'shows error when --template-version must immediately follow --template-id'
    );
});

describe('error handling - missing required flags', () => {
  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        // Missing --soc
        '--board=ADSPSC835-EV-SOM',
        '--core=M33',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        '--name=no-soc-workspace',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.contain('Missing required flag soc');
    })
    .it('shows error when --soc is missing');

  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        // Missing --board
        '--core=M33',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        '--name=no-board-workspace',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.contain('Missing required flag board');
    })
    .it('shows error when --board is missing');
});

describe('error handling - invalid values', () => {
  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=INVALID-SOC',
        '--board=ADSPSC835-EV-SOM',
        '--core=M33',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        '--name=invalid-soc-workspace',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.satisfy(
        (msg: string) =>
          msg.includes('not found') ||
          msg.includes('invalid') ||
          msg.includes('INVALID-SOC')
      );
    })
    .it('shows error when invalid SoC is specified');

  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=INVALID-BOARD',
        '--core=CM33',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        '--name=invalid-board-workspace',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.satisfy((msg: string) =>
        msg.includes(
          'Please ensure that the board and SoC names are correct'
        )
      );
    })
    .it('shows error when invalid board is specified');

  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=ADSPSC835-EV-SOM',
        '--core=INVALID-CORE',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        '--name=invalid-core-workspace',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.satisfy(
        (msg: string) =>
          msg.includes('not found') ||
          msg.includes('invalid') ||
          msg.includes('core')
      );
    })
    .it('shows error when invalid core is specified');

  test
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=ADSPSC835-EV-SOM',
        '--core=M33',
        '--template-id=com.invalid.template.plugin',
        '--name=invalid-template-workspace',
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.satisfy(
        (msg: string) =>
          msg.includes('not found') || msg.includes('Template')
      );
    })
    .it('shows error when invalid template-id is specified');
});

describe('edge cases', () => {
  /*
	// Skip for now. A workspace name is currently required.
  test
    .stdout()
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=ADSPSC835-EV-SOM',
        '--core=M33',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        // No --name specified
        '--output=' + outputPath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .it('should create config without workspace name', (ctx) => {
      expect(
        fs.existsSync(configFilePath),
        'config file should exist'
      ).to.be.true;
      const workspace: CfsWorkspace = JSON.parse(
        fs.readFileSync(configFilePath, 'utf8')
      );
      expect(workspace.workspaceName).to.equal('');
    });

		*/
  /* Skip for now. A folder name is currently required.
  test
    .stdout()
    .stderr({print: true})
    .command(
      [
        'workspace:configure',
        '--soc=ADSP-SC835',
        '--board=ADSPSC835-EV-SOM',
        '--core=M33',
        '--template-id=com.analog.project.sharcfx.mock.plugin',
        '--name=default-output-workspace',
        // No --output specified, should use default '.'
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath
      ],
      {
        root: '..'
      }
    )
    .it(
      'should use default output directory when not specified',
      (ctx) => {
        expect(
          fs.existsSync(configFilePath),
          'config file should exist'
        ).to.be.true;
      }
    );
		*/
});
