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
import type { Messenger } from "vscode-messenger";
import { BROADCAST } from "vscode-messenger-common";
import type { SWPackage } from "cfs-ccm-lib";
import {
  CustomRemoteCatalogManager,
  type CustomRemoteApplyResult,
  type CustomRemoteChanges,
  type CustomRemoteFailure,
} from "cfs-lib";
import type { CfsPackageManagerProvider } from "cfs-package-manager";
import {
  type CustomRemoteIndexing,
  customRemoteIndexingType,
  packageManagerRemotesUpdatedType,
} from "../constants/messages/package-manager-messages";
import {
  PackageManagerRemotesWatcher,
  type RemotesFiles,
} from "../providers/package-manager-remotes-file-watcher";
import { logger } from "./logger";
import { listWebviewRemotes } from "./package-manager";

/**
 * Keeps the packages of the custom remotes indexed. Updated at activation,
 * when the remotes change and when the Package Manager opens.
 */
export class CustomRemoteCatalogService {
  private readonly manager: CustomRemoteCatalogManager;
  private running: Promise<void> | undefined;
  private rerun = false;
  /**
   * Remotes the last update could not index, by name. A remote is reported
   * to the user when it starts failing, and again if it fails after recovering.
   */
  private failures = new Map<string, CustomRemoteFailure>();
  private indexingState: CustomRemoteIndexing = { remotes: [] };

  /**
   * @param catalogStoreDir - the catalog store directory
   * @param pkgManager - the package manager that reads the remotes
   * @param messenger - used to tell the Package Manager the list changed
   */
  constructor(
    catalogStoreDir: string,
    private readonly pkgManager: CfsPackageManagerProvider,
    private readonly messenger: Messenger,
  ) {
    this.manager = new CustomRemoteCatalogManager(catalogStoreDir, pkgManager);
  }

  /** The custom remotes whose packages are being fetched; empty when none are. */
  get indexing(): CustomRemoteIndexing {
    return this.indexingState;
  }

  /**
   * Every indexed package.
   * @returns the packages
   */
  getPackages(): Promise<SWPackage[]> {
    return this.manager.getPackages();
  }

  /**
   * Why the last update could not index a remote.
   * @param remote - the remote name
   * @returns the failure, or undefined when the remote was indexed or not checked
   */
  getFailure(remote: string): CustomRemoteFailure | undefined {
    return this.failures.get(remote);
  }

  /**
   * Indexes new and changed packages. A call made while an update runs
   * schedules one more run instead of a parallel one.
   * @returns a promise that resolves once the index is current
   */
  update(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  private async run(): Promise<void> {
    do {
      this.rerun = false;
      try {
        const changes = await this.manager.check();
        const failures = [...changes.failures];
        let cancelled = false;
        if (changes.changed) {
          const result =
            changes.fetch.size > 0
              ? await this.fetch(changes)
              : await this.manager.apply(changes);
          failures.push(...result.failures);
          cancelled = result.cancelled.length > 0;
        }
        // The remote cards show the failures, so a change to them is
        // announced like a change to the packages. After a cancel, disabling
        // the remotes already sent the Package Manager the updated list.
        if (this.report(failures) || (changes.changed && !cancelled)) {
          this.messenger.sendNotification(
            packageManagerRemotesUpdatedType,
            BROADCAST,
            undefined,
          );
        }
      } catch (error) {
        logger.warn("Indexing custom remotes failed:", error);
      }
    } while (this.rerun);
  }

  /**
   * Fetches the new packages with a cancellable progress notification, and
   * tells the Package Manager which remotes are being indexed meanwhile.
   * After a cancel, the unfinished remotes are disabled before the Package
   * Manager is told indexing ended, so it stays locked until then.
   * @param changes - what the check found
   * @returns the failed and the cancelled remotes
   */
  private async fetch(
    changes: CustomRemoteChanges,
  ): Promise<CustomRemoteApplyResult> {
    const total = [...changes.fetch.values()].reduce(
      (sum, refs) => sum + refs.length,
      0,
    );
    const remotes = [...changes.fetch.keys()].map((remote) => remote.name);
    const fetching = new AbortController();
    let stopped: () => void = () => undefined;
    const stopping = new Promise<void>((resolve) => {
      stopped = resolve;
    });
    this.setIndexing({ remotes });
    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: vscode.l10n.t(
            "CFS: Package Manager features are disabled while indexing custom remotes",
          ),
          cancellable: true,
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            fetching.abort();
            // VS Code closes this notification on Cancel; this one stays
            // until the current batch is done and the remotes are disabled.
            void vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Notification,
                title: vscode.l10n.t(
                  "CFS: Cancelling indexing of custom remotes",
                ),
              },
              () => stopping,
            );
          });
          const done = new Map<string, number>();
          return this.manager.apply(changes, {
            signal: fetching.signal,
            onProgress: (remote, remoteDone, remoteTotal) => {
              const step = remoteDone - (done.get(remote) ?? 0);
              done.set(remote, remoteDone);
              progress.report({
                message: vscode.l10n.t(
                  "{0}, {1} of {2} packages",
                  remote,
                  remoteDone,
                  remoteTotal,
                ),
                increment: (step / total) * 100,
              });
            },
          });
        },
      );
      if (result.cancelled.length > 0) {
        await this.disableCancelled(result.cancelled);
      }
      return result;
    } finally {
      stopped();
      this.setIndexing({ remotes: [] });
    }
  }

  private setIndexing(state: CustomRemoteIndexing): void {
    this.indexingState = state;
    this.messenger.sendNotification(customRemoteIndexingType, BROADCAST, state);
  }

  /**
   * Disables the remotes whose indexing was cancelled, so it does not start
   * again on its own; enabling one resumes where it stopped. The Package
   * Manager gets the updated remote list before this returns, so it shows
   * them disabled by the time indexing is reported as ended.
   * @param remotes - the cancelled remotes
   */
  private async disableCancelled(remotes: string[]): Promise<void> {
    let files: RemotesFiles | undefined;
    await PackageManagerRemotesWatcher.pause(
      async () => {
        for (const remote of remotes) {
          try {
            await this.pkgManager.disableRemote(remote);
          } catch (error) {
            logger.warn(`Failed to disable custom remote '${remote}':`, error);
          }
        }
        try {
          // Read before the list, so the list is at least as new as the files
          files = await PackageManagerRemotesWatcher.readFiles?.();
          return await listWebviewRemotes(this.pkgManager, this);
        } catch (error) {
          // The Package Manager then reloads the list itself
          logger.warn("Failed to read the remote list:", error);
          return undefined;
        }
      },
      (list) => (list && files ? { remotes: list, files } : undefined),
    );
    const names = remotes.join(", ");
    void vscode.window.showInformationMessage(
      remotes.length === 1
        ? vscode.l10n.t(
            "CFS: Indexing of {0} was cancelled and the remote was disabled. Enable it in the Remotes tab to resume.",
            names,
          )
        : vscode.l10n.t(
            "CFS: Indexing of {0} was cancelled and the remotes were disabled. Enable them in the Remotes tab to resume.",
            names,
          ),
    );
  }

  /**
   * Logs the failures of an update, tells the user about remotes that
   * started failing, and keeps the failures for {@link getFailure}.
   * @param failures - the failures of the update
   * @returns whether a remote started or stopped failing, or fails differently
   */
  private report(failures: CustomRemoteFailure[]): boolean {
    for (const { remote, error } of failures) {
      logger.warn(`Indexing custom remote '${remote}' failed:`, error);
    }
    const previous = this.failures;
    this.failures = new Map(
      failures.map((failure) => [failure.remote, failure]),
    );
    const fresh = [...this.failures.keys()].filter(
      (name) => !previous.has(name),
    );
    if (fresh.length > 0) {
      void vscode.window.showErrorMessage(
        vscode.l10n.t(
          "CFS: Could not update custom remotes: {0}. Check your connection or log in to them again.",
          fresh.join(", "),
        ),
      );
    }
    return (
      previous.size !== this.failures.size ||
      [...this.failures.values()].some(
        (failure) => !isSameFailure(previous.get(failure.remote), failure),
      )
    );
  }
}

/** Whether two failures would be shown the same way. */
function isSameFailure(
  a: CustomRemoteFailure | undefined,
  b: CustomRemoteFailure,
): boolean {
  return (
    a !== undefined &&
    Boolean(a.auth) === Boolean(b.auth) &&
    String(a.error) === String(b.error)
  );
}
