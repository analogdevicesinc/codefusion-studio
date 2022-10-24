/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {Command, Flags} from '@oclif/core';

import {getEngines} from '../../lib/engines.js';

export default class EnginesList extends Command {
  static description = 'List available export engines.';

  static flags = {
    verbose: Flags.boolean({
      char: 'v',
      summary: 'Include additional information on code generation engines.',
    }),
    format: Flags.string({
      char: 'f',
      default: 'text',
      summary: 'Set the data encoding format.',
      options: ['text', 'json'],
    }),
  };

  async run() {
    const {flags} = await this.parse(EnginesList);

    const engines = await getEngines(this.config);

    if (flags.verbose) {
      if (flags.format === 'json') {
        this.log(JSON.stringify(engines, null, 2));
      } else {
        for (const engine of engines) {
          this.log(engine.name);
          this.log(`Label: ${engine.label}`);
          this.log(`Description: ${engine.description}`);
          this.log(`Version: ${engine.version}`);
          this.log(`Supported SoCs: ${engine.socs.join(', ') || 'All'}`);
          this.log(`Supported features: ${engine.features.join(', ') || 'All'}`);
          this.log('');
        }
      }
    } else {
      const names = engines.map((engine) => engine.name);
      this.log(flags.format === 'json' ? JSON.stringify(names, null, 2) : names.join('\n'));
    }
  }
};
