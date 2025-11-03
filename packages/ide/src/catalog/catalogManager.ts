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
  PublicAuthorizer,
  Authorizer,
} from "cfs-ccm-lib";
import { resolveVariables } from "../utils/resolveVariables";
import { Utils } from "../utils/utils";
import * as fs from "fs";
import { CATALOG_API_URL } from "../constants";

export class CatalogManager {
  private readonly client: CfsApiClient | undefined = undefined;
  #socCatalog: SocCatalog;

  /**
   * Creates an instance of the CatalogManager.
   *
   * @param catalogStoreDir - The directory where the catalog store is located.
   * @param catalogBackupZipFile - The zip file with a backup copy of the catalog.
   * @param useOfflineMode - A boolean indicating whether to use offline mode. Defaults to true.
   * @param baseUrl - The base URL for the API client (required for online mode).
   * @param authorizer - An optional authorizer for the API client (defaults to the public authorizer).
   */
  constructor(
    readonly catalogStoreDir: string,
    readonly catalogBackupZipFile: string | undefined,
    useOfflineMode: boolean = true,
    readonly baseUrl: string | URL = CATALOG_API_URL,
    authorizer: Authorizer = new PublicAuthorizer(),
  ) {
    // Ensure the catalog store directory exists
    if (!Utils.directoryExists(resolveVariables(this.catalogStoreDir))) {
      fs.mkdirSync(resolveVariables(this.catalogStoreDir), { recursive: true });
    }

    // Initialize the API client for online mode
    try {
      if (!useOfflineMode) {
        this.client = new CfsApiClient({
          baseUrl: this.baseUrl,
          authorizer: authorizer,
        });
      }
    } catch (err) {
      console.warn(
        "CatalogManager: Error initializing the API client, working offline",
        err,
      );
    }

    this.#socCatalog = new SocCatalog(
      { directory: this.catalogStoreDir },
      this.client,
    );
  }

  // Accessor for the SocCatalog instance
  get socCatalog(): SocCatalog {
    return this.#socCatalog;
  }

  /**
   * Asynchronously loads the catalog, refreshes it from the server (if online)
   * If it cannot be refreshed and it had no previous contents, attempts to
   * import the catalog from the backup zip file (fails if the backup is not available).
   *
   * @returns {Promise<void>} A promise that resolves when the catalog is loaded.
   * @throws an error if the catalog cannot be loaded.
   */
  async loadCatalog(): Promise<void> {
    try {
      await this.validateCatalog(); // check the current catalog is OK
      await this.refreshCatalog(); // fetch updates from the server
      // if the catalog is empty, try to import from the backup file
      if (await this.#socCatalog.isEmpty()) {
        await this.importBackupCatalog();
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * Refreshes the catalog from the server if the client is online.
   *
   * @throws {Error} If a non-network error occurs during the refresh.
   *
   * @returns {Promise<void>} A promise that resolves when the catalog is refreshed.
   */
  private async refreshCatalog(): Promise<void> {
    try {
      await this.#socCatalog.refresh();
    } catch (err) {
      console.error("Unexpected error during catalog refresh:", err);
      if (err instanceof CatalogError) {
        // ignore network errors, machine may be offline
        if (err.type !== "SERVICE_ERROR") {
          throw err;
        }
      }
    }
  }

  /**
   * Validates the catalog's existing contents. If invalid, attempts to purge, or
   * destroy and recreate the catalog, so it can be reloaded from the server or zip file.
   *
   * @throws {Error} If the catalog is invalid and could not be purged or recreated.
   *
   * @returns {Promise<void>} A promise that resolves when the catalog is valid (may be empty).
   */
  private async validateCatalog(): Promise<void> {
    try {
      await this.#socCatalog.validate();
    } catch (err) {
      if (err instanceof CatalogError) {
        // throw away the invalid catalog contents
        // it will be reloaded from the server or backup file
        if (err.type === "INVALID_CONTENTS") {
          await this.#socCatalog.purge();
          return;
        } else if (
          err.type === "PERSISTENCE_ERROR" &&
          err.cause instanceof DataStoreError &&
          err.cause.type === "INVALID_DATA"
        ) {
          // destroy the unusable catalog and create a new one
          await this.#socCatalog.destroy();
          this.#socCatalog = new SocCatalog(
            { directory: this.catalogStoreDir },
            this.client,
          );
          return;
        }
      }
      throw err;
    }
  }

  /**
   * Imports the catalog from the backup zip file.
   *
   * @throws {Error} If the catalog backup zip file is not configured or cannot be imported.
   *
   * @returns {Promise<void>} A promise that resolves when the catalog is imported.
   */
  private async importBackupCatalog(): Promise<void> {
    try {
      if (!this.catalogBackupZipFile) {
        throw new Error(
          "CatalogManager: No catalog backup configured, cannot import catalog",
        );
      }
      await this.#socCatalog.import(this.catalogBackupZipFile);
    } catch (err) {
      throw new Error(
        `Unexpected error during catalog import: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Disposes of the CatalogManager and its resources.
   *
   * @returns {Promise<void>} A promise that resolves when the resources are disposed.
   */
  async dispose(): Promise<void> {
    await this.#socCatalog.dispose();
  }
}
