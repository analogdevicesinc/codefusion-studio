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
import {DtParser} from 'cfs-lib';
import {promises as fs} from 'node:fs';
import {dirname} from 'node:path';

import {Logger} from '../../logger.js';

// Example run:
// $ ./run.js dt parse zephyr/boards/adi/max32690evkit/max32690evkit_max32690_m4.dts \
// -I~/work/elf/zephyr/dts \
// -I~/work/elf/zephyr/dts/arm/ \
// -I~/work/elf/zephyr/dts/common/ \
// -I~/work/elf/zephyr/dts/x86/ \
// -I~/work/elf/hal_nxp/dts \
// -I~/work/elf/zephyr/

export default class DtCommand extends Command {
  static args = {
    filePath: Args.string({
      description: 'Devicetree (text) file path'
    })
  };

  static description = 'Devicetree (text) file parser';

  static flags = {
    includeDirs: Flags.directory({
      char: 'I',
      // -I one -I two -I three ...
      multiple: true,
      // Parse one value per flag to allow `-m val1 -m val2`
      // but disallow `-m val1 val2`. Only respected if multiple is set to true
      multipleNonGreedy: true,
      summary: 'Include file paths. -Idir1 -Idir2 -Idir3 ...'
    }),
    output: Flags.string({
      char: 'o',
      summary: 'Output json file'
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Enable verbose mode'
    })
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(DtCommand);
    if (args.filePath) {
      try {
        const inc: string[] = flags.includeDirs ?? [];
        // Include the input file directory
        inc.push(dirname(args.filePath));
        const parser = new DtParser({
          includeDirs: inc,
          verbose: flags.verbose
        });
        const json = await parser.jsonFromFile(args.filePath);

        const str = JSON.stringify(json, null, 2); // spacing level = 2
        if (flags.output) {
          await fs.writeFile(flags.output, str);
        } else {
          console.log(str);
        }
      } catch (error) {
        Logger.logError(`${error}`);
      }
    } else {
      Logger.logError(
        `No input file. Please provide a valid file path.`
      );
    }
  }
}
