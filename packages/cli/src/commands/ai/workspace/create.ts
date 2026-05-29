/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import type {CfsPluginInfo} from 'cfs-types';

import {Command, Flags} from '@oclif/core';
import {CfsDataModelManager} from 'cfs-lib';
import {readdirSync} from 'node:fs';
import path from 'node:path';

import {getDataModelManager} from '../../../utils/data-model-manager.js';
import {getPackageManager} from '../../../utils/package-manager.js';
import {getPluginManager} from '../../../utils/plugin-manager.js';
import {
  validatePaths,
  validateSoC
} from '../../../utils/validation.js';
import {
  checkErrors,
  createWorkspaceConfig,
  generateWorkspaceFromConfig,
  getPackageNameFromTemplate,
  getValidTemplate
} from '../../../utils/workspace-utils.js';

export default class WorkspaceCreate extends Command {
  static description = 'Generates a workspace based on a model file.';

  static examples = [
    '<%= config.bin %> <%= command.id %> -o c:/tmp --name myNewWorkspace --soc MAX32690 --board EvKit_V1 --core CM4 --model c:/models/model.tflite'
  ];

  static flags = {
    'search-path': Flags.string({
      char: 's',
      summary:
        'Additional search path for templates and data models. Can be used multiple times',
      multiple: true,
      required: false
    }),
    output: Flags.string({
      char: 'o',
      required: true,
      summary:
        'Output path for new workspace (excluding workspace name)'
    }),
    name: Flags.string({
      required: true,
      summary: 'Name for new workspace'
    }),
    soc: Flags.string({
      required: true,
      summary: 'SoC name'
    }),
    board: Flags.string({
      required: true,
      summary: 'Board name'
    }),
    core: Flags.string({
      summary: 'Target core',
      required: true
    }),
    model: Flags.string({
      char: 'm',
      required: true,
      summary: 'Path or URL to the model file'
    }),
    dataset: Flags.string({
      required: false,
      summary: 'Path or URL to the sample dataset for the model'
    }),
    'skip-compat': Flags.boolean({
      char: 'f',
      required: false,
      default: false,
      summary: 'Skip the model compatibility check'
    })
  };

  async run() {
    const {flags} = await this.parse(WorkspaceCreate);

    const pkgManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager: CfsDataModelManager = await getDataModelManager(
      this.config,
      pkgManager,
      flags['search-path']
    );

    const pluginManager = getPluginManager(
      dmManager,
      flags['search-path'],
      pkgManager
    );

    // Collect all validation errors
    const errors: string[] = [];

    // Validate the path names and file names
    await validatePaths(flags, true, errors);

    await validateSoC(flags, this.config, true, errors);

    checkErrors(errors, this);

    const template = await getValidTemplate(
      flags,
      pluginManager,
      errors
    );

    checkErrors(errors, this);

    const packageName = getPackageNameFromTemplate(
      template as CfsPluginInfo,
      flags.soc,
      flags.board,
      errors
    );

    checkErrors(errors, this);

    if (!flags['skip-compat']) {
      await this.config.runCommand('ai:compat', [
        '--soc',
        flags.soc,
        '--core',
        flags.core,
        '--model',
        flags.model,
        '--package',
        packageName as string,
        ...(flags.dataset ? ['--dataset', flags.dataset] : [])
      ]);

      if (process.exitCode !== 0) {
        this.exit(1);
      }
    }

    const workspaceConfig = createWorkspaceConfig({
      soc: flags.soc,
      package: packageName as string,
      board: flags.board,
      workspaceName: flags.name,
      location: flags.output,
      workspacePluginId: template?.pluginId as string,
      workspacePluginVersion: template?.pluginVersion as string
    });

    this.log(
      `Creating workspace '${flags.name}' at location: ${flags.output}`
    );
    this.log(
      `Template: ${template?.pluginId} (version ${workspaceConfig.workspacePluginVersion})`
    );

    await generateWorkspaceFromConfig(
      workspaceConfig,
      pluginManager,
      this
    );

    const workspacePath = path.join(
      flags.output as string,
      flags.name as string
    );

    const cfsDirPath = path.join(workspacePath, '.cfs');
    const files = readdirSync(cfsDirPath);
    const configFile = files.find((f) => f.endsWith('.cfsconfig'));

    if (configFile) {
      const MODEL_NAME = 'model';

      const modelArgs = [
        '--core',
        flags.core,
        '--name',
        MODEL_NAME,
        '--workspace',
        workspacePath,
        '--set',
        `model=${flags.model}`
      ];

      if (flags.dataset) {
        modelArgs.push(`dataset=${flags.dataset}`);
      }

      await this.config.runCommand('ai:model:update', modelArgs);

      await this.config.runCommand('ai:build', [
        '--config',
        path.join(cfsDirPath, configFile),
        '--cwd',
        workspacePath
      ]);
    } else {
      this.warn(
        'Could not find .cfsconfig file to run: ai:model:update, ai:build'
      );
    }
  }
}
