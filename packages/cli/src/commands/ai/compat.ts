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
import {
  AiCommandResult,
  CfsAiCompatibilityReport,
  SocAi
} from 'cfs-types';

import {
  ensureOrTryInferCoreFlags,
  getAndEnsureDataModel,
  getModelFormat
} from '../../utils/ai-command-utils.js';
import {BaseAiCommand} from '../../utils/base-ai-command.js';
import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {RecoverableError} from '../../utils/recoverable-error.js';
import {
  getCfsaiPath,
  getVersionFromConfig
} from '../../utils/utils.js';

export default class Compat extends BaseAiCommand<
  typeof Compat,
  CfsAiCompatibilityReport
> {
  static useResponseEnvelope = true;

  static description = `Analyze model compatibility with target SoC and core.`;

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
      summary: 'SoC Package',
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
      summary: 'Path to output JSON report file',
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
    }),
    dataset: Flags.string({
      char: 'd',
      summary:
        'Path or URL to the dataset file to use for compatibility analysis',
      required: false
    })
  };

  protected formatData(data: CfsAiCompatibilityReport): void {
    // Blocking issues decide the pass/fail verdict. Operators that the
    // compiler pushed to the Host DSP still execute, so they are reported
    // separately as informational notes and never fail the model.
    const issues: string[] = [];
    const pushedToHost: string[] = [];

    for (const issue of data.memory_issues ?? []) {
      issues.push(
        `   Memory issue: ${issue.type} - ${issue.memory_type} memory`
      );
    }

    for (const issue of data.operator_issues ?? []) {
      const layers = issue.layers.join(',');

      if (issue.type === 'pushed to host') {
        const suggestion =
          issue.suggested_alternative ??
          'Switch to NPU friendly Operator';
        pushedToHost.push(
          `   Pushed to Host: ${issue.operator} Layer(s) ${layers}. Suggested: ${suggestion}.`
        );
        continue;
      }

      const alternativeText =
        issue.suggested_alternative &&
        issue.suggested_alternative !== 'None'
          ? ` may be swapped for ${issue.suggested_alternative}`
          : ' no hardware-compatible alternative identified';
      issues.push(
        `   Unsupported operator: ${issue.operator} Layer(s) ${layers}.${alternativeText}.`
      );
    }

    for (const issue of data.unsupported_types ?? []) {
      const layers = issue.layers.join(',');
      issues.push(
        `   Unsupported type: ${issue.operation_type} operation uses ${issue.data_type}. Layer(s) ${layers}.`
      );
    }

    if (issues.length === 0) {
      this.log('Model compatibility checks pass.');
    } else {
      this.log(
        `Model incompatible - (${issues.length}) issues identified:`
      );
      for (const issue of issues) {
        this.log(issue);
      }
    }

    if (pushedToHost.length > 0) {
      this.log(
        `Operators pushed to Host (${pushedToHost.length}) - these run on the DSP instead of the NPU:`
      );
      for (const line of pushedToHost) {
        this.log(line);
      }
    }
  }

  async run(): Promise<AiCommandResult<CfsAiCompatibilityReport>> {
    const {flags, config} = this;
    const warnings: string[] = [];

    if (flags.acc) {
      throw new RecoverableError(
        'Accelerators are not currently supported',
        {
          suggestion: 'Remove the --acc flag'
        }
      );
    }

    // validate inputs
    if (!flags.soc || !flags.model) {
      throw new RecoverableError('--soc and --model are required', {
        suggestion:
          'Provide both required flags to check model compatibility',
        example: 'cfsutil ai compat --soc MAX32690 --model <model>'
      });
    }

    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const aiPlugin = getAiToolsPlugin(
      await getCfsaiPath(config),
      getVersionFromConfig(config),
      packageManager
    );

    const dmManager = await getDataModelManager(
      config,
      packageManager,
      flags['search-path']
    );

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
            run: `cfsutil socs list`,
            code: 'SOC_PACKAGE_NOT_FOUND'
          }
        );
      }
    }

    const dataModel = await getAndEnsureDataModel(
      flags.soc,
      flags.package,
      dmManager
    );

    ensureOrTryInferCoreFlags(flags, dataModel, warnings);

    this.telemetryMetadata = {
      soc: flags.soc,
      core: flags.core,
      modelFormat: getModelFormat(flags.model)
    };

    const ai: SocAi | undefined = aiPlugin.getAIDataFromSOCModel(
      dataModel,
      flags.soc,
      flags.package,
      flags.core,
      flags.acc
    );
    if (!ai) {
      throw new RecoverableError(
        `AI data not found for SoC '${flags.soc}', Core '${flags.core}'${flags.acc ? `, Acc '${flags.acc}'` : ''}`,
        {
          suggestion: 'Verify --core is valid for this SoC',
          run: `cfsutil socs info ${flags.soc} --cores`,
          code: 'AI_TARGET_NOT_FOUND'
        }
      );
    }

    const output = await aiPlugin.runCompat(ai, flags.model, {
      reportFile: flags['report-file'],
      ignoreCache: flags['ignore-cache'],
      dataset: flags.dataset
    });

    return this.handleResult(output, warnings);
  }
}
