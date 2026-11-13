/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
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
import { LiveTrace } from "cfs-lib";
import type { DataSourceConfig } from "cfs-lib";
import { toZephelinConfig } from "./zephelin-config";
import { getWorkspaceRoot } from "../../utils/utils";

export interface LiveTracingOptions {
  /** Data source configuration */
  source: DataSourceConfig;
  /** Host address for the CTF data stream */
  tcpServerHost?: string;
  /** Port for the CTF data stream */
  tcpServerPort?: number;
  /** Host address for the backend server */
  backendHost?: string;
  /** Port for the backend server */
  backendPort?: number;
  /** Paths to TFLite Micro models */
  aiModels: string[];
  /** Build directory the backend reads the ELF from */
  buildDir: string;
  /**
   * Zephyr repository root the backend reads the CTF metadata from. Empty
   * when it could not be resolved, or when it is configured in the Zephelin
   * extension, in which case that setting is left to apply.
   */
  zephyrBase: string;
  backendPath?: string;
  pythonPath?: string;
}

/**
 * Orchestrates a live tracing session inside the VS Code extension host.
 */
export class LiveTracing {
  /** Tracks the state of the live tracing session */
  private _isActive: boolean = false;
  /** Stores initial configuration of the live tracing session */
  private readonly _options: LiveTracingOptions;

  /** Live tracing session */
  private liveTrace?: LiveTrace;

  /** Event emitter for broadcasting errors */
  private readonly _onError = new vscode.EventEmitter<Error>();
  /** Event that fires when an error occurs */
  readonly onError = this._onError.event;

  private constructor(options: LiveTracingOptions) {
    this._options = options;
  }

  /**
   * Starts a Live Tracing session.
   * @param options - Live Tracing configuration and environment context
   * @returns A managed instance of a Live Tracing session
   */
  static async start(options: LiveTracingOptions): Promise<LiveTracing> {
    const liveTracing = new LiveTracing(options);

    try {
      liveTracing._isActive = true;

      // Launches the backend and opens the Zephelin Trace webview.
      await liveTracing.launchLiveViewerExtension();

      // Forwards the CTF data stream to the backend's TCP server.
      liveTracing.liveTrace = await LiveTrace.start({
        source: options.source,
        tcpHost: options.tcpServerHost,
        tcpPort: options.tcpServerPort,
      });

      liveTracing.liveTrace.onError((error) => {
        if (liveTracing._isActive) {
          liveTracing._onError.fire(error);
        }
      });
    } catch (error) {
      liveTracing._onError.fire(
        new Error(`Failed during startup: ${(error as Error).message}`)
      );
      liveTracing.dispose();
      throw error;
    }

    return liveTracing;
  }

  /**
   * Returns whether the live trace session is currently active.
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Maps CFS configuration to the Zephelin extension and executes the viewer command.
   */
  private async launchLiveViewerExtension(): Promise<void> {
    const ztvExtension = vscode.extensions.getExtension(
      "antmicro.zephelin-trace"
    );
    if (!ztvExtension) {
      throw new Error(
        "The Zephelin Trace extension is not installed or enabled."
      );
    }

    if (!ztvExtension.isActive) {
      await ztvExtension.activate();
    }

    const externalConfig = toZephelinConfig(
      this._options,
      getWorkspaceRoot()
    );

    await vscode.commands.executeCommand(
      "zephelin.openLiveViewer",
      externalConfig
    );
  }

  /**
   * Stops the live trace data stream.
   */
  async stop(): Promise<void> {
    if (!this._isActive) {
      return;
    }

    this._isActive = false;
    await this.liveTrace?.stop();
  }

  /**
   * Cleans up all resources.
   */
  dispose(): void {
    void this.stop();
    this.liveTrace?.dispose();
    this._onError.dispose();
  }
}
