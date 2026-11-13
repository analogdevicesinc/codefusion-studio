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
import {Flags} from '@oclif/core';
import {
  caseInsensitiveCompare,
  enforceMaxActiveModels,
  readJsonFile,
  resolveSource
} from 'cfs-lib';
import {AIModel, CfsConfig} from 'cfs-types';
import {promises as fs} from 'node:fs';

import {getBaseName} from './ai-command-utils.js';
import {BaseCommand} from './base-command.js';
import {
  errorWithCode,
  RecoverableError
} from './recoverable-error.js';
import {getCfsConfig} from './utils.js';

export abstract class BaseModelCommand extends BaseCommand<
  typeof BaseModelCommand
> {
  static baseFlags = {
    ...BaseCommand.baseFlags,
    workspace: Flags.string({
      char: 'w',
      summary: 'Path to workspace',
      required: false
    }),
    config: Flags.string({
      summary: 'Path to .cfsconfig file',
      required: false
    }),
    core: Flags.string({
      char: 'c',
      summary: 'Target Core',
      required: false
    })
  };

  protected getConfig(configPath?: string, workspacePath?: string) {
    if (!configPath && !workspacePath) {
      throw new RecoverableError(
        '--config or --workspace must be provided',
        {
          suggestion:
            'Provide either a path to a .cfsconfig file or a CodeFusion Studio workspace directory'
        }
      );
    }

    if (configPath && workspacePath) {
      this.warn('--workspace is ignored when --config is provided.');
    }

    // The messages interpolate paths, so tag them with a stable code.
    try {
      if (configPath) {
        const config = readJsonFile(configPath) as CfsConfig;
        return {config, pathToConfig: configPath};
      }

      return getCfsConfig(workspacePath);
    } catch (error) {
      throw errorWithCode(
        error instanceof Error ? error.message : String(error),
        'CONFIG_READ_FAILED'
      );
    }
  }

  protected async resolveSourceFile(
    ...args: Parameters<typeof resolveSource>
  ): Promise<string> {
    try {
      return await resolveSource(...args);
    } catch (error) {
      throw errorWithCode(
        error instanceof Error ? error.message : String(error),
        'SOURCE_RESOLVE_FAILED'
      );
    }
  }

  protected getModelNameFromFilename(filename: string) {
    return getBaseName(filename);
  }

  // The shared helper only warns via console in text mode, so in JSON mode
  // the disabled models are diffed here and reported in the envelope.
  protected enforceMaxModels(
    models: AIModel[],
    changedModel: AIModel,
    maxModels: number
  ): AIModel[] {
    const json = this.jsonEnabled();
    const enabledBefore = new Set(
      models.filter((m) => m.Enabled).map((m) => m.Name)
    );

    const result = enforceMaxActiveModels(
      models,
      changedModel,
      maxModels,
      json
    );

    if (json) {
      const disabled = result
        .filter((m) => enabledBefore.has(m.Name) && !m.Enabled)
        .map((m) => m.Name);

      if (disabled.length > 0) {
        this.pushWarning(
          `Maximum number of models exceeded. The following ${disabled.length > 1 ? 'models have' : 'model has'} been disabled: ${disabled.join(', ')}`
        );
      }
    }

    return result;
  }

  private getModelNamesFromConfig(config: CfsConfig): string[] {
    return config.Projects.flatMap(
      (project) =>
        project.AIModels?.map((aiModel) => aiModel.Name) ?? []
    );
  }

  protected isExistingModel(
    modelName: string,
    config: CfsConfig
  ): boolean {
    return this.getModelNamesFromConfig(config).some((model) =>
      caseInsensitiveCompare(model, modelName)
    );
  }

  protected async writeCfsConfig(
    configPath: string,
    config: CfsConfig
  ) {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  protected throwIdentifierCollisionError(pathFlag: string): never {
    throw new RecoverableError(
      'Model conflicts with an existing model',
      {
        suggestion: `Run the list command to review your models, then update the conflicting model's name or Symbol`,
        run: `cfsutil ai model list ${pathFlag} --verbose`
      }
    );
  }
}
