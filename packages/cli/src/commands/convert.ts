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
import {Errors, Flags} from '@oclif/core';
import {convertTefToReport, InvalidTefError} from 'cfs-lib';
import fs from 'node:fs/promises';
import path from 'node:path';

import {BaseCommand} from '../utils/base-command.js';
import {RecoverableError} from '../utils/recoverable-error.js';

// Input format -> converter. Add an entry here to support a new format.
const CONVERTERS = {
  tef: convertTefToReport
};
type InputFormat = keyof typeof CONVERTERS;
const INPUT_FORMATS = Object.keys(CONVERTERS) as InputFormat[];

const inputFormatFlag = Flags.custom<InputFormat>({
  helpValue: `<${INPUT_FORMATS.join('|')}>`,
  parse: async (input) => {
    const format = input.toLowerCase() as InputFormat;
    if (!INPUT_FORMATS.includes(format)) {
      throw new Errors.CLIError(
        `Expected --input-format=${input} to be one of: ${INPUT_FORMATS.join(', ')}`,
        {code: 'INVALID_INPUT_FORMAT'}
      );
    }

    return format;
  }
});

// File extension (lowercase) -> input format, used when --input-format is omitted.
const FORMAT_BY_EXTENSION: Record<string, InputFormat> = {
  '.tef': 'tef'
};

export default class Convert extends BaseCommand<typeof Convert> {
  static description =
    'Convert a profiling trace into a CodeFusion Studio report.';

  static useResponseEnvelope = true;

  static examples: string[] = [
    '<%= config.bin %> <%= command.id %> --input PATH_TO_TEF_FILE',
    '<%= config.bin %> <%= command.id %> --input PATH_TO_TEF_FILE --output PATH_TO_REPORT',
    '<%= config.bin %> <%= command.id %> --input PATH_TO_TRACE --input-format tef'
  ];

  static flags = {
    'input-format': inputFormatFlag({
      summary:
        'Format of the input file. Detected from the file extension if not set',
      required: false
    }),
    input: Flags.string({
      summary: 'Path to the file to convert',
      required: true
    }),
    output: Flags.string({
      summary:
        'Path to output report file. Defaults to <input name>_runtime_report.cfsreport next to the input file',
      required: false
    })
  };

  async run(): Promise<{outputPath: string}> {
    const {input, output} = this.flags;
    const inputFormat = this.resolveInputFormat(input);

    try {
      await fs.access(input);
    } catch {
      throw new RecoverableError(`Input file not found: ${input}`, {
        code: 'INPUT_FILE_NOT_FOUND',
        suggestion:
          'Check that the path to the input file is correct.',
        example: `${this.config.bin} convert --input <path-to-file>.tef`
      });
    }

    let reportPath: string;
    try {
      reportPath = await CONVERTERS[inputFormat](input, {
        outputPath: output
      });
    } catch (error) {
      if (error instanceof InvalidTefError) {
        throw new RecoverableError(error.message, {
          code: 'INVALID_INPUT_CONTENT',
          suggestion: `Check that the file is a valid ${inputFormat} trace, or pass --input-format if it was detected incorrectly.`
        });
      }

      throw error;
    }

    this.log(`Wrote profiling report to ${reportPath}`);
    return {outputPath: reportPath};
  }

  private resolveInputFormat(input: string): InputFormat {
    const explicit = this.flags['input-format'];
    if (explicit) return explicit;

    const detected =
      FORMAT_BY_EXTENSION[path.extname(input).toLowerCase()];
    if (detected) return detected;

    throw new RecoverableError(
      `Cannot detect the input format of: ${input}`,
      {
        code: 'UNKNOWN_INPUT_FORMAT',
        suggestion: `Pass --input-format explicitly. Supported formats: ${INPUT_FORMATS.join(', ')}.`,
        example: `${this.config.bin} convert --input <path-to-file> --input-format tef`
      }
    );
  }
}
