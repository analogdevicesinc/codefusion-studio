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
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import {assertValidEnvelope} from '../../utils/assert-json-envelope.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('elf info', () => {
  const elfPath = path.resolve(
    __dirname,
    '../../../../cfs-lib/test/parsers/elf-parser/data/input.elf'
  );

  it('produces text output by default', async () => {
    const {stdout} = await runCommand(['elf:info', '-a', elfPath], {
      root: '..'
    });

    expect(stdout).to.contain('Attributes Info:');
    expect(stdout).to.contain('CPU name:');
    expect(stdout).to.contain('CPU arch:');
    expect(stdout).to.contain('CPU arch profile:');
  });

  it('json', async () => {
    const {stdout} = await runCommand(
      ['elf:info', '-a', elfPath, '--format=json'],
      {root: '..'}
    );
    const parsed = assertValidEnvelope<{AttributesInfo: unknown}>(
      stdout
    );
    expect(parsed.ok).to.be.true;
    if (parsed.ok) {
      expect(parsed.data).to.be.an('object');
      expect(parsed.data).to.have.property('AttributesInfo');
    }
    // Human-readable narration is suppressed in JSON mode.
    expect(stdout).to.not.contain('Attributes Info:');
  });

  for (const flag of [
    '--debug_heuristics',
    '--debug_cus',
    '--debug_lt',
    '--debug_abbrevs',
    '--debug_dies'
  ]) {
    it(`rejects ${flag} in JSON mode with an error envelope`, async () => {
      const {stdout} = await runCommand(
        ['elf:info', flag, elfPath, '--format=json'],
        {root: '..'}
      );
      const parsed = assertValidEnvelope(stdout) as {
        ok: boolean;
        errors: {code: string; message: string}[];
      };
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0]?.code).to.equal(
        'ELF_INFO_UNSUPPORTED_JSON_FLAGS'
      );
    });
  }
});
