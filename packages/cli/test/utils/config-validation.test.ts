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

import type {Config} from '@oclif/core';

import {CfsConfigError} from 'cfs-lib';
import {expect} from 'chai';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {validateCfsConfigFile} from '../../src/utils/config-validation.js';
import {CFS_DATA_MODELS_PATH} from '../constants.js';

describe('validateCfsConfigFile', () => {
  let workingDir: string;

  beforeEach(() => {
    workingDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cfs-config-validation-')
    );
  });

  afterEach(() => {
    fs.rmSync(workingDir, {recursive: true, force: true});
  });

  // The oclif config is only consumed when resolving the data model, which is
  // not reached by this test, so a stub is sufficient.
  const cliConfig = {} as Config;

  function writeConfig(contents: string): string {
    const filePath = path.join(workingDir, 'test.cfsconfig');
    fs.writeFileSync(filePath, contents);

    return filePath;
  }

  it('propagates a CfsConfigError for a schema-invalid file', async () => {
    // Missing every required top-level property but declares a version.
    const filePath = writeConfig(
      JSON.stringify({SchemaVersion: '2.1.0'})
    );

    let thrown: unknown;
    try {
      await validateCfsConfigFile(filePath, cliConfig);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).to.be.instanceOf(CfsConfigError);
    expect((thrown as CfsConfigError).code).to.equal(
      'SCHEMA_INVALID'
    );
  });

  // TEST690/PLP is a real fixture data model (test-fixtures/cfs-data-model),
  // with an SPI0.RECEIVE_FIFO_THRESHOLD control bounded 0-30 and no Condition,
  // so a persisted value of "999" reliably produces a model-backed diagnostic.
  function writeModelBackedConfig(
    receiveFifoThreshold: string
  ): string {
    return writeConfig(
      JSON.stringify({
        SchemaVersion: '2.1.0',
        Copyright: '(c) 2026 Analog Devices, Inc.',
        DataModelVersion: '^1.1.0',
        Soc: 'TEST690',
        Package: 'PLP',
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
            Peripherals: [
              {
                Name: 'SPI0',
                Signals: [],
                Config: {
                  RECEIVE_FIFO_THRESHOLD: receiveFifoThreshold
                }
              }
            ],
            PlatformConfig: {}
          }
        ],
        Pins: [],
        ClockNodes: [],
        ClockFrequencies: {}
      })
    );
  }

  it('reports a model-backed diagnostic for a persisted control value that violates the data model', async () => {
    const filePath = writeModelBackedConfig('999');

    const {diagnostics} = await validateCfsConfigFile(
      filePath,
      cliConfig,
      [CFS_DATA_MODELS_PATH]
    );

    const controlDiagnostic = diagnostics.find(
      (diagnostic) => diagnostic.ruleId === 'control-invalid-value'
    );

    expect(
      controlDiagnostic,
      'expected a control-invalid-value diagnostic'
    ).to.exist;
    expect(controlDiagnostic?.instancePath).to.equal(
      '/Projects/0/Peripherals/0/Config/RECEIVE_FIFO_THRESHOLD'
    );
  });

  it('adds a data-model-unavailable warning when the data model cannot be resolved', async () => {
    const filePath = writeConfig(
      JSON.stringify({
        SchemaVersion: '2.1.0',
        Copyright: '(c) 2026 Analog Devices, Inc.',
        DataModelVersion: '1.0.0',
        Soc: 'NONEXISTENT_SOC',
        Package: 'NONEXISTENT_PACKAGE',
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
      })
    );

    const {diagnostics} = await validateCfsConfigFile(
      filePath,
      cliConfig,
      [CFS_DATA_MODELS_PATH]
    );

    const warning = diagnostics.find(
      (diagnostic) => diagnostic.ruleId === 'data-model-unavailable'
    );

    expect(warning, 'expected a data-model-unavailable warning').to
      .exist;
    expect(warning?.severity).to.equal('warning');
  });
});
