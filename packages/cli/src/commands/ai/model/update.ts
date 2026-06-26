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
import type {AIModel, SocControl} from 'cfs-types';

import {Config, Flags} from '@oclif/core';
import {
  enforceMaxActiveModels,
  getAiToolsPlugin,
  getValidExtensions,
  resolveSource
} from 'cfs-lib';

import {type CliRunResponse} from '../../../utils/base-command.js';
import {BaseModelCommand} from '../../../utils/base-model-command.js';
import {RecoverableError} from '../../../utils/recoverable-error.js';
import {
  getCfsaiPath,
  getVersionFromConfig
} from '../../../utils/utils.js';

export default class Update extends BaseModelCommand {
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

  async run(): CliRunResponse {
    const {flags} = this;
    const {config, pathToConfig} = this.getConfig(
      flags.config,
      flags.workspace
    );

    const existingModelNames = this.getModelNamesFromConfig(config);

    if (!existingModelNames.includes(flags.name)) {
      throw new RecoverableError(
        `Model '${flags.name}' does not exist`,
        {
          suggestion:
            'Check the model name for typos or list existing models',
          run: `cfsutil ai model list ${flags.config ? `--config ${flags.config}` : `--workspace ${flags.workspace}`}`
        }
      );
    }

    const aiPlugin = getAiToolsPlugin(
      await getCfsaiPath(this.config),
      getVersionFromConfig(this.config)
    );

    for (const project of config.Projects) {
      for (let aiModel of project.AIModels ?? []) {
        if (aiModel.Name === flags.name) {
          const be = await aiPlugin.getBackendFromName(
            aiModel.Backend?.Name ?? ''
          );

          aiModel = await this.updateModel(
            aiModel,
            flags.set,
            this.config,
            {
              ignoreCache: flags['ignore-cache'],
              existingModelNames
            }
          );

          if (be) {
            project.AIModels = enforceMaxActiveModels(
              project.AIModels ?? [],
              aiModel,
              be.MaxModels,
              flags.json
            );
          }

          await this.writeCfsConfig(pathToConfig, config);

          this.log(`Model '${aiModel.Name}' updated successfully.`);
          return {
            msg: `Model '${aiModel.Name}' updated successfully`
          };
        }
      }
    }
  }

  async updateModel(
    aiModel: AIModel,
    set: string[],
    config: Config,
    options: {ignoreCache: boolean; existingModelNames: string[]}
  ) {
    const extensionsToSet: string[] = [];

    for (const item of set) {
      let [key, value] = item.split('=');

      key = key.toLowerCase();

      if (!value) {
        throw new RecoverableError(
          `Invalid update format for '${item}'`,
          {
            suggestion:
              'Use the correct key=value format for updates',
            example:
              'cfsutil ai model update --name <name> --set enabled=true --config <path>'
          }
        );
      }

      switch (key) {
        case 'name': {
          if (options.existingModelNames.includes(value)) {
            throw new RecoverableError(
              'A model with this name already exists',
              {
                suggestion: `Choose a unique model name`,
                run: 'cfsutil ai model list --config <path> --verbose'
              }
            );
          }

          aiModel.Name = value;
          break;
        }

        case 'enabled': {
          if (value !== 'true' && value !== 'false') {
            throw new RecoverableError(
              `Invalid update format for '${key}'`,
              {
                suggestion: "Use 'true' or 'false' for this field"
              }
            );
          }

          aiModel.Enabled = value === 'true';
          break;
        }

        case 'model':
        case 'networkconfig':
        case 'dataset': {
          const path = await resolveSource(
            getVersionFromConfig(config),
            value,
            options.ignoreCache
          );

          if (key === 'model') {
            aiModel.Files.Model = path;
          } else if (key === 'dataset') {
            aiModel.Files.Dataset = path;
          } else {
            aiModel.Files.NetworkConfig = path;
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
            run: 'cfsutil ai model list --config <path> --verbose'
          }
        );
      }

      const aiPlugin = getAiToolsPlugin(
        await getCfsaiPath(config),
        getVersionFromConfig(config)
      );

      let props: SocControl[] = [];
      const name = aiModel.Backend.Name ?? '';

      try {
        props = await aiPlugin.getPropertiesFromName(name);
      } catch (error) {
        // swallow thrown error for recoverable one
        throw new RecoverableError(
          error instanceof Error
            ? error.message
            : `No backend properties found for '${name}'`,
          {
            suggestion: 'Verify the backend is properly configured',
            run: `cfsutil ai backends list --name ${name}`
          }
        );
      }

      const validExtensions = getValidExtensions(
        extensionsToSet,
        props,
        false
      );
      aiModel.Backend.Extensions = {
        ...aiModel.Backend.Extensions,
        ...validExtensions
      };
    }

    return aiModel;
  }
}
