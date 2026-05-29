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
import { resolveVariables } from "./resolveVariables";
import { CfsPluginManager } from "cfs-lib/dist/plugins/cfs-plugin-manager";
import { CfsPackageManagerProvider } from "cfs-package-manager";
import debounce from "lodash.debounce";
import { CfsDataModelManager } from "cfs-lib";

export function createPluginManager(
  pkgManager?: CfsPackageManagerProvider,
  dataModelManager?: CfsDataModelManager,
): CfsPluginManager | undefined {
  const pluginSearchDirs = vscode.workspace
    .getConfiguration("cfs")
    .get<string[]>("plugins.searchDirectories")
    ?.map((dir) => resolveVariables(dir, true));

  const dataModelSearchDirs = vscode.workspace
    .getConfiguration("cfs")
    .get<string[]>("plugins.dataModelSearchDirectories")
    ?.map((dir) => resolveVariables(dir, true));
  try {
    const searchPaths = [
      ...(pluginSearchDirs ?? []),
      ...(dataModelSearchDirs ?? []),
    ];
    if (!dataModelManager) {
      throw new Error(
        "DataModelManager is required to initialize PluginManager",
      );
    }

    return new CfsPluginManager(dataModelManager, pkgManager, {
      pluginsCustomSearchPaths: searchPaths,
    });
  } catch (error) {
    debounce(
      () =>
        vscode.window.showWarningMessage(
          `Plugin Manager failed to initialize with error ${(error as Error).message}. Some features may not work as expected.`,
        ),
      4000,
    )();
  }
  return;
}
