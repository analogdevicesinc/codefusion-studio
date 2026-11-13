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
import {
  CtiConfigTreeProvider,
  CtiConfigItem,
  CtiConnectionItem,
  CtiTriggerItem,
  SerializedConnection,
} from "./tree-provider";
import { TraceManager, CtiNoCapacityError } from "../trace/trace-manager";
import { CfsDebugManager, CfsDebugSession } from "../debug-manager";
import { Mutex } from "../../utils/mutex";
import { v0_1, type CtiConfigFile } from "./cti-config-schema";
import type { ValidateFunction } from "ajv";
import { ajv } from "../../utils/ajv-wrapper";
import type { CtiTriggerPair } from "../trace/trace-types";

let v0_1Validator: ValidateFunction<v0_1.CtiConfigFile> | undefined;

/**
 * Manages the CTI Configuration view and commands.
 */
export class CfsCtiConfigView {
  private static nInstances: number = 0;
  private treeProvider: CtiConfigTreeProvider;
  private disposables: vscode.Disposable[] = [];
  private static readonly STORAGE_KEY = "cfs.cti.connections";
  private traceManager: TraceManager;
  private debugManager: CfsDebugManager;
  private ctiMutex: Mutex = new Mutex();
  private sessionDisposables = new Map<string, vscode.Disposable[]>();
  /**
   * True once reconciliation is considered complete for the current target
   * session. Set after a successful commit or a user dismissal (which discards
   * all shown hardware connections); left false on hardware failures so the
   * next halt retries. Reset when the last session stops.
   */
  private reconciled = false;
  /**
   * Identity token for the reconciliation currently in progress.
   * A halt that arrives while this is set skips reconciliation and goes
   * straight to applyConnections; the next halt retries if still needed.
   * Cleared when reconciliation finishes or when the last session stops
   * (which also orphans any open picker so its result cannot affect the
   * next session's state).
   */
  private reconciliationToken: object | undefined;

  /**
   * Creates the CTI Configuration view, restoring persisted connections, registering
   * the tree view and all commands, and wiring into the debug session lifecycle.
   * @param context The VS Code extension context used for workspace state and icon resolution.
   * @param traceManager The trace manager used to issue CTI connect/disconnect calls.
   * @param debugManager The debug manager used to listen for session start/halt/stop events.
   */
  constructor(
    context: vscode.ExtensionContext,
    traceManager: TraceManager,
    debugManager: CfsDebugManager,
  ) {
    this.traceManager = traceManager;
    this.debugManager = debugManager;
    // Detect multiple instances without falling into singleton trap
    // (i.e. forcing dependency injection if actually needed)
    CfsCtiConfigView.nInstances++;
    if (CfsCtiConfigView.nInstances > 1) {
      throw new Error("Only one instance of CfsCtiConfigView is allowed.");
    }

    // Create the provider first so that extensionContext is initialised before
    // any CtiConnectionItem or CtiTriggerItem can call toTreeItem().
    this.treeProvider = new CtiConfigTreeProvider(context, []);
    this.disposables.push(this.treeProvider);

    // Restore connections saved from the previous session.
    const serialized = context.workspaceState.get<SerializedConnection[]>(
      CfsCtiConfigView.STORAGE_KEY,
      [],
    );
    this.treeProvider.addConnections(
      serialized.map(CtiConnectionItem.fromSerialized),
    );

    // Persist changes into workspace state.
    this.disposables.push(
      this.treeProvider.onDidChangeTreeData(() => {
        const connections = this.treeProvider
          .getConnections()
          .map((connection) => connection.serialize());
        void context.workspaceState.update(
          CfsCtiConfigView.STORAGE_KEY,
          connections,
        );
      }),
    );

    // Register tree view
    const treeView = vscode.window.createTreeView("cfs.ctiConfig", {
      treeDataProvider: this.treeProvider,
      showCollapseAll: true,
    });
    this.disposables.push(treeView);

    this.disposables.push(
      treeView.onDidChangeCheckboxState(async (event) => {
        if (this.blockIfRunning()) {
          this.treeProvider.refresh();
          return;
        }
        for (const [item, state] of event.items) {
          if (!(item instanceof CtiConnectionItem)) {
            continue;
          }

          const enabled = state === vscode.TreeItemCheckboxState.Checked;
          this.treeProvider.setConnectionEnabled(item, enabled);
        }
        const session = this.traceManager.getDebugSession();
        if (session) {
          await this.applyConnections(session);
        }
      }),
    );

    // Register commands
    this.registerCommands();

    this.disposables.push(
      this.debugManager.onStartSession((session) =>
        this.onSessionStart(session),
      ),
    );
  }

  /**
   * Wires up per-session event handlers when a new debug session starts.
   * Transitions enabled connections to Pending and subscribes to halt/stop events.
   * On the first non-entry halt, device connections absent from the UI are discovered
   * and the user is prompted to keep or discard each one before connections are applied.
   * Confirming keeps selected connections and discards the rest; dismissing the picker
   * (Escape or click away) discards all shown connections from hardware.
   * Subsequent halts skip reconciliation and apply connections directly.
   * @param session The debug session that just started.
   */
  private async onSessionStart(session: CfsDebugSession): Promise<void> {
    const disposables: vscode.Disposable[] = [];
    this.sessionDisposables.set(session.vscodeSession.id, disposables);
    disposables.push(
      session.onHalt(async (info) => {
        if (info.reason == "entry" && this.sessionDisposables.size <= 1) {
          // No other session active — reset connections to Pending so the UI
          // reflects that this is the first session starting up.
          this.setAllConnectionsPending();
          return;
        }
        // TODO(CFSIO-26502): cover the case where a second core's entry halt
        // triggers reconciliation while the first core's connections are Active.
        // Non-entry halt, or entry halt while another session is already active:
        // reconcile once then apply, without resetting Active connections.
        await this.tryReconcileAndApply(session);
      }),
      session.onStop(async () => {
        disposables.forEach((d) => d.dispose());
        this.sessionDisposables.delete(session.vscodeSession.id);
        if (this.debugManager.getAllSessions().length === 0) {
          this.reconciled = false;
          this.reconciliationToken = undefined;
          await this.ctiMutex.withLock(() => this.setAllConnectionsOffline());
          return;
        }
        // A non-last session stopped. Defer so sessions.delete has run before we
        // inspect the remaining sessions. If a halted session remains, retry the
        // full reconcile+apply flow through it — hardware that was unreachable
        // while this session was running is now accessible.
        void Promise.resolve().then(async () => {
          const lastHalted = this.traceManager.getDebugSession();
          if (lastHalted) {
            await this.tryReconcileAndApply(lastHalted);
          }
        });
      }),
    );

    // Transition enabled connections to Pending immediately so the UI reflects
    // that a session is active while waiting for the adapter to become ready.
    await this.applyConnections(session);
  }

  /**
   * Reads the current hardware CTI trigger mappings, finds connections that are active
   * on the device but absent from the UI, and prompts the user to keep or discard each
   * one. Kept connections are added to the tree as Active; discarded ones are
   * disconnected from the device immediately.
   *
   * A device connection is considered different from a UI connection if the resulting set
   * of input or output triggers does not exactly match any existing UI connection.
   */
  private async reconcileDeviceConnections(
    session: CfsDebugSession,
  ): Promise<"completed" | "failed"> {
    type ReconcileItem = {
      label: string;
      description: string;
      detail: string | undefined;
      picked: boolean;
      conn: CtiTriggerPair;
      supersedes: CtiConnectionItem[];
    };

    // Capture halt identity synchronously before the first await so that a
    // resume+halt during the hardware read cannot update lastStopInfo and cause
    // Phase 3 to accept choices built from a stale read.
    const haltToken = session.lastStopInfo;

    // Read hardware state and compute items under the lock so no other hardware
    // operation interleaves between the hardware read and building the dialog list.
    // deviceConnections is hoisted so Phase 3 can check whether a superseded UI
    // item has a separate exact hardware channel that must also be disconnected.
    let items: ReconcileItem[] | undefined;
    let hardwareReadSucceeded = false;
    let deviceConnections: CtiTriggerPair[] = [];
    await this.ctiMutex.withLock(async () => {
      try {
        deviceConnections = await this.traceManager.ctiReadActiveConnections();
      } catch {
        return;
      }
      // Validate that the session is still active at the same halt after the async read.
      if (
        !this.sessionDisposables.has(session.vscodeSession.id) ||
        !session.isHalted() ||
        session.lastStopInfo !== haltToken
      ) {
        return;
      }
      hardwareReadSucceeded = true;

      if (deviceConnections.length === 0) {
        return;
      }

      const uiConnections = this.treeProvider.getConnections();

      // Classify each device connection into one of three buckets:
      // - Matches an enabled UI connection  → already reconciled, skip.
      // - Matches a disabled UI connection  → disconnect silently so the device
      //   honours the disabled UI state instead of staying connected.
      // - No UI match at all               → offer in the QuickPick dialog.
      const disabledMatches: CtiTriggerPair[] = [];
      const unknownConnections = deviceConnections.filter(
        ({ inputTriggers, outputTriggers }) => {
          const candidate = new CtiConnectionItem(
            inputTriggers,
            outputTriggers,
          );
          const match = uiConnections.find((uiConn) =>
            uiConn.equals(candidate),
          );
          if (!match) return true;
          if (!match.isEnabled) {
            disabledMatches.push({ inputTriggers, outputTriggers });
          } else {
            match.setState("Active");
          }
          return false;
        },
      );

      let anyDisabledDisconnectFailed = false;
      for (const { inputTriggers, outputTriggers } of disabledMatches) {
        try {
          await this.traceManager.ctiDisconnect(inputTriggers, outputTriggers);
          // Remove from the snapshot so Phase 3's hasExactChannel check does not
          // find a stale entry and attempt a redundant disconnect.
          const idx = deviceConnections.findIndex((dc) => {
            const candidate = new CtiConnectionItem(
              dc.inputTriggers,
              dc.outputTriggers,
            );
            return candidate.equals(
              new CtiConnectionItem(inputTriggers, outputTriggers),
            );
          });
          if (idx !== -1) deviceConnections.splice(idx, 1);
        } catch {
          anyDisabledDisconnectFailed = true;
        }
      }
      if (anyDisabledDisconnectFailed) {
        // Signal failure so reconcileDeviceConnections returns "failed", which
        // keeps `reconciled` false and allows the next halt to retry.
        // Without this, the UI stays Offline while the hardware route remains
        // active and is never retried within this session.
        hardwareReadSucceeded = false;
        void vscode.window.showErrorMessage(
          vscode.l10n.t(
            "CTI: failed to clear one or more disabled connections from hardware; will retry on next halt.",
          ),
        );
        return;
      }

      if (unknownConnections.length === 0) {
        return;
      }

      // For each unknown device connection, also find UI connections whose trigger
      // sets are subsets of it (UI ⊆ device). If the user keeps the device
      // connection, those narrower UI entries are removed to prevent applyConnections
      // from re-applying them on a conflicting channel.
      // The reverse (device ⊆ UI) is intentionally not handled here: the device
      // connection and the wider UI entry target different channel configurations,
      // so they must be kept distinct to avoid masking a connection the user
      // explicitly configured.
      items = unknownConnections.map(({ inputTriggers, outputTriggers }) => {
        const supersedes = uiConnections.filter(
          (uiConn) =>
            uiConn.inputTriggers.every((t) => inputTriggers.includes(t.name)) &&
            uiConn.outputTriggers.every((t) => outputTriggers.includes(t.name)),
        );

        const replacesDetail =
          supersedes.length > 0
            ? vscode.l10n.t(
                "Replaces: {0}",
                supersedes
                  .map((c) =>
                    CfsCtiConfigView.formatCtiLabel(
                      c.inputTriggers.map((t) => t.name),
                      c.outputTriggers.map((t) => t.name),
                    ),
                  )
                  .join("; "),
              )
            : undefined;

        return {
          label: inputTriggers.join(", "),
          description: vscode.l10n.t("→ {0}", outputTriggers.join(", ")),
          detail: replacesDetail,
          picked: true,
          conn: { inputTriggers, outputTriggers },
          supersedes,
        };
      });
    });

    if (!hardwareReadSucceeded) {
      return "failed";
    }
    if (!items) {
      return "completed";
    }

    // Show the dialog outside the lock — showQuickPick is unbounded and holding
    // the mutex would block applyConnections and any other hardware operations
    // until the user responds.
    if (
      !this.sessionDisposables.has(session.vscodeSession.id) ||
      !session.isHalted() ||
      session.lastStopInfo !== haltToken
    ) {
      return "failed";
    }
    const selected = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      title: vscode.l10n.t("CTI connections found on device"),
      placeHolder: vscode.l10n.t(
        "Select connections to keep — dismiss (Escape) to discard all",
      ),
    });

    if (selected === undefined) {
      // User dismissed — discard all shown hardware connections.
      const capturedItemsForDiscard = items;
      let sessionInvalid = false;
      let allDiscarded = true;
      await this.ctiMutex.withLock(async () => {
        if (
          !this.sessionDisposables.has(session.vscodeSession.id) ||
          !session.isHalted() ||
          session.lastStopInfo !== haltToken
        ) {
          sessionInvalid = true;
          return;
        }
        for (const { conn } of capturedItemsForDiscard) {
          try {
            await this.traceManager.ctiDisconnect(
              conn.inputTriggers,
              conn.outputTriggers,
            );
          } catch {
            allDiscarded = false;
          }
        }
        this.treeProvider.refresh();
      });
      if (sessionInvalid) {
        return "failed";
      }
      if (!allDiscarded) {
        void vscode.window.showErrorMessage(
          vscode.l10n.t(
            "CTI: failed to discard one or more connections from hardware; will retry on next halt.",
          ),
        );
      }
      return allDiscarded ? "completed" : "failed";
    }

    // Apply choices under the lock: UI updates and hardware disconnects must not
    // interleave with applyConnections or other halt handlers.
    // Guard against the session having stopped while the dialog was open — onStop
    // would have already marked everything Offline and removed the session.
    // Also guard against a resume+halt cycle: lastStopInfo is a fresh object on
    // every halt, so a reference change means the choices are based on stale
    // hardware state and must be discarded.
    let committed = false;
    const capturedItems = items;
    await this.ctiMutex.withLock(async () => {
      if (
        !this.sessionDisposables.has(session.vscodeSession.id) ||
        !session.isHalted() ||
        session.lastStopInfo !== haltToken
      ) {
        return;
      }
      const selectedSet = new Set(selected);
      let anyDiscardFailed = false;
      for (const item of capturedItems) {
        if (selectedSet.has(item)) {
          // Track superseded rows whose hardware was cleared so we can mark
          // them for reapplication if a later disconnect in the same item fails
          // and we have to keep them in the tree.
          const hardwareCleared: CtiConnectionItem[] = [];
          const toRemove: CtiConnectionItem[] = [];
          let anySupersededDisconnectFailed = false;
          for (const superseded of item.supersedes) {
            // If the superseded UI entry also maps to its own exact hardware
            // channel (distinct from the wider channel being kept), disconnect
            // it first. When no exact channel exists the entry was only a
            // conceptual subset with no independent hardware mapping — safe to
            // remove. When disconnection fails the hardware route remains active,
            // so keep the UI item and abort this replacement so the next halt
            // can retry.
            const hasExactChannel = deviceConnections.some((dc) => {
              const candidate = new CtiConnectionItem(
                dc.inputTriggers,
                dc.outputTriggers,
              );
              return superseded.equals(candidate);
            });
            if (hasExactChannel) {
              try {
                await this.traceManager.ctiDisconnect(
                  superseded.inputTriggers.map((t) => t.name),
                  superseded.outputTriggers.map((t) => t.name),
                );
                // Remove from the snapshot so a later item superseding the same
                // UI group does not find a stale entry and attempt a second disconnect.
                const idx = deviceConnections.findIndex((dc) => {
                  const candidate = new CtiConnectionItem(
                    dc.inputTriggers,
                    dc.outputTriggers,
                  );
                  return superseded.equals(candidate);
                });
                if (idx !== -1) deviceConnections.splice(idx, 1);
                hardwareCleared.push(superseded);
              } catch {
                anySupersededDisconnectFailed = true;
                break;
              }
            }
            toRemove.push(superseded);
          }
          if (anySupersededDisconnectFailed) {
            // Some hardware was already cleared for this item's superseded rows.
            // Mark those rows Offline so applyConnections re-applies them on the
            // next halt — their hardware was removed but the UI rows are kept.
            for (const cleared of hardwareCleared) {
              cleared.setState("Offline");
            }
            anyDiscardFailed = true;
            continue;
          }
          for (const superseded of toRemove) {
            this.treeProvider.removeItem(superseded);
          }
          const connection = this.treeProvider.addConnection(
            item.conn.inputTriggers,
            item.conn.outputTriggers,
          );
          connection.setState("Active");
        } else {
          try {
            await this.traceManager.ctiDisconnect(
              item.conn.inputTriggers,
              item.conn.outputTriggers,
            );
          } catch {
            anyDiscardFailed = true;
          }
        }
      }
      this.treeProvider.refresh();
      if (anyDiscardFailed) {
        // Do not set committed so reconcileDeviceConnections returns "failed",
        // keeping `reconciled` false and allowing the next halt to re-offer
        // the still-active hardware connections for discard.
        void vscode.window.showErrorMessage(
          vscode.l10n.t(
            "CTI: failed to discard one or more connections from hardware; will retry on next halt.",
          ),
        );
        return;
      }
      committed = true;
    });
    return committed ? "completed" : "failed";
  }

  private static formatCtiLabel(inputs: string[], outputs: string[]): string {
    return `${inputs.join(", ")} → ${outputs.join(", ")}`;
  }

  /**
   * Sets all enabled connections to Pending and disabled ones to Offline.
   * Called on the entry halt before hardware connections are applied.
   */
  private setAllConnectionsPending(): void {
    for (const connection of this.treeProvider.getConnections()) {
      if (connection.isEnabled) {
        connection.setState("Pending");
      } else {
        connection.setState("Offline");
      }
    }
    this.treeProvider.refresh();
  }

  /**
   * Sets all connections to Offline. Called when the debug session stops.
   */
  private setAllConnectionsOffline(): void {
    for (const connection of this.treeProvider.getConnections()) {
      connection.setState("Offline");
    }
    this.treeProvider.refresh();
  }

  private async disconnectToOffline(
    connection: CtiConnectionItem,
  ): Promise<void> {
    const inputs = connection.inputTriggers.map((t) => t.name);
    const outputs = connection.outputTriggers.map((t) => t.name);
    try {
      await this.traceManager.ctiDisconnect(inputs, outputs);
    } catch {
      // Disconnect failed; the next session's reconciliation will detect the
      // stale mapping and offer to discard it.
    }
    connection.setState("Offline");
  }

  /**
   * Reconciles device connections (if not already done for this session) then
   * applies all enabled connections through the given halted session.
   * Used by both the per-session `onHalt` handler and the deferred retry that
   * runs when a non-last running session stops and a halted session remains.
   *
   * Only one reconciliation runs at a time. A halt that arrives while one is
   * in progress skips the dialog and goes straight to applyConnections; the
   * next halt retries reconciliation if it failed. The token object ensures
   * that a picker left open after the last session stops cannot update the
   * state of the next debug session.
   * @param session The halted session to reconcile and apply through.
   */
  private async tryReconcileAndApply(session: CfsDebugSession): Promise<void> {
    if (this.reconciliationToken) {
      // Picker is open — skip entirely to avoid allocating channels between
      // Phase 1's hardware snapshot and Phase 3's superseded-row check.
      // Application runs for all halted sessions once the picker resolves.
      return;
    }
    if (!this.reconciled) {
      const token = {};
      this.reconciliationToken = token;
      try {
        const result = await this.reconcileDeviceConnections(session);
        if (this.reconciliationToken === token && result !== "failed") {
          this.reconciled = true;
        }
      } finally {
        if (this.reconciliationToken === token) {
          this.reconciliationToken = undefined;
        }
      }
      // Apply through any other halted sessions that were skipped while the
      // picker was open so their connections do not remain stuck in Pending.
      for (const other of this.debugManager.getAllSessions()) {
        if (other !== session && other.isHalted()) {
          await this.applyConnections(other);
        }
      }
    }
    await this.applyConnections(session);
  }

  private applyConnections(session: CfsDebugSession): Promise<void> {
    return this.ctiMutex.withLock(() => this.applyConnectionsImpl(session));
  }

  /**
   * Applies `connection` to hardware when the session is halted. Must be called
   * while holding `ctiMutex`. Callers that modify the trigger list of an Active
   * connection must disconnect it first (via `disconnectToOffline`) before calling
   * this — `ctiConnect` is idempotent (no-op for an exact match) but does not
   * replace a changed mapping; without the prior disconnect both groups would remain
   * active simultaneously.
   */
  private async tryApplyConnection(
    connection: CtiConnectionItem,
    session: CfsDebugSession,
  ): Promise<void> {
    if (!session.isHalted()) return;
    const inputNames = connection.inputTriggers.map((t) => t.name);
    const outputNames = connection.outputTriggers.map((t) => t.name);
    try {
      await this.traceManager.ctiConnect(inputNames, outputNames);
      connection.setState("Active");
    } catch (err) {
      connection.setState(
        "Error",
        err instanceof CtiNoCapacityError
          ? vscode.l10n.t("No CTI channels available.")
          : String(err),
      );
    }
  }

  private async applyConnectionsImpl(session: CfsDebugSession) {
    // Guard: if the session was already cleaned up by onStop (sessionDisposables
    // entry deleted synchronously before the mutex was queued), bail out to
    // prevent stale completions from committing state after session termination.
    if (!this.sessionDisposables.has(session.vscodeSession.id)) {
      return;
    }
    return vscode.window.withProgress(
      { location: { viewId: "cfs.ctiConfig" } },
      async () => {
        // TODO Remove this once the req actions are included on DataModel
        if (session.isHalted()) {
          try {
            await this.traceManager.ctiCleanACKTriggerOutputs();
          } catch {
            // ACK failure is non-fatal; proceed so connection states are not left stale.
          }
        }
        // Connections must be applied sequentially: each connectGroup reads live
        // hardware status to find a free channel, so concurrent calls would all
        // read the same initial state and claim the same channel.
        for (const connection of this.treeProvider.getConnections().slice()) {
          switch (connection.getState()) {
            // @ts-expect-error TS7029 — intentional fallthrough: Offline→Pending shares connection logic
            case "Offline":
              if (!connection.isEnabled) {
                // Disabled connections are skipped
                break;
              }
              connection.setState("Pending");
            case "Pending":
              if (!connection.isEnabled) {
                connection.setState("Offline");
                break;
              }
              await this.tryApplyConnection(connection, session);
              break;
            case "Active":
              // Issues a disconnect only when the connection has been disabled while halted.
              if (!connection.isEnabled && session.isHalted()) {
                await this.disconnectToOffline(connection);
              }
              break;
            case "Error":
              if (!connection.isEnabled) {
                connection.setState("Offline");
              } else if (session.isHalted()) {
                // Re-enabled — retry the connection immediately.
                connection.setState("Pending");
                await this.tryApplyConnection(connection, session);
              }
              break;
          }
        }
        // Note that above calls are direct access to the connection item
        // so they don't trigger a tree refresh on every individual state change.
        // Instead, we will update here all at once for a better UI experience
        this.treeProvider.refresh();
      },
    );
  }

  /**
   * Removes a connection or trigger item. Blocked while the target is running;
   * allowed when halted (hardware is reachable) or when there is no active session.
   * Active connections are disconnected from hardware before the row is removed.
   * Removing a trigger from an enabled connection re-applies it with fewer triggers.
   * @param item The connection or trigger to remove.
   */
  private async removeItem(item: CtiConfigItem): Promise<void> {
    if (this.blockIfRunning()) {
      return;
    }

    const session = this.traceManager.getDebugSession();

    if (item instanceof CtiTriggerItem) {
      const connection = item.parentConnection;
      const isLastInput =
        item.direction === "input" && connection.inputTriggers.length === 1;
      const isLastOutput =
        item.direction === "output" && connection.outputTriggers.length === 1;

      if (isLastInput || isLastOutput) {
        // Last trigger on one side — disconnect hardware (if applied) and remove atomically.
        await this.ctiMutex.withLock(async () => {
          if (this.blockIfRunning()) return;
          const activeSession = this.traceManager.getDebugSession();
          if (activeSession && connection.getState() === "Active") {
            await this.disconnectToOffline(connection);
          }
          this.treeProvider.removeItem(connection);
        });
        return;
      }

      // Removing a single trigger re-applies the connection with fewer triggers.
      // Re-check inside the lock, disconnect the old hardware group (if active) before
      // removing the trigger, then update state — all atomically so the target cannot
      // resume between operations.
      let effective = connection;
      await this.ctiMutex.withLock(async () => {
        if (this.blockIfRunning()) return;
        if (connection.getState() === "Active") {
          await this.disconnectToOffline(connection);
        }
        this.treeProvider.removeItem(item);
        effective = this.treeProvider.mergeIfDuplicate(connection);
        if (
          effective.isEnabled &&
          session &&
          effective.getState() !== "Active"
        ) {
          this.treeProvider.setConnectionState(effective, "Pending");
        }
      });
      if (effective.isEnabled && session) {
        await this.applyConnections(session);
      }
      return;
    }

    // Connection removal: disconnect from hardware and remove atomically so no
    // concurrent applyConnections can re-apply the connection between the two steps.
    await this.ctiMutex.withLock(async () => {
      if (this.blockIfRunning()) return;
      const activeSession = this.traceManager.getDebugSession();
      if (activeSession && item.getState() === "Active") {
        await this.disconnectToOffline(item);
      }
      this.treeProvider.removeItem(item);
    });
  }

  /**
   * Registers all VS Code commands contributed by the CTI Configuration view with the
   * extension context's disposables list.
   */
  private registerCommands(): void {
    this.disposables.push(
      vscode.commands.registerCommand(
        "cfs.ctiConfig.createConnection",
        async () => {
          await this.createConnection();
        },
      ),
      vscode.commands.registerCommand(
        "cfs.ctiConfig.removeItem",
        async (item: CtiConfigItem) => {
          await this.removeItem(item);
        },
      ),
      vscode.commands.registerCommand(
        "cfs.ctiConfig.renameConnection",
        async (item: CtiConnectionItem) => {
          await this.renameConnection(item);
        },
      ),
      vscode.commands.registerCommand(
        "cfs.ctiConfig.addTriggerInput",
        async (connection: CtiConnectionItem) => {
          await this.addTriggerInput(connection);
        },
      ),
      vscode.commands.registerCommand(
        "cfs.ctiConfig.addTriggerOutput",
        async (connection: CtiConnectionItem) => {
          await this.addTriggerOutput(connection);
        },
      ),
      vscode.commands.registerCommand(
        "cfs.ctiConfig.export",
        async (connection?: CtiConnectionItem) => {
          await this.exportConfiguration(connection);
        },
      ),
      vscode.commands.registerCommand("cfs.ctiConfig.import", async () => {
        await this.importConfiguration();
      }),
    );
  }

  /**
   * Returns `true` and shows an informational message when any active session
   * is running (not halted), signalling that the caller should abort.
   * Changes are allowed only when there is no session or all sessions are halted.
   */
  private blockIfRunning(): boolean {
    const running = this.debugManager
      .getAllSessions()
      .find((s) => !s.isHalted());
    if (!running) {
      return false;
    }
    void vscode.window.showInformationMessage(
      vscode.l10n.t(
        "CTI configuration cannot be modified while the target is running.",
      ),
    );
    return true;
  }

  /**
   * Prompts the user to select input and output triggers and creates a new CTI connection.
   * Blocked while the target is running; allowed when halted or no session.
   * If a debug session is active and the connection is enabled, it is immediately
   * submitted for hardware application.
   */
  private async createConnection(): Promise<void> {
    if (this.blockIfRunning()) {
      return;
    }

    const selectedInputs = await this.selectInputTriggers();
    if (!selectedInputs?.length) {
      return;
    }

    const selectedOutputs = await this.selectOutputTriggers();
    if (!selectedOutputs?.length) {
      return;
    }

    // Re-check: target may have started running while the picker was open.
    if (this.blockIfRunning()) {
      return;
    }
    this.treeProvider.addConnection(selectedInputs, selectedOutputs);
    const session = this.traceManager.getDebugSession();
    if (session) {
      await this.applyConnections(session);
    }
  }

  /**
   * Shows a multi-select quick-pick of available input triggers.
   * @param exclude Optional set of trigger names to omit from the list.
   * @returns The selected trigger names, or undefined if the user cancelled.
   */
  private async selectInputTriggers(
    exclude?: Set<string>,
  ): Promise<string[] | undefined> {
    const all = await this.traceManager.ctiGetTriggers("input");
    if (all.length === 0) {
      await vscode.window.showInformationMessage(
        vscode.l10n.t(
          "No CTI/CTM input triggers found. Make sure a target with CTI hardware is configured.",
        ),
      );
      return undefined;
    }
    const availableTriggers = exclude
      ? all.filter((trigger) => !exclude.has(trigger))
      : all;

    if (availableTriggers.length === 0) {
      await vscode.window.showInformationMessage(
        vscode.l10n.t(
          "All CTI/CTM input triggers are already assigned to this connection.",
        ),
      );
      return undefined;
    }

    return vscode.window.showQuickPick(availableTriggers, {
      canPickMany: true,
      placeHolder: vscode.l10n.t(
        "Select input triggers (press space to select multiple)",
      ),
      title: vscode.l10n.t("CTI Connection - Select Inputs"),
    });
  }

  /**
   * Shows a multi-select quick-pick of available output triggers.
   * @param exclude Optional set of trigger names to omit from the list.
   * @returns The selected trigger names, or undefined if the user cancelled.
   */
  private async selectOutputTriggers(
    exclude?: Set<string>,
  ): Promise<string[] | undefined> {
    const all = await this.traceManager.ctiGetTriggers("output");
    if (all.length === 0) {
      await vscode.window.showInformationMessage(
        vscode.l10n.t(
          "No CTI/CTM output triggers found. Make sure a target with CTI hardware is configured.",
        ),
      );
      return undefined;
    }
    const availableTriggers = exclude
      ? all.filter((trigger) => !exclude.has(trigger))
      : all;

    if (availableTriggers.length === 0) {
      await vscode.window.showInformationMessage(
        vscode.l10n.t(
          "All CTI/CTM output triggers are already assigned to this connection.",
        ),
      );
      return undefined;
    }

    return vscode.window.showQuickPick(availableTriggers, {
      canPickMany: true,
      placeHolder: vscode.l10n.t(
        "Select output triggers (press space to select multiple)",
      ),
      title: vscode.l10n.t("CTI Connection - Select Outputs"),
    });
  }

  /**
   * Prompts the user for a new display name and applies it to `connection`.
   * @param connection The connection to rename.
   */
  private async renameConnection(connection: CtiConnectionItem): Promise<void> {
    const newName = (
      await vscode.window.showInputBox({
        prompt: vscode.l10n.t("Type a new name for your connection"),
        value: connection.name,
      })
    )?.trim();

    if (newName) {
      this.treeProvider.renameConnection(connection, newName);
    }
  }

  /**
   * Prompts the user to select additional input triggers and appends them to `connection`.
   * Triggers already present on the connection are excluded from the picker.
   * Blocked while the target is running; if the connection is enabled and the target is
   * halted, the old hardware group is disconnected before the new trigger list is applied.
   * @param connection The connection to extend with new input triggers.
   */
  private async addTriggerInput(connection: CtiConnectionItem): Promise<void> {
    if (this.blockIfRunning()) {
      return;
    }
    const existingNames = new Set(connection.inputTriggers.map((t) => t.name));
    const selected = await this.selectInputTriggers(existingNames);
    if (!selected?.length) {
      return;
    }
    const session = this.traceManager.getDebugSession();
    // Re-check inside the lock: the target may have resumed while the picker was
    // open or while waiting to acquire the mutex.
    // Disconnect the current hardware group (if active) before expanding the trigger
    // list so ctiConnect does not leave both the old and new groups active simultaneously.
    let effective = connection;
    await this.ctiMutex.withLock(async () => {
      if (this.blockIfRunning()) return;
      if (connection.getState() === "Active") {
        await this.disconnectToOffline(connection);
      }
      this.treeProvider.addInputTriggers(connection, selected);
      effective = this.treeProvider.mergeIfDuplicate(connection);
      if (effective.isEnabled && session && effective.getState() !== "Active") {
        this.treeProvider.setConnectionState(effective, "Pending");
      }
    });
    if (effective.isEnabled && session) {
      await this.applyConnections(session);
    }
  }

  /**
   * Prompts the user to select additional output triggers and appends them to `connection`.
   * Triggers already present on the connection are excluded from the picker.
   * Blocked while the target is running; if the connection is enabled and the target is
   * halted, the old hardware group is disconnected before the new trigger list is applied.
   * @param connection The connection to extend with new output triggers.
   */
  private async addTriggerOutput(connection: CtiConnectionItem): Promise<void> {
    if (this.blockIfRunning()) {
      return;
    }
    const existingNames = new Set(connection.outputTriggers.map((t) => t.name));
    const selected = await this.selectOutputTriggers(existingNames);
    if (!selected?.length) {
      return;
    }
    const session = this.traceManager.getDebugSession();
    // Re-check inside the lock: the target may have resumed while the picker was
    // open or while waiting to acquire the mutex.
    // Disconnect the current hardware group (if active) before expanding the trigger
    // list so ctiConnect does not leave both the old and new groups active simultaneously.
    let effective = connection;
    await this.ctiMutex.withLock(async () => {
      if (this.blockIfRunning()) return;
      if (connection.getState() === "Active") {
        await this.disconnectToOffline(connection);
      }
      this.treeProvider.addOutputTriggers(connection, selected);
      effective = this.treeProvider.mergeIfDuplicate(connection);
      if (effective.isEnabled && session && effective.getState() !== "Active") {
        this.treeProvider.setConnectionState(effective, "Pending");
      }
    });
    if (effective.isEnabled && session) {
      await this.applyConnections(session);
    }
  }

  /**
   * Saves the CTI configuration to a JSON file chosen by the user via a save dialog.
   * Exports only the specified `connection` when provided; otherwise exports all connections.
   * @param connection Optional single connection to export; omit to export all connections.
   */
  private async exportConfiguration(
    connection?: CtiConnectionItem,
  ): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      filters: { JSON: ["json"] },
    });
    if (!uri) {
      return;
    }

    const data: CtiConfigFile = {
      schemaVersion: "0.1",
      connections: (connection
        ? [connection]
        : this.treeProvider.getConnections()
      ).map((item) => {
        const s = item.serialize();
        return {
          customName: s.customName,
          inputTriggers: s.inputTriggers,
          outputTriggers: s.outputTriggers,
        };
      }),
    };
    await vscode.workspace.fs.writeFile(
      uri,
      new TextEncoder().encode(JSON.stringify(data, null, 2)),
    );

    const action = await vscode.window.showInformationMessage(
      vscode.l10n.t("CTI configuration exported successfully"),
      vscode.l10n.t("Open File"),
      vscode.l10n.t("Show in Folder"),
    );
    if (action === vscode.l10n.t("Open File")) {
      await vscode.window.showTextDocument(uri);
    } else if (action === vscode.l10n.t("Show in Folder")) {
      await vscode.commands.executeCommand("revealFileInOS", uri);
    }
  }

  /**
   * Opens a file picker, reads and validates a CTI configuration file,
   * and merges any new (non-duplicate) connections into the current configuration.
   * Blocked while the target is running; if a debug session is active the imported
   * connections are applied to hardware immediately.
   */
  private async importConfiguration(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: { JSON: ["json"] },
      openLabel: vscode.l10n.t("Import"),
    });
    if (!uris?.length) {
      return;
    }

    try {
      const content = await vscode.workspace.fs.readFile(uris[0]);
      const parsed: unknown = JSON.parse(new TextDecoder().decode(content));
      if (!v0_1Validator) {
        v0_1Validator = ajv.compile<v0_1.CtiConfigFile>(v0_1.ctiConfigSchema);
      }
      if (!v0_1Validator(parsed)) {
        throw new Error(
          vscode.l10n.t(
            "Invalid configuration format: {0}",
            ajv.errorsText(v0_1Validator.errors),
          ),
        );
      }
      if (this.blockIfRunning()) {
        return;
      }
      this.treeProvider.addConnections(
        parsed.connections.map((c) =>
          CtiConnectionItem.fromSerialized({ ...c, enabled: true }),
        ),
      );
      const session = this.traceManager.getDebugSession();
      if (session) {
        await this.applyConnections(session);
      }
    } catch (error) {
      void vscode.window.showErrorMessage(
        vscode.l10n.t("Failed to import configuration: {0}", String(error)),
      );
    }
  }

  /**
   * Disposes all registered disposables and decrements the instance counter so a
   * new instance can be created if the view is re-opened.
   */
  public dispose(): void {
    this.sessionDisposables.forEach((disposables) =>
      disposables.forEach((d) => d.dispose()),
    );
    this.sessionDisposables.clear();
    this.disposables.forEach((disposable) => disposable.dispose());
    if (CfsCtiConfigView.nInstances > 0) {
      CfsCtiConfigView.nInstances--;
    }
  }
}
