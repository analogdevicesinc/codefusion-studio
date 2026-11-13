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

import {expect} from 'chai';
import {runCommand} from '@oclif/test';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import {assertValidEnvelope} from '../../utils/assert-json-envelope.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const missingElfPath = path.resolve(__dirname, 'does-not-exist.elf');
// Exists on disk but cannot be parsed as an ELF file.
const notAnElfPath = __filename;

const elfCommands: Record<string, (filePath: string) => string[]> = {
  'elf:analyze': (filePath) => ['elf:analyze', filePath],
  'elf:info': (filePath) => ['elf:info', '-c', filePath],
  'elf:memory': (filePath) => ['elf:memory', '-s', filePath],
  'elf:symbols': (filePath) => [
    'elf:symbols',
    filePath,
    '"SELECT * FROM symbols limit 1"'
  ]
};

async function errorCodeFor(argv: string[]): Promise<string> {
  const {stdout} = await runCommand([...argv, '--format=json'], {
    root: '..'
  });
  const parsed = assertValidEnvelope(stdout) as {
    ok: boolean;
    errors: {code: string; message: string}[];
  };
  expect(parsed.ok).to.be.false;

  return parsed.errors[0].code;
}

describe('elf commands JSON error codes', () => {
  for (const [command, buildArgv] of Object.entries(elfCommands)) {
    describe(command, () => {
      it('uses a fixed code when the file is not found', async () => {
        expect(
          await errorCodeFor(buildArgv(missingElfPath))
        ).to.equal('ELF_FILE_NOT_FOUND');
      });

      it('uses a fixed code when the file cannot be parsed', async () => {
        expect(await errorCodeFor(buildArgv(notAnElfPath))).to.equal(
          'ELF_PARSE_FAILED'
        );
      });
    });
  }
});
