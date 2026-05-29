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

import {expect, test} from '@oclif/test';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Catalog store path as configured in test/config/cfsutil/config.json
const catalogStoreDir = path.resolve(
  __dirname,
  '../../fixtures/catalog'
);

// CFS_INSTALL_DIR is set to 'test/fixtures' by test/setup.js and package.json test commands.
const cfsInstallDir = path.resolve(
  process.cwd(),
  process.env.CFS_INSTALL_DIR ?? 'test/fixtures'
);
const catalogZipFile = path.join(
  cfsInstallDir,
  'Data',
  'SoC',
  'catalog.zip'
);
const hiddenZipFile = `${catalogZipFile}.hidden`;

describe('catalog:restore', () => {
  describe('help', () => {
    test
      .stdout()
      .command(['help', 'catalog:restore'], {root: '..'})
      .it('displays the command description', (ctx) => {
        expect(ctx.stdout).to.contain('Restore the catalog');
        expect(ctx.stdout).to.contain('catalog.zip');
      });
  });

  describe('successful restore from ZIP', () => {
    before(() => {
      // Remove the catalog store so the restore must use the backup ZIP
      fs.rmSync(catalogStoreDir, {recursive: true, force: true});
    });

    test
      .stdout()
      .stderr()
      .command(['catalog:restore'], {root: '..'})
      .it(
        'logs success and recreates the catalog store from the backup ZIP',
        (ctx) => {
          expect(ctx.stdout).to.contain(
            'Catalog restored successfully'
          );
          expect(
            fs.existsSync(catalogStoreDir),
            'catalog store directory should exist after restore'
          ).to.be.true;
          // expect the catalog store directory to contain a file called lowdb-soc-data.json
          const catalogFiles = fs.readdirSync(catalogStoreDir);

          // confirm that $catalogFiles/soc/db/A/lowdb-soc-data.json exists in the restored catalog store
          const catalogFile = path.join(
            catalogStoreDir,
            'soc',
            'db',
            'A',
            'lowdb-soc-data.json'
          );
          expect(
            fs.existsSync(catalogFile),
            'lowdb-soc-data.json should exist in the restored catalog store'
          ).to.be.true;
        }
      );
  });

  describe('restore failure when backup ZIP is missing', () => {
    before(() => {
      // Hide the backup ZIP so the restore has no data source
      if (fs.existsSync(catalogZipFile)) {
        fs.renameSync(catalogZipFile, hiddenZipFile);
      }
    });

    after(() => {
      // Restore the ZIP so subsequent tests continue to work
      if (fs.existsSync(hiddenZipFile)) {
        fs.renameSync(hiddenZipFile, catalogZipFile);
      }
    });

    test
      .stderr()
      .command(['catalog:restore'], {root: '..'})
      .catch(/Failed to restore catalog/)
      .it(
        'reports an error and preserves the existing catalog when the backup ZIP is missing',
        () => {
          expect(
            fs.existsSync(catalogStoreDir),
            'catalog store should be preserved when restore fails'
          ).to.be.true;
        }
      );
  });
});
