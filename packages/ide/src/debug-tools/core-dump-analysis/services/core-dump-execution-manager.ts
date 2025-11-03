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

import { CoreDumpTreeProvider } from "../ui/core-dump-tree-provider";

/**
 * CoreDumpManager is a singleton responsible for managing global state
 * related to core dump analysis, such as the current CoreDumpTreeProvider instance.
 */
export class CoreDumpManager {
  private static _instance: CoreDumpManager;
  private _treeProvider: CoreDumpTreeProvider | null = null;

  // Private constructor to enforce singleton pattern
  private constructor() {}

  /**
   * Returns the singleton instance of CoreDumpManager.
   */
  static get instance(): CoreDumpManager {
    if (!this._instance) {
      this._instance = new CoreDumpManager();
    }
    return this._instance;
  }

  /**
   * Sets the current CoreDumpTreeProvider instance.
   * @param provider The tree provider to be managed globally.
   */
  setTreeProvider(provider: CoreDumpTreeProvider) {
    this._treeProvider = provider;
  }

  /**
   * Gets the current CoreDumpTreeProvider instance, or null if not set.
   */
  get treeProvider(): CoreDumpTreeProvider | null {
    return this._treeProvider;
  }
}
