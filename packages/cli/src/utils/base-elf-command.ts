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
import {type Command, Args as OclifArgs} from '@oclif/core';
import {DataResult, ElfFileParser, checkIfFileExists} from 'cfs-lib';

import {BaseCommand} from './base-command.js';
import {RecoverableError} from './recoverable-error.js';

export abstract class BaseElfCommand<
  T extends typeof Command
> extends BaseCommand<T> {
  static args = {
    filePath: OclifArgs.string({
      description: 'Path to an ELF file',
      required: true
    })
  };

  protected async initializeParser(
    noDb = false,
    debug = false
  ): Promise<ElfFileParser> {
    if (!checkIfFileExists(this.args.filePath)) {
      throw new RecoverableError(
        `File not found: "${this.args.filePath}"`,
        {
          suggestion: 'Verify the file path is correct',
          code: 'ELF_FILE_NOT_FOUND'
        }
      );
    }

    try {
      const parser = new ElfFileParser(this.args.filePath, debug);
      const result = await parser.initialize(noDb, debug);

      if (result === DataResult.INVALID) {
        throw new RecoverableError(
          `Not a valid ELF file: "${this.args.filePath}"`,
          {
            suggestion: 'Ensure the file is a compiled ELF binary',
            code: 'ELF_INVALID_FILE'
          }
        );
      }

      return parser;
    } catch (error) {
      if (error instanceof RecoverableError) throw error;
      this.error(
        `Failed to parse ELF file: "${this.args.filePath}"`,
        {
          code: 'ELF_PARSE_FAILED'
        }
      );
    }
  }
}
