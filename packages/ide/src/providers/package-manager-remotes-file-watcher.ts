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
import type { CfsPackageManagerProvider } from "cfs-package-manager";
import { packageManagerRemotesUpdatedType } from "../constants/messages/package-manager-messages";
import { logger } from "../utils/logger";

/**
 * Registers a file system watcher for package manager remotes config files.
 * Broadcasts a notification so open package manager webviews can refresh.
 *
 * Watches:
 * - remotes.json
 * - userRemotesCfg.json
 */
export async function registerPackageManagerRemotesFileWatcher(
  context: vscode.ExtensionContext,
  messenger: Messenger,
  pkgManager: CfsPackageManagerProvider,
): Promise<void> {
  const decoder = new TextDecoder();
  const indexDir = path.dirname(pkgManager.getIndexFilePath());
  const conanHome = path.join(indexDir, "conan");
  const watchedFiles = new Set(["remotes.json", "userRemotesCfg.json"]);
  const previousContents = new Map<string, string | undefined>();

  const pattern = new vscode.RelativePattern(
    vscode.Uri.file(conanHome),
    "**/{remotes.json,userRemotesCfg.json}",
  );

  const remotesFileWatcher = vscode.workspace.createFileSystemWatcher(
    pattern,
    false,
    false,
    false,
  );

  const readFileContent = async (
    uri: vscode.Uri,
  ): Promise<string | undefined> => {
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      return decoder.decode(bytes);
    } catch (error) {
      if (
        error instanceof vscode.FileSystemError &&
        error.code === "FileNotFound"
      ) {
        logger.warn(
          `[remotes-watcher] file not found '${uri.fsPath}', treating as empty`,
        );
        return undefined;
      }
      throw error;
    }
  };

  await Promise.all(
    [...watchedFiles].map(async (fileName) => {
      const uri = vscode.Uri.file(path.join(conanHome, fileName));
      previousContents.set(fileName, await readFileContent(uri));
    }),
  );

  const notifyWebviews = debounce(async (uri: vscode.Uri) => {
    try {
      const fileName = path.basename(uri.fsPath);
      if (!watchedFiles.has(fileName)) {
        return;
      }

      const nextContent = await readFileContent(uri);
      const previousContent = previousContents.get(fileName);

      if (nextContent === previousContent) {
        return;
      }

      previousContents.set(fileName, nextContent);

      messenger.sendNotification(
        packageManagerRemotesUpdatedType,
        BROADCAST,
        undefined,
      );
    } catch (error) {
      logger.error(
        `[remotes-watcher] failed to process change for '${uri.fsPath}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }, 100);

  remotesFileWatcher.onDidCreate((uri) => void notifyWebviews(uri));
  remotesFileWatcher.onDidChange((uri) => void notifyWebviews(uri));
  remotesFileWatcher.onDidDelete((uri) => void notifyWebviews(uri));

  context.subscriptions.push(
    remotesFileWatcher,
    new vscode.Disposable(() => notifyWebviews.cancel()),
  );

  logger.info(
    `[remotes-watcher] registered in '${conanHome}', watching: ${[...watchedFiles].join(", ")}`,
  );
}
