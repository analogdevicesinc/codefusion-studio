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
import type AIToolsPlugin from 'cfs-lib/dist/ai-tools/index.js';

import {Flags} from '@oclif/core';
import {
  enforceMaxActiveModels,
  getAiToolsPlugin,
  getValidExtensions,
  resolveSource
} from 'cfs-lib';
import {
  AIModel,
  AIModelBackend,
  CfsSocDataModel,
  SocAi
} from 'cfs-types';

import {type CliRunResponse} from '../../../utils/base-command.js';
import {BaseModelCommand} from '../../../utils/base-model-command.js';
import {getDataModelManager} from '../../../utils/data-model-manager.js';
import {getPackageManager} from '../../../utils/package-manager.js';
import {RecoverableError} from '../../../utils/recoverable-error.js';
import {
  getCfsaiPath,
  getVersionFromConfig
} from '../../../utils/utils.js';

export default class Add extends BaseModelCommand {
  static description = 'Add model to a workspace.';

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> --config PATH_TO_CONFIG --core CM4 --model PATH_TO_MODEL'
  ];

  static flags = {
    ...BaseModelCommand.baseFlags,
    model: Flags.string({
      char: 'm',
      summary: 'Path or URL to the model file',
      required: true
    }),
    dataset: Flags.string({
      required: false,
      summary: 'Path or URL to the sample dataset for the model'
    }),
    acc: Flags.string({
      char: 'a',
      summary: 'Target accelerator',
      required: false
    }),
    'network-config': Flags.string({
      summary: `Path or URL to the Izer network configuration YAML (required for 'izer' backend)`,
      required: false
    }),
    extension: Flags.string({
      char: 'e',
      summary: 'Backend specific fields provided as key=value pairs',
      multiple: true
    }),
    core: Flags.string({
      summary: 'Target core',
      required: true
    }),
    'ignore-cache': Flags.boolean({
      name: 'ignore-cache',
      summary: 'Bypass cache and fetch latest remote files'
    })
  };

  async getExtensions(
    extension: string[],
    name: string,
    plugin: AIToolsPlugin
  ): Promise<NonNullable<AIModelBackend['Extensions']>> {
    try {
      const validProperties =
        await plugin.getPropertiesFromName(name);

      return getValidExtensions(extension, validProperties);
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
  }

  async run(): CliRunResponse {
    const {flags} = this;
    const {config, pathToConfig} = this.getConfig(
      flags.config,
      flags.workspace
    );

    const modelName = this.getModelNameFromFilename(flags.model);
    const modelExists =
      this.getModelNamesFromConfig(config).includes(modelName);

    if (modelExists) {
      throw new RecoverableError(
        'A model with this name already exists',
        {
          suggestion: `Use a different model or remove the existing model first`,
          run: `cfsutil ai model remove --name ${modelName} ${flags.config ? `--config ${flags.config}` : `--workspace ${flags.workspace}`}`
        }
      );
    }

    const cfsVersion = getVersionFromConfig(this.config);

    flags.model = await resolveSource(
      cfsVersion,
      flags.model,
      flags['ignore-cache']
    );

    if (flags.dataset) {
      flags.dataset = await resolveSource(
        cfsVersion,
        flags.dataset,
        flags['ignore-cache']
      );
    }

    if (flags['network-config']) {
      flags['network-config'] = await resolveSource(
        cfsVersion,
        flags['network-config'],
        flags['ignore-cache']
      );
    }

    const aiPlugin = getAiToolsPlugin(
      await getCfsaiPath(this.config),
      cfsVersion
    );

    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager = await getDataModelManager(
      this.config,
      packageManager
    );

    const dataModel: CfsSocDataModel | undefined =
      await dmManager.getDataModel(config.Soc, config.Package);

    if (!dataModel) {
      throw new RecoverableError(
        `Could not load data model for SoC '${config.Soc}', Package '${config.Package}'`,
        {
          suggestion:
            'Verify the Soc and Package in your workspace configuration are valid',
          run: `cfsutil socs info ${config.Soc} --packages`
        }
      );
    }

    flags.core = flags.core.toUpperCase();
    flags.acc = flags.acc?.toUpperCase();

    const ai: SocAi | undefined = aiPlugin.getAIDataFromSOCModel(
      dataModel,
      config.Soc,
      config.Package,
      flags.core,
      flags.acc
    );

    if (!ai?.Target) {
      throw new RecoverableError(
        `AI data not found for SoC '${config.Soc}', Core '${flags.core}'${flags.acc ? `, Acc '${flags.acc}'` : ''}`,
        {
          suggestion: 'Verify --core is valid for this SoC',
          run: `cfsutil socs info ${config.Soc} --cores`
        }
      );
    }

    const be = await aiPlugin.getBackendFromTarget(ai.Target);

    if (!be) {
      throw new RecoverableError('No AI Backend found', {
        suggestion: 'Check that your backend package is installed',
        run: 'cfsutil ai backends list'
      });
    }

    if (be.Name === 'izer' && flags['network-config'] === undefined) {
      throw new RecoverableError(
        "--network-config is required for 'izer' backends",
        {
          suggestion:
            'Provide the network configuration file for the Izer backend',
          example: `cfsutil ai model add --core CM4 --model <model> --network-config <network-file> --config <path>`
        }
      );
    }

    if (be.Name !== 'izer' && flags['network-config']) {
      this.warn('ignoring --network-config for non-izer backend.');
    }

    const backend: AIModelBackend = {
      Name: be.Name,
      Extensions: {}
    };

    if (flags.extension) {
      backend.Extensions = await this.getExtensions(
        flags.extension,
        be.Name,
        aiPlugin
      );
    }

    for (const project of config.Projects) {
      if (project.CoreId === flags.core) {
        const newModel = {
          Name: modelName,
          Target: {
            Core: ai.Target?.Core ?? '',
            Accelerator: ai.Target?.Accelerator
          },
          Enabled: true,
          Files: {
            Model: flags.model,
            ...(flags['network-config'] && {
              NetworkConfig: flags['network-config']
            }),
            ...(flags.dataset && {
              Dataset: flags.dataset
            })
          },
          Backend: backend,
          OutDir: '.'
        } as AIModel;

        project.AIModels = enforceMaxActiveModels(
          [...(project.AIModels ?? []), newModel],
          newModel,
          be.MaxModels,
          flags.json
        );
      }
    }

    await this.writeCfsConfig(pathToConfig, config);

    this.log(`Model '${modelName}' added successfully.`);
    return {
      msg: `Model '${modelName}' added successfully`
    };
  }
}
