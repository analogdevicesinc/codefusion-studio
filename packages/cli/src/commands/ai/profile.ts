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
import {getAiToolsPlugin} from 'cfs-lib';
import {CfsSocDataModel, SocAi} from 'cfs-types';

import {
  BaseCommand,
  type CliRunResponse
} from '../../utils/base-command.js';
import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {RecoverableError} from '../../utils/recoverable-error.js';
import {
  getCfsaiPath,
  getVersionFromConfig
} from '../../utils/utils.js';

export default class Profile extends BaseCommand<typeof Profile> {
  static description = `Profile model resources with target SoC and core.`;

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> --soc MAX32690 --core CM4 --model PATH_TO_MODEL'
  ];

  static flags = {
    soc: Flags.string({
      char: 's',
      summary: 'Target SoC',
      required: false
    }),
    package: Flags.string({
      char: 'p',
      summary: 'SoC package',
      required: false
    }),
    core: Flags.string({
      char: 'c',
      summary: 'Target core',
      required: false
    }),
    acc: Flags.string({
      char: 'a',
      summary: 'Target accelerator',
      required: false
    }),
    model: Flags.string({
      char: 'm',
      summary: 'Path or URL to the model file',
      required: false
    }),
    'report-file': Flags.string({
      name: 'report-file',
      summary: 'Path to output report file',
      required: false
    }),
    'report-format': Flags.string({
      name: 'report-format',
      summary: 'Report output format: text or json',
      options: ['text', 'json'],
      default: 'json',
      required: false
    }),
    'search-path': Flags.string({
      char: 'x',
      summary:
        'Additional search path for templates and data models. Can be used multiple times',
      multiple: true
    }),
    'ignore-cache': Flags.boolean({
      name: 'ignore-cache',
      summary: 'Bypass cache and fetch latest remote files'
    })
  };

  async run(): CliRunResponse {
    const {flags, config} = this;

    if (flags.acc) {
      throw new RecoverableError(
        'Accelerators are not currently supported',
        {
          suggestion: 'Remove the --acc flag'
        }
      );
    }

    // validate inputs
    if (!flags.soc || !flags.core || !flags.model) {
      throw new RecoverableError(
        '--soc, --core, and --model are required',
        {
          suggestion:
            'Provide all three required flags to check model profiling',
          example:
            'cfsutil ai profile --core CM4 --soc MAX32690 --model <model>'
        }
      );
    }

    const aiPlugin = getAiToolsPlugin(
      await getCfsaiPath(config),
      getVersionFromConfig(config)
    );

    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager = await getDataModelManager(
      config,
      packageManager,
      flags['search-path']
    );

    // Change cases to match datamodel expectations
    flags.soc = flags.soc?.toLowerCase();
    flags.core = flags.core?.toUpperCase();
    flags.package = flags.package?.toLowerCase();
    flags.acc = flags.acc?.toUpperCase();

    if (!flags.package) {
      flags.package = await dmManager.getFirstPackageIdForSoc(
        flags.soc
      );
      if (!flags.package) {
        throw new RecoverableError(
          `No packages found for SoC '${flags.soc}'`,
          {
            suggestion:
              'Verify the SoC name is correct or required package is available',
            run: `cfsutil socs list`
          }
        );
      }
    }

    // get datamodel
    const dataModel: CfsSocDataModel | undefined =
      await dmManager.getDataModel(
        flags.soc as string,
        flags.package as string
      );
    if (!dataModel) {
      throw new RecoverableError(
        `Could not load data model for SoC '${flags.soc}', Package '${flags.package}'`,
        {
          suggestion: 'Verify the SoC and Package are compatible',
          run: `cfsutil socs info ${flags.soc} --packages`
        }
      );
    }

    const ai: SocAi | undefined = aiPlugin.getAIDataFromSOCModel(
      dataModel,
      flags.soc,
      flags.package,
      flags.core,
      flags.acc as string
    );
    if (!ai) {
      throw new RecoverableError(
        `AI data not found for SoC '${flags.soc}', Core '${flags.core}'${flags.acc ? `, Acc '${flags.acc}'` : ''}`,
        {
          suggestion: 'Verify --core is valid for this SoC',
          run: `cfsutil socs info ${flags.soc} --cores`
        }
      );
    }

    const output = await aiPlugin.runProfile(ai, flags.model, {
      reportFileFormat: flags['report-format'] as 'json' | 'text',
      reportFilePath: flags['report-file'],
      ignoreCache: flags['ignore-cache']
    });

    return this.handlePythonOutput(output);
  }
}
