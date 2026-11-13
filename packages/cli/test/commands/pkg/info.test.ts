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

import {pkgInfoDeps} from '../../../dist/commands/pkg/info.js';
import type {CfsPackage} from 'cfs-package-manager';

import {assertValidEnvelope} from '../../utils/assert-json-envelope.js';

describe('pkg:info', () => {
  const originalGetPackageManager = pkgInfoDeps.getPackageManager;

  afterEach(() => {
    pkgInfoDeps.getPackageManager = originalGetPackageManager;
  });

  const mockPackageInfo: CfsPackage = {
    reference: {name: 'test_pkg', version: '1.0.0'},
    description: 'A test package',
    license: 'MIT',
    cfsVersion: '2.0.0',
    soc: ['test_soc_a', 'test_soc_b']
  };

  describe('success', () => {
    it('prints package information as human-readable text', async () => {
      pkgInfoDeps.getPackageManager = (async () => ({
        getPackageInfo: async () => mockPackageInfo
      })) as unknown as typeof pkgInfoDeps.getPackageManager;

      const {stdout} = await runCommand(
        ['pkg:info', 'test_pkg/1.0.0'],
        {root: '..'}
      );

      expect(stdout).to.contain('Package Information');
      expect(stdout).to.contain('Name:        test_pkg');
      expect(stdout).to.contain('Version:     1.0.0');
      expect(stdout).to.contain('Description: A test package');
      expect(stdout).to.contain('License:     MIT');
      expect(stdout).to.contain('CFS Version: 2.0.0');
      expect(stdout).to.contain('Supported SoCs:');
      expect(stdout).to.contain('- test_soc_a');
      expect(stdout).to.contain('- test_soc_b');
    });

    it('returns the package info as the JSON envelope data payload', async () => {
      pkgInfoDeps.getPackageManager = (async () => ({
        getPackageInfo: async () => mockPackageInfo
      })) as unknown as typeof pkgInfoDeps.getPackageManager;

      const {stdout} = await runCommand(
        ['pkg:info', 'test_pkg/1.0.0', '--format', 'json'],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as {
        ok: boolean;
        command: string;
        data: CfsPackage;
      };
      expect(parsed.ok).to.be.true;
      expect(parsed.command).to.equal('pkg info');
      expect(parsed.data).to.deep.equal(mockPackageInfo);
      // Human-readable narration is suppressed in JSON mode.
      expect(stdout).not.to.contain('Package Information');
    });
  });

  describe('error handling', () => {
    it('reports package manager initialization failures', async () => {
      pkgInfoDeps.getPackageManager = async () => {
        throw new Error('Package manager failed to initialize');
      };

      const {error} = await runCommand(
        ['pkg:info', 'test_pkg/1.0.0'],
        {root: '..'}
      );

      expect(error?.message).to.contain(
        'Package manager failed to initialize'
      );
    });

    it('reports package manager initialization failures as a JSON error envelope', async () => {
      pkgInfoDeps.getPackageManager = async () => {
        throw new Error('Package manager failed to initialize');
      };

      const {stdout} = await runCommand(
        ['pkg:info', 'test_pkg/1.0.0', '--format', 'json'],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as {
        ok: boolean;
        command: string;
        errors: {code: string; message: string}[];
      };
      expect(parsed.ok).to.be.false;
      expect(parsed.command).to.equal('pkg info');
      expect(parsed.errors[0]?.message).to.contain(
        'Package manager failed to initialize'
      );
    });

    for (const reference of ['justAName', 'bad*ref/1.0.0']) {
      it(`reports the malformed reference "${reference}" with a fixed JSON error code`, async () => {
        pkgInfoDeps.getPackageManager = (async () => ({
          getPackageInfo: async () => mockPackageInfo
        })) as unknown as typeof pkgInfoDeps.getPackageManager;

        const {stdout} = await runCommand(
          ['pkg:info', reference, '--format', 'json'],
          {root: '..'}
        );

        const parsed = assertValidEnvelope(stdout) as {
          ok: boolean;
          errors: {code: string; message: string}[];
        };
        expect(parsed.ok).to.be.false;
        expect(parsed.errors[0]?.code).to.equal(
          'INVALID_PACKAGE_REFERENCE'
        );
      });
    }
  });
});
