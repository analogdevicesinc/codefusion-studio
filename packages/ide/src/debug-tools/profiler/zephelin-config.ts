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

import * as path from "path";
import type { TraceConfiguration } from "@ide-types/trace-types";

/**
 * The subset of the Zephelin extension's configuration that CFS owns and
 * forwards to it.
 */
export type ZephelinConfig = {
  tcpServerHost?: string;
  tcpServerPort?: number;
  backendHost?: string;
  backendPort?: number;
  buildDir: string;
  tflmModelPaths: string[];
  zephyrBase?: string;
  backendPath?: string;
  pythonPath?: string;
};

/**
 * Resolves a path against the workspace root.
 *
 * @param target - The path to resolve.
 * @param workspaceRoot - The workspace root to resolve against.
 * @returns The absolute path.
 */
function toAbsolutePath(
  target: string,
  workspaceRoot: string | undefined,
): string {
  return path.isAbsolute(target)
    ? target
    : path.join(workspaceRoot ?? "", target);
}

/**
 * Builds the config CFS forwards to the Zephelin extension from a trace
 * configuration.
 *
 * @param config - The trace configuration to derive forwarded settings from.
 * @param workspaceRoot - The workspace root that relative paths resolve against.
 * @returns The Zephelin-shaped configuration to forward.
 */
export function toZephelinConfig(
  config: Pick<
    TraceConfiguration,
    | "tcpServerHost"
    | "tcpServerPort"
    | "backendHost"
    | "backendPort"
    | "aiModels"
    | "buildDir"
  > & {
    zephyrBase?: string;
    backendPath?: string;
    pythonPath?: string;
  },
  workspaceRoot?: string
): ZephelinConfig {
  return {
    tcpServerHost: config.tcpServerHost,
    tcpServerPort: config.tcpServerPort,
    backendHost: config.backendHost,
    backendPort: config.backendPort,
    buildDir: toAbsolutePath(config.buildDir, workspaceRoot),
    tflmModelPaths: config.aiModels.map((modelPath) =>
      toAbsolutePath(modelPath, workspaceRoot)
    ),
    ...(config.zephyrBase ? { zephyrBase: config.zephyrBase } : {}),
    ...(config.backendPath ? { backendPath: config.backendPath } : {}),
    ...(config.pythonPath ? { pythonPath: config.pythonPath } : {}),
  };
}
