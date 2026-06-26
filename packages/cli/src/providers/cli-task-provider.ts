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

import type {CfsPackageManagerProvider} from 'cfs-package-manager';
import type {CfsWorkspace, Task} from 'cfs-types';

import {
  CfsTaskDiscoveryStrategy,
  CfsTaskProvider,
  CfsToolManager,
  CfsVariableResolver,
  MsdkTaskStrategy,
  type ShellEnvOptions,
  ZephyrTaskStrategy,
  checkIfFileExists,
  readJsonFile,
  resolveZephyrSdkRoot
} from 'cfs-lib';
import fs from 'node:fs';
import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import path from 'node:path';

import type {CliConfig} from '../types/cli-config.js';

import {GenericTaskDiscoveryStrategy} from '../utils/generic-task-discovery-strategy.js';
import {
  checkProjectExists,
  lowercaseFirstLetterProps
} from '../utils/utils.js';
import {CliConfigResolver} from './cli-config-resolver.js';
import {CliEnvironmentVariableProvider} from './cli-environment-variable-provider.js';

export class CliTaskProvider {
  private readonly configResolver: CliConfigResolver;
  private readonly envVarProvider: CliEnvironmentVariableProvider;
  private readonly taskProvider: CfsTaskProvider;
  private readonly toolManager: CfsToolManager;
  private readonly userConfig?: CliConfig;
  private readonly variableResolver: CfsVariableResolver;
  private variableResolverWorkspaceFolder: string;
  private readonly workspacePath: string;

  constructor(
    workspacePath: string,
    packageManager?: CfsPackageManagerProvider,
    userConfig?: CliConfig
  ) {
    this.workspacePath = workspacePath;
    this.variableResolverWorkspaceFolder = workspacePath;
    this.userConfig = userConfig;

    // Initialize config resolver
    this.configResolver = new CliConfigResolver(
      workspacePath,
      userConfig
    );

    // Resolve SDK path and tool search paths
    const sdkPath = this.resolveSdkPath();
    const toolSearchPaths = this.resolveToolSearchPaths(sdkPath);

    const {soc} = this.getCfsWorkspaceFromPath(workspacePath);

    // Initialize tool manager with package manager and search paths
    this.toolManager = new CfsToolManager(
      packageManager,
      toolSearchPaths,
      soc
    );

    this.envVarProvider = new CliEnvironmentVariableProvider(
      workspacePath
    );

    // Initialize variable resolver with all providers
    this.variableResolver =
      this.createVariableResolver(workspacePath);

    // Initialize task provider with discovery strategies
    this.taskProvider = new CfsTaskProvider(
      [
        new CfsTaskDiscoveryStrategy(this.toolManager),
        new GenericTaskDiscoveryStrategy()
      ],
      [new MsdkTaskStrategy(), new ZephyrTaskStrategy()]
    );
  }

  /**
   * Build shell environment options from config and tool manager.
   * @returns Shell environment options.
   */
  async buildShellEnvOptions(): Promise<ShellEnvOptions> {
    const sdkPath = this.resolveSdkPath();
    const jlinkPath =
      this.configResolver.get('cfs.jlink.path') ??
      process.env.JLINK_PATH ??
      undefined;

    // Zephyr base: custom workspace or default from zephyr tool
    let zephyrBase: string | undefined;
    const customZephyrWorkspace = this.configResolver.get(
      'cfs.zephyr.workspace.path'
    );
    if (customZephyrWorkspace) {
      zephyrBase = customZephyrWorkspace;
    } else {
      const zephyrPath = await this.toolManager.getToolPath('zephyr');
      if (zephyrPath) {
        zephyrBase = path.join(zephyrPath, 'zephyr');
      }
    }

    // Zephyr SDK: prefer per-project override, then toolchain ID from settings, then legacy path
    let zephyrSdkPath: string | undefined;
    const toolchainPathOverride = this.configResolver.get(
      'cfs.project.toolchain.path'
    );
    if (toolchainPathOverride) {
      zephyrSdkPath = toolchainPathOverride;
    } else {
      const toolchainId =
        this.configResolver.get('cfs.project.toolchain.id') ??
        'arm.zephyr.eabi.toolchain';
      const zephyrToolPath = toolchainId.includes('zephyr')
        ? await this.toolManager.getToolPath(toolchainId)
        : undefined;

      if (zephyrToolPath) {
        zephyrSdkPath = resolveZephyrSdkRoot(zephyrToolPath);
      } else if (sdkPath) {
        zephyrSdkPath = path.join(sdkPath, 'Tools', 'zephyr-sdk');
      }
    }

    const cmakePrefixPath = zephyrSdkPath;

    // Git exec path (non-Windows only)
    let gitExecPath: string | undefined;
    if (process.platform !== 'win32') {
      const gitPath = await this.toolManager.getToolPath('git.tool');
      if (gitPath) {
        gitExecPath = path.join(gitPath, 'libexec', 'git-core');
      }
    }

    // CFSAI path
    const cfsaiPath =
      (await this.toolManager.getToolPath('cfsai.tool')) ?? undefined;

    return {
      sdkPath,
      jlinkPath,
      zephyrBase,
      zephyrSdkPath,
      cmakePrefixPath,
      gitExecPath,
      cfsaiPath
    };
  }

  /**
   * Fetch tasks from the workspace, optionally filtered by project.
   * @param project - Optional project name to filter tasks.
   * @returns Array of task definitions.
   */
  async fetchTasks(project?: string): Promise<Task.Definition[]> {
    let workspace = this.workspacePath;
    let inferredProject: string | undefined;

    // return an error if the workspace does not exist
    if (!checkIfFileExists(workspace)) {
      throw new Error(
        `Workspace path "${workspace}" does not exist.`
      );
    }

    // Support both workspace root and project cwd.
    // If .cfs is not in current folder, try finding it in ancestors.
    let cfsFolder = join(workspace, '.cfs');
    if (!checkIfFileExists(cfsFolder)) {
      let searchDir = workspace;
      let foundWorkspaceRoot: string | undefined;

      while (searchDir !== path.dirname(searchDir)) {
        const parent = path.dirname(searchDir);
        const parentCfsFolder = join(parent, '.cfs');
        if (checkIfFileExists(parentCfsFolder)) {
          foundWorkspaceRoot = parent;
          break;
        }

        searchDir = parent;
      }

      if (!foundWorkspaceRoot) {
        throw new Error(
          `Workspace path "${workspace}" is not a valid CFS workspace or project path inside a CFS workspace.`
        );
      }

      // If command is run from inside a project folder, infer project filter.
      const relPath = path.relative(foundWorkspaceRoot, workspace);
      const relSegments = relPath.split(path.sep).filter(Boolean);
      if (relSegments.length > 0) {
        inferredProject = relSegments[0];
      }

      workspace = foundWorkspaceRoot;
      cfsFolder = join(workspace, '.cfs');
    }

    // Identify all folders in the workspace folder, excluding .cfs.
    const entries = await readdir(workspace, {withFileTypes: true});
    const folders = entries
      .filter((entry) => entry.isDirectory() && entry.name !== '.cfs')
      .map((entry) => join(workspace, entry.name));

    const discoveredTasks =
      await this.taskProvider.discoverTasks(folders);

    // For each task, generate a user-friendly name by removing characters that will
    // be problematic on the command line, and replacing spaces with underscores
    // For example, "Build (Project1)" becomes "Build_Project1"
    for (const task of discoveredTasks) {
      task.userFriendlyName = task.label
        .replaceAll(/[^\w .-]/g, '')
        .replaceAll(/\s+/g, '_');
    }

    const selectedProject = project ?? inferredProject;

    if (selectedProject) {
      // Filter tasks by project if a project name is provided
      checkProjectExists(discoveredTasks, selectedProject);

      return discoveredTasks.filter(
        (task) => task.projectId === selectedProject
      );
    }

    return discoveredTasks; // Return all tasks if no project filter is applied
  }

  /**
   * Extract and resolve environment variables from the `cfs.environment`
   * setting in the workspace/project settings.json.
   *
   * Each value may contain variable references (`${config:...}`,
   * `${command:...}`, `${workspaceFolder}`, `${env:...}`, etc.) which
   * are resolved using the same resolvers as task command strings.
   *
   * @returns Resolved environment variables as key-value pairs.
   */
  async getCfsEnvironmentVariables(): Promise<
    Record<string, string>
  > {
    const raw = this.configResolver.getRaw('cfs.environment');

    if (
      raw === undefined ||
      typeof raw !== 'object' ||
      Array.isArray(raw)
    ) {
      return {};
    }

    const envObject = raw as Record<string, unknown>;
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(envObject)) {
      if (typeof value !== 'string') {
        continue;
      }

      result[key] =
        await this.variableResolver.resolveStringVariables(value);
    }

    return result;
  }

  /**
   * Get the config resolver instance.
   * @returns Config resolver instance.
   */
  getConfigResolver(): CliConfigResolver {
    return this.configResolver;
  }

  /**
   * Get the tool manager instance.
   * @returns Tool manager instance.
   */
  getToolManager(): CfsToolManager {
    return this.toolManager;
  }

  /**
   * Get the variable resolver instance.
   * @returns Variable resolver instance.
   */
  getVariableResolver(): CfsVariableResolver {
    return this.variableResolver;
  }

  /**
   * Update the workspace folder context used for variable resolution.
   * @param folder - Absolute folder path to use for workspace scoped variables.
   * @returns void
   */
  setVariableResolverWorkspaceFolder(folder: string): void {
    this.variableResolverWorkspaceFolder = folder;
    this.envVarProvider.setWorkspaceFolder(folder);
  }

  /**
   * Create command provider callback for resolving ${command:...} variables.
   * @returns Command provider callback.
   */
  private createCommandProvider(): (
    cmd: string
  ) => Promise<string | undefined> {
    return async (cmd: string) => {
      if (cmd === 'cfs.tool.path.msdk') {
        return this.toolManager.getToolPath('msdk');
      }

      if (cmd === 'cfs.tool.path.zephyr') {
        return this.toolManager.getToolPath('zephyr');
      }

      if (cmd === 'cfs.getToolchainPath') {
        const toolchainPath = this.configResolver.get(
          'cfs.project.toolchain.path'
        );

        if (toolchainPath) {
          return toolchainPath;
        }

        const toolchainId = this.configResolver.get(
          'cfs.project.toolchain.id'
        );

        if (toolchainId) {
          return this.toolManager.getToolPath(toolchainId);
        }
      }

      if (cmd === 'cfs.jlink.setJlinkPath') {
        return (
          this.configResolver.get('cfs.jlink.path') ??
          process.env.JLINK_PATH
        );
      }

      // Cannot resolve interactive command in CLI context
    };
  }

  /**
   * Create a resolver for ${command:COMMAND} variables.
   * @param value - Input string potentially containing ${command:...} variables.
   * @returns Resolved string with ${command:...} variables replaced.
   * This resolver is separate because it requires asynchronous resolution of commands.
   */
  private createCommandVariableResolver(): (
    value: string
  ) => Promise<string> {
    const commandProvider = this.createCommandProvider();
    return async (value: string) => {
      const matches = [...value.matchAll(/\${command:([^}]+)}/g)];
      let result = value;

      for (const match of matches) {
        const [fullMatch, command] = match;
        const resolved = await commandProvider(command);
        if (resolved !== undefined) {
          result = result.replaceAll(fullMatch, resolved);
        }
      }

      return result;
    };
  }

  /**
   * Create a resolver for ${config:KEY} variables.
   * @param value - Input string potentially containing ${config:...} variables.
   * @returns Resolved string with ${config:...} variables replaced.
   * This resolver is separate because it accesses the config resolver to resolve values.
   */
  private createConfigVariableResolver(): (value: string) => string {
    return (value: string) =>
      value.replaceAll(/\${config:([^}]+)}/g, (fullMatch, key) => {
        const resolved = this.configResolver.get(key);
        return resolved ?? fullMatch;
      });
  }

  /**
   * Create a resolver for ${env:VAR} variables.
   * @param value - Input string potentially containing ${env:...} variables.
   * @returns Resolved string with ${env:...} variables replaced.
   * This resolver is separate because it accesses environment variables to resolve values.

   */
  private createEnvVariableResolver(): (value: string) => string {
    return (value: string) =>
      value.replaceAll(/\${env:([^}]+)}/g, (fullMatch, varName) => {
        const envValue = process.env[varName];
        return envValue ?? fullMatch;
      });
  }

  /**
   * Create a resolver for VS Code predefined variables in CLI context.
   * @param value - Input string potentially containing predefined variables.
   * @returns Resolved string with predefined variables replaced.
   * This resolver is separate because it handles a specific set of variables that are commonly used in task definitions, and it accesses the environment variable provider to resolve them.
   */
  private createPredefinedVariableResolver(): (
    value: string
  ) => string {
    return (value: string) =>
      value.replaceAll(/\${([/A-Za-z]+)}/g, (fullMatch, varName) => {
        const resolved = this.envVarProvider.resolve(varName);
        return resolved ?? fullMatch;
      });
  }

  /**
   * Create and configure the variable resolver with CLI-specific providers.
   * @param workspacePath - Absolute path to the workspace folder.
   * @returns Configured variable resolver.
   */
  private createVariableResolver(
    workspacePath: string
  ): CfsVariableResolver {
    const variableResolver = new CfsVariableResolver(
      this.toolManager
    );
    this.setVariableResolverWorkspaceFolder(workspacePath);

    variableResolver.registerResolver(
      this.createConfigVariableResolver()
    );
    variableResolver.registerResolver(
      this.createCommandVariableResolver()
    );
    variableResolver.registerResolver(
      this.createWorkspaceFolderVariableResolver()
    );
    variableResolver.registerResolver(
      this.createEnvVariableResolver()
    );
    variableResolver.registerResolver(
      this.createPredefinedVariableResolver()
    );

    return variableResolver;
  }

  /**
   * Create a resolver for ${workspaceFolder} variables.
   * @param workspacePath - Absolute path to the workspace folder.
   * @returns Resolver function for workspace folder variables.
   * This resolver is separate because it may need to be updated dynamically
   * if the workspace folder context changes (e.g., when running tasks from different project folders).
   */
  private createWorkspaceFolderVariableResolver(): (
    value: string
  ) => string {
    return (value: string) =>
      value.replaceAll(
        // eslint-disable-next-line no-template-curly-in-string
        '${workspaceFolder}',
        this.variableResolverWorkspaceFolder
      );
  }

  /**
   * Find the .cfsworkspace file in the current or parent directories and read its contents.
   * TODO: This function is a copy of a similar function in utils.ts. The function in utils.ts
   * does not search recursively in parent directories, and I didn't want to change its behavior
   * so late in the release cycle. We should refactor this function to be shared between utils.ts and this file.
   * @param workspacePath - Path to the workspace folder (or a subfolder inside it).
   * @returns The workspace configuration object read from the .cfsworkspace file in the .cfs folder.
   *
   */
  private getCfsWorkspaceFromPath(
    workspacePath: string
  ): CfsWorkspace {
    // Check if the .cfs folder exists in this folder. If not,
    // check the parent folder(s).	 If not, throw an error.
    let currentPath = path.resolve(workspacePath);

    while (!checkIfFileExists(path.join(currentPath, '.cfs'))) {
      const parentPath = path.resolve(currentPath, '..');
      if (parentPath === currentPath) {
        throw new Error(
          `No CFS workspace found at "${workspacePath}" or any parent directory (expected a .cfs folder).`
        );
      }

      currentPath = parentPath;
    }

    const cfsFolder = path.join(currentPath, '.cfs');
    const workspaceFile = path.join(cfsFolder, '.cfsworkspace');

    if (!checkIfFileExists(workspaceFile)) {
      throw new Error(
        `No CFS workspace file found at "${workspaceFile}" (expected a .cfs/.cfsworkspace file).`
      );
    }

    return lowercaseFirstLetterProps(
      readJsonFile(workspaceFile)
    ) as CfsWorkspace;
  }

  /**
   * Resolve SDK path from config, environment variable, or user config cfsInstallPath.
   * Priority order:
   * 1. CFS_INSTALL_DIR environment variable
   * 2. cfs.sdk.path from workspace config
   * 3. cfsInstallPath from user config file
   * @returns SDK path or throws error if not defined.
   */
  private resolveSdkPath(): string {
    // 1. Check environment variable
    const envSdkPath = process.env.CFS_INSTALL_DIR;

    if (envSdkPath) {
      return path.isAbsolute(envSdkPath)
        ? envSdkPath
        : path.resolve(process.cwd(), envSdkPath);
    }

    // 2. Check workspace config setting
    const configSdkPath = this.configResolver.get('cfs.sdk.path');

    if (configSdkPath) {
      return path.isAbsolute(configSdkPath)
        ? configSdkPath
        : path.resolve(process.cwd(), configSdkPath);
    }

    // 3. Check user config cfsInstallPath
    if (
      this.userConfig?.cfsInstallPath &&
      typeof this.userConfig.cfsInstallPath === 'string' &&
      this.userConfig.cfsInstallPath.trim() !== ''
    ) {
      const {cfsInstallPath} = this.userConfig;

      // Handle tilde expansion for home directory
      const expandedPath = cfsInstallPath.startsWith('~')
        ? path.join(
            process.env.HOME || process.env.USERPROFILE || '',
            cfsInstallPath.slice(1)
          )
        : cfsInstallPath;

      // Resolve to absolute path
      return path.isAbsolute(expandedPath)
        ? expandedPath
        : path.resolve(process.cwd(), expandedPath);
    }

    throw new Error(
      'SDK path not defined. Please set one of the following:\n' +
        '  - CFS_INSTALL_DIR environment variable\n' +
        '  - cfs.sdk.path in the .code-workspace file at the root of the CFS workspace\n' +
        '  - cfsInstallPath in user config file (~/.config/cfsutil/config.json)'
    );
  }

  /**
   * Resolve tool search directories from config, with fallback to defaults.
   * Mirrors IDE behavior where customSearchPaths include SDK install dirs.
   * @param sdkPath - Resolved SDK path.
   * @returns Array of resolved search directory paths.
   */
  private resolveToolSearchPaths(sdkPath: string): string[] {
    const userToolSearchPaths = this.resolveUserToolSearchPaths();

    // Try to get custom directories from config
    const configSearchDirs = this.configResolver.getAll('cfs.tools.');
    const customDirs =
      configSearchDirs['cfs.tools.searchDirectories'];
    const configToolSearchPaths: string[] = [];

    // If search directories are defined in config, resolve variable placeholder
    if (customDirs) {
      let dirs: string[] = [];

      // Try parsing as JSON array first
      try {
        const parsed = JSON.parse(customDirs);
        if (Array.isArray(parsed)) {
          dirs = parsed;
        }
      } catch {
        // Not valid JSON - try splitting as comma-separated string
        // This handles the case where String(array) produces "item1,item2,item3"
        dirs = customDirs
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean);
      }

      // Resolve ${config:cfs.sdk.path} placeholder using resolved SDK path.
      if (dirs.length > 0) {
        const pattern = /\${config:cfs\.sdk\.path}/g;
        const resolvedSdkPath = sdkPath ?? '';

        configToolSearchPaths.push(
          ...dirs.map((dir) =>
            dir.replaceAll(pattern, resolvedSdkPath)
          )
        );
      }
    }

    // user-configured toolSearchPaths extend configured/default paths.
    return [
      ...new Set([...configToolSearchPaths, ...userToolSearchPaths])
    ];
  }

  /**
   * Resolve custom tool search paths from user config.
   * @returns Array of resolved existing paths from user configuration.
   */
  private resolveUserToolSearchPaths(): string[] {
    const searchPaths: Set<string> = new Set<string>();
    const configuredPaths = this.userConfig?.toolSearchPaths;

    if (!Array.isArray(configuredPaths)) {
      return [];
    }

    for (const p of configuredPaths) {
      if (typeof p !== 'string' || p.trim() === '') {
        continue;
      }

      const resolvedPath = path.isAbsolute(p)
        ? p
        : path.resolve(process.cwd(), p);

      if (fs.existsSync(resolvedPath)) {
        searchPaths.add(resolvedPath);
      } else {
        console.warn(
          `Warning: Tool search path "${resolvedPath}" does not exist.`
        );
      }
    }

    return [...searchPaths];
  }
}
