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
import type {
  AIModel,
  AIModelBackend,
  CfsSocDataModel,
  SocAi
} from 'cfs-types';

import {Flags} from '@oclif/core';
import {
  assertValidFileExtension,
  caseInsensitiveCompare,
  findModelIdentifierCollision,
  getAiToolsPlugin,
  getValidExtensions
} from 'cfs-lib';

import {BaseModelCommand} from '../../../utils/base-model-command.js';
import {getDataModelManager} from '../../../utils/data-model-manager.js';
import {getPackageManager} from '../../../utils/package-manager.js';
import {
  errorWithCode,
  RecoverableError
} from '../../../utils/recoverable-error.js';
import {
  getCfsaiPath,
  getVersionFromConfig
} from '../../../utils/utils.js';

export default class Add extends BaseModelCommand {
  static useResponseEnvelope = true;

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
    let validProperties;

    try {
      validProperties = await plugin.getPropertiesFromName(name);
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
      return getValidExtensions(extension, validProperties);
    } catch (error) {
      throw new RecoverableError(
        error instanceof Error ? error.message : String(error),
        {
          suggestion: 'Verify the backend is properly configured',
          run: `cfsutil ai backends list --name ${name}`,
          code: 'INVALID_BACKEND_EXTENSIONS'
        }
      );
    }
  }

  async run(): Promise<{model: AIModel}> {
    const {flags} = this;
    const {config, pathToConfig} = this.getConfig(
      flags.config,
      flags.workspace
    );

    const modelName = this.getModelNameFromFilename(flags.model);

    const cfsVersion = getVersionFromConfig(this.config);

    await this.resolveSourceFile(
      cfsVersion,
      flags.model,
      flags['ignore-cache']
    );

    if (flags.dataset) {
      await this.resolveSourceFile(
        cfsVersion,
        flags.dataset,
        flags['ignore-cache']
      );
    }

    if (flags['network-config']) {
      await this.resolveSourceFile(
        cfsVersion,
        flags['network-config'],
        flags['ignore-cache']
      );
    }

    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const aiPlugin = getAiToolsPlugin(
      await getCfsaiPath(this.config),
      cfsVersion,
      packageManager
    );

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
          run: `cfsutil socs info ${config.Soc} --packages`,
          code: 'DATA_MODEL_NOT_FOUND'
        }
      );
    }

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
          run: `cfsutil socs info ${config.Soc} --cores`,
          code: 'AI_TARGET_NOT_FOUND'
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

    try {
      assertValidFileExtension(flags.model, be.Formats);
    } catch (error) {
      throw errorWithCode(
        error instanceof Error ? error.message : String(error),
        'INVALID_MODEL_FILE_EXTENSION'
      );
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

    const matchingProjects = config.Projects.filter((project) =>
      caseInsensitiveCompare(project.CoreId, flags.core)
    );

    if (matchingProjects.length === 0) {
      throw new RecoverableError(
        `No project is associated with core '${flags.core}'`,
        {
          suggestion:
            'Check that your project/s is configured as expected',
          code: 'PROJECT_NOT_FOUND_FOR_CORE'
        }
      );
    }

    const newModel: AIModel = {
      Name: modelName,
      Target: {
        Core: ai.Target?.Core ?? '',
        Accelerator: ai.Target?.Accelerator ?? undefined
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
    };

    const allModels = matchingProjects
      .flatMap((project) => project.AIModels)
      .filter((models) => models !== undefined);

    const collision = findModelIdentifierCollision(
      newModel,
      allModels
    );

    if (collision) {
      this.throwIdentifierCollisionError(
        flags.config
          ? `--config ${flags.config}`
          : `--workspace ${flags.workspace}`
      );
    }

    for (const project of matchingProjects) {
      const modelForProject: AIModel = structuredClone(newModel);
      project.AIModels = this.enforceMaxModels(
        [...(project.AIModels ?? []), modelForProject],
        modelForProject,
        be.MaxModels
      );
    }

    await this.writeCfsConfig(pathToConfig, config);
    this.log(`Model '${modelName}' added successfully.`);
    return {model: newModel};
  }
}
