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
import type {CfsPluginManager, CodeGenerationOptions} from 'cfs-lib';
import type {CfsPluginInfo, CfsWorkspace} from 'cfs-types';

import {readdirSync, statSync} from 'node:fs';
import path from 'node:path';

import {handleMissingDependencyError} from './error-handler.js';
import {getPluginManager} from './plugin-manager.js';
import {getLatestPluginVersion} from './utils.js';
import {isTemplateValid} from './validation.js';

/**
 * Checks whether a path exists while preserving unexpected filesystem errors.
 *
 * @param inputPath - The path to inspect.
 * @returns `true` when the path exists; otherwise, `false` for absent paths.
 */
function pathExists(inputPath: string): boolean {
  try {
    statSync(inputPath);
    return true;
  } catch (error) {
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? error.code
        : undefined;

    if (errorCode === 'ENOENT' || errorCode === 'ENOTDIR') {
      return false;
    }

    throw error;
  }
}

/**
 * Checks whether a directory is itself a CFS workspace root.
 *
 * A CFS workspace root must contain the `.cfs/.cfsworkspace` marker. A bare
 * `.cfs` directory is not sufficient: project-level `.cfs` folders only hold
 * `.cfsdependencies`, so a project directory is not a workspace root.
 *
 * @param inputPath - The directory path to check.
 * @returns `true` when the directory is the root of a CFS workspace.
 */
export function isWorkspaceRoot(inputPath: string): boolean {
  return pathExists(
    path.join(path.resolve(inputPath), '.cfs', '.cfsworkspace')
  );
}

/**
 * Finds the nearest CFS workspace containing the supplied path.
 *
 * Walks up the directory tree until it finds a directory for which
 * {@link isWorkspaceRoot} is true.
 *
 * @param inputPath - A directory or file path within a CFS workspace.
 * @returns The absolute workspace root, or `undefined` when no workspace exists.
 */
export function findWorkspaceRoot(
  inputPath: string
): string | undefined {
  const resolvedPath = path.resolve(inputPath);
  let searchPath = resolvedPath;

  if (!pathExists(searchPath)) {
    return undefined;
  }

  if (statSync(searchPath).isFile()) {
    searchPath = path.dirname(searchPath);
  }

  while (true) {
    if (isWorkspaceRoot(searchPath)) {
      return searchPath;
    }

    const parentPath = path.dirname(searchPath);
    if (parentPath === searchPath) {
      return undefined;
    }

    searchPath = parentPath;
  }
}

/**
 * Returns the dependency manifest path of a workspace or project folder.
 *
 * @param dir - The workspace root or project folder.
 * @returns The absolute `.cfs/.cfsdependencies` path inside `dir`.
 */
function dependencyManifestPath(dir: string): string {
  return path.join(dir, '.cfs', '.cfsdependencies');
}

/**
 * Lists the dependency manifest locations relevant to a path within a CFS
 * workspace: the shared manifest at the workspace root and, when the path
 * is inside a project folder, that project's manifest. Neither the
 * manifests nor any other project folders are checked.
 *
 * @param inputPath - A directory or file path within a CFS workspace.
 * @returns The absolute candidate manifest paths, workspace root first.
 */
export function getDependencyManifestCandidates(
  inputPath: string
): string[] {
  const workspaceRoot = findWorkspaceRoot(inputPath);
  if (!workspaceRoot) {
    return [];
  }

  const [projectName] = path
    .relative(workspaceRoot, path.resolve(inputPath))
    .split(path.sep);

  const dirs = projectName
    ? [workspaceRoot, path.join(workspaceRoot, projectName)]
    : [workspaceRoot];

  return dirs.map((dir) => dependencyManifestPath(dir));
}

/**
 * Finds the dependency manifests of the nearest CFS workspace: the shared
 * `.cfs/.cfsdependencies` at the workspace root and that of each project
 * folder directly inside the root.
 *
 * @param inputPath - A directory or file path within a CFS workspace.
 * @returns The existing absolute manifest paths, workspace root first and
 * projects sorted by folder name.
 * @throws When the workspace root or a manifest cannot be checked, e.g.
 * due to `EACCES`.
 */
export function findWorkspaceDependencyManifests(
  inputPath: string
): string[] {
  const workspaceRoot = findWorkspaceRoot(inputPath);
  if (!workspaceRoot) {
    return [];
  }

  const projectDirs = readdirSync(workspaceRoot)
    .sort()
    .map((name) => path.join(workspaceRoot, name));

  return [workspaceRoot, ...projectDirs]
    .map((dir) => dependencyManifestPath(dir))
    .filter((manifestPath) => pathExists(manifestPath));
}

/**
 * Sanitizes a task label for CLI usage by stripping
 * non-word characters and replacing whitespace with underscores.
 *
 * @param label - Raw task label (e.g. "flash & run (JLink)")
 * @returns CLI-friendly name (e.g. "flash_run_JLink")
 */
export function sanitizeTaskLabel(label: string): string {
  return label.replaceAll(/[^\w .-]/g, '').replaceAll(/\s+/g, '_');
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
          .join('\n'),
      {code: 'VALIDATION_FAILED'}
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
      supportedSoc.board?.toLowerCase() === board.toLowerCase()
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
 * @param options - Optional code generation environment options
 * @return void
 */
export async function generateWorkspaceFromConfig(
  config: CfsWorkspace,
  pluginManager: CfsPluginManager,
  command: Command,
  options?: CodeGenerationOptions
) {
  try {
    // Generate workspace with the provided configuration
    await pluginManager.generateWorkspace(config, options);
    command.log(`Workspace created successfully.`);
  } catch (error) {
    handleMissingDependencyError(error);

    command.error(`Failed to create workspace: ${error}`, {
      code: 'WORKSPACE_CREATE_FAILED'
    });
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

    // Filter to plugins compatible with the SoC/board/package
    // context first, then select the best version from that subset.
    const compatiblePlugins = plugins.filter((plugin) =>
      isTemplateValid(plugin, flags)
    );

    for (const plugin of compatiblePlugins) {
      let versionMatches = false;

      if (flags['template-version']) {
        versionMatches =
          plugin.pluginVersion === flags['template-version'];
      } else {
        const latestVersion = getLatestPluginVersion(
          plugin.pluginId,
          compatiblePlugins
        );
        versionMatches = plugin.pluginVersion === latestVersion;
      }

      if (versionMatches) {
        return plugin;
      }
    }

    if (flags['template-id']) {
      errors.push(
        `Template '${flags['template-id']}' version '${flags['template-version'] ?? 'latest'}' not suitable for SoC '${flags.soc}'${flags.board ? `, Board '${flags.board}'` : ''}${flags.core ? `, Core '${flags.core}'` : ''}${flags.package ? `, Package '${flags.package}'` : ''}.`
      );
    } else {
      errors.push(
        `Valid Template not found in available plugins list for SoC '${flags.soc}'${flags.board ? `, Board '${flags.board}'` : ''}${flags.core ? `, Core: '${flags.core}'` : ''}.`
      );
    }

    return undefined;
  }

  errors.push('Please check your plugin search paths.');
  return undefined;
}
