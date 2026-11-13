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
import Sinon from 'sinon';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Import from dist/ so we share the same module instance that
// runCommand() uses (oclif always loads commands from dist/).
import {
  initTelemetrySession,
  clearTelemetrySession
} from '../../../dist/utils/telemetry-session.js';

function createStubManager() {
  return {
    logAction: Sinon.stub().resolves(undefined)
  };
}

const validConfig = JSON.stringify({
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
});

const invalidConfig = JSON.stringify({
  SchemaVersion: '2.1.0',
  Projects: [
    {
      Partitions: [{Access: 'READWRITE'}]
    }
  ]
});

describe('validate config telemetry', () => {
  let manager: ReturnType<typeof createStubManager>;
  let savedExitCode: number | undefined;
  let workspaceDir: string;

  beforeEach(() => {
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
    manager = createStubManager();
    initTelemetrySession(manager as never, performance.now());
    workspaceDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cfs-telemetry-validate-')
    );
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
    clearTelemetrySession();
    fs.rmSync(workspaceDir, {recursive: true, force: true});
  });

  function writeConfig(contents: string) {
    const cfsDir = path.join(workspaceDir, '.cfs');
    fs.mkdirSync(cfsDir, {recursive: true});
    fs.writeFileSync(path.join(cfsDir, 'test.cfsconfig'), contents);
  }

  it('reports isValid true with diagnostic count for a valid config', async () => {
    writeConfig(validConfig);

    await runCommand(
      ['validate:config', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(manager.logAction.calledOnce).to.equal(true);

    const metadata = manager.logAction.firstCall.args[1];
    expect(metadata.commandId).to.equal('validate:config');
    expect(metadata.isValid).to.equal(true);
    expect(metadata.targetCount).to.equal(1);
    expect(metadata.diagnosticCount).to.equal(1);
  });

  it('reports isValid false and non-zero diagnostics for an invalid config', async () => {
    writeConfig(invalidConfig);

    await runCommand(
      ['validate:config', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(manager.logAction.calledOnce).to.equal(true);

    const metadata = manager.logAction.firstCall.args[1];
    expect(metadata.commandId).to.equal('validate:config');
    expect(metadata.isValid).to.equal(false);
    expect(metadata.targetCount).to.equal(1);
    expect(metadata.diagnosticCount).to.be.a('number');
    expect(metadata.diagnosticCount).to.be.greaterThan(0);
  });
});
