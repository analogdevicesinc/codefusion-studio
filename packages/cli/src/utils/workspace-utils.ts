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

import type {Command} from '@oclif/core';
import type {CfsPluginManager} from 'cfs-lib';
import type {CfsConfig, CfsPluginInfo, CfsWorkspace} from 'cfs-types';

import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';

import {handleMissingDependencyError} from './error-handler.js';
import {getPluginManager} from './plugin-manager.js';
import {getLatestPluginVersion} from './utils.js';
import {isTemplateValid} from './validation.js';

/**
 * Resolves workspace folder paths for task discovery.
 *
 * For multi-project workspaces (with .cfsconfig), returns individual project paths.
 * For single-project workspaces, returns the workspace root.
 *
 * @param workspacePath - Absolute path to workspace root
 * @returns Array of project folder paths for task discovery
 *
 * @remarks
 * Multi-project detection:
 * 1. Checks for `.cfs/*.cfsconfig` file
 * 2. Reads `Projects[].PlatformConfig.ProjectName` values
 * 3. Constructs paths relative to workspace root
 *
 * Example multi-project structure:
 * ```
 * workspace/
 *   .cfs/
 *     max78000.cfsconfig   (Projects: [{ProjectName: "m4"}, {ProjectName: "riscv"}])
 *   m4/                     (MSDK project)
 *   riscv/                  (MSDK project)
 * ```
 *
 * Returns: `["workspace/m4", "workspace/riscv"]`
 */
export function resolveWorkspaceFolders(
  workspacePath: string
): string[] {
  // Look for .cfsconfig file in .cfs directory
  const cfsDir = path.join(workspacePath, '.cfs');
  if (!existsSync(cfsDir)) {
    return [workspacePath];
  }

  try {
    const files = readdirSync(cfsDir);
    const cfsconfigFile = files.find((file) =>
      file.endsWith('.cfsconfig')
    );

    if (!cfsconfigFile) {
      return [workspacePath];
    }

    // Read and parse .cfsconfig
    const cfsconfigPath = path.join(cfsDir, cfsconfigFile);
    const content = readFileSync(cfsconfigPath, 'utf8');
    const config = JSON.parse(content) as CfsConfig;

    // Extract project names from PlatformConfig
    if (!config.Projects || config.Projects.length === 0) {
      return [workspacePath];
    }

    const projectPaths: string[] = [];
    for (const project of config.Projects) {
      const projectName =
        project.PlatformConfig?.ProjectName || project.ProjectId;

      if (projectName) {
        const projectPath = path.join(workspacePath, projectName);
        // Only add if project directory exists
        if (existsSync(projectPath)) {
          projectPaths.push(projectPath);
        }
      }
    }

    // Return project paths if found, otherwise workspace root
    return projectPaths.length > 0 ? projectPaths : [workspacePath];
  } catch (error) {
    // If anything fails (parse error, missing fields, etc.), fall back to workspace root
    console.error(
      `Warning: Failed to parse .cfsconfig file: ${error instanceof Error ? error.message : String(error)}`
    );
    return [workspacePath];
  }
}

/**
 * If there are any errors, display them all and exit.
 * @param errors - The error array. Will be empty if there are no errors.
 * @param command - Command class from oclif
 * @return void
 */
export function checkErrors(errors: string[], command: Command) {
  if (errors.length > 0) {
    command.error(
      `Command failed with ${errors.length} error${errors.length > 1 ? 's' : ''}:\n` +
        errors
          .map((err, index) => `  ${index + 1}. ${err}`)
          .join('\n')
    );
  }
}

/**
 * Constructs a CFS workspace config file
 * @param config - object constructed from workspace create commands flags
 * @param pluginManager - CFS plugin lookup
 * @return Config for CFS workspace
 */
export function createWorkspaceConfig(config: {
  soc: string;
  package: string;
  board: string;
  workspaceName: string;
  location: string;
  workspacePluginId: string;
  workspacePluginVersion: string;
}): CfsWorkspace {
  return {
    ...config,
    projects: []
  };
}

/**
 * Attempts to resolve a package name based on template/soc/board combo
 * @param template - CFS Plugin
 * @param soc - SoC identifier e.g. MAX32690
 * @param board - Board name to check e.g. EvKit_V1
 * @param errors - Array of errors to potentially append onto
 * @return Name of a valid package or undefined
 */
export function getPackageNameFromTemplate(
  template: CfsPluginInfo,
  soc: string,
  board: string,
  errors: string[]
): string | undefined {
  const packageName = template?.supportedSocs.find(
    (supportedSoc) =>
      supportedSoc.name.toLowerCase() === soc.toLowerCase() &&
      supportedSoc.board.toLowerCase() === board.toLowerCase()
  )?.package;

  if (!packageName) {
    errors.push(
      `A valid package name could not be found for the specified board (${board}) and SoC (${soc}) combination. Please ensure that the board and SoC names are correct.`
    );
  }

  return packageName;
}

/**
 * Attempts to generate a CFS workspace based on passed config
 * @param config - CFS workspace config
 * @param pluginManager - CFS plugin lookup for generation
 * @param command - Command class from oclif
 * @return void
 */
export async function generateWorkspaceFromConfig(
  config: CfsWorkspace,
  pluginManager: CfsPluginManager,
  command: Command
) {
  try {
    // Generate workspace with the provided configuration
    await pluginManager.generateWorkspace(config);
    command.log(`Workspace created successfully.`);
  } catch (error) {
    handleMissingDependencyError(error);

    command.error(`Failed to create workspace: ${error}`);
  }
}

/**
 * Attempts to get a valid template from pluginManager
 * @param flags - Object constructed from workspace create/configure flags
 * @param pluginManager - Lookup for found plugins
 * @param errors - Array of errors to potentially append onto
 * @return Compatible template or undefined
 */
export async function getValidTemplate(
  flags: {
    soc?: string;
    board?: string;
    package?: string;
    'template-id'?: string;
    'template-version'?: string;
    core?: string;
  },
  pluginManager: ReturnType<typeof getPluginManager>,
  errors: string[]
): Promise<CfsPluginInfo | undefined> {
  const pluginListInfo = await pluginManager.getPluginsInfoList();

  if (pluginListInfo) {
    const plugins = pluginListInfo.filter((plugin) =>
      flags['template-id']
        ? flags['template-id'] === plugin.pluginId
        : plugin.features?.aiprof
    );

    for (const plugin of plugins) {
      let versionMatches = false;

      if (flags['template-version']) {
        versionMatches =
          plugin.pluginVersion === flags['template-version'];
      } else {
        const latestVersion = getLatestPluginVersion(
          plugin.pluginId,
          pluginListInfo
        );
        versionMatches = plugin.pluginVersion === latestVersion;
      }

      if (versionMatches && isTemplateValid(plugin, flags)) {
        return plugin;
      }
    }

    if (flags['template-id']) {
      errors.push(
        `Template '${flags['template-id']}' version '${flags['template-version'] ?? 'latest'}' not suitable for SoC '${flags.soc}', Board '${flags.board}'${flags.core ? `, Core '${flags.core}'.` : ''}${flags.package ? `, Package '${flags.package}'.` : ''}`
      );
    } else {
      errors.push(
        `Valid Template not found in available plugins list for SoC '${flags.soc}', Board '${flags.board}', Core: '${flags.core}'.`
      );
    }

    return undefined;
  }

  errors.push('Please check your plugin search paths.');
  return undefined;
}
