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

import {cfsSettingDefaults} from 'cfs-lib';
import {parse as parseJsonc} from 'jsonc-parser';
import {existsSync} from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import type {CliConfig} from '../types/cli-config.js';

/**
 * CLI implementation of config resolution.
 * Layers setting sources with last-wins precedence:
 * 1. Setting defaults from cfs-lib
 * 2. User config.json overrides
 * 3. Top level workspace settings from .code-workspace file
 *
 * The `get` method signature is compatible with the
 * `ConfigProvider` type from cfs-lib, so it can be used with
 * `CfsVariableResolver.setConfigProvider(resolver.get.bind(resolver))`.
 */
export class CliConfigResolver {
  private readonly initialSettings: Record<string, unknown>;
  private merged: Record<string, unknown>;

  constructor(workspacePath: string, userConfig?: CliConfig) {
    // Layer 1: defaults from cfs-lib
    const cfsDefaults = {...cfsSettingDefaults};

    // Override cfs.sdk.path with the value from getCFSInstallPath()
    const installPath = this.getCFSInstallPath();

    if (installPath) {
      cfsDefaults['cfs.sdk.path'] = installPath
        .split(path.sep)
        .join(path.posix.sep);
    }

    // Layer 2: user config overrides
    const userSettings = userConfig ?? {};

    // Layer 3: top level workspace overrides
    const workspaceSettings =
      this.loadWorkspaceSettings(workspacePath);

    // The initial set of default+user+workspace settings. Project-level settings are added later.
    this.initialSettings = {
      ...cfsDefaults,
      ...userSettings,
      ...workspaceSettings
    };

    this.merged = {
      ...this.initialSettings
    };
  }

  /**
   * Add settings from a workspace's .vscode/settings.json file as an additional layer.
   *
   * @param workspacePath The path to the workspace folder, where .vscode/settings.json will be located.
   * @returns void.
   */
  addProjectSettings(workspacePath: string): void {
    const settingsPath = path.join(
      workspacePath,
      '.vscode',
      'settings.json'
    );
    let projectSettings: Record<string, unknown> = {};

    try {
      if (fs.existsSync(settingsPath)) {
        const content = fs.readFileSync(settingsPath, 'utf8');
        projectSettings = {
          ...(parseJsonc(content) as Record<string, unknown>)
        };
      }
    } catch {
      // Workspace settings not available or invalid JSON
    }

    this.merged = {
      ...this.initialSettings,
      ...projectSettings
    };
  }

  /**
   * Get a setting value by key.
   *
   * **All values are coerced to strings** to satisfy the `ConfigProvider`
   * contract from cfs-lib, which is used by `CfsVariableResolver` for
   * template variable substitution (e.g., `${config:cfs.firmwarePlatform}`).
   *
   * **Null values are treated as undefined** — both `null` and `undefined`
   * return `undefined`, allowing fallback logic to work correctly.
   *
   * **Compatible with:** `ConfigProvider` type from cfs-lib for use with
   * `CfsVariableResolver.setConfigProvider(resolver.get.bind(resolver))`.
   *
   * @param key The setting key to retrieve (e.g. "cfs.firmwarePlatform").
   * @returns The setting value as a string, or undefined if not set or explicitly null.
   */
  get(key: string): string | undefined {
    const value = this.merged[key];

    return value === undefined || value === null
      ? undefined
      : String(value);
  }

  /**
   * Get all settings matching a prefix.
   *
   * All values are coerced to strings using the same rationale as `get()`.
   * See the `get()` method documentation for details on string coercion behavior.
   * Null values are excluded from the result (treated as undefined).
   *
   * @param prefix The prefix to filter settings by (e.g. "cfs.").
   * @returns An object containing all matching settings as key-value pairs (all values stringified).
   */
  getAll(prefix: string): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(this.merged)) {
      if (
        key.startsWith(prefix) &&
        value !== undefined &&
        value !== null
      ) {
        result[key] = String(value);
      }
    }

    return result;
  }

  /**
   * Get a setting value by key without type coercion.
   *
   * Unlike `get()`, this returns the raw value as stored — preserving
   * objects, arrays, and other non-string types. Use this for settings
   * like `cfs.environment` whose value is a structured object
   * (Record<string, string>) rather than a scalar string.
   *
   * @param key The setting key to retrieve (e.g. "cfs.environment").
   * @returns The raw setting value, or undefined if not set or explicitly null.
   */
  getRaw(key: string): unknown {
    const value = this.merged[key];

    return value === undefined || value === null ? undefined : value;
  }

  /**
   * Determines the installation path for CodeFusion Studio (CFS) by locating the `cfs.json` file.
   *
   * The method searches for the `cfs.json` file on parent directories of this file.
   *
   * If the `cfs.json` file is not found in any of the parent directories, it is searched on
   * CFS_INSTALL_DIR environment variable (if defined).
   *
   * This does not print any errors.
   *
   * @returns The directory path containing the `cfs.json` file, or `undefined` if the file is not found.
   */
  private getCFSInstallPath(): string | undefined {
    // Try to find CFS install root folder on parent directories
    let searchDir = path.dirname(fileURLToPath(import.meta.url));
    do {
      if (existsSync(path.join(searchDir, 'cfs.json'))) {
        return searchDir;
      }

      searchDir = path.dirname(searchDir);
      // Stop if we reach the root folder
    } while (searchDir !== path.dirname(searchDir));

    // We didn't find the root folder on parent directories, try to find it using CFS_INSTALL_DIR environment variable
    const cfsInstallerHome = process.env.CFS_INSTALL_DIR;
    if (!cfsInstallerHome) {
      return undefined;
    }

    if (!existsSync(path.join(cfsInstallerHome, 'cfs.json'))) {
      return undefined;
    }

    return cfsInstallerHome;
  }

  /**
   * Add settings from a workspace's .code-workspace file as an additional layer.
   *
   * @param workspacePath The path to the workspace folder or a subfolder.
   * @returns void.
   */
  private loadWorkspaceSettings(
    workspacePath: string
  ): Record<string, unknown> {
    // If no .cfs folder exists, we're not in a workspace folder. We could be in a sub-folder, so search
    // up the directory tree until we find a .cfs folder or reach the root.
    let currentPath = workspacePath;
    while (!fs.existsSync(path.join(currentPath, '.cfs'))) {
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        // Reached the root without finding a .cfs folder
        throw new Error(
          `Error loading workspace settings from ${workspacePath}. Please ensure this is a valid workspace folder.`
        );
      }

      currentPath = parentPath;
    }

    // Assume the workspace config file is named after the workspace folder
    const workspaceConfigFile =
      path.basename(currentPath) + '.code-workspace';
    const settingsPath = path.join(currentPath, workspaceConfigFile);

    try {
      if (fs.existsSync(settingsPath)) {
        const content = parseJsonc(
          fs.readFileSync(settingsPath, 'utf8')
        ) as Record<string, unknown>;

        return content.settings as Record<string, unknown>;
      }
    } catch {
      throw new Error(
        `Error loading workspace settings from ${settingsPath}. Please ensure the file exists and contains valid JSON.`
      );
    }

    return {};
  }
}
