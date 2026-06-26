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
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {CliConfigResolver} from '../../src/providers/cli-config-resolver.js';
import type {CliConfig} from '../../src/types/cli-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspacePath = path.resolve(
  __dirname,
  '..',
  'fixtures',
  'tasks-workspace'
);

describe('CliConfigResolver', () => {
  const originalInstallDir = process.env.CFS_INSTALL_DIR;

  beforeEach(() => {
    process.env.CFS_INSTALL_DIR = '/mock/cfs-install';
  });

  afterEach(() => {
    if (originalInstallDir === undefined) {
      delete process.env.CFS_INSTALL_DIR;
      return;
    }

    process.env.CFS_INSTALL_DIR = originalInstallDir;
  });

  describe('getRaw()', () => {
    it('returns object values without string coercion', () => {
      const envObject = {
        MY_VAR: 'value1',
        OTHER_VAR: 'value2'
      };

      const resolver = new CliConfigResolver(workspacePath, {
        'cfs.environment': envObject
      } as CliConfig);

      const raw = resolver.getRaw('cfs.environment');

      expect(raw).to.deep.equal(envObject);
      expect(typeof raw).to.equal('object');
    });

    it('returns undefined for missing keys', () => {
      const resolver = new CliConfigResolver(
        workspacePath,
        {} as CliConfig
      );
      const raw = resolver.getRaw('nonexistent.key');

      expect(raw).to.equal(undefined);
    });

    it('returns undefined for null values', () => {
      const resolver = new CliConfigResolver(workspacePath, {
        'cfs.nullSetting': null
      } as CliConfig);
      const raw = resolver.getRaw('cfs.nullSetting');

      expect(raw).to.equal(undefined);
    });

    it('returns string values as-is', () => {
      const resolver = new CliConfigResolver(workspacePath, {
        'cfs.someString': 'hello'
      } as CliConfig);
      const raw = resolver.getRaw('cfs.someString');

      expect(raw).to.equal('hello');
    });

    it('returns array values without coercion', () => {
      const resolver = new CliConfigResolver(workspacePath, {
        'cfs.list': ['a', 'b', 'c']
      } as CliConfig);
      const raw = resolver.getRaw('cfs.list');

      expect(raw).to.deep.equal(['a', 'b', 'c']);
    });
  });
});
