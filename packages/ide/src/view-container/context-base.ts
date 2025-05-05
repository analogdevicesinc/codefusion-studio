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

import { workspace } from "vscode";
import { ACTIVE_CONTEXT, EXTENSION_ID, WORKSPACE_CONTEXT } from "../constants";

export abstract class ContextBase {
  protected activeContext = WORKSPACE_CONTEXT;

  constructor() {
    setTimeout(() => {
      this.retrieveContext();
    }, 100);
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(`${EXTENSION_ID}.${ACTIVE_CONTEXT}`)) {
        this.retrieveContext();
      }
    });
  }

  /**
   * Called when context changes.
   *
   * Derived class must implement specific functionality
   */
  abstract onContextChanged(): void;

  private retrieveContext() {
    const config = workspace.getConfiguration(EXTENSION_ID);
    const context = config.get(ACTIVE_CONTEXT) as string;
    this.activeContext = context;
    this.onContextChanged();
  }
}
