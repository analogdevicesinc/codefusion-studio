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
import {existsSync, unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {
  assertSuccessEnvelopeData,
  assertValidEnvelope
} from '../../utils/assert-json-envelope.js';

describe('soc export (legacy arguments)', () => {
  it('runs socs export --name test_soc_b-tqfn', async () => {
    const {stdout} = await runCommand(
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
    );
    expect(stdout).to.contain('"Name": "TEST_SOC_B"');
  });

  it('exports output to file', async () => {
    const {stdout} = await runCommand(
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
    );
    const outputFile = join(tmpdir(), 'test-output.json');
    expect(stdout).to.contain('Output written to:');
    expect(existsSync(outputFile)).to.be.true;

    // Clean up
    if (existsSync(outputFile)) {
      unlinkSync(outputFile);
    }
  });

  it('fails due to both positional and --name flag', async () => {
    const {error} = await runCommand(
      ['socs:export', 'test_soc_b', '--name', 'test_soc_b-tqfn'],
      {
        root: '..'
      }
    );
    expect(error?.message).to.contain(
      'SoC name provided both as positional argument and via deprecated --name flag.'
    );
  });
});

describe('soc export', () => {
  it('fails due to missing positional argument', async () => {
    const {error} = await runCommand(['socs:export'], {
      root: '..'
    });
    expect(error?.message).to.contain('Missing 1 required arg');
  });

  it('runs socs export test_soc_b --package tqfn', async () => {
    const {stdout} = await runCommand(
      [
        'socs:export',
        'test_soc_b',
        '--package',
        'tqfn',
        '--search-path',
        './test/fixtures/socs'
      ],
      {
        root: '..'
      }
    );
    expect(stdout).to.contain('"Name": "TEST_SOC_B"');
    expect(stdout).to.contain('"Package": "TQFN"');
  });

  it('runs socs export test_soc_b --package wlp', async () => {
    const {stdout} = await runCommand(
      [
        'socs:export',
        'test_soc_b',
        '--package',
        'wlp',
        '--search-path',
        './test/fixtures/socs'
      ],
      {
        root: '..'
      }
    );
    expect(stdout).to.contain('"Name": "TEST_SOC_B"');
    expect(stdout).to.contain('"Package": "WLP"');
  });

  it('runs socs export test_soc_a', async () => {
    const {stdout} = await runCommand(
      [
        'socs:export',
        'test_soc_a',
        '--search-path',
        './test/fixtures/socs'
      ],
      {
        root: '..'
      }
    );
    expect(stdout).to.contain('"Name": "TEST_SOC_A"');
  });

  it('exports output to file', async () => {
    const {stdout} = await runCommand(
      [
        'socs:export',
        'test_soc_b',
        '--package',
        'tqfn',
        '--search-path',
        './test/fixtures/socs',
        '-o',
        join(tmpdir(), 'test-output.json')
      ],
      {
        root: '..'
      }
    );
    const outputFile = join(tmpdir(), 'test-output.json');
    expect(stdout).to.contain('Output written to:');
    expect(existsSync(outputFile)).to.be.true;

    // Clean up
    if (existsSync(outputFile)) {
      unlinkSync(outputFile);
    }
  });
});

describe('soc export JSON envelope', () => {
  it('returns a soc envelope in JSON mode for stdio output', async () => {
    const {stdout} = await runCommand(
      [
        'socs:export',
        'test_soc_b',
        '--package',
        'tqfn',
        '--search-path',
        './test/fixtures/socs',
        '--format',
        'json'
      ],
      {root: '..'}
    );

    const data = assertSuccessEnvelopeData<{soc: {Name: string}}>(
      stdout,
      'socs export'
    );

    expect(data.soc.Name).to.equal('TEST_SOC_B');
  });

  it('returns an outputPath envelope in JSON mode for file output', async () => {
    const outputFile = join(tmpdir(), 'test-output-envelope.json');

    try {
      const {stdout} = await runCommand(
        [
          'socs:export',
          'test_soc_b',
          '--package',
          'tqfn',
          '--search-path',
          './test/fixtures/socs',
          '-o',
          outputFile,
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const data = assertSuccessEnvelopeData<{outputPath: string}>(
        stdout,
        'socs export'
      );

      expect(data).to.deep.equal({outputPath: outputFile});
      expect(existsSync(outputFile)).to.be.true;
    } finally {
      if (existsSync(outputFile)) {
        unlinkSync(outputFile);
      }
    }
  });

  it('returns a SOC_DATA_MODEL_NOT_FOUND error envelope in JSON mode', async () => {
    const {stdout} = await runCommand(
      [
        'socs:export',
        'nonexistent_soc',
        '--search-path',
        './test/fixtures/socs',
        '--format',
        'json'
      ],
      {root: '..'}
    );

    const parsed = assertValidEnvelope(stdout);

    expect(parsed.ok).to.be.false;
    if (parsed.ok) throw new Error('expected an error envelope');
    expect(parsed.command).to.equal('socs export');
    expect(parsed.errors[0]?.code).to.equal(
      'SOC_DATA_MODEL_NOT_FOUND'
    );
  });

  for (const [label, extraArgs] of [
    [
      'an explicit package that does not exist',
      ['--package', 'nosuchpkg']
    ],
    [
      'an unavailable --version',
      ['--package', 'tqfn', '--version', '999.0.0']
    ]
  ] as const) {
    it(`returns the same SOC_DATA_MODEL_NOT_FOUND code for ${label}`, async () => {
      const {stdout} = await runCommand(
        [
          'socs:export',
          'test_soc_b',
          ...extraArgs,
          '--search-path',
          './test/fixtures/socs',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout);

      expect(parsed.ok).to.be.false;
      if (parsed.ok) throw new Error('expected an error envelope');
      expect(parsed.errors[0]?.code).to.equal(
        'SOC_DATA_MODEL_NOT_FOUND'
      );
    });
  }
});
