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

import {type CliRunResponse} from '../../../utils/base-command.js';
import {BaseModelCommand} from '../../../utils/base-model-command.js';
import {RecoverableError} from '../../../utils/recoverable-error.js';

export default class Remove extends BaseModelCommand {
  static description = 'Remove model from a workspace.';

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> --name NAME_OF_MODEL --config PATH_TO_CONFIG'
  ];

  static flags = {
    ...BaseModelCommand.baseFlags,
    core: Flags.string({
      hidden: true
    }),
    name: Flags.string({
      summary: 'Name of model',
      required: true
    })
  };

  async run(): CliRunResponse {
    const {flags} = this;
    const {config, pathToConfig} = this.getConfig(
      flags.config,
      flags.workspace
    );

    const modelExists = this.getModelNamesFromConfig(config).includes(
      flags.name
    );

    if (!modelExists) {
      throw new RecoverableError(
        `Model '${flags.name}' does not exist`,
        {
          suggestion:
            'Check the model name for typos or list existing models',
          run: `cfsutil ai model list ${flags.config ? `--config ${flags.config}` : `--workspace ${flags.workspace}`}`
        }
      );
    }

    for (const project of config.Projects) {
      if (
        project.AIModels?.some((model) => model.Name === flags.name)
      ) {
        project.AIModels = project.AIModels.filter(
          (model) => model.Name !== flags.name
        );
        break;
      }
    }

    await this.writeCfsConfig(pathToConfig, config);

    this.log(`Model '${flags.name}' removed successfully.`);
    return {
      msg: `Model '${flags.name}' removed successfully`
    };
  }
}
