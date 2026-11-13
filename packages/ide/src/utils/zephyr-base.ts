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
import * as path from "path";
import { CfsToolManager } from "cfs-lib";
import type { CfsPackageManagerProvider } from "cfs-package-manager";
import { resolveVariables } from "./resolveVariables";

/**
 * Resolves the Zephyr base directory used for board devicetree detection.
 *
 * Honors the `cfs.zephyr.workspace.path` override, otherwise resolves the
 * installed Zephyr SDK with a tool manager scoped to the given SoC so that the
 * correct SoC-scoped SDK is selected when multiple are installed.
 *
 * @param soc - The target SoC for this operation
 * @param pkgManager - The package manager used to discover installed tools
 * @returns The Zephyr base directory, or `undefined` when it cannot be resolved
 */
export async function resolveZephyrBase(
  soc: string | undefined,
  pkgManager?: CfsPackageManagerProvider,
): Promise<string | undefined> {
  const customZephyrWorkspace = vscode.workspace
    .getConfiguration("cfs")
    .get<string>("zephyr.workspace.path");

  if (customZephyrWorkspace) {
    return customZephyrWorkspace;
  }

  const searchPaths =
    vscode.workspace
      .getConfiguration("cfs")
      .get<string[]>("tools.searchDirectories")
      ?.map((dir) => resolveVariables(dir, true)) ?? [];

  const toolManager = new CfsToolManager(pkgManager, searchPaths, soc);
  const zephyrPath = await toolManager.getToolPath("zephyr");

  return zephyrPath ? path.join(zephyrPath, "zephyr") : undefined;
}
