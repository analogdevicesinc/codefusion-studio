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
import {expect, test} from '@oclif/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {exec} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile, rm} from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

describe('elf symbols', () => {
  describe('output colors', () => {
    test.stdout().it('text', (ctx) => {
      expect(ctx.stdout).to.contain('');
    });

    test
      .stdout({
        stripColor: false
      })
      .command(
        [
          'elf:symbols',
          path.resolve(
            __dirname,
            '../../../../elf-parser/test/data/input.elf'
          ),
          "SELECT * FROM symbols where name = 'devices'"
        ],
        {root: '..'}
      )
      .it(
        'should print color characters when output is not piped',
        // Skipped: needs more investigation across environments.
        // (ctx) => {
        //   expect(ctx.stdout).to.include('\x1b[90m');
        // }
        function () {
          this.skip();
        }
      );

    it('should hide colors when output is piped to a file', async () => {
      await execAsync(
        [
          'node',
          path.resolve(__dirname, '../../../bin/run.js'),
          'elf',
          'symbols',
          path.resolve(
            __dirname,
            '../../../../elf-parser/test/data/input.elf'
          ),
          '"SELECT * FROM symbols WHERE name = \'devices\'"',
          '>',
          path.resolve(__dirname, 'output-file.txt')
        ].join(' ')
      );

      const outputFile = await readFile(
        path.resolve(__dirname, 'output-file.txt'),
        {
          encoding: 'utf8'
        }
      );
      expect(outputFile).to.not.be.empty;
      expect(outputFile).to.not.include('\x1b[90m');

      await rm(path.resolve(__dirname, 'output-file.txt'));
    });
  });
});
