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
import {ElfFileParser} from 'elf-parser';

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

export default class Analyze extends Command {
  static args = {
    filePath: Args.string({description: 'ELF file path'})
  };

  static description = 'Heuristics from an ELF file';

  static flags = {
    json: Flags.boolean({
      char: 'j',
      description: 'Export in JSON format'
    })
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Analyze);

    if (args.filePath) {
      try {
        const parser = new ElfFileParser(args.filePath);
        await parser.initialize();

        const md = parser.getDataModel();
        const heuristics = md.getHeuristics();

        if (flags.json) {
          let jsonString = `{\n\t"FirmwarePlatform":"${heuristics.getTargetOs()}",\n`;
          for (const [k, v] of heuristics.getSymbolEntries()) {
            const unit = v.stringValue.split(' ').pop();
            jsonString += `\t"${capitalizeAndRemoveSeparators(k, unit)}": ${JSON.stringify(v.value)},\n`;
          }

          jsonString = jsonString.slice(0, -2); // remove last comma
          jsonString += '\n}';
          console.log(jsonString);
        } else {
          console.log(
            `Firmware Platform: ${heuristics.getTargetOs()}`
          );
          for (const [k, v] of heuristics.getSymbolEntries()) {
            console.log(`${k}: ${v.stringValue}`);
          }
        }
      } catch (error) {
        console.log((error as Error).message);
      }
    } else {
      console.log(`Please input ELF file`);
    }
  }
}
