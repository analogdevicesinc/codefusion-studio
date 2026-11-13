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

import {catalogUpdateDeps} from '../../../dist/commands/catalog/update.js';
import {SocCatalog} from 'cfs-lib';

import {assertValidEnvelope} from '../../utils/assert-json-envelope.js';

describe('catalog:update', () => {
  describe('help', () => {
    // Verify that the help text does not require authentication.
    it('displays the command description', async () => {
      const {stdout} = await runCommand(['help', 'catalog:update'], {
        root: '..'
      });
      expect(stdout).to.contain('Updates the catalog');
      expect(stdout).not.to.contain('myAnalog');
    });
  });

  describe('run', () => {
    // Using a mocked getSocCatalog function to test the behaviour of the command without needing a network connection or myAnalog account.
    // The first test verifies that a success message is printed when the update completes successfully
    // The second test verifies that errors from getSocCatalog are properly reported to the user.
    const originalGetSocCatalog = catalogUpdateDeps.getSocCatalog;

    afterEach(() => {
      catalogUpdateDeps.getSocCatalog = originalGetSocCatalog;
    });

    it('prints a success message when catalog update completes', async () => {
      catalogUpdateDeps.getSocCatalog = async (
        _config,
        force,
        warn
      ) => {
        // Verify that the forceOnline parameter is true, which indicates that the command is attempting to fetch the
        // latest catalog from the online source.
        expect(force).to.equal(true);
        expect(warn).to.be.a('function');

        // Create an empty soc catalog that we can return. It isn't used, so can be empty.
        const mockCatalog = {} as SocCatalog;
        return mockCatalog;
      };
      const {stdout} = await runCommand(['catalog:update'], {
        root: '..'
      });
      expect(stdout).to.contain('Catalog updated successfully');
    });

    it('prints the warning supplied for an anonymous catalog update', async () => {
      catalogUpdateDeps.getSocCatalog = async (
        _config,
        _force,
        warn
      ) => {
        warn?.(
          'Catalog updated without a myAnalog login. Restricted SoCs may not be included.'
        );
        return {} as SocCatalog;
      };

      const {stderr} = await runCommand(['catalog:update'], {
        root: '..'
      });
      expect(stderr).to.contain(
        'Catalog updated without a myAnalog login'
      );
    });

    it('Reports getSocCatalog errors', async () => {
      catalogUpdateDeps.getSocCatalog = async () => {
        throw new Error('Network failure');
      };
      const {error, stdout} = await runCommand(['catalog:update'], {
        root: '..'
      });
      expect(error?.message).to.match(
        /Failed to update catalog. Network failure/
      );
      expect(stdout).not.to.contain('Catalog updated successfully');
    });

    it('reports getSocCatalog errors with a stable code in the JSON envelope', async () => {
      catalogUpdateDeps.getSocCatalog = async () => {
        throw new Error('Network failure');
      };
      const {stdout} = await runCommand(
        ['catalog:update', '--format', 'json'],
        {root: '..'}
      );
      const parsed = assertValidEnvelope(stdout) as {
        ok: boolean;
        errors: {code: string; message: string}[];
      };
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0]?.code).to.equal(
        'CATALOG_UPDATE_FAILED'
      );
    });

    it('returns {updated: true} as the JSON envelope data payload', async () => {
      catalogUpdateDeps.getSocCatalog = async () => {
        return {} as SocCatalog;
      };
      const {stdout} = await runCommand(
        ['catalog:update', '--format', 'json'],
        {root: '..'}
      );
      const parsed = assertValidEnvelope(stdout) as {
        ok: boolean;
        command: string;
        data: {updated: boolean};
      };
      expect(parsed.ok).to.be.true;
      expect(parsed.command).to.equal('catalog update');
      expect(parsed.data).to.deep.equal({updated: true});
    });

    it('routes the anonymous-update warning into the JSON envelope warnings[]', async () => {
      catalogUpdateDeps.getSocCatalog = async (
        _config,
        _force,
        warn
      ) => {
        warn?.(
          'Catalog updated without a myAnalog login. Restricted SoCs may not be included.'
        );
        return {} as SocCatalog;
      };

      const {stdout, stderr} = await runCommand(
        ['catalog:update', '--format', 'json'],
        {root: '..'}
      );
      const parsed = assertValidEnvelope(stdout) as {
        warnings: {message: string}[];
      };
      expect(parsed.warnings).to.deep.include({
        message:
          'Catalog updated without a myAnalog login. Restricted SoCs may not be included.'
      });
      expect(stderr).to.equal('');
    });
  });
});
