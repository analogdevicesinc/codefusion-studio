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
import {Args, Flags} from '@oclif/core';
import {AiToolsData, getAiToolsPlugin} from 'cfs-lib';
import {AiBackend, SocControl} from 'cfs-types';

import {
  BaseCommand,
  type CliRunResponse
} from '../../utils/base-command.js';
import {RecoverableError} from '../../utils/recoverable-error.js';
import {
  getCfsaiPath,
  getVersionFromConfig
} from '../../utils/utils.js';

interface AiBackendWithExtensions extends AiBackend {
  Extensions: SocControl[];
}

export default class Backends extends BaseCommand<typeof Backends> {
  static args = {
    action: Args.string({
      options: ['list'],
      required: true
    })
  };

  static description = `List available AI backends.`;

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> list',
    '<%= config.bin %> <%= command.id %> list --name tflm'
  ];

  static flags = {
    name: Flags.string({
      char: 'n',
      summary: 'Backend to display more information about',
      required: false
    })
  };

  static hiddenAliases: string[] = ['ai:backend'];

  async run(): CliRunResponse<
    AiBackendWithExtensions | AiBackendWithExtensions[]
  > {
    const {flags, config} = this;

    const aiPlugin = getAiToolsPlugin(
      await getCfsaiPath(config),
      getVersionFromConfig(config)
    );

    if (flags.name) {
      // Look up specified backend
      const be: AiBackend | undefined =
        await aiPlugin.getBackendFromName(flags.name);
      if (!be) {
        throw new RecoverableError(
          `No backend found with name '${flags.name}'`,
          {
            suggestion: `Check '${flags.name}' for typos or list all available backends`,
            run: 'cfsutil ai backends list'
          }
        );
      }

      let props: SocControl[] = [];

      try {
        props = await aiPlugin.getPropertiesFromName(flags.name);
      } catch (error) {
        // swallow thrown error for recoverable one
        throw new RecoverableError(
          error instanceof Error
            ? error.message
            : `No backend properties found for '${flags.name}'`,
          {
            suggestion: 'Verify the backend is properly configured',
            run: `cfsutil ai backends list --name ${flags.name}`
          }
        );
      }

      this.log(`${flags.name}: ${be.Description}`);
      this.log(`    Model Formats: ${be.Formats.join(', ')}`);
      this.log(`    Advanced Tool Support: ${be.AdvancedTools}`);
      be.Default !== undefined &&
        this.log(`    Used by default: ${be.Default}`);

      if (be.Targets.length > 0) {
        this.log('Supported hardware:');
        for (const target of be.Targets) {
          if (target.Hardware.Family) {
            this.log(
              `    Family: ${target.Hardware.Family}` +
                (target.FirmwarePlatform
                  ? `, Firmware: ${target.FirmwarePlatform}`
                  : '')
            );
          } else {
            this.log(
              `    SoC: ${target.Hardware.Soc}, ` +
                `Core: ${target.Hardware.Core}` +
                (target.Hardware.Accelerator
                  ? `, Acc: ${target.Hardware.Accelerator}`
                  : '') +
                (target.FirmwarePlatform
                  ? `, Firmware: ${target.FirmwarePlatform}`
                  : '')
            );
          }
        }
      } else {
        this.log('No supported hardware.');
      }

      this.log('Extension fields:');
      for (const prop of props) {
        this.log(
          `    ${prop.Id}: ${prop.Description}\n      Type: ${prop.Type}, Default: ${typeof prop.Default === 'string' ? prop.Default : JSON.stringify(prop.Default)}.`
        );
      }

      return {data: {...be, Extensions: props}};
    }

    // List all backends
    const aiData: AiToolsData | undefined =
      await aiPlugin.readBackendJson();

    if (!aiData) {
      throw new RecoverableError(
        'Failed to read configuration JSON',
        {
          suggestion: 'Verify backend configuration files exist',
          run: 'cfsutil ai backends list'
        }
      );
    }

    const output: AiBackendWithExtensions[] = [];

    for (const [key, value] of Object.entries(
      aiData.SupportedBackends
    )) {
      this.log(`${key}: ${value.Description}`);

      if (this.jsonEnabled()) {
        let props: SocControl[] = [];

        try {
          props = await aiPlugin.getPropertiesFromName(key);
        } catch (error) {
          // swallow thrown error for recoverable one
          throw new RecoverableError(
            error instanceof Error
              ? error.message
              : `No backend properties found for '${key}'`,
            {
              suggestion: 'Verify the backend is properly configured',
              run: `cfsutil ai backends list --name ${key}`
            }
          );
        }

        output.push({...value, Extensions: props});
      }
    }

    return {data: output};
  }
}
