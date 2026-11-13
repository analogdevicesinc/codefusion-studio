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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Test suite for the validate config command. Checks:
 * - Reports schema violations against the CFSConfig schema (-w and -i)
 * - Prints the offending value and allowed values only with --verbose
 * - Handles a standalone .cfsconfig / .cfsworkspace file via --input
 * - Reports .cfsworkspace checking as not yet implemented
 * - Rejects unsupported file types and --workspace + --input together
 * - Fails when the .cfs directory is missing
 * - Fails when no checkable file is present
 * - Fails when the .cfsconfig file is not valid JSON
 */
describe('validate config', () => {
  let workspaceDir: string;

  beforeEach(() => {
    // Commands signal failure in JSON mode by setting `process.exitCode`
    // (a global that the oclif test harness does not manage), so reset it
    // around every test to keep the failure status isolated per test.
    process.exitCode = 0;
    workspaceDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cfs-validate-config-')
    );
  });

  afterEach(() => {
    process.exitCode = 0;
    fs.rmSync(workspaceDir, {recursive: true, force: true});
  });

  function writeConfig(contents: string) {
    const cfsDir = path.join(workspaceDir, '.cfs');
    fs.mkdirSync(cfsDir, {recursive: true});
    fs.writeFileSync(
      path.join(cfsDir, 'max78000.cfsconfig'),
      contents
    );
  }

  // A config containing an invalid `Access` enum value. The Access
  // property only permits "R" or "R/W", so this reliably triggers an
  // enum violation. A valid SchemaVersion is included so the document
  // gets past version resolution and reaches schema validation.
  const enumViolationConfig = JSON.stringify({
    SchemaVersion: '2.1.0',
    Projects: [
      {
        Partitions: [{Access: 'READWRITE'}]
      }
    ]
  });

  // A minimal document that satisfies every required top-level property and
  // conforms to the schema, so a check of it must pass.
  const validConfigDocument = {
    Copyright: '(c) 2026 Analog Devices, Inc.',
    SchemaVersion: '2.1.0',
    DataModelVersion: '1.0.0',
    Soc: 'MAX78000',
    Package: 'WLP',
    BoardName: 'EvKit',
    Timestamp: '2026-01-01T00:00:00Z',
    Projects: [
      {
        CoreId: 'CM4',
        ProjectId: 'm4',
        PluginId: 'p',
        PluginVersion: '1.0.0',
        FirmwarePlatform: 'msdk',
        ExternallyManaged: false,
        Partitions: [],
        Peripherals: [],
        PlatformConfig: {}
      }
    ],
    Pins: [],
    ClockNodes: [],
    ClockFrequencies: {}
  };
  const validConfig = JSON.stringify(validConfigDocument);

  it('reports a valid .cfsconfig as valid and exits without error', async () => {
    writeConfig(validConfig);

    const {error, stdout} = await runCommand(
      ['validate:config', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain('is valid');
    expect(stdout).to.contain('max78000.cfsconfig');
  });

  for (const version of ['2.1.0', '2.2.0']) {
    it(`accepts a ${version} workspace config with boolean EnableCoreDump`, async () => {
      writeConfig(
        JSON.stringify({
          ...validConfigDocument,
          SchemaVersion: version,
          Projects: validConfigDocument.Projects.map((project) => ({
            ...project,
            FirmwarePlatform: 'zephyr',
            PlatformConfig: {
              ProjectName: 'zephyr-project',
              EnableCoreDump: true
            }
          }))
        })
      );

      const {error, stdout} = await runCommand(
        ['validate:config', '--workspace', workspaceDir],
        {root: '..'}
      );

      expect(error).to.be.undefined;
      expect(stdout).to.contain('is valid');
      expect(process.exitCode).to.equal(0);
    });

    const withoutFirmwarePlatform = JSON.stringify({
      ...validConfigDocument,
      SchemaVersion: version,
      Projects: validConfigDocument.Projects.map(
        ({FirmwarePlatform: _FirmwarePlatform, ...project}) => project
      )
    });

    it(`accepts a ${version} workspace config without FirmwarePlatform`, async () => {
      writeConfig(withoutFirmwarePlatform);

      const {error, stdout} = await runCommand(
        ['validate:config', '--workspace', workspaceDir],
        {root: '..'}
      );

      expect(error).to.be.undefined;
      expect(stdout).to.contain('is valid');
      expect(process.exitCode).to.equal(0);
    });
  }

  it('reports schema violations without value detail by default', async () => {
    writeConfig(enumViolationConfig);

    const {error} = await runCommand(
      ['validate:config', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.contain('Access must be equal to');
    expect(error?.message).to.contain(
      '/Projects/0/Partitions/0/Access'
    );
    // The offending file is named so the source of the error is clear.
    expect(error?.message).to.contain('max78000.cfsconfig');
    // Without --verbose, the offending/allowed values are not included.
    expect(error?.message).to.not.contain('found:');
    expect(error?.message).to.not.contain('allowed values:');
  });

  it('prints the offending value and allowed values with --verbose', async () => {
    writeConfig(enumViolationConfig);

    const {error, stdout} = await runCommand(
      ['validate:config', '--workspace', workspaceDir, '--verbose'],
      {root: '..'}
    );

    // Verbose progress is logged to stdout before the checks fail.
    expect(stdout).to.contain('Checking workspace at');
    expect(stdout).to.contain('Found configuration file');
    // The offending and allowed values are folded into the error message.
    expect(error?.message).to.contain('found: "READWRITE"');
    expect(error?.message).to.contain('allowed values:');
    expect(error?.message).to.contain('"R", "R/W"');
  });

  it('fails when the .cfs directory is missing', async () => {
    const {error} = await runCommand(
      ['validate:config', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.contain("No '.cfs' directory");
  });

  it('fails when no .cfsconfig file is present', async () => {
    fs.mkdirSync(path.join(workspaceDir, '.cfs'), {recursive: true});

    const {error} = await runCommand(
      ['validate:config', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.contain("No '.cfsconfig' file found");
  });

  it('fails when the .cfsconfig file is not valid JSON', async () => {
    writeConfig('{not valid json');

    const {error} = await runCommand(
      ['validate:config', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.contain('not a valid JSON file');
  });

  it('checks a standalone .cfsconfig file via --input', async () => {
    const file = path.join(workspaceDir, 'standalone.cfsconfig');
    fs.writeFileSync(file, enumViolationConfig);

    const {error} = await runCommand(
      ['validate:config', '--input', file],
      {
        root: '..'
      }
    );

    expect(error?.message).to.contain('Access must be equal to');
    expect(error?.message).to.contain(
      '/Projects/0/Partitions/0/Access'
    );
  });

  it('reports a .cfsworkspace file as valid without checking it', async () => {
    const file = path.join(workspaceDir, 'standalone.cfsworkspace');
    fs.writeFileSync(file, '{}');

    const {stdout} = await runCommand(
      ['validate:config', '--input', file],
      {
        root: '..'
      }
    );

    expect(stdout).to.contain('is valid');
    expect(stdout).to.contain('not yet implemented');
  });

  it('rejects an unsupported --input file type', async () => {
    const file = path.join(workspaceDir, 'notes.txt');
    fs.writeFileSync(file, '{}');

    const {error} = await runCommand(
      ['validate:config', '--input', file],
      {
        root: '..'
      }
    );

    expect(error?.message).to.contain('Unsupported file type');
  });

  it('checks both files when the workspace has a .cfsworkspace', async () => {
    writeConfig(enumViolationConfig);
    fs.writeFileSync(
      path.join(workspaceDir, '.cfs', '.cfsworkspace'),
      '{}'
    );

    const {error} = await runCommand(
      ['validate:config', '--workspace', workspaceDir],
      {root: '..'}
    );

    // The invalid .cfsconfig is reported via the error, tagged with its path.
    expect(error?.message).to.contain('max78000.cfsconfig');
    // The .cfsworkspace is not checked, so no advisory is printed for it.
  });

  it('rejects using --workspace and --input together', async () => {
    const file = path.join(workspaceDir, 'standalone.cfsconfig');
    fs.writeFileSync(file, '{}');

    const {error} = await runCommand(
      [
        'validate:config',
        '--workspace',
        workspaceDir,
        '--input',
        file
      ],
      {root: '..'}
    );

    expect(error?.message).to.contain('cannot also be provided');
  });

  it('returns a valid result as JSON with --format json', async () => {
    const file = path.join(workspaceDir, 'valid.cfsconfig');
    fs.writeFileSync(file, validConfig);

    const {result, stdout, error} = await runCommand(
      ['validate:config', '--input', file, '--format', 'json'],
      {root: '..'}
    );

    // JSON mode returns the structured result instead of text reporting.
    expect(error, 'JSON mode should not throw').to.be.undefined;

    const parsed = JSON.parse(stdout);
    expect(parsed.valid).to.be.true;
    expect(parsed.results).to.be.an('array').with.lengthOf(1);
    expect(parsed.results[0].valid).to.be.true;
    expect((result as {valid: boolean} | undefined)?.valid).to.be
      .true;
  });

  it('returns an invalid result as JSON and sets a failure exit code with --format json', async () => {
    const file = path.join(workspaceDir, 'invalid.cfsconfig');
    fs.writeFileSync(file, enumViolationConfig);

    const {result, stdout, error} = await runCommand(
      ['validate:config', '--input', file, '--format', 'json'],
      {root: '..'}
    );

    // JSON mode suppresses oclif's error reporting; failure is signalled via
    // the exit code and the returned result instead. The suite resets
    // `process.exitCode` around every test, so it reflects only this command.
    expect(error, 'JSON mode should not throw').to.be.undefined;
    expect(process.exitCode).to.equal(1);

    const parsed = JSON.parse(stdout);
    expect(parsed.valid).to.be.false;
    expect(parsed.results[0].valid).to.be.false;

    const hasSchemaError = parsed.results[0].diagnostics.some(
      (diagnostic: {severity: string; ruleId: string}) =>
        diagnostic.severity === 'critical' &&
        diagnostic.ruleId === 'schema'
    );
    expect(hasSchemaError, 'expected a critical schema diagnostic').to
      .be.true;
    expect((result as {valid: boolean} | undefined)?.valid).to.be
      .false;
  });
});
