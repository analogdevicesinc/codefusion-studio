/**
 *
 * Copyright (c) 2024, 2026 Analog Devices, Inc.
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
import {createWriteStream} from 'node:fs';

import type {CfsSocDataModel} from 'cfs-types';

import {getDataModelManager} from '../../utils/data-model-manager.js';
import {handleMissingDependencyError} from '../../utils/error-handler.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {BaseCommand} from '../../utils/base-command.js';

export default class Export extends BaseCommand<typeof Export> {
  static aliases = ['soc:export'];
  static useResponseEnvelope = true;

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
    gzip: Flags.boolean({
      summary: 'Gzip the output',
      hidden: true
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
      charAliases: ['v'],
      deprecateAliases: true,
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

  async run(): Promise<
    {soc: CfsSocDataModel} | {outputPath: string}
  > {
    const {args, flags} = this;

    if (flags.gzip) {
      this.error(`Support for '--gzip' has been removed.`);
    }

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
          `Invalid SoC name format. Expected '{name}-{package}', got '${flags.name}'.`,
          {code: 'INVALID_SOC_NAME_FORMAT'}
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
          `Multiple packages found for SoC '${socName}', please specify one with --package=${[...new Set(pkgVariants)].join('|')}.`,
          {code: 'MULTIPLE_PACKAGES_FOUND'}
        );
      } else if (pkgVariants.length === 0) {
        this.error(
          `SoC data model not found for '${socName}', please check SoC name.`,
          {code: 'SOC_DATA_MODEL_NOT_FOUND'}
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
      handleMissingDependencyError(error, 'SOC_DATA_MODEL_NOT_FOUND');
      throw error;
    }

    if (!soc) {
      this.error(
        `SoC data model not found for '${socName}' with package '${socPackage}'.`,
        {code: 'SOC_DATA_MODEL_NOT_FOUND'}
      );
    }

    // Drives --output=stdio text mode and --output=<file> in both modes.
    // Note: when --format json routes through the shared envelope below,
    // this pre-formatted string is discarded in favor of the envelope's own
    // JSON serialization, so --minify/--indent have no effect on `--format
    // json --output stdio` output (they still apply to file output).
    const output = JSON.stringify(
      soc,
      null,
      flags.minify ? 0 : Number(flags.indent) || flags.indent
    );

    const writeOutput = async (data: string) => {
      if (flags.output === 'stdio') {
        // The envelope already carries `soc` as its own JSON document;
        // writing the raw payload too would put two JSON documents on stdout.
        if (!this.jsonEnabled()) {
          this.writeToStdout(data);
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

    await writeOutput(output);

    return flags.output === 'stdio'
      ? {soc}
      : {outputPath: flags.output};
  }
}
