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
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  type RecordingOptions,
  Recording,
  SerialSourceConfig
} from 'cfs-lib';
import sinon from 'sinon';

import {
  type PortCaptureResult,
  portCaptureDeps
} from '../../../dist/commands/port/capture.js';
import {
  type CliErrorEnvelope,
  assertSuccessEnvelopeData,
  assertValidEnvelope
} from '../../utils/assert-json-envelope.js';

/**
 * Test suite for port:capture command.
 *
 * The recording is replaced by a fake so no serial port is needed.
 */
describe('port:capture', () => {
  const originalDeps = {...portCaptureDeps};

  let startOptions: RecordingOptions | undefined;
  let disposed: boolean;
  let converted: string[];

  /**
   * Stub `Recording.start` to return a fake recording.
   * @param params - Fake recording behaviour.
   * @param params.files - Files reported as captured.
   * @param params.bytes - Bytes reported as recorded.
   * @param params.error - Error emitted right after start, if any.
   */
  function fakeRecording(params: {
    files: string[];
    bytes?: number;
    error?: Error;
  }): void {
    sinon.stub(Recording, 'start').callsFake(async (options) => {
      startOptions = options;
      return {
        capturedFiles: params.files,
        bytesRecorded: params.bytes ?? 0,
        onError(listener: (error: Error) => void) {
          if (params.error) {
            const {error} = params;
            setImmediate(() => listener(error));
          }
        },
        async dispose() {
          disposed = true;
        }
      } as unknown as Recording;
    });
  }

  beforeEach(() => {
    startOptions = undefined;
    disposed = false;
    converted = [];
    portCaptureDeps.getConversionEnvironment = async () => ({
      ZEPHYR_BASE: '/zephyr'
    });
    portCaptureDeps.convertCtfToTef = async ({ctfFile}) => {
      converted.push(ctfFile);
      return ctfFile.replace(/\.ctf$/, '.tef');
    };
  });

  afterEach(() => {
    sinon.restore();
    Object.assign(portCaptureDeps, originalDeps);
  });

  it('rejects --convert with --capture-format txt', async () => {
    fakeRecording({files: []});
    const {error} = await runCommand(
      [
        'port:capture',
        '-p',
        '/dev/ttyUSB0',
        '--capture-format',
        'txt',
        '--convert'
      ],
      {root: '..'}
    );
    expect(error?.message).to.contain(
      '--convert can only be used with --capture-format ctf'
    );
    expect(startOptions).to.be.undefined;
  });

  it('captures until the timeout and lists the captured files', async () => {
    fakeRecording({files: ['/out/tracefile_1.txt'], bytes: 42});
    const {stdout, error} = await runCommand(
      [
        'port:capture',
        '-p',
        '/dev/ttyUSB0',
        '--capture-dir',
        '/out',
        '--capture-format',
        'txt',
        '--timeout',
        '1'
      ],
      {root: '..'}
    );
    expect(error).to.be.undefined;
    expect(startOptions?.format).to.equal('txt');
    expect(startOptions?.outputFolder).to.equal(path.resolve('/out'));
    expect(disposed).to.be.true;
    expect(stdout).to.contain('Capture timeout of 1 second reached.');
    expect(stdout).to.contain('Captured 42 bytes into:');
    expect(stdout).to.contain('/out/tracefile_1.txt');
  });

  it('warns when no CTF start tag was received', async () => {
    fakeRecording({files: []});
    const {stderr, error} = await runCommand(
      ['port:capture', '-p', '/dev/ttyUSB0', '--timeout', '1'],
      {root: '..'}
    );
    expect(error).to.be.undefined;
    expect(stderr).to.contain('No CTF trace start tag was received');
  });

  it('rejects --convert without a project', async () => {
    fakeRecording({files: []});
    const {error} = await runCommand(
      ['port:capture', '-p', '/dev/ttyUSB0', '--convert'],
      {root: '..'}
    );
    expect(error?.message).to.contain('--convert requires a project');
    expect(startOptions).to.be.undefined;
  });

  it('converts captured CTF files with --convert', async () => {
    const workspacePath = mkdtempSync(
      path.join(os.tmpdir(), 'port-capture-')
    );
    mkdirSync(path.join(workspacePath, '.cfs'));
    writeFileSync(
      path.join(workspacePath, '.cfs', '.cfsworkspace'),
      '{}'
    );
    portCaptureDeps.resolveSerialSourceConfig = (port) =>
      new SerialSourceConfig(port, 115200, {});
    let conversionProjectPath: string | undefined;
    portCaptureDeps.getConversionEnvironment = async (
      projectPath
    ) => {
      conversionProjectPath = projectPath;
      return {ZEPHYR_BASE: '/zephyr'};
    };
    fakeRecording({
      files: ['/out/tracefile_1.ctf', '/out/tracefile_1_1.ctf'],
      bytes: 10
    });
    const {stdout, error} = await runCommand(
      [
        'port:capture',
        '-p',
        '/dev/ttyUSB0',
        '--timeout',
        '1',
        '--workspace',
        workspacePath,
        '--project',
        'm4',
        '--convert'
      ],
      {root: '..'}
    );
    rmSync(workspacePath, {recursive: true, force: true});
    expect(error).to.be.undefined;
    expect(conversionProjectPath).to.equal(
      path.join(workspacePath, 'm4')
    );
    expect(converted).to.deep.equal([
      '/out/tracefile_1.ctf',
      '/out/tracefile_1_1.ctf'
    ]);
    expect(stdout).to.contain(
      'Converted /out/tracefile_1.ctf to /out/tracefile_1.tef.'
    );
  });

  it('stops and reports a recording error', async () => {
    fakeRecording({
      files: [],
      error: new Error('Device disconnected during recording.')
    });
    const {error} = await runCommand(
      ['port:capture', '-p', '/dev/ttyUSB0'],
      {root: '..'}
    );
    expect(disposed).to.be.true;
    expect(error?.message).to.contain(
      'Capture error: Device disconnected during recording.'
    );
  });

  it('reports a failure to open the port', async () => {
    sinon
      .stub(Recording, 'start')
      .rejects(new Error('No such file or directory'));
    const {error} = await runCommand(
      ['port:capture', '-p', '/dev/ttyDoesNotExist'],
      {root: '..'}
    );
    expect(error?.message).to.contain(
      'Failed to start capture on /dev/ttyDoesNotExist: No such file or directory'
    );
  });

  it('uses the workspace serial settings of the project', async () => {
    fakeRecording({files: ['/out/tracefile_1.txt'], bytes: 1});
    let sourceOptions: unknown;
    portCaptureDeps.resolveSerialSourceConfig = (port, options) => {
      sourceOptions = options;
      return new SerialSourceConfig(port, 9600, {parity: 'even'});
    };

    const {error} = await runCommand(
      [
        'port:capture',
        '-p',
        '/dev/ttyUSB0',
        '--capture-format',
        'txt',
        '--timeout',
        '1',
        '--workspace',
        '/ws',
        '--project',
        'm4'
      ],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(sourceOptions).to.deep.equal({
      workspacePath: path.resolve('/ws'),
      project: 'm4'
    });
    expect(startOptions?.source).to.include({baudRate: 9600});
  });
  describe('JSON envelope', () => {
    it('returns the captured files and warnings in JSON mode', async () => {
      fakeRecording({files: []});
      const {stdout} = await runCommand(
        [
          'port:capture',
          '-p',
          '/dev/ttyUSB0',
          '--capture-dir',
          '/out',
          '--timeout',
          '1',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const envelope = assertValidEnvelope(stdout);
      expect(envelope.ok).to.equal(true);
      if (envelope.ok) {
        expect(envelope.warnings[0].message).to.contain(
          'No CTF trace start tag was received'
        );
      }

      const data = assertSuccessEnvelopeData<PortCaptureResult>(
        stdout,
        'port capture'
      );
      expect(data).to.deep.equal({
        capturedFiles: [],
        convertedFiles: []
      });
    });

    it('returns the converted files with --convert in JSON mode', async () => {
      const workspacePath = mkdtempSync(
        path.join(os.tmpdir(), 'port-capture-')
      );
      mkdirSync(path.join(workspacePath, '.cfs'));
      writeFileSync(
        path.join(workspacePath, '.cfs', '.cfsworkspace'),
        '{}'
      );
      portCaptureDeps.resolveSerialSourceConfig = (port) =>
        new SerialSourceConfig(port, 115200, {});
      fakeRecording({files: ['/out/tracefile_1.ctf'], bytes: 10});
      const {stdout} = await runCommand(
        [
          'port:capture',
          '-p',
          '/dev/ttyUSB0',
          '--timeout',
          '1',
          '--workspace',
          workspacePath,
          '--project',
          'm4',
          '--convert',
          '--format',
          'json'
        ],
        {root: '..'}
      );
      rmSync(workspacePath, {recursive: true, force: true});

      const data = assertSuccessEnvelopeData<PortCaptureResult>(
        stdout,
        'port capture'
      );
      expect(data).to.deep.equal({
        capturedFiles: ['/out/tracefile_1.ctf'],
        convertedFiles: [
          {
            ctfFile: '/out/tracefile_1.ctf',
            tefFile: '/out/tracefile_1.tef'
          }
        ]
      });
    });

    it('prints an error envelope when the port cannot be opened', async () => {
      sinon
        .stub(Recording, 'start')
        .rejects(new Error('No such file or directory'));
      const {stdout} = await runCommand(
        [
          'port:capture',
          '-p',
          '/dev/ttyDoesNotExist',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const envelope = assertValidEnvelope(
        stdout
      ) as CliErrorEnvelope;
      expect(envelope.ok).to.equal(false);
      expect(envelope.errors).to.have.length(1);
      expect(envelope.errors[0].code).to.equal(
        'CAPTURE_START_FAILED'
      );
      expect(envelope.errors[0].message).to.contain(
        'Failed to start capture on /dev/ttyDoesNotExist'
      );
    });

    it('prints an error envelope for a recording error', async () => {
      fakeRecording({
        files: [],
        error: new Error('Device disconnected during recording.')
      });
      const {stdout} = await runCommand(
        ['port:capture', '-p', '/dev/ttyUSB0', '--format', 'json'],
        {root: '..'}
      );

      const envelope = assertValidEnvelope(
        stdout
      ) as CliErrorEnvelope;
      expect(envelope.ok).to.equal(false);
      expect(envelope.errors[0].code).to.equal('CAPTURE_FAILED');
    });
  });
});
