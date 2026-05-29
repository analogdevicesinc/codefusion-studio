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
import {homedir} from 'node:os';
import {basename, sep} from 'node:path';

import {CliEnvironmentVariableProvider} from '../../src/providers/cli-environment-variable-provider.js';

/**
 * Feature: CLI Environment Variable Resolution
 *   As a CLI user
 *   I want VS Code predefined variables resolved in task commands
 *   So that tasks using ${workspaceFolderBasename}, ${userHome}, etc. work headlessly
 *
 * Background:
 *   Given VS Code resolves predefined variables natively in the IDE
 *   And the CLI must replicate this behavior for headless execution
 */
describe('CliEnvironmentVariableProvider', () => {
  const workspacePath = '/home/user/my-project';
  let provider: CliEnvironmentVariableProvider;

  beforeEach(() => {
    provider = new CliEnvironmentVariableProvider(workspacePath);
  });

  // Scenario: Resolve ${workspaceFolderBasename}
  //   Given a workspace folder "/home/user/my-project"
  //   When resolving "workspaceFolderBasename"
  //   Then return "my-project"
  describe('workspaceFolderBasename', () => {
    it('resolves to basename of workspace folder', () => {
      expect(provider.resolve('workspaceFolderBasename')).to.equal(
        'my-project'
      );
    });

    it('resolves correctly for nested paths', () => {
      const nested = new CliEnvironmentVariableProvider(
        '/workspace/78000-multi-msdk-hw/m4'
      );
      expect(nested.resolve('workspaceFolderBasename')).to.equal(
        'm4'
      );
    });
  });

  // Scenario: Resolve ${userHome}
  //   When resolving "userHome"
  //   Then return the OS home directory
  describe('userHome', () => {
    it('resolves to os.homedir()', () => {
      expect(provider.resolve('userHome')).to.equal(homedir());
    });
  });

  // Scenario: Resolve ${pathSeparator} and ${/}
  //   When resolving "pathSeparator" or "/"
  //   Then return the OS path separator
  describe('pathSeparator', () => {
    it('resolves pathSeparator to path.sep', () => {
      expect(provider.resolve('pathSeparator')).to.equal(sep);
    });

    it('resolves / shorthand to path.sep', () => {
      expect(provider.resolve('/')).to.equal(sep);
    });
  });

  // Scenario: Unknown variable
  //   When resolving an unrecognized variable name
  //   Then return undefined
  describe('unknown variables', () => {
    it('returns undefined for unknown variable', () => {
      expect(provider.resolve('file')).to.be.undefined;
    });

    it('returns undefined for fileBasename', () => {
      expect(provider.resolve('fileBasename')).to.be.undefined;
    });

    it('returns undefined for lineNumber', () => {
      expect(provider.resolve('lineNumber')).to.be.undefined;
    });
  });

  // Scenario: Multi-project scoping via setWorkspaceFolder
  //   Given a multi-project workspace with m4/ and riscv/ subdirectories
  //   When setWorkspaceFolder is called with the task's cwd
  //   Then workspaceFolderBasename reflects the new folder
  describe('setWorkspaceFolder (multi-project scoping)', () => {
    it('updates workspaceFolderBasename after setWorkspaceFolder', () => {
      expect(provider.resolve('workspaceFolderBasename')).to.equal(
        'my-project'
      );

      provider.setWorkspaceFolder(
        '/workspace/78000-multi-msdk-hw/riscv'
      );

      expect(provider.resolve('workspaceFolderBasename')).to.equal(
        'riscv'
      );
    });

    it('does not affect userHome when workspace changes', () => {
      const before = provider.resolve('userHome');
      provider.setWorkspaceFolder('/other/path');
      expect(provider.resolve('userHome')).to.equal(before);
    });
  });
});
