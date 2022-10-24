/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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

import { platform } from "node:process";

import { resolveVariables } from "../utils/resolveVariables";
import { Utils } from "../utils/utils";

import { ToolInfo } from "./toolInfo";

/**
 * The Tool class describes an external tool supported by the extension.
 * This includes the tool's path, path to the tool's binaries, and access
 * to the `tool.json` content associated with the tool (tool name, ID, version, etc).
 *
 * The Tool objects are handled by the {@link ToolManager} class.
 */
export class Tool {
  /** The tool.json file contents associated with this tool */
  protected info: ToolInfo;
  /** File path to the tool */
  protected path: string;

  /**
   * Tool constructor
   * @param info - Tool description info
   * @param path - Tool root path
   */
  constructor(info: ToolInfo, path: string) {
    this.info = info;
    this.path = path;
  }

  /**
   * Get the absolute resolved file path to the root tool directory.
   * @returns The resolved file path
   */
  getPath(): string {
    return Utils.normalizePath(resolveVariables(this.path, true));
  }

  /**
   * Get the absolute resolved file path to the tool's paths.
   * @returns An array of resolved paths
   */
  getPaths(): string[] {
    let paths: string[] = [];
    if (this.info.paths) {
      paths = this.info.paths.map((path: string) => {
        const fullPath = [this.path, path].join("/");
        return Utils.normalizePath(resolveVariables(fullPath, true));
      });
    }
    return paths;
  }

  /**
   * Get the absolute resolved file path to the tool binary directory.
   * @returns The resolved file path
   */
  getBinaryPath(): string {
    return [this.getPath(), "bin"].join("/");
  }

  /**
   * Get the {@link ToolInfo} object for this Tool.
   * @returns The {@link ToolInfo} object
   */
  getInfo(): ToolInfo {
    return this.info;
  }

  /**
   * Get the full path to the given executable.
   * @param relativeExePath - The executable path relative to the root tool path.
   * @returns The full path to the executable
   */
  protected getExecutablePath(relativeExePath: string): string {
    let ret = [this.getPath(), relativeExePath].join("/");

    if (platform === "win32") {
      ret += ".exe";
    }

    return ret;
  }
}
