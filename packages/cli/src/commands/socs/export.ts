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
import {createWriteStream} from 'node:fs';
import {createGzip} from 'node:zlib';

import {getDataModelManager} from '../../utils/data-model-manager.js';
import {getPackageManager} from '../../utils/package-manager.js';

export default class Export extends Command {
  static description =
    'Output the SoC data model for the specified SoC.';

  static flags = {
    format: Flags.string({
      char: 'f',
      default: 'json',
      summary: 'Output format',
      options: ['json']
    }),
    gzip: Flags.boolean({
      description: 'Gzip the output'
    }),
    indent: Flags.string({
      char: 'i',
      default: '2',
      summary:
        "Set JSON indentation (number of spaces or $'\\t' for tab)."
    }),
    minify: Flags.boolean({
      char: 'm',
      summary: 'Minify the JSON output'
    }),
    name: Flags.string({
      char: 'n',
      summary: 'SoC name',
      required: true
    }),
    output: Flags.string({
      char: 'o',
      default: 'stdio',
      summary: 'Output destination (stdio or file path)'
    }),
    'search-path': Flags.string({
      char: 's',
      summary:
        'Additional custom search path(s) for SoC data models.',
      multiple: true
    })
  };

  async run() {
    const {flags} = await this.parse(Export);

    const customSearchPaths = flags['search-path'] ?? [];
    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager = await getDataModelManager(
      this.config,
      packageManager,
      customSearchPaths
    );

    // Parse name as {name}-{package}
    const [socName, socPackage] = flags.name.split('-', 2);

    if (!socName || !socPackage) {
      this.error(
        `Invalid SoC name format. Expected "{name}-{package}", got "${flags.name}"`
      );
    }

    const soc = await dmManager.getDataModel(socName, socPackage);

    if (!soc) {
      this.error(
        `SoC data model not found for "${socName}" with package "${socPackage}" and schema "${flags.schema}"`
      );
    }

    const output = JSON.stringify(
      soc,
      null,
      flags.minify ? 0 : Number(flags.indent) || flags.indent
    );

    const writeOutput = (data: Buffer | string) => {
      if (flags.output === 'stdio') {
        if (Buffer.isBuffer(data)) {
          process.stdout.write(data.toString());
        } else {
          process.stdout.write(data);
        }

        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        const outputFile = createWriteStream(flags.output);
        outputFile.write(data);
        outputFile.end();
        outputFile.on('finish', () => {
          this.log(`Output written to: ${flags.output}`);

          resolve();
        });
        outputFile.on('error', reject);
      });
    };

    if (flags.gzip) {
      const gzip = createGzip();

      if (flags.output === 'stdio') {
        gzip.pipe(process.stdout);
      } else {
        const outputFile = createWriteStream(flags.output);
        gzip.pipe(outputFile);
        outputFile.on('finish', () => {
          this.log(`Output written to: ${flags.output}`);
        });
      }

      await new Promise<void>((resolve, reject) => {
        gzip.on('end', resolve);
        gzip.on('error', reject);
        gzip.write(output);
        gzip.end();
      });
    } else {
      await writeOutput(output);
    }
  }
}
