/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import {Args} from '@oclif/core';
import {ElfFileParser} from 'elf-parser';

import {Logger} from '../../logger.js';
import {BaseCommand} from '../../utils/base-command.js';

/**
 * Capitalizes all words in the input string and removes spaces or other separators.
 * @param input - The input string to be transformed.
 * @param unit - The unit of measurement.
 * @returns The transformed string with capitalized words and no separators.
 */
function capitalizeAndRemoveSeparators(
  input: string,
  unit?: string
): string {
  if (unit && unit.toLowerCase().includes('kb')) {
    return (
      input
        .split(/[\s-_]+/) // Split by spaces, hyphens, or underscores
        .map(
          (word) =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ) // Capitalize each word
        .join('') + unit.toUpperCase()
    ); // Join without separators and add unit in uppercase
  }

  return input
    .split(/[\s-_]+/) // Split by spaces, hyphens, or underscores
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ) // Capitalize each word
    .join(''); // Join without separators
}

type JsonObject = Record<string, number | string>;

export default class Analyze extends BaseCommand<typeof Analyze> {
  static args = {
    filePath: Args.string({description: 'ELF file path'})
  };

  static description = 'Heuristics from an ELF file';

  public async run(): Promise<JsonObject> {
    const {args} = this;

    if (args.filePath) {
      try {
        const parser = new ElfFileParser(args.filePath);
        await parser.initialize();

        const md = parser.getDataModel();
        const heuristics = md.getHeuristics();

        const jsonObject: JsonObject = {
          FirmwarePlatform: heuristics.getTargetOs(),
          DetectedCompiler: heuristics.getCompilerDetected()
        };

        this.log(`Firmware Platform: ${heuristics.getTargetOs()}`);

        // Add all symbol entries to the object
        for (const [k, v] of heuristics.getSymbolEntries()) {
          this.log(`${k}: ${v.stringValue}`);
          const unit = v.stringValue.split(' ').pop();
          jsonObject[capitalizeAndRemoveSeparators(k, unit)] =
            v.value;
        }

        this.log(
          `Detected Compiler: ${heuristics.getCompilerDetected()}`
        );

        return jsonObject;
      } catch (error) {
        return Logger.logError(`${error}`);
      }
    } else {
      return Logger.logError(
        `No input file. Please provide a valid file path.`
      );
    }
  }
}
