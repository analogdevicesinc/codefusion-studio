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

import * as path from "path";
import * as vscode from "vscode";
import debounce from "lodash.debounce";
import { Messenger } from "vscode-messenger";
import { BROADCAST } from "vscode-messenger-common";
import { SessionManager, type TokenAuthSession } from "cfs-lib";
import type { CfsPackageManagerProvider } from "cfs-package-manager";
import { AuthConfigParser } from "../utils/auth-config";
import { syncPackageManagerCredentials } from "../utils/package-manager";
import { isLoggedInStatusType } from "../constants/messages/package-manager-messages";
import { logger } from "../utils/logger";

/**
 * Registers a file system watcher for the auth session file and broadcasts
 * login state updates so package manager webviews can refresh automatically.
 * @param context - The extension context
 * @param messenger - The vscode messenger instance
 */
export async function registerAuthSessionFileWatcher(
  context: vscode.ExtensionContext,
  messenger: Messenger,
  pkgManager?: CfsPackageManagerProvider,
): Promise<void> {
  try {
    const authConfig = new AuthConfigParser().getConfig();
    const sessionManager = new SessionManager(authConfig);
    let previousAuthSignature: string | undefined;
    let publishQueue = Promise.resolve();
    const sessionFilePath = authConfig.sessionFile;
    const sessionDir = path.dirname(sessionFilePath);
    const sessionFileName = path.basename(sessionFilePath);

    const pattern = new vscode.RelativePattern(
      vscode.Uri.file(sessionDir),
      sessionFileName,
    );

    const sessionFileWatcher = vscode.workspace.createFileSystemWatcher(
      pattern,
      false, // ignoreCreateEvents
      false, // ignoreChangeEvents
      false, // ignoreDeleteEvents
    );

    const getAuthSignature = (
      session: TokenAuthSession | undefined,
    ): string => {
      return session ? (session.userId ?? "logged-in") : "logged-out";
    };

    const publishLoggedInStatus = (force = false) => {
      publishQueue = publishQueue
        .then(async () => {
          const session = await sessionManager.getSession();
          const loggedIn = Boolean(session);
          const authSignature = getAuthSignature(session);

          if (!force && previousAuthSignature === authSignature) {
            return;
          }

          let syncSucceeded = true;
          if (pkgManager) {
            try {
              await syncPackageManagerCredentials(pkgManager, session);
            } catch (error) {
              syncSucceeded = false;
              const errMessage =
                "Failed to configure package manager. " +
                (error instanceof Error ? error.message : String(error));
              logger.error(errMessage);
              vscode.window.showErrorMessage(errMessage);
            }
          }

          messenger.sendNotification(isLoggedInStatusType, BROADCAST, {
            loggedIn,
            authSignature,
          });

          // Commit the signature only after sync succeeds, to enable retry on transient failures
          if (syncSucceeded) {
            previousAuthSignature = authSignature;
          }
        })
        .catch((error) => {
          const errMessage =
            "Failed to publish logged-in status: " +
            (error instanceof Error ? error.message : String(error));
          logger.error(errMessage);
          vscode.window.showErrorMessage(errMessage);
        });

      return publishQueue;
    };

    const handleSessionFileChange = debounce(() => {
      void publishLoggedInStatus();
    }, 50);

    sessionFileWatcher.onDidCreate(handleSessionFileChange);
    sessionFileWatcher.onDidChange(handleSessionFileChange);
    sessionFileWatcher.onDidDelete(handleSessionFileChange);

    // Broadcast initial status so any open Packman webview is immediately in sync.
    await publishLoggedInStatus(true);

    context.subscriptions.push(
      sessionFileWatcher,
      new vscode.Disposable(() => handleSessionFileChange.cancel()),
    );
  } catch (error) {
    logger.error(
      "Auth session file watcher not registered:",
      error instanceof Error ? error.message : error,
    );
  }
}
