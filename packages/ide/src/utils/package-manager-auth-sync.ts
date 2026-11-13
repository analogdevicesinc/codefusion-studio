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
import { Messenger } from "vscode-messenger";
import { BROADCAST } from "vscode-messenger-common";
import type { TokenAuthSession } from "cfs-lib";
import type { CfsPackageManagerProvider } from "cfs-package-manager";
import {
  type AuthService,
  type AuthSessionLoadEvent,
  getAuthSignature,
} from "../services/auth-service";
import { syncPackageManagerCredentials } from "./package-manager";
import { isLoggedInStatusType } from "../constants/messages/package-manager-messages";
import { logger } from "./logger";
import type { PackageCatalogService } from "./package-catalog";
import { PackageManagerRemotesWatcher } from "../providers/package-manager-remotes-file-watcher";

/**
 * Keeps the package manager credentials, remotes and catalog, and its
 * webviews, in sync with the myAnalog session, so logging in or out (from the
 * IDE or the CLI) takes effect without reloading the window.
 *
 * Credentials are synced whenever a loaded session belongs to a different
 * user than the credentials last applied. A failed sync is retried on the
 * next session load.
 * @param context - The extension context
 * @param authService - The shared auth service
 * @param messenger - The vscode messenger instance
 * @param pkgManager - The package manager, if it initialized
 * @param initialSignature - Signature of the session whose credentials were
 * applied when the package manager was set up, see {@link getAuthSignature}
 * @param packageCatalog - The package catalog, rebuilt for each session
 */
export function registerPackageManagerAuthSync(
  context: vscode.ExtensionContext,
  authService: AuthService,
  messenger: Messenger,
  pkgManager: CfsPackageManagerProvider | undefined,
  initialSignature: string | undefined,
  packageCatalog?: PackageCatalogService,
): void {
  let appliedSignature = initialSignature;
  let catalogSignature = initialSignature;
  let broadcastSignature: string | undefined;
  let syncQueue = Promise.resolve();

  const broadcastLoggedInStatus = (session: TokenAuthSession | undefined) => {
    const signature = getAuthSignature(session);
    if (signature === broadcastSignature) {
      return;
    }
    broadcastSignature = signature;
    messenger.sendNotification(isLoggedInStatusType, BROADCAST, {
      loggedIn: Boolean(session),
      authSignature: signature,
    });
  };

  const syncCredentials = async ({
    session,
    signature,
  }: AuthSessionLoadEvent) => {
    if (!pkgManager || signature === appliedSignature) {
      return;
    }
    // The sync rewrites the remotes several times; notify once at the end
    await PackageManagerRemotesWatcher.pause(async () => {
      try {
        await syncPackageManagerCredentials(pkgManager, authService, session);
      } catch (error) {
        const errMessage =
          "Failed to configure package manager. " +
          (error instanceof Error ? error.message : String(error));
        logger.error(errMessage);
        vscode.window.showErrorMessage(errMessage);
        return; // not committed, so the next load retries
      }
      appliedSignature = signature;

      // Set up the new session's remotes before the webviews read them. The
      // package manager retries on its next call, so a failure is only logged.
      try {
        await pkgManager.listRemotes();
      } catch (error) {
        logger.warn("Failed to apply the package remotes:", error);
      }
    });
  };

  // The catalog is per session: drop it before anything notifies the webviews
  const resetCatalog = async ({ session, signature }: AuthSessionLoadEvent) => {
    if (!packageCatalog || signature === catalogSignature) {
      return;
    }
    catalogSignature = signature;
    try {
      await packageCatalog.onAuthChanged(session);
    } catch (error) {
      logger.warn("Failed to purge the package catalog:", error);
    }
  };

  context.subscriptions.push(
    authService.onDidLoadSession((event) => {
      // Serialize so a sync always sees the signature applied by the previous one
      syncQueue = syncQueue
        .then(() => resetCatalog(event))
        .then(() => syncCredentials(event))
        .then(() => broadcastLoggedInStatus(event.session));
    }),
  );

  // Broadcast the current status so any open Packman webview is in sync.
  if (authService.config) {
    authService.getSession().then(broadcastLoggedInStatus, (error) => {
      logger.error(
        "Failed to publish logged-in status:",
        error instanceof Error ? error.message : error,
      );
    });
  }
}
