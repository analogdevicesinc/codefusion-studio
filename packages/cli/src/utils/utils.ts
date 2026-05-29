/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import type {Config} from '@oclif/core';

import {SoC} from 'cfs-ccm-lib';
import {CfsToolManager} from 'cfs-lib';
import {CfsConfig, CfsPluginInfo, CfsWorkspace} from 'cfs-types';
import {Task} from 'cfs-types/types/cfs-task';
import fs from 'node:fs';
import path from 'node:path';
import {lt as semverLessThan} from 'semver';

import {getSocCatalog} from './catalog-manager.js';

export function checkIfFileExists(filename: string | undefined) {
  if (!filename) {
    return false;
  }

  const filepath = path.isAbsolute(filename)
    ? filename
    : path.resolve(process.cwd(), filename);

  return fs.existsSync(filepath);
}

export function readJsonFile(filename: string) {
  try {
    const fileContent = fs.readFileSync(filename, 'utf8');
    return JSON.parse(fileContent);
  } catch {
    throw new Error(
      `The file: ${filename} is not a valid JSON file.`
    );
  }
}

/**
 * Returns a new object with the first letter of each top-level property lowercased.
 * Does not modify nested properties.
 * @param obj The object whose top-level property names will be lowercased.
 * @returns A new object with lowercased first letters for top-level property names.
 */
export function lowercaseFirstLetterProps<
  T extends Record<string, unknown>
>(obj: T): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj))
    return obj;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const newKey = key.charAt(0).toLowerCase() + key.slice(1);
    result[newKey] = obj[key];
  }

  return result as T;
}

/**
 * Read and parse the user configuration file `config.json`.
 * @param config - The configuration object from oclif
 * @returns The parsed user configuration object, or undefined if the file doesn't exist or can't be read
 */
export function readUserConfig(
  config: Config
): Record<string, unknown> | undefined {
  try {
    const configPath = path.join(config.configDir, 'config.json');

    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent) as Record<string, unknown>;
    }
  } catch {
    // Silently continue if config file doesn't exist or can't be read
  }

  return undefined;
}

/**
 * Get data model search paths included in user custom configuration.
 * @param config - The configuration object from oclif
 * @returns Array containing all data model search paths
 */
export function getDataModelSearchPaths(config: Config): string[] {
  const searchPaths: Set<string> = new Set<string>();

  const userConfig = readUserConfig(config);

  if (
    userConfig?.dataModelSearchPaths &&
    Array.isArray(userConfig.dataModelSearchPaths)
  ) {
    // validate each path before adding
    for (const p of userConfig.dataModelSearchPaths as string[]) {
      if (typeof p === 'string' && p.trim() !== '') {
        const resolvedPath = path.isAbsolute(p)
          ? p
          : path.resolve(process.cwd(), p);
        if (fs.existsSync(resolvedPath)) {
          searchPaths.add(resolvedPath);
        } else {
          console.warn(
            `Warning: Search path "${resolvedPath}" does not exist.`
          );
        }
      }
    }
  }

  return [...searchPaths];
}

/**
 * Get the catalog store path from user configuration.
 * @param config - The configuration object from oclif
 * @returns The resolved catalog store path, or undefined if not configured or invalid
 */
export function getCustomCatalogStorePath(
  config: Config
): string | undefined {
  const userConfig = readUserConfig(config);

  if (
    userConfig?.catalogStorePath &&
    typeof userConfig.catalogStorePath === 'string' &&
    userConfig.catalogStorePath.trim() !== ''
  ) {
    const configuredPath = userConfig.catalogStorePath as string;
    const resolvedPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);

    return resolvedPath;
  }

  return undefined;
}

/**
 * Determines the installation path for CodeFusion Studio (CFS) by locating the `cfs.json` file.
 *
 * The method first checks if the install path is set as an env var or in user config.
 * If not, it searches for the `cfs.json` file in parent directories of the oclif root directory.
 *
 * @param config - The configuration object from oclif
 * @returns The directory path containing the `cfs.json` file, or `undefined` if the file is not found.
 */
export function getCFSInstallPath(
  config: Config
): string | undefined {
  // First check environment variable value
  const cfsInstallerHome = process.env.CFS_INSTALL_DIR;

  if (cfsInstallerHome) {
    const resolvedPath = path.isAbsolute(cfsInstallerHome)
      ? cfsInstallerHome
      : path.resolve(process.cwd(), cfsInstallerHome);

    if (fs.existsSync(path.join(resolvedPath, 'cfs.json'))) {
      return resolvedPath;
    }

    console.error(
      `cfs.json file not found in CFS_INSTALL_DIR (${resolvedPath}). Please check the path and try again.`
    );

    return undefined;
  }

  // If env var is not defined, check user config file
  const userConfig = readUserConfig(config);

  if (
    userConfig?.cfsInstallPath &&
    typeof userConfig.cfsInstallPath === 'string' &&
    userConfig.cfsInstallPath.trim() !== ''
  ) {
    const configuredPath = userConfig.cfsInstallPath as string;

    const resolvedPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);

    if (fs.existsSync(path.join(resolvedPath, 'cfs.json'))) {
      return resolvedPath;
    }
  }

  // Finally, try to find CFS install root folder in parent directories
  // Limit search depth to prevent excessive directory traversal
  const MAX_SEARCH_DEPTH = 5;
  let searchDir = path.dirname(config.root);
  let iterations = 0;

  do {
    // Check if we've exceeded max search depth
    if (iterations >= MAX_SEARCH_DEPTH) {
      console.error(
        `CFS installation not found within ${MAX_SEARCH_DEPTH} directory levels. ` +
          `Set CFS_INSTALL_DIR environment variable or configure cfsInstallPath in config.json to specify the installation path.`
      );

      return undefined;
    }

    if (fs.existsSync(path.join(searchDir, 'cfs.json'))) {
      return searchDir;
    }

    searchDir = path.dirname(searchDir);
    iterations++;
    // Stop if we reach the root folder
  } while (searchDir !== path.parse(searchDir).root);

  console.error(
    'Running outside of CFS installation. Set CFS_INSTALL_DIR environment variable or configure cfsInstallPath in config.json and try again.'
  );

  return undefined;
}

// Check if a project with the given name exists in the list of tasks, and throw an error if not found
export function checkProjectExists(
  tasks: Task.Definition[],
  projectName: string
): void {
  const projectExists = tasks.some(
    (task) => task.projectId === projectName
  );

  if (!projectExists) {
    throw new Error(
      `No project with the name "${projectName}" found in the specified workspace.`
    );
  }
}

/**
 * Determines latest version of a plugin based on a list of available plugins
 * @param templateId - Specified plugin by templateId we want the latest version of
 * @param plugins - Available plugins
 * @returns  The latest version string of the plugin with the specified templateId, or `undefined` if no matching plugin is found.
 */
export function getLatestPluginVersion(
  templateId: string,
  plugins: CfsPluginInfo[]
): string | undefined {
  let latestVersion: string | undefined;

  for (const plugin of plugins) {
    if (
      plugin.pluginId === templateId &&
      (!latestVersion ||
        semverLessThan(latestVersion, plugin.pluginVersion) === true)
    ) {
      latestVersion = plugin.pluginVersion;
    }
  }

  return latestVersion;
}

/**
 * Converts a string to title case
 * @param str - The string to convert to title case
 * @returns The string in title case
 */
export function titleCase(str: string) {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * @description This function takes an object and converts all of its keys to PascalCase. It also recursively converts any nested objects and arrays to PascalCase.
 * @param obj - The object to convert
 * @returns - The object with all keys converted to PascalCase
 */
export const convertToPascalCase = (
  obj: Record<string, unknown>
): Record<string, unknown> => {
  const acc: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const pascalKey = titleCase(key);

    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      acc[pascalKey] = convertToPascalCase(
        value as Record<string, unknown>
      );
    } else if (Array.isArray(value)) {
      acc[pascalKey] = value.map((item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item)
          ? convertToPascalCase(item as Record<string, unknown>)
          : item
      );
    } else {
      acc[pascalKey] = value;
    }
  }

  return acc;
};

/**
 * Get the package name from the catalog
 * @param config - configuration object from oclif
 * @param boardName - board name
 * @param socName - SoC name
 * @param errors - An array to collect any validation error messages.
 * @returns A promise that resolves when validation is complete.
 */
export async function getPackageName(
  config: Config,
  boardName: string,
  socName: string,
  errors: string[]
): Promise<string | undefined> {
  const catalog = await getSocCatalog(config, false);
  const socs = await catalog.getAll();
  const soc = findSocByName(socs, socName);

  const packageName = soc?.packages.find(
    (pkg) =>
      pkg.id ===
      soc?.boards.find(
        (board) =>
          board.name.toLowerCase() === (boardName ?? '').toLowerCase()
      )?.packageIDs[0]
  )?.dataModelPackageID;

  if (!packageName) {
    errors.push(
      `A valid package name could not be found for the specified board (${boardName}) and SoC (${socName}) combination. Please ensure that the board and SoC names are correct.`
    );
  }

  return packageName;
}

/**
 * Find a SoC by name (case-insensitive).
 * @param socs - Array of SoC objects to search through.
 * @param socName - The name of the SoC to find.
 * @returns The matching SoC object, or undefined if not found.
 */
export function findSocByName(
  socs: SoC[],
  socName: string
): SoC | undefined {
  const lowerName = socName.toLowerCase();
  return socs.find((soc) => soc.name.toLowerCase() === lowerName);
}

/**
 * Detects when output is not TTY and disables Table colors
 * @returns empty style block when output is piped
 */
export function tableOutputStyles() {
  return (
    !process.stdout.isTTY && {
      style: {
        border: [],
        head: []
      }
    }
  );
}

function getCfsWorkspaceFromPath(workspacePath: string) {
  const cfsFolder = `${workspacePath}/.cfs`;
  const workspaceFile = `${cfsFolder}/.cfsworkspace`;

  if (!checkIfFileExists(workspaceFile)) {
    throw new Error('no cfs workspace file');
  }

  return lowercaseFirstLetterProps(
    readJsonFile(workspaceFile)
  ) as CfsWorkspace;
}

function getConfigFromWorkspace(workspacePath: string): {
  config: CfsConfig;
  pathToConfig: string;
} {
  const cfsFolder = `${workspacePath}/.cfs`;
  const cfsWorkspace = getCfsWorkspaceFromPath(workspacePath);

  const pathToConfig = `${cfsFolder}/${cfsWorkspace.soc.toLowerCase()}-${cfsWorkspace.package.toLowerCase()}.cfsconfig`;
  const config = readJsonFile(pathToConfig) as CfsConfig;
  return {config, pathToConfig};
}

export function getCfsConfig(workspaceRootPath?: string) {
  if (workspaceRootPath?.length) {
    const result = getConfigFromWorkspace(workspaceRootPath);
    return result;
  }

  const searchPaths = [
    process.cwd(),
    path.resolve(process.cwd(), '..')
  ];

  for (const searchPath of searchPaths) {
    try {
      const result = getConfigFromWorkspace(searchPath);
      return result;
    } catch {
      continue;
    }
  }

  throw new Error(
    'No CFS workspace found in the current or parent directory, please provide a soc, core and model.'
  );
}

export function getVersionFromConfig(config: Config) {
  return config.version.split('-')[0];
}

export async function getCfsaiPath(config: Config): Promise<string> {
  const installPath = getCFSInstallPath(config);

  if (!installPath) {
    throw new Error('Could not resolve CFS Install Path.');
  }

  const toolManager = new CfsToolManager(undefined, [installPath]);

  const cfsaiPath = await toolManager.getToolPath('cfsai.tool');

  if (!cfsaiPath) {
    throw new Error('Could not resolve cfsai tool path in SDK.');
  }

  return cfsaiPath;
}
