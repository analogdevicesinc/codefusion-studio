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
import {
  packageManagerRemotesUpdatedType,
  type PackageManagerRemote,
  type RemotesUpdate,
} from "../constants/messages/package-manager-messages";
import { logger } from "../utils/logger";
import type { CustomRemoteCatalogService } from "../utils/custom-remote-catalog";
import { getConanHome } from "../utils/package-manager";

/** The contents of the watched remotes files, by file name. */
export type RemotesFiles = ReadonlyMap<string, string | undefined>;

/**
 * A remote list together with the remotes files as they were just before it
 * was read. The list is only sent with a notification while the files are
 * still the same, so it can never be older than the files.
 */
export type RemotesSnapshot = {
  remotes: PackageManagerRemote[];
  files: RemotesFiles;
};

/**
 * Pauses the remotes watcher while the extension changes the remotes itself,
 * so a batch of changes is notified once.
 */
export class PackageManagerRemotesWatcher {
  private static pauses = 0;

  /** Re-reads the files and notifies if they changed; set by the watcher. */
  static resync: ((snapshot?: RemotesSnapshot) => Promise<void>) | undefined;

  /** Reads the watched files as they are now; set by the watcher. */
  static readFiles: (() => Promise<RemotesFiles>) | undefined;

  /** Whether a task is pausing the watcher. */
  static get paused(): boolean {
    return PackageManagerRemotesWatcher.pauses > 0;
  }

  /**
   * Runs a task that changes the remotes, such as setting up a new session's
   * remotes. The watcher ignores the files meanwhile, then notifies once if
   * the task changed them. Before the watcher is registered, the task just runs.
   * @param task - the task to run
   * @param toSnapshot - the remote list the task read, with the files it was read from
   * @returns the result of the task
   */
  static async pause<T>(
    task: () => Promise<T>,
    toSnapshot?: (result: T) => RemotesSnapshot | undefined,
  ): Promise<T> {
    PackageManagerRemotesWatcher.pauses += 1;
    let snapshot: RemotesSnapshot | undefined;
    try {
      const result = await task();
      snapshot = toSnapshot?.(result);
      return result;
    } finally {
      PackageManagerRemotesWatcher.pauses -= 1;
      if (!PackageManagerRemotesWatcher.paused) {
        await PackageManagerRemotesWatcher.resync?.(snapshot);
      }
    }
  }
}

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
  customRemoteCatalog?: CustomRemoteCatalogService,
): Promise<void> {
  const decoder = new TextDecoder();
  const conanHome = getConanHome(pkgManager);
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

  const notify = (update?: RemotesUpdate) => {
    messenger.sendNotification(
      packageManagerRemotesUpdatedType,
      BROADCAST,
      update,
    );
    customRemoteCatalog?.update();
  };

  const notifyWebviews = debounce(async (uri: vscode.Uri) => {
    try {
      const fileName = path.basename(uri.fsPath);
      if (!watchedFiles.has(fileName) || PackageManagerRemotesWatcher.paused) {
        return;
      }

      const nextContent = await readFileContent(uri);
      const previousContent = previousContents.get(fileName);

      if (nextContent === previousContent) {
        return;
      }

      previousContents.set(fileName, nextContent);

      logger.debug(`[remotes-watcher] ${fileName} changed, notifying webviews`);
      notify();
    } catch (error) {
      logger.error(
        `[remotes-watcher] failed to process change for '${uri.fsPath}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }, 100);

  // Late events from a paused task match the contents saved here, so are ignored.
  const readFiles = async (): Promise<RemotesFiles> => {
    const files = new Map<string, string | undefined>();
    for (const fileName of watchedFiles) {
      const uri = vscode.Uri.file(path.join(conanHome, fileName));
      files.set(fileName, await readFileContent(uri));
    }
    return files;
  };
  PackageManagerRemotesWatcher.readFiles = readFiles;

  PackageManagerRemotesWatcher.resync = async (snapshot) => {
    notifyWebviews.cancel();
    try {
      const files = await readFiles();
      // A change that started meanwhile resyncs when it ends
      if (PackageManagerRemotesWatcher.paused) {
        return;
      }
      const changed = [...files].filter(
        ([fileName, content]) => content !== previousContents.get(fileName),
      );
      for (const [fileName, content] of changed) {
        previousContents.set(fileName, content);
      }
      if (changed.length > 0) {
        logger.debug("[remotes-watcher] remotes changed, notifying webviews");
        // The list goes along only if the files are still the ones it was
        // read from; otherwise the webviews reload it
        const current =
          snapshot &&
          [...files].every(
            ([fileName, content]) => snapshot.files.get(fileName) === content,
          );
        notify(current ? { remotes: snapshot.remotes } : undefined);
      }
    } catch (error) {
      logger.error(
        `[remotes-watcher] failed to check the remotes: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  remotesFileWatcher.onDidCreate((uri) => void notifyWebviews(uri));
  remotesFileWatcher.onDidChange((uri) => void notifyWebviews(uri));
  remotesFileWatcher.onDidDelete((uri) => void notifyWebviews(uri));

  context.subscriptions.push(
    remotesFileWatcher,
    new vscode.Disposable(() => {
      notifyWebviews.cancel();
      PackageManagerRemotesWatcher.resync = undefined;
      PackageManagerRemotesWatcher.readFiles = undefined;
    }),
  );

  logger.info(
    `[remotes-watcher] registered in '${conanHome}', watching: ${[...watchedFiles].join(", ")}`,
  );
}
