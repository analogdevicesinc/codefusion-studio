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
import {Command} from '@oclif/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {getSocCatalog} from '../../utils/catalog-manager.js';
import {
  getCustomCatalogStorePath,
  getVersionFromConfig
} from '../../utils/utils.js';

export default class Restore extends Command {
  static description =
    'Restore the catalog to its original version using the backup stored in `<install_dir>/Data/SoC/catalog.zip`. This will delete the existing catalog.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    const customCatalogPath = getCustomCatalogStorePath(this.config);

    const catalogStoreDir =
      customCatalogPath ??
      path.resolve(
        os.homedir(),
        'cfs',
        getVersionFromConfig(this.config),
        '.catalog'
      );

    const tempBackupDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cfs-catalog-restore-')
    );
    const catalogStoreBackupDir = path.join(
      tempBackupDir,
      'catalog-backup'
    );
    let backupCreated = false;

    try {
      // Preserve the existing catalog store directory so it can be restored if
      // the backup import fails.
      if (fs.existsSync(catalogStoreDir)) {
        fs.renameSync(catalogStoreDir, catalogStoreBackupDir);
        backupCreated = true;
      }

      // Restore the SoC catalog
      await getSocCatalog(this.config, false);

      if (backupCreated && fs.existsSync(catalogStoreBackupDir)) {
        fs.rmSync(catalogStoreBackupDir, {
          recursive: true,
          force: true
        });
      }

      this.log(`Catalog restored successfully`);
    } catch (error) {
      if (backupCreated && fs.existsSync(catalogStoreBackupDir)) {
        // Remove catalogStoreDir, if we started to create it, before restoring the backup.
        if (fs.existsSync(catalogStoreDir)) {
          fs.rmSync(catalogStoreDir, {recursive: true, force: true});
        }

        fs.renameSync(catalogStoreBackupDir, catalogStoreDir);
      }

      this.error(
        `Failed to restore catalog. ` +
          (error instanceof Error
            ? ` ${error.message}`
            : 'Please check that the backup file exists and is accessible.')
      );
    } finally {
      if (fs.existsSync(tempBackupDir)) {
        fs.rmSync(tempBackupDir, {recursive: true, force: true});
      }
    }
  }
}
