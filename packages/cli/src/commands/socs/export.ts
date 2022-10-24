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
import {createGzip} from 'node:zlib';

import {getSoc} from '../../lib/socs.js';

export default class Export extends Command {
  static description = 'Output the SoC data model for the specified SoC.';
  
  static flags = {
    format: Flags.string({
      char: 'f',
      default: 'json',
      summary: 'Output format',
      options: ['json'],
    }),
    gzip: Flags.boolean({
      description: 'Gzip the output',
    }),
    indent: Flags.string({
      char: 'i',
      default: '2',
      summary: 'Set JSON indentation (number of spaces or $\'\\t\' for tab).',
    }),
    minify: Flags.boolean({
      char: 'm',
      summary: 'Minify the JSON output',
    }),
    name: Flags.string({
      char: 'n',
      summary: 'SoC name',
      required: true,
    }),
    output: Flags.string({
      char: 'o',
      default: 'stdio',
      summary: 'Output destination',
      options: ['stdio'],
    })
  };

  async run() {
    const {flags} = await this.parse(Export);

    const soc = await getSoc(this.config, flags.name);
    const output = JSON.stringify(soc, null, flags.minify ? 0 : (Number(flags.indent) || flags.indent));

    if (flags.gzip) {
      const gzip = createGzip();
      gzip.pipe(process.stdout);
      gzip.write(output);
      gzip.end();
    }
    else {
      this.log(output);
    }
  }
}
