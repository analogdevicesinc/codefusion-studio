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
import type {AIToolsPlugin} from 'cfs-lib';
import type {AIModel, SocControl} from 'cfs-types';

import {Config, Flags} from '@oclif/core';
import path from 'node:path';
import {
  caseInsensitiveCompare,
  findModelIdentifierCollision,
  getAiToolsPlugin,
  getValidExtensions,
  validateModelNameLength
} from 'cfs-lib';
import {BaseModelCommand} from '../../../utils/base-model-command.js';
import {getPackageManager} from '../../../utils/package-manager.js';
import {
  errorWithCode,
  RecoverableError
} from '../../../utils/recoverable-error.js';
import {
  getCfsaiPath,
  getVersionFromConfig
} from '../../../utils/utils.js';

export default class Update extends BaseModelCommand {
  static useResponseEnvelope = true;

  static description = 'Update a model in your workspace.';

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> --config PATH_TO_CONFIG --name MODEL_NAME --set key=value'
  ];

  static flags = {
    ...BaseModelCommand.baseFlags,
    name: Flags.string({
      summary: 'Name of model',
      required: true
    }),
    set: Flags.string({
      summary: 'Values to update',
      multiple: true,
      required: true
    }),
    'ignore-cache': Flags.boolean({
      name: 'ignore-cache',
      summary: 'Bypass cache and fetch latest remote files'
    })
  };

  async run(): Promise<{updated: true; name: string}> {
    const {flags} = this;
    const {config, pathToConfig} = this.getConfig(
      flags.config,
      flags.workspace
    );

    const modelExists = this.isExistingModel(flags.name, config);

    if (!modelExists) {
      throw new RecoverableError(
        `Model '${flags.name}' does not exist`,
        {
          suggestion:
            'Check the model name for typos or list existing models',
          run: `cfsutil ai model list ${flags.config ? `--config ${flags.config}` : `--workspace ${flags.workspace}`}`,
          code: 'MODEL_NOT_FOUND'
        }
      );
    }

    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const aiPlugin = getAiToolsPlugin(
      await getCfsaiPath(this.config),
      getVersionFromConfig(this.config),
      packageManager
    );

    aiPlugin.setVerbose(flags.verbose);
    aiPlugin.setQuiet(flags.quiet);

    let updatedModelName = '';

    for (const project of config.Projects) {
      for (let aiModel of project.AIModels ?? []) {
        if (caseInsensitiveCompare(aiModel.Name, flags.name)) {
          const be = await aiPlugin.getBackendFromName(
            aiModel.Backend?.Name ?? ''
          );

          const configFlag = flags.config
            ? `--config ${flags.config}`
            : `--workspace ${flags.workspace}`;

          aiModel = await this.updateModel(
            aiModel,
            flags.set,
            this.config,
            {
              aiPlugin,
              ignoreCache: flags['ignore-cache'],
              configFlag,
              cwd: flags.workspace
                ? path.resolve(flags.workspace)
                : undefined
            }
          );

          const collision = findModelIdentifierCollision(
            aiModel,
            project.AIModels ?? []
          );

          if (collision) {
            this.throwIdentifierCollisionError(
              flags.config
                ? `--config ${flags.config}`
                : `--workspace ${flags.workspace}`
            );
          }

          updatedModelName = aiModel.Name;

          if (be) {
            project.AIModels = this.enforceMaxModels(
              project.AIModels ?? [],
              aiModel,
              be.MaxModels
            );
          }
        }
      }
    }

    await this.writeCfsConfig(pathToConfig, config);

    this.log(`Model '${updatedModelName}' updated successfully.`);
    return {updated: true, name: updatedModelName};
  }

  async updateModel(
    aiModel: AIModel,
    set: string[],
    config: Config,
    options: {
      aiPlugin: AIToolsPlugin;
      ignoreCache: boolean;
      configFlag: string;
      cwd?: string;
    }
  ) {
    const extensionsToSet: string[] = [];

    for (const item of set) {
      const separatorIndex = item.indexOf('=');
      let key =
        separatorIndex === -1 ? item : item.slice(0, separatorIndex);
      let value =
        separatorIndex === -1
          ? undefined
          : item.slice(separatorIndex + 1);

      key = key.toLowerCase();

      if (!value) {
        throw new RecoverableError(
          `Invalid update format for '${item}'`,
          {
            suggestion:
              'Use the correct key=value format for updates',
            example: `cfsutil ai model update --name ${aiModel.Name} --set enabled=true ${options.configFlag}`,
            code: 'INVALID_UPDATE_FORMAT'
          }
        );
      }

      switch (key) {
        case 'name': {
          validateModelNameLength(aiModel.Name);

          aiModel.Name = value;
          break;
        }

        case 'enabled': {
          if (value !== 'true' && value !== 'false') {
            throw new RecoverableError(
              `Invalid update format for '${key}'`,
              {
                suggestion: "Use 'true' or 'false' for this field",
                code: 'INVALID_UPDATE_VALUE'
              }
            );
          }

          aiModel.Enabled = value === 'true';
          break;
        }

        case 'model':
        case 'networkconfig':
        case 'dataset': {
          await this.resolveSourceFile(
            getVersionFromConfig(config),
            value,
            options.ignoreCache,
            options.cwd
          );

          if (key === 'model') {
            aiModel.Files.Model = value;
          } else if (key === 'dataset') {
            aiModel.Files.Dataset = value;
          } else {
            aiModel.Files.NetworkConfig = value;
          }

          break;
        }

        default: {
          extensionsToSet.push(item);
          break;
        }
      }
    }

    if (extensionsToSet.length > 0) {
      if (!aiModel.Backend) {
        throw new RecoverableError(
          'Unable to set Backend Extensions',
          {
            suggestion:
              'Ensure your model has a backend configured before updating extensions',
            run: `cfsutil ai model list ${options.configFlag} --verbose`
          }
        );
      }

      let props: SocControl[] = [];
      const name = aiModel.Backend.Name ?? '';

      try {
        props = await options.aiPlugin.getPropertiesFromName(name);
      } catch (error) {
        // swallow thrown error for recoverable one
        throw new RecoverableError(
          error instanceof Error
            ? error.message
            : `No backend properties found for '${name}'`,
          {
            suggestion: 'Verify the backend is properly configured',
            run: `cfsutil ai backends list --name ${name}`,
            code: 'BACKEND_PROPERTIES_NOT_FOUND'
          }
        );
      }

      try {
        aiModel.Backend.Extensions = {
          ...aiModel.Backend.Extensions,
          ...getValidExtensions(extensionsToSet, props, false)
        };
      } catch (error) {
        throw errorWithCode(
          error instanceof Error ? error.message : String(error),
          'INVALID_BACKEND_EXTENSIONS'
        );
      }
    }

    return aiModel;
  }
}
