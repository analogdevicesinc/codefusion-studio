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
import {AIModel} from 'cfs-types';

import {type CliRunResponse} from '../../../utils/base-command.js';
import {BaseModelCommand} from '../../../utils/base-model-command.js';

export default class List extends BaseModelCommand {
  static description = 'List workspace models.';

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> --config PATH_TO_CONFIG',
    '<%= config.bin %> <%= command.id %> --config PATH_TO_CONFIG --core CM4 --verbose'
  ];

  static flags = {
    ...BaseModelCommand.baseFlags,
    verbose: Flags.boolean({
      summary: 'List filename, backend, extensions for given models',
      required: false,
      default: false
    })
  };

  async run(): CliRunResponse<AIModel[]> {
    const {flags} = this;
    const {config} = this.getConfig(flags.config, flags.workspace);

    const output: AIModel[] = [];

    for (const project of config.Projects) {
      if (flags.core) {
        flags.core = flags.core.toLowerCase();
        if (project.CoreId.toLowerCase() === flags.core) {
          for (const aiModel of project.AIModels ?? []) {
            this.logModel(aiModel, flags.verbose);
            output.push(aiModel);
          }
        }
      } else {
        this.log(`${project.CoreId}:`);
        for (const aiModel of project.AIModels ?? []) {
          this.logModel(aiModel, flags.verbose);
          output.push(aiModel);
        }
      }
    }

    return {data: output};
  }

  private logModel(model: AIModel, verbose: boolean) {
    this.log(`  ${model.Name}`);
    if (verbose) {
      model.Backend && this.log(`    Backend: ${model.Backend.Name}`);
      this.log(`    Files:`);
      this.logObject(model.Files);
      if (Object.keys(model.Backend?.Extensions ?? {}).length > 0) {
        this.log(`    Extensions:`);
        this.logObject(model.Backend?.Extensions ?? {});
      }

      this.log(`    Enabled: ${model.Enabled}`);
    }
  }

  private logObject(obj: object) {
    for (const [key, value] of Object.entries(obj)) {
      this.log(`      ${key}: ${value}`);
    }
  }
}
