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

import {catalogUpdateDeps} from '../../../src/commands/catalog/update.js';
import {SocCatalog} from 'cfs-lib';

describe('catalog:update', () => {
  describe('help', () => {
    // Verify that the help text contains the command description and mentions
    // that an active myAnalog account is required.
    it('displays the command description', async () => {
      const {stdout} = await runCommand(['help', 'catalog:update'], {
        root: '..'
      });
      expect(stdout).to.contain('Updates the catalog');
      expect(stdout).to.contain('myAnalog');
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
      catalogUpdateDeps.getSocCatalog = async (_config, force) => {
        // Verify that the forceOnline parameter is true, which indicates that the command is attempting to fetch the
        // latest catalog from the online source.
        expect(force).to.equal(true);

        // Create an empty soc catalog that we can return. It isn't used, so can be empty.
        const mockCatalog = {} as SocCatalog;
        return mockCatalog;
      };
      const {stdout} = await runCommand(['catalog:update'], {
        root: '..'
      });
      expect(stdout).to.contain('Catalog updated successfully');
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
  });
});
