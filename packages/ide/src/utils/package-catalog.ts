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

import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  CfsApiClient,
  SessionManager,
  createSWPackageSource,
  type SWPackageSource,
  type SWPackageSourceOptions,
  type TokenAuthSession,
} from "cfs-lib";
import type { SWPackage } from "cfs-ccm-lib";
import { Utils } from "./utils";
import { resolveVariables } from "./resolveVariables";
import { AuthConfigParser } from "./auth-config";
import {
  EXTENSION_ID,
  CATALOG_MANAGER,
  CATALOG_LOCATION,
  CHECK_FOR_UPDATES,
} from "../constants";
import { logger } from "./logger";

/**
 * The software package catalog for the whole extension.
 *
 * Created at activation and handed to every panel that lists packages;
 * panels never own or dispose it. Packages come from the cfs-lib
 * {@link SWPackageSource} factory.
 */
export class PackageCatalogService implements vscode.Disposable {
  private _source: Promise<SWPackageSource> | undefined;
  /** The session the next source is built for; looked up when undefined. */
  private _session: TokenAuthSession | undefined;
  /** Serialises auth changes so a logout and a login cannot interleave. Never rejects. */
  private _authQueue: Promise<void> = Promise.resolve();
  /** Set when the last purge failed, so the next source starts empty. */
  private _purgePending = false;

  /**
   * @param cfsVersion - the running CFS version, sent to the server so it
   * returns only compatible packages
   */
  constructor(private readonly cfsVersion: string) {}

  /**
   * The current source, created on first use. When the catalog cannot be
   * populated (offline on a first run with no bundled backup, or the
   * session was rejected) the list renders empty rather than failing, the
   * user is told once, and the next request tries again.
   * @returns the source serving the packages for the current session
   */
  getSource(): Promise<SWPackageSource> {
    this._source ??= this.createSource().catch((error: unknown) => {
      this._source = undefined;
      this.reportUnavailable(error);
      return emptySWPackageSource();
    });
    return this._source;
  }

  private _warned = false;

  private reportUnavailable(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Package catalog unavailable:", message);
    if (this._warned) {
      return;
    }
    this._warned = true;
    if (message.includes("Unauthorized")) {
      void vscode.window.showWarningMessage(
        "CFS: Your myAnalog session was rejected while loading the package catalog. Sign in again to see all packages.",
      );
    } else {
      void vscode.window.showWarningMessage(
        "CFS: The package catalog could not be loaded. Check your connection; the Package Manager will show packages once it is available.",
      );
    }
  }

  /**
   * Every package version the source holds.
   * @returns the packages
   */
  async getPackages(): Promise<SWPackage[]> {
    const source = await this.getSource();
    return source.getAll();
  }

  /**
   * Reacts to a login, logout or account switch: purges the previous
   * session's packages from disk and disposes the source, so the next
   * request rebuilds it for the new session, even when offline.
   * @param session - the new session, or undefined when logged out
   * @returns a promise that resolves once the old packages are gone
   */
  onAuthChanged(session: TokenAuthSession | undefined): Promise<void> {
    const change = this._authQueue.then(async () => {
      const previous = this._source;
      this._source = undefined;
      this._session = session;
      if (!previous) {
        return;
      }
      const source = await previous;
      try {
        await source.purge();
        this._purgePending = false;
      } catch (error) {
        this._purgePending = true;
        throw error;
      } finally {
        await source.dispose().catch((error: unknown) => {
          logger.warn("Failed to dispose the package catalog:", error);
        });
      }
    });
    // A failed change must not block the next one.
    this._authQueue = change.catch(() => undefined);
    return change;
  }

  private async createSource(): Promise<SWPackageSource> {
    // Wait for a purge in progress so it cannot empty the new source.
    await this._authQueue;
    const options = await buildSWPackageSourceOptions(
      this.cfsVersion,
      this._session,
    );
    const source = await createSWPackageSource(options);
    if (this._purgePending) {
      // The previous session's packages may still be on disk: drop them
      // and reload, so they are never served to the new session.
      try {
        await source.purge();
        this._purgePending = false;
        await source.refresh();
      } catch (error) {
        await source.dispose().catch(() => undefined);
        throw error;
      }
    }
    return source;
  }

  dispose(): void {
    const source = this._source;
    this._source = undefined;
    void source
      ?.then((s) => s.dispose())
      .catch((error: unknown) => {
        logger.warn("Failed to dispose the package catalog:", error);
      });
  }
}

/**
 * A source with no packages, used while the real one cannot be populated.
 * @returns the empty source
 */
function emptySWPackageSource(): SWPackageSource {
  return {
    getAll: async () => [],
    refresh: async () => {},
    purge: async () => {},
    dispose: async () => {},
  };
}

/**
 * The catalog store directory from the settings, shared with the SoC catalog.
 * @param cfsVersion - the running CFS version, used when the setting is unset
 * @returns the directory
 */
export function getCatalogStoreDir(cfsVersion: string): string {
  const catalogLocation = vscode.workspace
    .getConfiguration(EXTENSION_ID)
    .get<string>(`${CATALOG_MANAGER}.${CATALOG_LOCATION}`);
  return resolveVariables(
    catalogLocation ?? `\${userHome}/cfs/${cfsVersion}/.catalog`,
  );
}

/**
 * Builds the source options from the same settings and session the SoC
 * catalog uses, so both catalogs live in one store directory and share
 * the online/offline behaviour.
 * @param cfsVersion - the running CFS version
 * @param session - the auth session to use; looked up when omitted
 * @returns the options for the cfs-lib source factory
 */
export async function buildSWPackageSourceOptions(
  cfsVersion: string,
  session?: TokenAuthSession,
): Promise<SWPackageSourceOptions> {
  const checkForUpdates = vscode.workspace
    .getConfiguration(EXTENSION_ID)
    .get<boolean>(`${CATALOG_MANAGER}.${CHECK_FOR_UPDATES}`);
  const catalogStoreDir = getCatalogStoreDir(cfsVersion);

  let apiClient: CfsApiClient | undefined;
  if (checkForUpdates !== false) {
    try {
      const authConfig = new AuthConfigParser().getConfig();
      const resolvedSession =
        session ?? (await new SessionManager(authConfig).getSession());
      apiClient = new CfsApiClient({
        baseUrl: authConfig.ccmUrl,
        authorizer: resolvedSession?.authorizer,
      });
    } catch (error) {
      // No auth config or session: the catalog works offline, like the
      // SoC catalog does in the same situation.
      logger.warn(
        "Package catalog: no API client, using offline mode:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  // The installer may ship a backup next to the SoC one; pass it only when present.
  const sdkPath = Utils.getSdkPath();
  const backupZip = sdkPath
    ? path.join(sdkPath, "Data", "SWPackages", "catalog.zip")
    : undefined;

  return {
    catalogStoreDir,
    catalogBackupZipFile:
      backupZip && fs.existsSync(backupZip) ? backupZip : undefined,
    apiClient,
    cfsVersion,
  };
}
