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

import {pkgDeleteDeps} from '../../../dist/commands/pkg/delete.js';
import {assertSuccessEnvelopeData} from '../../utils/assert-json-envelope.js';

describe('pkg delete', () => {
  const originalGetPackageManager = pkgDeleteDeps.getPackageManager;

  afterEach(() => {
    pkgDeleteDeps.getPackageManager = originalGetPackageManager;
  });

  it('lists the deleted packages when a match is found', async () => {
    pkgDeleteDeps.getPackageManager = (async () => ({
      delete: async () => [{name: 'pkg-a', version: '1.0.0'}]
    })) as unknown as typeof pkgDeleteDeps.getPackageManager;

    const {stdout} = await runCommand(['pkg', 'delete', 'pkg-a/*'], {
      root: '..'
    });

    expect(stdout).to.contain('Successfully deleted 1 package(s)');
    expect(stdout).to.contain('pkg-a/1.0.0');
  });

  it('reports no packages were deleted when the pattern matches nothing', async () => {
    pkgDeleteDeps.getPackageManager = (async () => ({
      delete: async () => []
    })) as unknown as typeof pkgDeleteDeps.getPackageManager;

    const {stdout} = await runCommand(
      ['pkg', 'delete', 'no-match/*'],
      {
        root: '..'
      }
    );

    expect(stdout).to.contain('No packages were deleted.');
  });

  describe('JSON envelope', () => {
    it('returns the deleted packages as data in JSON mode', async () => {
      pkgDeleteDeps.getPackageManager = (async () => ({
        delete: async () => [{name: 'pkg-a', version: '1.0.0'}]
      })) as unknown as typeof pkgDeleteDeps.getPackageManager;

      const {stdout} = await runCommand(
        ['pkg', 'delete', 'pkg-a/*', '--format', 'json'],
        {root: '..'}
      );

      const data = assertSuccessEnvelopeData<{
        deleted: {name: string; version: string}[];
      }>(stdout, 'pkg delete');
      expect(data).to.deep.equal({
        deleted: [{name: 'pkg-a', version: '1.0.0'}]
      });
    });

    it('returns an empty deleted list in JSON mode when nothing matches', async () => {
      pkgDeleteDeps.getPackageManager = (async () => ({
        delete: async () => []
      })) as unknown as typeof pkgDeleteDeps.getPackageManager;

      const {stdout} = await runCommand(
        ['pkg', 'delete', 'no-match/*', '--format', 'json'],
        {root: '..'}
      );

      const data = assertSuccessEnvelopeData<{
        deleted: {name: string; version: string}[];
      }>(stdout, 'pkg delete');
      expect(data).to.deep.equal({deleted: []});
    });
  });
});
