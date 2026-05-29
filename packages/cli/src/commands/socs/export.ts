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
import {Args, Command, Flags} from '@oclif/core';
import {createWriteStream} from 'node:fs';
import {createGzip} from 'node:zlib';

import {getDataModelManager} from '../../utils/data-model-manager.js';
import {handleMissingDependencyError} from '../../utils/error-handler.js';
import {getPackageManager} from '../../utils/package-manager.js';

export default class Export extends Command {
  static aliases = ['soc:export'];

  static args = {
    socName: Args.string({
      description: 'SoC to export, not including package',
      required: false // This is conditionally required based on legacy flag usage. Should be true in future major releases.
    })
  };

  static description =
    'Output the SoC data model for the specified SoC.';

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> max32690 --package tqfn'
  ];

  static flags = {
    package: Flags.string({
      char: 'p',
      summary: 'Package name of the SoC to be exported'
    }),
    format: Flags.string({
      char: 'f',
      default: 'json',
      summary: 'Output format',
      options: ['json']
    }),
    gzip: Flags.boolean({
      summary: 'Gzip the output'
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
      summary:
        'SoC name. [DEPRECATED] Use SOCNAME positional argument and --package flag instead.',
      deprecated: {
        message:
          '--name flag is deprecated. Use SOCNAME positional argument and --package flag instead.'
      }
    }),
    version: Flags.string({
      char: 'v',
      summary:
        'Optional Data model version (defaults to latest if not specified)'
    }),
    output: Flags.string({
      char: 'o',
      default: 'stdio',
      summary: 'Output destination (stdio or file path)'
    }),
    'search-path': Flags.string({
      char: 's',
      summary:
        'Additional custom search path for SoC data models. Can be used multiple times',
      multiple: true
    })
  };

  async run() {
    const {args, flags} = await this.parse(Export);

    const customSearchPaths = flags['search-path'] ?? [];
    const packageManager = await getPackageManager({
      acceptUndefined: true
    });

    const dmManager = await getDataModelManager(
      this.config,
      packageManager,
      customSearchPaths
    );

    let socName: string | undefined;
    let socPackage: string | undefined;
    // Handled legacy --name flag. This block can be removed in future major releases.
    if (flags.name !== undefined) {
      if (args.socName !== undefined) {
        this.error(
          'SoC name provided both as positional argument and via deprecated --name flag. Please provide the SoC name only as a positional argument.'
        );
      }
      // Parse name as {name}-{package}

      [socName, socPackage] = flags.name.split('-', 2);

      if (!socName || !socPackage) {
        this.error(
          `Invalid SoC name format. Expected '{name}-{package}', got '${flags.name}'.`
        );
      }
    } else if (args.socName === undefined) {
      this.error(
        'Missing 1 required arg:\nsocName  SoC to export, not including package.'
      );
    } else {
      // End of legacy --name flag handling.
      socName = args.socName;
      socPackage = flags.package;
    }

    if (socPackage === undefined) {
      const pkgVariants = (await dmManager.listDataModels())
        .filter(
          (dm) =>
            dm.name.toLocaleLowerCase() ===
            socName.toLocaleLowerCase()
        )
        .map((dm) => dm.package);
      if (pkgVariants.length > 1) {
        this.error(
          `Multiple packages found for SoC '${socName}', please specify one with --package=${[...new Set(pkgVariants)].join('|')}.`
        );
      } else if (pkgVariants.length === 0) {
        this.error(
          `SoC data model not found for '${socName}', please check SoC name.`
        );
      } else {
        // Only one package found, use it
        [socPackage] = pkgVariants;
      }
    }

    let soc;

    try {
      soc = await dmManager.getDataModel(
        socName,
        socPackage,
        flags.version
      );
    } catch (error) {
      handleMissingDependencyError(error);
      throw error;
    }

    if (!soc) {
      this.error(
        `SoC data model not found for '${socName}' with package '${socPackage}'.`
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

        await new Promise<void>((resolve, reject) => {
          gzip.on('end', resolve);
          gzip.on('error', reject);
          gzip.write(output);
          gzip.end();
        });
      } else {
        const outputFile = createWriteStream(flags.output);
        gzip.pipe(outputFile);

        await new Promise<void>((resolve, reject) => {
          outputFile.on('finish', () => {
            this.log(`Output written to: ${flags.output}`);
            resolve();
          });
          outputFile.on('error', reject);
          gzip.on('error', reject);
          gzip.write(output);
          gzip.end();
        });
      }
    } else {
      await writeOutput(output);
    }
  }
}
