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
import * as vscode from "vscode";
import { Utils } from "../utils/utils";

/**
 * PATH entry and environment additions for spawning git/west with the `cfspkg`
 * remote helper available.
 */
export interface GitRemoteHelperSetup {
  /** Directory to prepend to PATH so git finds `git-remote-cfspkg`. */
  binDir: string;
  /** Environment variables to add for spawned git/west processes. */
  env: Record<string, string>;
}

/**
 * Prepares the `cfspkg` git remote helper for the current VS Code runtime.
 *
 * Uses the shared `git-remote-cfspkg` launcher shipped in `out/git-remote/`
 * (next to the bundled `entry.js`). Returns the PATH entry and the `CFS_NODE`
 * environment variable (VS Code's Node runtime) the launcher needs.
 *
 * @param context - The extension context.
 * @returns The helper setup.
 */
export function installGitRemoteHelper(
  context: vscode.ExtensionContext,
): GitRemoteHelperSetup {
  const binDir = path.join(context.extensionPath, "out", "git-remote");
  const sdkPath = Utils.getSdkPath();

  const env = {
    CFS_NODE: process.execPath,
    ...(sdkPath ? { CFS_SDK_PATH: sdkPath } : {}),
  };

  // process.execPath is the executable running the extension host: VS Code's
  // Electron binary on desktop (behaves as Node via ELECTRON_RUN_AS_NODE, set
  // by the launcher) or the server's standalone node on remote/WSL/SSH.
  return {
    binDir,
    env,
  };
}
