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

import {pkgUninstallDeps} from '../../../dist/commands/pkg/uninstall.js';
import {assertSuccessEnvelopeData} from '../../utils/assert-json-envelope.js';

describe('pkg uninstall', () => {
  const originalGetPackageManager =
    pkgUninstallDeps.getPackageManager;

  afterEach(() => {
    pkgUninstallDeps.getPackageManager = originalGetPackageManager;
  });

  it('uninstalls the named package', async () => {
    let uninstalledName: string | undefined;
    pkgUninstallDeps.getPackageManager = (async () => ({
      uninstall: async (name: string) => {
        uninstalledName = name;
      }
    })) as unknown as typeof pkgUninstallDeps.getPackageManager;

    const {stdout} = await runCommand(['pkg', 'uninstall', 'pkg-a'], {
      root: '..'
    });

    expect(uninstalledName).to.equal('pkg-a');
    expect(stdout).to.contain('Package: "pkg-a" was uninstalled.');
  });

  it('rejects a full package reference instead of a name', async () => {
    pkgUninstallDeps.getPackageManager = (async () => ({
      uninstall: async () => {}
    })) as unknown as typeof pkgUninstallDeps.getPackageManager;

    const {error} = await runCommand(
      ['pkg', 'uninstall', 'pkg-a/1.0.0'],
      {root: '..'}
    );

    expect(error?.message).to.contain(
      'Expecting a package name, but a package reference was provided.'
    );
  });

  describe('JSON envelope', () => {
    it('returns an uninstalled:true envelope in JSON mode', async () => {
      pkgUninstallDeps.getPackageManager = (async () => ({
        uninstall: async () => {}
      })) as unknown as typeof pkgUninstallDeps.getPackageManager;

      const {stdout} = await runCommand(
        ['pkg', 'uninstall', 'pkg-a', '--format', 'json'],
        {root: '..'}
      );

      const data = assertSuccessEnvelopeData<{
        uninstalled: boolean;
        name: string;
      }>(stdout, 'pkg uninstall');
      expect(data).to.deep.equal({uninstalled: true, name: 'pkg-a'});
    });
  });
});
