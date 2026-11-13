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
import {expect} from 'chai';
import {runCommand} from '@oclif/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {exec} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile, rm} from 'node:fs/promises';

import {assertValidEnvelope} from '../../utils/assert-json-envelope.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

interface SymbolsData {
  rows: Record<string, unknown>[];
  rowsTotalNumber: number;
}

describe('elf symbols', () => {
  const elfPath = path.resolve(
    __dirname,
    '../../../../cfs-lib/test/parsers/elf-parser/data/input.elf'
  );
  const query = '"SELECT * FROM symbols WHERE size > 0 limit 1"';

  it('produces valid JSON output', async () => {
    const {stdout} = await runCommand(
      ['elf:symbols', elfPath, query, '--format=json'],
      {root: '..'}
    );

    const parsed = assertValidEnvelope<SymbolsData>(stdout);
    expect(parsed.ok).to.be.true;
    if (parsed.ok) {
      expect(parsed.data).to.be.an('object');
      expect(parsed.data.rows).to.be.an('array');
      expect(parsed.data.rowsTotalNumber).to.equal(
        parsed.data.rows.length
      );
    }
  });

  describe('output colors', () => {
    it('text', async () => {
      const {stdout} = await runCommand([]);
      expect(stdout).to.contain('');
    });

    // Skipped: needs more investigation across environments.
    it('should print color characters when output is not piped', function () {
      this.skip();
    });

    it('should hide colors when output is piped to a file', async () => {
      await execAsync(
        [
          'node',
          path.resolve(__dirname, '../../../bin/run.js'),
          'elf',
          'symbols',
          elfPath,
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

  describe('-f (--full) deprecation', () => {
    it('still works and surfaces a deprecation warning', async () => {
      const {stdout} = await runCommand(
        ['elf:symbols', elfPath, query, '-f', '--format=json'],
        {root: '..'}
      );

      const parsed = assertValidEnvelope<SymbolsData>(stdout);
      expect(parsed.ok).to.be.true;
      if (parsed.ok) {
        expect(parsed.data.rows[0].path).to.equal(
          '/Users/kevin/Linaro/zephyr/upstream/zephyr/lib/os/printk.c:99:13'
        );
        expect(
          parsed.warnings.some((warning) =>
            warning.message.includes(
              'The "-f" flag has been deprecated. Use "--full" instead'
            )
          )
        ).to.be.true;
      }
    });
  });
});
