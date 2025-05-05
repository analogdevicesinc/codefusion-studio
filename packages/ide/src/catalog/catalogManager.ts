/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {
  CfsApiClient,
  SocCatalog,
  CatalogError,
  DataStoreError,
} from "cfs-ccm-lib";
import { resolveVariables } from "../utils/resolveVariables";
import { Utils } from "../utils/utils";
import * as fs from "fs";

export class CatalogManager {
  baseUrl: string;
  catalogStoreDir: string;
  catalogBackupStore: string;
  client: CfsApiClient | undefined = undefined;
  socCatalog: SocCatalog;

  /**
   * Creates an instance of the CatalogManager.
   *
   * @param baseUrl - The base URL for the API client.
   * @param catalogStoreDir - The directory where the catalog store is located.
   * @param catalogBackupStore - The directory where the catalog backup store is located.
   * @param useOfflineMode - A boolean indicating whether to use offline mode. Defaults to false.
   */
  constructor(
    baseUrl: string,
    catalogStoreDir: string,
    catalogBackupStore: string,
    useOfflineMode: boolean = true,
  ) {
    this.baseUrl = baseUrl;
    this.catalogStoreDir = catalogStoreDir;
    this.catalogBackupStore = catalogBackupStore;

    if (!Utils.directoryExists(resolveVariables(this.catalogStoreDir))) {
      fs.mkdirSync(resolveVariables(this.catalogStoreDir), { recursive: true });
    }

    //Initializing the api client
    try {
      if (!useOfflineMode) {
        this.client = new CfsApiClient({
          baseUrl: this.baseUrl,
        });
      }
    } catch (err) {
      console.warn(
        "CatalogManager: Error initializing the API client, working offline",
        err,
      );
    }

    this.socCatalog = new SocCatalog(
      { directory: this.catalogStoreDir },
      this.client,
    );
  }

  async isOffline(): Promise<boolean> {
    return !(await this.client?.isOnline());
  }

  /**
   * Asynchronously loads the catalog. If the catalog is empty, it refreshes the catalog.
   * If an update is available, it refreshes the catalog again. Finally, it retrieves
   * all items from the catalog and logs them to the console.
   *
   * @returns {Promise<void>} A promise that resolves when the catalog is loaded.
   * @throws Will log an error to the console if any operation fails.
   */
  async loadCatalog(): Promise<void> {
    try {
      await this.validateCatalog();

      const isCatalogEmpty = await this.socCatalog.isEmpty();

      if (isCatalogEmpty) {
        await this.initializeCatalog();
        return;
      }

      if (!(await this.isOffline())) {
        const isUpdateAvailable = await this.socCatalog.updateAvailable();
        if (isUpdateAvailable) {
          this.socCatalog.refresh();
        }
      }
    } catch (err) {
      //TODO deal with the error
      console.error(err);
    }
  }

  /**
   * Initializes the catalog by refreshing it if the client is offline,
   * or importing it from the backup store if the client is online.
   *
   * @throws {CatalogError} If an error occurs during the catalog initialization.
   *
   * @returns {Promise<void>} A promise that resolves when the catalog is initialized.
   */
  private async initializeCatalog(): Promise<void> {
    try {
      if (!(await this.isOffline())) {
        await this.socCatalog.refresh();
        return;
      }
    } catch (err) {
      //TODO deal with the error
      console.error("Unexpected error during catalog refresh:", err);
    }
    await this.importBackupCatalog();
  }

  private async validateCatalog() {
    try {
      await this.socCatalog.validate();
    } catch (err) {
      if (err instanceof CatalogError) {
        // throw away the invalid catalog contents, it will be reloaded from the server or backup file
        if (err.type === "INVALID_CONTENTS") {
          await this.socCatalog.purge();
          return;
        } else if (
          err.type === "PERSISTENCE_ERROR" &&
          err.cause instanceof DataStoreError &&
          err.cause.type === "INVALID_DATA"
        ) {
          // destroy the unusable catalog and create a new one
          await this.socCatalog.destroy();
          this.socCatalog = new SocCatalog(
            { directory: this.catalogStoreDir },
            this.client,
          );
          return;
        }
      }
      throw err;
    }
  }

  private async importBackupCatalog() {
    try {
      await this.socCatalog.import(this.catalogBackupStore);
    } catch (err) {
      //TODO deal with the error
      console.error("Unexpected error during catalog import:", err);
    }
  }

  async dispose() {
    await this.socCatalog.dispose();
  }
}
