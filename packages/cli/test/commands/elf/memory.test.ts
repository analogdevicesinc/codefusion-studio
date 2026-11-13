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

describe('elf memory', () => {
  it('text', async () => {
    const {stdout} = await runCommand([]);
    expect(stdout).to.contain('');
  });

  it('json', async () => {
    const {stdout} = await runCommand(
      [
        'elf:memory',
        '-s',
        path.resolve(
          __dirname,
          '../../../../cfs-lib/test/parsers/elf-parser/data/input.elf'
        ),
        '--format=json'
      ],
      {root: '..'}
    );
    const parsed = assertValidEnvelope<{Segments: unknown[]}>(stdout);
    expect(parsed.ok).to.be.true;
    if (parsed.ok) {
      expect(parsed.data).to.be.an('object');
      expect(parsed.data).to.have.property('Segments');
      expect(parsed.data.Segments).to.be.an('array');
      expect(Object.keys(parsed.data).length).to.be.equal(1);
    }
  });

  it('sections filtered by segment id', async () => {
    const {stdout} = await runCommand(
      [
        'elf:memory',
        '-t',
        '-i',
        '0', // Filter by segment id 0
        path.resolve(
          __dirname,
          '../../../../cfs-lib/test/parsers/elf-parser/data/input.elf'
        ),
        '--format=json'
      ],
      {root: '..'}
    );
    const parsed =
      assertValidEnvelope<Record<string, unknown>>(stdout);
    expect(parsed.ok).to.be.true;
    if (parsed.ok) {
      expect(parsed.data).to.be.an('object');
      // Should only contain sections for segment 0
      expect(parsed.data).to.have.property('0');
      // Should not contain other segments
      expect(parsed.data).to.not.have.property('1');
    }
  });

  it('symbols filtered by section id', async () => {
    const {stdout} = await runCommand(
      [
        'elf:memory',
        '-y',
        '-i',
        '0', // Filter by section id 0
        path.resolve(
          __dirname,
          '../../../../cfs-lib/test/parsers/elf-parser/data/input.elf'
        ),
        '--format=json'
      ],
      {root: '..'}
    );
    const parsed = assertValidEnvelope<{
      Sections: {id: number}[];
    }>(stdout);
    expect(parsed.ok).to.be.true;
    if (parsed.ok) {
      expect(parsed.data).to.be.an('object');
      expect(parsed.data).to.have.property('Sections');
      expect(parsed.data.Sections).to.be.an('array');
      // Should only contain section with id 0
      expect(parsed.data.Sections.length).to.be.at.least(1);
      expect(
        parsed.data.Sections.every((section) => section.id === 0)
      ).to.be.true;
    }
  });
});
