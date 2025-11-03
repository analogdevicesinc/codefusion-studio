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

import { registerDebugSessionListeners } from "../services/debug-event-hooks";
import { ScriptManager } from "../scripts/script-manager";
import { GDBExecutor } from "../execution/gdb-executor";

/**
 * GDBToolbox is a singleton class that manages the core components of the GDB Toolbox extension.
 * It initializes and provides access to the ScriptManager and GDBExecutor,
 * and ensures debug session listeners are registered only once.
 */
export class GDBToolbox {
  private static instance: GDBToolbox;
  private scriptManager: ScriptManager;
  private executor: GDBExecutor;

  private constructor(extensionRoot: string) {
    this.scriptManager = new ScriptManager();
    this.executor = new GDBExecutor(extensionRoot);
  }

  /**
   * Initializes the GDBToolbox singleton and registers debug session listeners.
   * Should be called once during extension activation.
   */
  public static async initialize(extensionRoot: string): Promise<GDBToolbox> {
    if (!GDBToolbox.instance) {
      await registerDebugSessionListeners();
      GDBToolbox.instance = new GDBToolbox(extensionRoot);
    }
    return GDBToolbox.instance;
  }

  /**
   * Returns the singleton instance of GDBToolbox.
   * Throws an error if initialize() has not been called.
   */
  public static getInstance(): GDBToolbox {
    if (!GDBToolbox.instance) {
      throw new Error(
        "GDBToolbox has not been initialized. Call initialize() first.",
      );
    }
    return GDBToolbox.instance;
  }

  /**
   * Returns the ScriptManager instance.
   */
  public getScriptManager(): ScriptManager {
    return this.scriptManager;
  }

  /**
   * Returns the GDBExecutor instance.
   */
  public getExecutor(): GDBExecutor {
    return this.executor;
  }
}
