/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import { ToolManager } from "../toolManager";
import * as vscode from "vscode";
import { ZephyrTaskProvider } from "./tasks";

// Globals
let zephyrTasksProvider: vscode.Disposable | undefined;

export class ZephyrToolchain {
  private static instance: ZephyrToolchain;

  /**
   * Implementation of a Singleton ZephyrToolchain class
   * @returns The ZephyrToolchain instance
   */
  public static getInstance(): ZephyrToolchain {
    if (!ZephyrToolchain.instance) {
      ZephyrToolchain.instance = new ZephyrToolchain();
    }

    return ZephyrToolchain.instance;
  }

  async getEnvironment() {
    const toolManager = await ToolManager.getInstance();
    return await toolManager.getShellEnvironment();
  }
}

export async function configureWorkspaceForZephyr() {
  zephyrTasksProvider = vscode.tasks.registerTaskProvider("shell", new ZephyrTaskProvider());
}

export function deactivate(): void {
  if (zephyrTasksProvider) {
    zephyrTasksProvider.dispose();
  }
}