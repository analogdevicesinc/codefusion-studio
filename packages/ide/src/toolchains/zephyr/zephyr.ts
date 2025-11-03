/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import type { IDEShellEnvProvider } from "../shell-env-provider";
import * as vscode from "vscode";
import { ZephyrTaskProvider } from "./tasks-provider";
import type { CfsToolManager } from "cfs-lib";

// Globals
let zephyrTasksProvider: vscode.Disposable | undefined;

export function registerZephyrTaskProvider(
  context: vscode.ExtensionContext,
  shellEnvProvider: IDEShellEnvProvider,
  toolManager: CfsToolManager,
) {
  const provider = new ZephyrTaskProvider(shellEnvProvider, toolManager);


  zephyrTasksProvider = vscode.tasks.registerTaskProvider("shell", provider);
  context.subscriptions.push(zephyrTasksProvider);

  return provider;
}

export function deactivate(): void {
  if (zephyrTasksProvider) {
    zephyrTasksProvider.dispose();
  }
}
