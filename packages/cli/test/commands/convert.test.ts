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

import {runCommand} from '@oclif/test';
import {expect} from 'chai';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {assertValidEnvelope} from '../utils/assert-json-envelope.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_TEF = path.resolve(
  __dirname,
  '../fixtures/tef/sample.tef'
);

describe('convert', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cfs-convert-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, {recursive: true, force: true});
  });

  it('writes the report to the given output path', async () => {
    const output = path.join(tmpDir, 'out.cfsreport');

    const {error} = await runCommand(
      ['convert', '--input', SAMPLE_TEF, '--output', output],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    const report = JSON.parse(await fs.readFile(output, 'utf8'));
    expect(report.type).to.equal('runtime-profile');
    expect(report.inference_summary.iterations).to.equal(1);
    expect(report.layer_performance).to.have.length(2);
  });

  it('prints a valid JSON envelope with --format json', async () => {
    const output = path.join(tmpDir, 'out.cfsreport');

    const {error, stdout} = await runCommand(
      [
        'convert',
        '--input',
        SAMPLE_TEF,
        '--output',
        output,
        '--format',
        'json'
      ],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(stdout).to.not.include('Wrote profiling report');
    expect(assertValidEnvelope(stdout)).to.deep.equal({
      ok: true,
      command: 'convert',
      data: {outputPath: output},
      warnings: []
    });
    await fs.access(output);
  });

  it('prints an error envelope with --format json when the input is missing', async () => {
    const {stdout} = await runCommand(
      [
        'convert',
        '--input',
        path.join(tmpDir, 'missing.tef'),
        '--format',
        'json'
      ],
      {root: '..'}
    );

    const envelope = assertValidEnvelope(stdout) as {
      ok: boolean;
      errors: {code: string; message: string}[];
    };
    expect(envelope.ok).to.equal(false);
    expect(envelope.errors).to.have.length(1);
    expect(envelope.errors[0].code).to.equal('INPUT_FILE_NOT_FOUND');
    expect(envelope.errors[0].message).to.include(
      'Input file not found'
    );
  });

  it('prints the report location in text mode', async () => {
    const output = path.join(tmpDir, 'out.cfsreport');

    const {error, stdout} = await runCommand(
      ['convert', '--input', SAMPLE_TEF, '--output', output],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(stdout).to.include(`Wrote profiling report to ${output}`);
  });

  it('defaults the output to a file next to the input', async () => {
    const input = path.join(tmpDir, 'trace.tef');
    await fs.copyFile(SAMPLE_TEF, input);

    const {error} = await runCommand(['convert', '--input', input], {
      root: '..'
    });

    expect(error).to.be.undefined;
    const expected = path.join(
      tmpDir,
      'trace_runtime_report.cfsreport'
    );
    await fs.access(expected);
  });

  it('fails with a suggestion when the input is missing', async () => {
    const {error} = await runCommand(
      ['convert', '--input', path.join(tmpDir, 'missing.tef')],
      {root: '..'}
    );

    expect(error?.message).to.include('Input file not found');
    expect(error?.message).to.include('Suggestion:');
  });

  it('rejects an unsupported input format', async () => {
    const {error} = await runCommand(
      ['convert', '--input', SAMPLE_TEF, '--input-format', 'ctf'],
      {root: '..'}
    );

    expect(error?.message).to.include(
      'Expected --input-format=ctf to be one of'
    );
  });

  it('detects the input format from an uppercase file extension', async () => {
    const input = path.join(tmpDir, 'TRACE.TEF');
    await fs.copyFile(SAMPLE_TEF, input);

    const {error} = await runCommand(['convert', '--input', input], {
      root: '..'
    });

    expect(error).to.be.undefined;
    await fs.access(
      path.join(tmpDir, 'TRACE_runtime_report.cfsreport')
    );
  });

  it('uses --input-format when the extension is unknown', async () => {
    const input = path.join(tmpDir, 'trace.log');
    await fs.copyFile(SAMPLE_TEF, input);

    const {error} = await runCommand(
      ['convert', '--input', input, '--input-format', 'tef'],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    await fs.access(
      path.join(tmpDir, 'trace_runtime_report.cfsreport')
    );
  });

  it('fails with a suggestion when the format cannot be detected', async () => {
    const input = path.join(tmpDir, 'trace.log');
    await fs.copyFile(SAMPLE_TEF, input);

    const {error} = await runCommand(['convert', '--input', input], {
      root: '..'
    });

    expect(error?.message).to.include(
      'Cannot detect the input format'
    );
    expect(error?.message).to.include('--input-format');
  });

  it('prints an error envelope with --format json when the format cannot be detected', async () => {
    const input = path.join(tmpDir, 'trace.log');
    await fs.copyFile(SAMPLE_TEF, input);

    const {stdout} = await runCommand(
      ['convert', '--input', input, '--format', 'json'],
      {root: '..'}
    );

    const envelope = assertValidEnvelope(stdout) as {
      ok: boolean;
      errors: {code: string}[];
    };
    expect(envelope.ok).to.equal(false);
    expect(envelope.errors[0].code).to.equal('UNKNOWN_INPUT_FORMAT');
  });

  it('converts with --input-format and a matching file extension', async () => {
    const input = path.join(tmpDir, 'trace.tef');
    await fs.copyFile(SAMPLE_TEF, input);

    const {error} = await runCommand(
      ['convert', '--input', input, '--input-format', 'tef'],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    await fs.access(
      path.join(tmpDir, 'trace_runtime_report.cfsreport')
    );
  });

  it('converts a file without an extension when --input-format is set', async () => {
    const input = path.join(tmpDir, 'trace');
    await fs.copyFile(SAMPLE_TEF, input);

    const {error} = await runCommand(
      ['convert', '--input', input, '--input-format', 'tef'],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    await fs.access(
      path.join(tmpDir, 'trace_runtime_report.cfsreport')
    );
  });

  it('fails with a suggestion for a file without an extension', async () => {
    const input = path.join(tmpDir, 'trace');
    await fs.copyFile(SAMPLE_TEF, input);

    const {error} = await runCommand(['convert', '--input', input], {
      root: '..'
    });

    expect(error?.message).to.include(
      'Cannot detect the input format'
    );
    expect(error?.message).to.include('--input-format');
  });

  it('accepts an empty trace and writes an empty report', async () => {
    const input = path.join(tmpDir, 'empty.tef');
    await fs.writeFile(input, '[]');

    const {error} = await runCommand(['convert', '--input', input], {
      root: '..'
    });

    expect(error).to.be.undefined;
    const report = JSON.parse(
      await fs.readFile(
        path.join(tmpDir, 'empty_runtime_report.cfsreport'),
        'utf8'
      )
    );
    expect(report.inference_summary.iterations).to.equal(0);
  });

  describe('invalid file content', () => {
    const INVALID_CONTENTS = {
      'not valid JSON': 'not json {',
      'JSON that is not an array': '{"a": 1}',
      'events without name and ph': '[{"ts": 1}]'
    };

    for (const [description, content] of Object.entries(
      INVALID_CONTENTS
    )) {
      for (const flagArgs of [[], ['--input-format', 'tef']]) {
        const flagLabel = flagArgs.length
          ? 'with --input-format'
          : 'without --input-format';

        it(`fails for ${description} ${flagLabel}`, async () => {
          const input = path.join(tmpDir, 'bad.tef');
          await fs.writeFile(input, content);

          const {error} = await runCommand(
            ['convert', '--input', input, ...flagArgs],
            {root: '..'}
          );

          expect(error?.message).to.include('Invalid TEF file');
          expect(error?.message).to.include('Suggestion:');
          await fs
            .access(path.join(tmpDir, 'bad_runtime_report.cfsreport'))
            .then(
              () => expect.fail('no report should be written'),
              () => undefined
            );
        });
      }
    }

    it('prints an error envelope with --format json', async () => {
      const input = path.join(tmpDir, 'bad.tef');
      await fs.writeFile(input, 'not json {');

      const {stdout} = await runCommand(
        ['convert', '--input', input, '--format', 'json'],
        {root: '..'}
      );

      const envelope = assertValidEnvelope(stdout) as {
        ok: boolean;
        errors: {code: string}[];
      };
      expect(envelope.ok).to.equal(false);
      expect(envelope.errors[0].code).to.equal(
        'INVALID_INPUT_CONTENT'
      );
    });

    it('fails for invalid content with a mismatching extension and --input-format', async () => {
      const input = path.join(tmpDir, 'bad.log');
      await fs.writeFile(input, 'not json {');

      const {error} = await runCommand(
        ['convert', '--input', input, '--input-format', 'tef'],
        {root: '..'}
      );

      expect(error?.message).to.include('Invalid TEF file');
    });
  });

  describe('case-insensitivity', () => {
    for (const extension of ['.TEF', '.TeF', '.tEf']) {
      it(`detects the format from the ${extension} extension`, async () => {
        const input = path.join(tmpDir, `trace${extension}`);
        await fs.copyFile(SAMPLE_TEF, input);

        const {error} = await runCommand(
          ['convert', '--input', input],
          {root: '..'}
        );

        expect(error).to.be.undefined;
        await fs.access(
          path.join(tmpDir, 'trace_runtime_report.cfsreport')
        );
      });
    }

    for (const format of ['TEF', 'Tef', 'tEf']) {
      it(`accepts --input-format ${format}`, async () => {
        const input = path.join(tmpDir, 'trace.log');
        await fs.copyFile(SAMPLE_TEF, input);

        const {error} = await runCommand(
          ['convert', '--input', input, '--input-format', format],
          {root: '..'}
        );

        expect(error).to.be.undefined;
        await fs.access(
          path.join(tmpDir, 'trace_runtime_report.cfsreport')
        );
      });
    }

    it('lets --input-format override a differently cased extension', async () => {
      const input = path.join(tmpDir, 'trace.TEF');
      await fs.copyFile(SAMPLE_TEF, input);

      const {error} = await runCommand(
        ['convert', '--input', input, '--input-format', 'TeF'],
        {root: '..'}
      );

      expect(error).to.be.undefined;
    });

    it('still rejects an unsupported --input-format regardless of case', async () => {
      const {error} = await runCommand(
        ['convert', '--input', SAMPLE_TEF, '--input-format', 'CTF'],
        {root: '..'}
      );

      expect(error?.message).to.include(
        'Expected --input-format=CTF to be one of: tef'
      );
    });

    it('prints an error envelope with a stable code for an unsupported --input-format', async () => {
      const {stdout} = await runCommand(
        [
          'convert',
          '--input',
          SAMPLE_TEF,
          '--input-format',
          'CTF',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const envelope = assertValidEnvelope(stdout) as {
        ok: boolean;
        errors: {code: string}[];
      };
      expect(envelope.ok).to.equal(false);
      expect(envelope.errors[0].code).to.equal(
        'INVALID_INPUT_FORMAT'
      );
    });
  });
});
