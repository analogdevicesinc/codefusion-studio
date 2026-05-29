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

import * as path from "node:path";
import * as util from "node:util";
import { execFile } from "node:child_process";
import { platform } from "node:process";
import type { IDEShellEnvProvider } from "../../toolchains/shell-env-provider";
import { checkIfFileExists } from "cfs-lib";

const asyncExecFile = util.promisify(execFile);

/**
 * Options for trace conversion.
 */
export interface TraceConversionOptions {
  /** Working directory for the conversion command. */
  cwd?: string;
  /** Path to the Zephyr build directory */
  buildDir?: string;
  /** Path to the Zephyr ELF file for symbol resolution */
  zephyrElfPath?: string;
  /** Paths to AI model files. Currently only supports TFLM models */
  aiModelPaths?: string[];
}

/**
 * Converts a trace file from CTF to TEF format by running `west zpl-prepare-trace`.
 *
 * @param inputTracePath - Path to the trace file to convert
 * @param shellEnvProvider - Shell environment provider
 * @param options - Optional conversion options (ELF path, TFLM model paths)
 * @returns Path to the converted trace file (.tef)
 * @example
 * ```typescript
 * await convertTrace("my-trace.ctf", shellEnvProvider);
 * // Produces: my-trace.tef
 * ```
 */
export async function convertTrace(
  inputTracePath: string,
  shellEnvProvider: IDEShellEnvProvider,
  options?: TraceConversionOptions,
): Promise<string> {
  const environment = await shellEnvProvider.getShellEnvironment();
  if (!environment) {
    throw new Error("Failed to get shell environment.");
  }

  const parsedPath = path.parse(inputTracePath);
  const outputFile = path.join(parsedPath.dir, `${parsedPath.name}.tef`);

  const westArgs = ["zpl-prepare-trace", inputTracePath, "-o", outputFile];
  if (options?.buildDir) {
    westArgs.push("--build-dir", options.buildDir);
  }
  if (options?.zephyrElfPath) {
    westArgs.push("--zephyr-elf-path", options.zephyrElfPath);
  }
  if (options?.aiModelPaths) {
    for (const modelPath of options.aiModelPaths) {
      westArgs.push("--tflm-model-paths", modelPath);
    }
  }

  const cppFiltPath = environment.ZEPHYR_SDK_INSTALL_DIR
    ? path.join(
        environment.ZEPHYR_SDK_INSTALL_DIR,
        "arm-zephyr-eabi",
        "bin",
        platform === "win32"
          ? "arm-zephyr-eabi-c++filt.exe"
          : "arm-zephyr-eabi-c++filt",
      )
    : undefined;

  const traceConversionEnv = { ...process.env, ...environment };
  if (checkIfFileExists(cppFiltPath)) {
    traceConversionEnv.ZPL_DEMANGLE_CMD = cppFiltPath;
  }

  await asyncExecFile("west", westArgs, {
    cwd: options?.cwd,
    env: traceConversionEnv,
    shell: false,
  });

  return outputFile;
}
