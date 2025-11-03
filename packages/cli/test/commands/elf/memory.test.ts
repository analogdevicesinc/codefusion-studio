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
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ElfFileParser} from 'elf-parser';
import {
  generateMemoryJson,
  MemoryFlags
} from '../../../src/commands/elf/memory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('elf memory', () => {
  test.stdout().it('text', (ctx) => {
    expect(ctx.stdout).to.contain('');
  });

  test
    .stdout()
    .command(
      [
        'elf:memory',
        '-s',
        path.resolve(
          __dirname,
          '../../../../elf-parser/test/data/input.elf'
        ),
        '-j'
      ],
      {root: '..'}
    )
    .it('json', (ctx) => {
      const json = JSON.parse(ctx.stdout);
      expect(json).to.be.an('object');
      expect(json).to.have.property('Segments');
      expect(json.Segments).to.be.an('array');
      expect(Object.keys(json).length).to.be.equal(1);
    });

  test
    .stdout()
    .command(
      [
        'elf:memory',
        '-t',
        '-i',
        '0', // Filter by segment id 0
        path.resolve(
          __dirname,
          '../../../../elf-parser/test/data/input.elf'
        ),
        '-j'
      ],
      {root: '..'}
    )
    .it('sections filtered by segment id', (ctx) => {
      const json = JSON.parse(ctx.stdout);
      expect(json).to.be.an('object');
      // Should only contain sections for segment 0
      expect(json).to.have.property('0');
      // Should not contain other segments
      expect(json).to.not.have.property('1');
    });

  test
    .stdout()
    .command(
      [
        'elf:memory',
        '-y',
        '-i',
        '0', // Filter by section id 0
        path.resolve(
          __dirname,
          '../../../../elf-parser/test/data/input.elf'
        ),
        '-j'
      ],
      {root: '..'}
    )
    .it('symbols filtered by section id', (ctx) => {
      const json = JSON.parse(ctx.stdout);
      expect(json).to.be.an('object');
      expect(json).to.have.property('Sections');
      expect(json.Sections).to.be.an('array');
      // Should only contain section with id 0
      expect(json.Sections.length).to.be.at.least(1);
      expect(json.Sections.every((section: any) => section.id === 0))
        .to.be.true;
    });
});
