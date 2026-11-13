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

describe('elf analyze', () => {
  const elfPath = path.resolve(
    __dirname,
    '../../../../cfs-lib/test/parsers/elf-parser/data/input.elf'
  );

  it('produces text output by default', async () => {
    const {stdout} = await runCommand(['elf:analyze', elfPath], {
      root: '..'
    });

    expect(stdout).to.contain('Firmware Platform:');
    expect(stdout).to.contain('Detected Compiler:');
    expect(stdout).to.contain('Flash size:');
    expect(stdout).to.contain('SRAM size:');
  });

  it('produces valid JSON output', async () => {
    const {stdout} = await runCommand(
      ['elf:analyze', elfPath, '--format=json'],
      {root: '..'}
    );
    // Verify the output is a valid envelope wrapping an object
    const parsed = assertValidEnvelope(stdout);
    expect(parsed.ok).to.be.true;
    if (parsed.ok) {
      expect(parsed.data).to.be.an('object');
    }

    // Verify no trailing commas in JSON
    const jsonString = stdout;
    expect(jsonString).to.not.match(/,\s*}/); // No trailing comma before closing brace
    expect(jsonString).to.not.match(/,\s*]/); // No trailing comma before closing bracket
  });
});
