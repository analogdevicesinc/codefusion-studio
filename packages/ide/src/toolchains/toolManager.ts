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

import * as fs from "fs";
import { readFileSync } from "fs";

import { Tool } from "./tool";
import { ToolInfo } from "./toolInfo";
import * as path from "path";
import { commands, ShellExecutionOptions, window, workspace } from "vscode";

import { VSCODE_OPEN_SETTINGS_COMMAND_ID } from "../commands/constants";
import {
  EXTENSION_ID,
  JLINK_PATH,
  SEARCH_DIRECTORIES,
  TOOLS,
} from "../constants";
import { ERROR, WARNING } from "../messages";
import { resolveVariables } from "../utils/resolveVariables";
import { Utils } from "../utils/utils";

import { Toolchain } from "./toolchain";
import { ToolchainInfo } from "./toolchainInfo";

import { platform } from "node:process";
import { getPropertyName } from "../properties";

/**
 * The ToolManager class manages all externally installed tools,
 * such as toolchains and debuggers.
 *
 * Example usage:
 *
 * ```
 * // Retrieve all installed tools
 * const installedTools = ToolManager.getInstance().getInstalledTools();
 *
 * // Get a specific tool by ID and version
 * const armToolchain = ToolManger.getInstance().getInstalledToolById("arm.none.eabi.toolchain", "12.3.1");
 * ```
 */
export class ToolManager {
  /** Tool info file name */
  private static readonly TOOL_INFO_FILE_NAME = "tool.json";
  /** Toolchain info file name */
  private static readonly TOOLCHAIN_INFO_FILE_NAME = "toolchain.json";
  /** Path to the MSDK directory relative to the CFS install path */
  private static readonly RELATIVE_MAXIM_PATH = "SDK/MAX";
  /** Notification option for opening search directory settings */
  private static readonly OPEN_SEARCH_DIRECTORY_SETTINGS = "Open Settings";

  /** ToolManager singleton instance */
  private static instance: ToolManager;

  /** Array of all installed tools */
  private installedTools: Tool[];
  /** Array of all tools available on the web */
  private availableTools: ToolInfo[];

  /**
   * Constructor
   */
  constructor() {
    this.installedTools = [];
    this.availableTools = [];
  }

  /**
   * @returns the ToolManager singleton instance
   */
  public static async getInstance(): Promise<ToolManager> {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager();
      await ToolManager.instance.refresh();
    }

    return ToolManager.instance;
  }

  /**
   * Refresh the ToolManager
   */
  public async refresh() {
    this.installedTools = [];
    this.availableTools = [];
    await ToolManager.instance.parseTools();
  }

  /**
   * Parse the tool at the specified file path
   * @param toolPath - the file path to the tool to parse
   * @returns the Tool object containing the parsed data
   */
  private parseTool(toolPath: string): Tool | null {
    const infoPath = path.join(toolPath, ToolManager.TOOL_INFO_FILE_NAME);
    try {
      if (!fs.existsSync(infoPath)) {
        console.error(`Failed to parse tool: Path ${infoPath} does not exist.`);
        return null;
      }

      const contents = readFileSync(infoPath, "utf8");
      const info = JSON.parse(contents) as ToolInfo;
      return new Tool(info, toolPath);
    } catch (error) {
      console.error(error);
    }
    return null;
  }

  /**
   * Parse the toolchain at the specified file path
   * @param toolchainPath - the file path to the toolchain to parse
   * @returns the Toolchain object containing the parsed data
   */
  private parseToolchain(toolchainPath: string): Toolchain | null {
    const infoPath = path.join(
      toolchainPath,
      ToolManager.TOOLCHAIN_INFO_FILE_NAME,
    );
    try {
      if (!fs.existsSync(infoPath)) {
        console.error(
          `Failed to parse toolchain: Path ${infoPath} does not exist.`,
        );
        return null;
      }

      const contents = readFileSync(infoPath, "utf8");
      const info = JSON.parse(contents) as ToolchainInfo;
      return new Toolchain(info, toolchainPath);
    } catch (error) {
      console.error(error);
    }
    return null;
  }

  /**
   * Search for all installed tools in the tool directories and parse them into
   * an internal data structure.
   */
  public async parseTools() {
    this.installedTools = [];

    const conf = workspace.getConfiguration(EXTENSION_ID);
    const searchDirs: string[] | undefined = conf.get(
      `${TOOLS}.${SEARCH_DIRECTORIES}`,
    );

    if (!searchDirs || searchDirs.length === 0) {
      window
        .showErrorMessage(
          ERROR.noToolSearchDirectories,
          ToolManager.OPEN_SEARCH_DIRECTORY_SETTINGS,
        )
        .then((choice) => {
          if (choice === ToolManager.OPEN_SEARCH_DIRECTORY_SETTINGS) {
            commands.executeCommand(
              VSCODE_OPEN_SETTINGS_COMMAND_ID,
              `${EXTENSION_ID}.${TOOLS}.${SEARCH_DIRECTORIES}`,
            );
          }
        });

      return;
    }

    searchDirs.forEach((searchDir: string) => {
      const dir = resolveVariables(searchDir, true);

      const tools = Utils.findFilesInDir(
        dir,
        ToolManager.TOOL_INFO_FILE_NAME,
        ToolManager.TOOLCHAIN_INFO_FILE_NAME,
      );

      if (tools.length === 0) {
        window
          .showErrorMessage(
            "Failed to find any tools or toolchains. Please verify and update your search directories.",
            ToolManager.OPEN_SEARCH_DIRECTORY_SETTINGS,
          )
          .then((choice) => {
            if (choice === ToolManager.OPEN_SEARCH_DIRECTORY_SETTINGS) {
              commands.executeCommand(
                VSCODE_OPEN_SETTINGS_COMMAND_ID,
                `${EXTENSION_ID}.${TOOLS}.${SEARCH_DIRECTORIES}`,
              );
            }
          });
        return;
      }

      tools.forEach((tool) => {
        const folder = path.dirname(tool);
        if (path.basename(tool) === ToolManager.TOOL_INFO_FILE_NAME) {
          this.addTool(folder);
        } else if (
          path.basename(tool) === ToolManager.TOOLCHAIN_INFO_FILE_NAME
        ) {
          this.addToolchain(folder);
        }
      });
    });
  }

  /**
   * Add the tool at the given path to the array of installed tools
   * @param toolPath - the file path to the tool to add
   */
  public addTool(toolPath: string) {
    const tool = this.parseTool(toolPath);

    if (!tool) {
      return;
    }

    this.warnIfDuplicate(tool.getInfo().id, tool.getInfo().version);

    this.installedTools.push(tool);
  }

  /**
   * Add the toolchain at the given path to the array of installed tools
   * @param toolchainPath - the file path to the toolchain to add
   */
  public addToolchain(toolchainPath: string) {
    const toolchain = this.parseToolchain(toolchainPath);

    if (!toolchain) {
      return;
    }

    this.warnIfDuplicate(toolchain.getInfo().id, toolchain.getInfo().version);

    this.installedTools.push(toolchain);
  }

  /**
   * Display a warning if the given tool ID and version is already in the array of installed tools.
   * @param id - the tool ID
   * @param version - the tool version
   */
  private warnIfDuplicate(id: string, version: string) {
    if (this.getInstalledTool(id, version) !== null) {
      Utils.displayAndLogWarning(
        `${WARNING.duplicateToolFound} ${id} v${version}`,
      );
    }
  }

  /**
   * Remove the tool with the given ID and version
   * @param toolId - the tool ID
   * @param version - the version
   */
  public removeTool(toolId: string, version: string) {
    this.installedTools = this.installedTools.filter((tool) => {
      const toolInfo = tool.getInfo();
      return toolInfo.id !== toolId || toolInfo.version !== version;
    });
  }

  /**
   * Get all installed tools
   * @returns all currently installed tools
   */
  public getInstalledTools() {
    return this.installedTools;
  }

  /**
   * Get all tools available on the web
   * @returns all available tools
   */
  public getAvailableTools() {
    return this.availableTools;
  }

  /**
   * Get the installed tools by ID
   * @param id - the tool ID
   * @returns an array containing all installed tools with the given ID, or an empty array
   */
  public getInstalledToolsForId(id: string): Tool[] {
    const tools: Tool[] = [];

    this.installedTools.forEach((tool: Tool) => {
      if (tool.getInfo().id === id) {
        tools.push(tool);
      }
    });

    return tools;
  }

  /**
   * Get the installed tool by ID and version
   * @param id - the tool ID
   * @param version - te tool version
   * @returns the Tool if found, otherwise null
   */
  public getInstalledTool(id: string, version: string): Tool | null {
    for (const tool of this.installedTools) {
      if (tool.getInfo().id === id && tool.getInfo().version === version) {
        return tool;
      }
    }

    return null;
  }

  /**
   * Get the installed toolchains by ID
   * @param id - the toolchain ID
   * @returns an array containing all installed toolchains with the given ID, or an empty array
   */
  public getInstalledToolchainsForId(id: string): Toolchain[] {
    const tools = this.getInstalledToolsForId(id);

    return tools
      .filter((tool: Tool) => {
        return tool instanceof Toolchain;
      })
      .map((tool) => {
        return tool as Toolchain;
      });
  }

  /**
   * Get the envVars for each tool.json
   * @returns an object containing all envVars for each tool.json
   */
  public getEnvVars(): Record<string, string> {
    const envVars: Record<string, string> = {};

    this.installedTools.forEach((tool) => {
      const toolInfo = tool.getInfo();
      if (toolInfo.envVars && toolInfo.envVars.length > 0) {
        toolInfo.envVars.forEach((envVar) => {
          const value = envVar.isPath
            ? path.join(tool.getPath(), envVar.value)
            : envVar.value;
          envVars[envVar.name] = value;
        });
      }
    });

    return envVars;
  }

  /**
   * Get the shell path, including the SDK path and the
   * binary path for each installed tool
   * @returns the shell path
   */
  public async getShellPath(): Promise<string> {
    const sdkPath = await Utils.getSdkPath();
    const jlinkExecutablePath = resolveVariables(
      getPropertyName(JLINK_PATH),
      true,
    );
    const shellPath: (string | undefined)[] = [];
    this.installedTools.forEach((tool: Tool) => {
      const toolPaths = tool.getPaths();
      // if the tool doesn't define any paths, assume the bin path
      if (toolPaths.length == 0) {
        shellPath.push(tool.getBinaryPath());
      } else {
        toolPaths.forEach((path) => {
          shellPath.push(path);
        });
      }
    });
    shellPath.push(sdkPath);
    if (jlinkExecutablePath && jlinkExecutablePath !== "null") {
      shellPath.push(jlinkExecutablePath);
    }
    shellPath.push(process.env.PATH);

    return shellPath.join(path.delimiter);
  }

  /**
   * Get the shell environment, including the updated PATH and MAXIM_PATH variables
   * @returns the shell environment
   */
  public async getShellEnvironment(): Promise<ShellExecutionOptions["env"]> {
    const shellPath = await this.getShellPath();
    const sdkPath = await Utils.getSdkPath();

    let maximPath = "";
    let zephyrSdkPath = "";

    if (sdkPath) {
      maximPath = path.join(sdkPath, ToolManager.RELATIVE_MAXIM_PATH);
      zephyrSdkPath = path.join(sdkPath, "Tools/zephyr-sdk");
    }

    // Add zephyr-sdk to the CMAKE_PREFIX_PATH so CMake can find the zephyr toolchains.
    let cmakePrefixPath = `${zephyrSdkPath}`;
    if (process.env.CMAKE_PREFIX_PATH) {
      cmakePrefixPath += `${path.delimiter}${process.env.CMAKE_PREFIX_PATH}`;
    }

    let gitExecPath = "";
    if (platform != "win32") {
      const gitTools = this.getInstalledToolsForId("git.tool");
      if (gitTools.length > 0) {
        // grab the first instance of git.
        // needs to be updated in the future to specify the active version
        const git = gitTools[0];
        gitExecPath = path.join(git.getPath(), "libexec", "git-core");
      }
    }

    // Retrieve envVars for all tool.json files
    const envVarsObj = this.getEnvVars();

    return {
      PATH: shellPath,
      MAXIM_PATH: maximPath,
      PYTHON_CMD: "none",
      CMAKE_PREFIX_PATH: cmakePrefixPath,
      GIT_EXEC_PATH: gitExecPath,
      ZEPHYR_BASE: resolveVariables("${config:cfs.zephyr.workspace.path}"),
      ...envVarsObj,
    };
  }
}
