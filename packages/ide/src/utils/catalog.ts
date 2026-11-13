/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import { Utils } from "./utils";
import { resolveVariables } from "./resolveVariables";
import {
  EXTENSION_ID,
  CATALOG_MANAGER,
  CATALOG_LOCATION,
  CHECK_FOR_UPDATES,
} from "../constants";
import type { AuthService } from "../services/auth-service";
import { CatalogManager, CfsApiClient } from "cfs-lib";
import * as vscode from "vscode";
import path from "node:path";

/**
 * Creates a catalog manager configured from the extension settings.
 * @param authService - Provides the myAnalog session for the online catalog
 * @returns The catalog manager, or undefined when it could not be created
 */
export async function getCatalogManager(
  authService: AuthService,
): Promise<CatalogManager | undefined> {
  const sdkPath = Utils.getSdkPath();
  const catalogLocation = vscode.workspace
    .getConfiguration(EXTENSION_ID)
    .get(`${CATALOG_MANAGER}.${CATALOG_LOCATION}`);
  const checkForCatalogUpdates = vscode.workspace
    .getConfiguration(EXTENSION_ID)
    .get(`${CATALOG_MANAGER}.${CHECK_FOR_UPDATES}`);

  if (
    [catalogLocation, checkForCatalogUpdates].some(
      (val) => val !== false && !val,
    )
  ) {
    console.error("Catalog Manager missing config", {
      catalogLocation,
      checkForCatalogUpdates,
    });
    void vscode.window.showErrorMessage(
      "Catalog Manager failed to initialize. Catalog data will be unavailable.",
    );
    return undefined;
  }

  const catalogBackupStore = sdkPath
    ? path.join(sdkPath, "Data", "SoC", "catalog.zip")
    : undefined;
  const catalogStoreDir = resolveVariables(String(catalogLocation));
  let offlineMode = !checkForCatalogUpdates;
  let apiClient: CfsApiClient | undefined;

  if (!offlineMode) {
    let session;
    try {
      session = await authService.getSession();
    } catch (error) {
      // Wanted online mode, but errored getting the session (rather than there just being no session)
      console.warn("Failed to load auth session", error);
      void vscode.window.showWarningMessage(
        "Catalog Manager failed to load user authentication session. Using public catalog.",
      );
    }

    try {
      apiClient = new CfsApiClient({
        baseUrl: authService.config?.ccmUrl,
        authorizer: session?.authorizer,
      });
    } catch (error) {
      // Work offline if unable to create api client
      console.warn("Failed to create API client", error);
      void vscode.window.showWarningMessage(
        "Catalog Manager failed to create API client. Using offline mode for catalog.",
      );
      offlineMode = true;
    }
  }

  let catalogManager: CatalogManager | undefined;
  try {
    catalogManager = new CatalogManager({
      catalogStoreDir,
      catalogBackupZipFile: catalogBackupStore,
      apiClient,
    });
  } catch (error) {
    console.error("Catalog Manager could not be initialized.", error);
    void vscode.window.showErrorMessage(
      "Catalog Manager failed to initialize. Catalog data will be unavailable.",
    );
  }

  return catalogManager;
}
