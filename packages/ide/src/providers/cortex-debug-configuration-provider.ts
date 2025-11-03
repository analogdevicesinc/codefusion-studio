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

import * as vscode from "vscode";
import { CfsToolManager, CfsVariableResolver } from "cfs-lib";
import { CORTEX_DEBUG_CONFIGURATIONS } from "../resources/debugConfigurations";

/**
 * Debug configuration provider for Cortex debug configurations that uses the CfsVariableResolver
 * service to resolve custom cfs template strings in the format ${cfs:MANAGER_ID.RESOLVER_ID.RESOLVER_ARG}
 */
export class CortexDebugConfigurationProvider
  implements vscode.DebugConfigurationProvider
{
  private variableResolver: CfsVariableResolver;

  constructor(toolManager: CfsToolManager) {
    this.variableResolver = new CfsVariableResolver(toolManager);
  }

  async provideDebugConfigurations(): Promise<vscode.DebugConfiguration[]> {
    const configsWithResolvedPaths: vscode.DebugConfiguration[] = [];

    for (const config of CORTEX_DEBUG_CONFIGURATIONS) {
      const resolvedConfig = { ...config };
      await this.variableResolver.resolveObjectVariables(resolvedConfig);
      configsWithResolvedPaths.push(resolvedConfig);
    }

    return configsWithResolvedPaths;
  }

  async resolveDebugConfiguration(
    _folder: vscode.WorkspaceFolder | undefined,
    debugConfiguration: vscode.DebugConfiguration,
    _token?: vscode.CancellationToken,
  ) {
    const resolvedConfig = { ...debugConfiguration };

    // Recursively resolve custom variables in all properties
    await this.variableResolver.resolveObjectVariables(resolvedConfig);

    return resolvedConfig;
  }
}
