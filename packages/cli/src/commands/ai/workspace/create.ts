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

import type {AIModelCfsWorkspace, CfsPluginInfo} from 'cfs-types';

import {Flags} from '@oclif/core';
import {
  CfsDataModelManager,
  CfsToolManager,
  generateAIWorkspace
} from 'cfs-lib';
import {readdirSync} from 'node:fs';
import path from 'node:path';

import {getModelFormat} from '../../../utils/ai-command-utils.js';
import {getSocCatalog} from '../../../utils/catalog-manager.js';
import {getDataModelManager} from '../../../utils/data-model-manager.js';
import {handleMissingDependencyError} from '../../../utils/error-handler.js';
import {getPackageManager} from '../../../utils/package-manager.js';
import {getPluginManager} from '../../../utils/plugin-manager.js';
import {
  findSocByName,
  getCFSInstallPath
} from '../../../utils/utils.js';
import {
  validatePaths,
  validateSoC
} from '../../../utils/validation.js';
import {
  checkErrors,
  createWorkspaceConfig,
  getPackageNameFromTemplate,
  getValidTemplate
} from '../../../utils/workspace-utils.js';
import {BaseCommand} from '../../../utils/base-command.js';
import {
  errorWithCode,
  RecoverableError
} from '../../../utils/recoverable-error.js';
import {preserveTelemetrySession} from '../../../utils/telemetry-session.js';

export default class WorkspaceCreate extends BaseCommand<
  typeof WorkspaceCreate
> {
  static useResponseEnvelope = true;

  static description = 'Generates a workspace based on a model file.';

  static examples = [
    '<%= config.bin %> <%= command.id %> -o c:/tmp --name myNewWorkspace --soc MAX32690 --board EvKit_V1 --core CM4 --model c:/models/model.tflite',
    '<%= config.bin %> <%= command.id %> -o c:/tmp --name myNewWorkspace --soc MAX32690 --board EvKit_V1 --core CM4 --model c:/models/model.tflite --set enabled=false'
  ];

  static flags = {
    'search-path': Flags.string({
      char: 'x',
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
      char: 'n',
      required: true,
      summary: 'Name for new workspace'
    }),
    soc: Flags.string({
      char: 's',
      required: true,
      summary: 'SoC name'
    }),
    board: Flags.string({
      char: 'b',
      required: true,
      summary: 'Board name'
    }),
    core: Flags.string({
      char: 'c',
      summary: 'Target core',
      required: true
    }),
    model: Flags.string({
      char: 'm',
      required: true,
      summary: 'Path or URL to the model file'
    }),
    dataset: Flags.string({
      char: 'd',
      required: false,
      summary: 'Path or URL to the sample dataset for the model'
    }),
    'skip-compat': Flags.boolean({
      charAliases: ['f'],
      deprecateAliases: true,
      required: false,
      default: false,
      summary: 'Skip the model compatibility check'
    }),
    set: Flags.string({
      summary: 'Model values to update',
      multiple: true,
      required: false
    })
  };

  async run(): Promise<{workspacePath: string}> {
    const {flags} = this;

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

    const nonAllowedSetOptions: string[] = [
      'name',
      'symbol',
      'model',
      'dataset'
    ];

    for (const item of flags.set ?? []) {
      const separatorIndex = item.indexOf('=');
      let key =
        separatorIndex === -1 ? item : item.slice(0, separatorIndex);

      key = key.toLowerCase();

      if (nonAllowedSetOptions.includes(key)) {
        errors.push(
          `--set '${key}' is not supported during ai workspace creation.`
        );
      }
    }

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
      await preserveTelemetrySession(() =>
        this.runNestedCommand(
          'ai:compat',
          [
            '--soc',
            flags.soc,
            '--core',
            flags.core,
            '--model',
            flags.model,
            '--package',
            packageName as string,
            ...(flags.dataset ? ['--dataset', flags.dataset] : []),
            ...(this.jsonEnabled() ? ['--quiet'] : [])
          ],
          'AI_COMPAT_CHECK_FAILED'
        )
      );

      if (process.exitCode !== 0) {
        if (this.jsonEnabled()) {
          throw new RecoverableError(
            'Model compatibility check failed',
            {
              suggestion:
                'Run the compatibility check on its own to see the details',
              run: `cfsutil ai compat --soc ${flags.soc} --core ${flags.core} --model ${flags.model} --package ${packageName}${flags.dataset ? ` --dataset ${flags.dataset}` : ''}`,
              code: 'AI_COMPAT_CHECK_FAILED'
            }
          );
        }

        this.exit(1);
      }
    }

    const catalog = await getSocCatalog(this.config, false);
    const catalogSocs = await catalog.getAll();
    const catalogSoc = findSocByName(catalogSocs, flags.soc);

    // --core is matched case-insensitively, so store the data model's casing
    const coreId =
      catalogSoc?.cores.find(
        (core) =>
          core.dataModelCoreID.toLowerCase() ===
          flags.core.toLowerCase()
      )?.dataModelCoreID ?? flags.core;

    const workspaceConfig: AIModelCfsWorkspace = {
      ...createWorkspaceConfig({
        soc: flags.soc,
        package: packageName as string,
        board: flags.board,
        workspaceName: flags.name,
        location: flags.output,
        workspacePluginId: template?.pluginId as string,
        workspacePluginVersion: template?.pluginVersion as string
      }),
      modelFile: flags.model,
      sampleData: flags.dataset,
      coreId
    };

    const isKnownBoard =
      catalogSoc?.boards.some((b) => b.name === flags.board) ?? false;
    const isAdiPlugin =
      template?.pluginId?.startsWith('com.analog') ?? false;

    this.telemetryMetadata = {
      soc: flags.soc,
      board: isKnownBoard ? flags.board : 'Custom',
      core: flags.core,
      templateId: isAdiPlugin ? template?.pluginId : 'Custom',
      templateVersion: isAdiPlugin
        ? template?.pluginVersion
        : undefined,
      modelFormat: getModelFormat(flags.model)
    };

    this.log(
      `Creating workspace '${flags.name}' at location: ${flags.output}`
    );
    this.log(
      `Template: ${template?.pluginId} (version ${workspaceConfig.workspacePluginVersion})`
    );

    const workspacePath = path.join(flags.output, flags.name);

    // Resolve Zephyr base for board DTS detection, scoped to the target SoC.
    const installPath = getCFSInstallPath(this.config);
    const toolManager = new CfsToolManager(
      pkgManager,
      installPath ? [installPath] : undefined,
      flags.soc
    );
    const zephyrTool =
      await toolManager.getInstalledToolById('zephyr');
    const zephyrBase = zephyrTool
      ? path.join(zephyrTool.rootPath, 'zephyr')
      : undefined;

    try {
      await generateAIWorkspace(
        pluginManager,
        workspaceConfig,
        workspacePath,
        {zephyrBase}
      );
      this.log(`Workspace created successfully.`);
    } catch (error) {
      handleMissingDependencyError(error);

      this.error(`Failed to create workspace: ${error}`, {
        code: 'WORKSPACE_CREATE_FAILED'
      });
    }

    const cfsDirPath = path.join(workspacePath, '.cfs');
    const files = readdirSync(cfsDirPath);
    const configFile = files.find((f) => f.endsWith('.cfsconfig'));

    if (configFile) {
      const MODEL_NAME = 'model';

      // Make file paths relative to the workspace so the config remains portable
      const absWorkspace = path.resolve(workspacePath);

      if (
        !flags.model.includes('://') &&
        !path.isAbsolute(flags.model)
      ) {
        flags.model = path.relative(
          absWorkspace,
          path.resolve(flags.model)
        );
      }

      if (
        flags.dataset &&
        !flags.dataset.includes('://') &&
        !path.isAbsolute(flags.dataset)
      ) {
        flags.dataset = path.relative(
          absWorkspace,
          path.resolve(flags.dataset)
        );
      }

      const modelArgs = [
        '--core',
        flags.core,
        '--name',
        MODEL_NAME,
        '--workspace',
        workspacePath,
        '--set',
        `model=${flags.model}`,
        ...(flags.set ? flags.set : [])
      ];

      if (flags.dataset) {
        modelArgs.push(`dataset=${flags.dataset}`);
      }

      await preserveTelemetrySession(() =>
        this.runNestedCommand(
          'ai:model:update',
          [...modelArgs, '--quiet'],
          'AI_MODEL_UPDATE_FAILED'
        )
      );
      this.assertNestedExitCode(
        'ai:model:update',
        'AI_MODEL_UPDATE_FAILED'
      );

      await preserveTelemetrySession(() =>
        this.runNestedCommand(
          'ai:build',
          [
            '--config',
            path.join(cfsDirPath, configFile),
            '--cwd',
            workspacePath,
            ...(flags.quiet || this.jsonEnabled() ? ['--quiet'] : []),
            ...(flags.verbose && !this.jsonEnabled()
              ? ['--verbose']
              : [])
          ],
          'AI_BUILD_FAILED'
        )
      );
      this.assertNestedExitCode('ai:build', 'AI_BUILD_FAILED');
    } else {
      this.warn(
        'Could not find .cfsconfig file to run: ai:model:update, ai:build'
      );
    }

    return {workspacePath: path.resolve(workspacePath)};
  }

  // A nested AI command can resolve while leaving a non-zero exit code;
  // text mode propagates it as the process exit code, JSON mode must not
  // report success for it.
  private assertNestedExitCode(id: string, code: string): void {
    if (this.jsonEnabled() && process.exitCode) {
      throw errorWithCode(
        `${id} exited with code ${process.exitCode}`,
        code
      );
    }
  }

  // Nested commands run in text mode, so their failures reach us as errors
  // whose messages vary; give them one stable code in JSON mode.
  private async runNestedCommand(
    id: string,
    args: string[],
    code: string
  ): Promise<void> {
    try {
      await this.config.runCommand(id, args);
    } catch (error) {
      if (!this.jsonEnabled()) throw error;

      throw errorWithCode(
        error instanceof Error ? error.message : String(error),
        code
      );
    }
  }
}
