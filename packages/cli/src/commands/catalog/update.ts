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

import {getSocCatalog} from '../../utils/catalog-manager.js';

export default class Update extends Command {
  static description =
    'Updates the catalog to the latest version available online. Requires an active session with a myAnalog account.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {};

  public async run(): Promise<void> {
    try {
      await getSocCatalog(this.config, true);
    } catch (error) {
      this.error(
        `Failed to update catalog.` +
          (error instanceof Error ? ` ${error.message}` : '')
      );
    }

    this.log(`Catalog updated successfully`);
  }
}
