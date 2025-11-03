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
import {existsSync, unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

describe('soc export', () => {
  test
    .stdout()
    .command(
      [
        'socs:export',
        '--name',
        'test_soc_b-tqfn',
        '--search-path',
        './test/fixtures/socs'
      ],
      {
        root: '..'
      }
    )
    .it('runs socs export --name test_soc_b-tqfn', (ctx) => {
      expect(ctx.stdout).to.contain('"Name": "TEST_SOC_B"');
    });

  test
    .stdout()
    .command(
      [
        'socs:export',
        '--name',
        'test_soc_b-tqfn',
        '--search-path',
        './test/fixtures/socs',
        '-o',
        join(tmpdir(), 'test-output.json')
      ],
      {
        root: '..'
      }
    )
    .it('exports output to file without gzip', (ctx) => {
      const outputFile = join(tmpdir(), 'test-output.json');
      expect(ctx.stdout).to.contain('Output written to:');
      expect(existsSync(outputFile)).to.be.true;

      // Clean up
      if (existsSync(outputFile)) {
        unlinkSync(outputFile);
      }
    });

  test
    .stdout()
    .command(
      [
        'socs:export',
        '--name',
        'test_soc_b-tqfn',
        '--search-path',
        './test/fixtures/socs',
        '--gzip',
        '-o',
        join(tmpdir(), 'test-output.gz')
      ],
      {
        root: '..'
      }
    )
    .it('exports gzipped output to file', (ctx) => {
      const outputFile = join(tmpdir(), 'test-output.gz');
      expect(ctx.stdout).to.contain('Output written to:');
      expect(existsSync(outputFile)).to.be.true;

      // Clean up
      if (existsSync(outputFile)) {
        unlinkSync(outputFile);
      }
    });
});
