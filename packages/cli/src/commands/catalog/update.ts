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
import {getSocCatalog} from '../../utils/catalog-manager.js';
import {BaseCommand} from '../../utils/base-command.js';

export const catalogUpdateDeps: {
  getSocCatalog: typeof getSocCatalog;
} = {
  getSocCatalog
};

export default class Update extends BaseCommand<typeof Update> {
  static useResponseEnvelope = true;

  static description =
    'Updates the catalog to the latest version available online.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<{updated: true}> {
    try {
      await catalogUpdateDeps.getSocCatalog(
        this.config,
        true,
        (message) => this.pushWarning(message)
      );
    } catch (error) {
      this.error(
        `Failed to update catalog.` +
          (error instanceof Error ? ` ${error.message}` : ''),
        {code: 'CATALOG_UPDATE_FAILED'}
      );
    }

    this.log(`Catalog updated successfully`);

    return {updated: true};
  }
}
