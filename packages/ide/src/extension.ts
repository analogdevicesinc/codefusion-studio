/**
 *
 * Copyright (c) 2022-2025 Analog Devices, Inc.
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
import * as vscode from "vscode";
import { existsSync } from "node:fs";
import { join, normalize } from "node:path";

import {
  ACTIONS_TREE_COMMAND_ID,
  BROWSE_MAXIM_EXAMPLES_COMMAND_ID,
  GET_CONTEXT_COMMAND_ID,
  OPEN_CFS_UTIL_PATH_SETTING_COMMAND_ID,
  OPEN_HOME_PAGE_COMMAND_ID,
  OPEN_ONLINE_DOCUMENTATION_COMMAND_ID,
  OPEN_CONFIG_TOOLS_GETTING_STARTED_COMMAND_ID,
  OPEN_PROJECT_BOARD_SETTING_COMMAND_ID,
  OPEN_PROJECT_SETTING_COMMAND_ID,
  OPEN_WALKTHROUGH_COMMAND_ID,
  RUN_BUILD_TASK_COMMAND_ID,
  RUN_CLEAN_TASK_COMMAND_ID,
  RUN_OPENOCD_FLASH_TASK_COMMAND_ID,
  START_DEBUG_COMMAND_ID,
  SELECT_START_DEBUG_ARM_COMMAND_ID,
  SELECT_START_DEBUG_ARM_JLINK_COMMAND_ID,
  SELECT_START_DEBUG_RISCV_COMMAND_ID,
  SHOW_HOME_PAGE_AT_STARTUP_COMMAND_ID,
  VSCODE_OPEN_FOLDER_COMMAND_ID,
  VSCODE_OPEN_SETTINGS_COMMAND_ID,
  VSCODE_OPEN_WALKTHROUGH_COMMAND_ID,
  VSCODE_START_DEBUG_COMMAND_ID,
  VSCODE_SELECT_START_DEBUG_COMMAND_ID,
  SELECT_ZEPHYR_WORKSPACE,
  LAUNCH_DEBUG_WITH_OZONE_COMMAND_ID,
  QUICK_ACCESS_TREE_VIEW_ID,
  SET_SDK_PATH_COMMAND_ID,
  RUN_JLINK_FLASH_TASK_COMMAND_ID,
  DEVICE_TREE_VIEW_ID,
  CONTEXT_VIEW_ID,
  SHOW_SYSTEM_PLANNER_AT_STARTUP_COMMAND_ID,
  OPEN_SYSTEM_PLANNER_COMMAND_ID,
  RUN_DEFAULT_BUILD_TASKS_COMMAND_ID,
} from "./commands/constants";
import {
  BROWSE_SDK_PATH_COMMAND_ID,
  OPEN_OPENOCD_TARGET_SETTING_COMMAND_ID,
  OPEN_SDK_PATH_SETTINGS_COMMAND_ID,
  OPEN_SDK_SETTINGS_COMMAND_ID,
  SELECT_SDK_PATH_COMMAND_ID,
} from "./commands/constants";
import { SdkPath } from "./commands/sdkPath";
import {
  configureWorkspace,
  configureWorkspaceCommandHandler,
  ConfigureWorkspaceOptionEnum,
  YesNoEnum,
} from "./configurations/configureWorkspace";
import { HomePagePanel } from "./panels/homepage";
import * as msdk from "./toolchains/msdk/msdk";
import * as zephyr from "./toolchains/zephyr/zephyr";
import { resolveVariables } from "./utils/resolveVariables";
import { Utils } from "./utils/utils";
import {
  ActionsViewProvider,
  QuickAccessProvider,
  DeviceTreeProvider,
  ViewContainerItem,
  ContextPanelProvider,
} from "./view-container";
import {
  ADI_CONFIGURE_WORKSPACE_SETTING,
  BOARD,
  BUILD,
  CFS_BUILD,
  CFS_CLEAN,
  CFS_DEBUG,
  CFS_FLASH,
  CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP,
  CFS_UTIL_PATH,
  CLEAN,
  DEBUG,
  EXTENSION_ID,
  OPENOCD,
  OPENOCD_TARGET,
  CONFIG_TOOLS_ID,
  PROJECT,
  RISCV_DEBUG,
  SDK_PATH,
  ZEPHYR_WORKSPACE,
  PIN_CONFIG_USER_GUIDE_URL,
  FLASH_OPENOCD,
  DEBUG_ACTION,
  FLASH_JLINK,
  OPEN_SYSTEM_PLANNER_AT_STARTUP,
  MCU_EDITOR_ID,
  ACTIVE_CONTEXT,
} from "./constants";
import { INFO } from "./messages";
import { CFS_TERMINAL, CFS_TERMINAL_ID } from "./toolchains/constants";
import { ToolManager } from "./toolchains/toolManager";
import { platform } from "node:process";
import {
  registerViewConfigFileSourceCommand,
  registerViewWorkspaceConfigFileSourceCommand,
} from "./commands/view-config-file-source";
import { registerLoadConfigFileCommand } from "./commands/load-config-file";
import { registerLoadElfFileCommand } from "./commands/load-elf-file";
import { McuEditor } from "./custom-editors/mcu-editor";
import { ElfEditor } from "./custom-editors/elf-editor";
import { OzoneDebugConfiguration } from "./configurations/externalDebugConfiguration";
import { SocDataObj } from "./panels/data/soc-data-obj";
import WorkspaceCreationEditor from "./custom-editors/workspace-creation-editor";
import { registerAllCommands } from "./commands/commands";
import { openFileAtLocation } from "./utils/open-file-location";
import { CatalogManager } from "./catalog/catalogManager";

const DOCUMENTATION_URL =
  "https://developer.analog.com/docs/codefusion-studio/1.1.0/";

/**
 * Activate the extension
 * @param context - The context for this extension
 */
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  // Fix backslashes in Windows paths
  await verifyPathSettings();

  // Listen for changes to the SDK path and update cfsutil path accordingly.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(`${EXTENSION_ID}.${SDK_PATH}`)) {
        const cfsSdkPath = vscode.workspace
          .getConfiguration()
          .get<string>(`${EXTENSION_ID}.${SDK_PATH}`);
        if (cfsSdkPath) {
          const os = process.platform;
          const cfsUtilPath = normalize(
            join(
              cfsSdkPath,
              `Utils/cfsutil/bin/cfsutil${os === "win32" ? ".cmd" : ""}`,
            ),
          );
          vscode.workspace
            .getConfiguration()
            .update(
              `${CONFIG_TOOLS_ID}.${CFS_UTIL_PATH}`,
              cfsUtilPath,
              vscode.ConfigurationTarget.Global,
            );

          ToolManager.getInstance().then((toolManager) => {
            toolManager.refresh();
          });

          if (cfsSdkPath) {
            SocDataObj.getInstance().loadData(cfsSdkPath);
          }
        }
      }
    }),
  );

  const cfsUtilPath = vscode.workspace
    .getConfiguration()
    .get<string>(`${CONFIG_TOOLS_ID}.${CFS_UTIL_PATH}`);

  const isCfsUtilPathValid = cfsUtilPath && existsSync(cfsUtilPath);
  const os = process.platform;
  const cfsSdkPath = vscode.workspace
    .getConfiguration()
    .get<string>(`${EXTENSION_ID}.${SDK_PATH}`);
  const isCfsSdkPathValid = cfsSdkPath && existsSync(cfsSdkPath);
  if (!isCfsUtilPathValid && isCfsSdkPathValid) {
    const path = normalize(
      join(
        cfsSdkPath,
        `Utils/cfsutil/bin/cfsutil${os === "win32" ? ".cmd" : ""}`,
      ),
    );

    await vscode.workspace
      .getConfiguration()
      .update(
        `${CONFIG_TOOLS_ID}.${CFS_UTIL_PATH}`,
        path,
        vscode.ConfigurationTarget.Global,
      );
  }

  context.subscriptions.push(
    McuEditor.register(context),
    ElfEditor.register(context),
    WorkspaceCreationEditor.register(context),
  );

  registerCommands(context);
  registerAllCommands(context);

  activateWorkspace(context);

  registerTerminalProvider();

  //Initializing toolchain
  ToolManager.getInstance();

  //Instantiating SocData Object
  let conf = vscode.workspace.getConfiguration(EXTENSION_ID);
  const sdkPath = conf.get(SDK_PATH) as string;
  if (sdkPath) {
    SocDataObj.getInstance().loadData(sdkPath);
  }

  msdk.activate(context);
}

/**
 * Fix Windows paths by swapping backslashes with forwardslashes
 */
async function verifyPathSettings() {
  let conf = vscode.workspace.getConfiguration(EXTENSION_ID);
  const sdkPath = conf.get(SDK_PATH) as string;
  if (sdkPath && sdkPath.includes("\\")) {
    await conf.update(SDK_PATH, sdkPath.replace(/\\/g, "/"), true);
  }
}

/**
 * Register the CFS terminal provider
 */
async function registerTerminalProvider() {
  // Register terminal profile
  vscode.window.registerTerminalProfileProvider(CFS_TERMINAL_ID, {
    async provideTerminalProfile(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _token: vscode.CancellationToken,
    ): Promise<vscode.TerminalProfile | null | undefined> {
      const toolManager = await ToolManager.getInstance();
      const profile = new vscode.TerminalProfile({
        name: CFS_TERMINAL,
        shellPath: Utils.getShellExecutable(platform),
        env: await toolManager.getShellEnvironment(),
      });

      return profile;
    },
  });
}

/**
 * Register commands that can be used without configuring the workspace
 * @param context - the extension context
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Registering command handler for configuring workspace as a CFS workspace
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.${ADI_CONFIGURE_WORKSPACE_SETTING}`,
      configureWorkspaceCommandHandler,
    ),
  );

  // This command returns context, should be used for testing
  context.subscriptions.push(
    vscode.commands.registerCommand(
      GET_CONTEXT_COMMAND_ID,
      (): vscode.ExtensionContext => {
        return context;
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      SELECT_SDK_PATH_COMMAND_ID,
      SdkPath.selectSdkPathCommandHandler,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      SET_SDK_PATH_COMMAND_ID,
      SdkPath.setSdkPathCommandHandler,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      BROWSE_SDK_PATH_COMMAND_ID,
      SdkPath.browseSdkPathCommandHandler,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_SDK_SETTINGS_COMMAND_ID, () => {
      vscode.commands.executeCommand(
        VSCODE_OPEN_SETTINGS_COMMAND_ID,
        `${EXTENSION_ID}`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_SDK_PATH_SETTINGS_COMMAND_ID, () => {
      vscode.commands.executeCommand(
        VSCODE_OPEN_SETTINGS_COMMAND_ID,
        `${EXTENSION_ID}.${SDK_PATH}`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      OPEN_OPENOCD_TARGET_SETTING_COMMAND_ID,
      () => {
        vscode.commands.executeCommand(
          VSCODE_OPEN_SETTINGS_COMMAND_ID,
          `${EXTENSION_ID}.${OPENOCD}.${OPENOCD_TARGET}`,
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_PROJECT_SETTING_COMMAND_ID, () => {
      vscode.commands.executeCommand(
        VSCODE_OPEN_SETTINGS_COMMAND_ID,
        `${EXTENSION_ID}.${PROJECT}`,
      );
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      OPEN_CFS_UTIL_PATH_SETTING_COMMAND_ID,
      () => {
        vscode.commands.executeCommand(
          VSCODE_OPEN_SETTINGS_COMMAND_ID,
          `${CONFIG_TOOLS_ID}.${CFS_UTIL_PATH}`,
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      OPEN_PROJECT_BOARD_SETTING_COMMAND_ID,
      () => {
        vscode.commands.executeCommand(
          VSCODE_OPEN_SETTINGS_COMMAND_ID,
          `${EXTENSION_ID}.${PROJECT}.${BOARD}`,
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_WALKTHROUGH_COMMAND_ID, () => {
      vscode.commands.executeCommand(
        VSCODE_OPEN_WALKTHROUGH_COMMAND_ID,
        "analogdevices.cfs-ide#cfs.gettingStarted",
        false,
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      OPEN_CONFIG_TOOLS_GETTING_STARTED_COMMAND_ID,
      () => {
        const url = vscode.Uri.parse(PIN_CONFIG_USER_GUIDE_URL);
        vscode.env.openExternal(url);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(SELECT_START_DEBUG_ARM_COMMAND_ID, () => {
      vscode.commands.executeCommand(VSCODE_SELECT_START_DEBUG_COMMAND_ID);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      SELECT_START_DEBUG_ARM_JLINK_COMMAND_ID,
      () => {
        vscode.commands.executeCommand(VSCODE_SELECT_START_DEBUG_COMMAND_ID);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(SELECT_START_DEBUG_RISCV_COMMAND_ID, () => {
      vscode.commands.executeCommand(VSCODE_SELECT_START_DEBUG_COMMAND_ID);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      RUN_DEFAULT_BUILD_TASKS_COMMAND_ID,
      async () => {
        await Utils.runDefaultBuildTasks();
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cfs.edit-config",
      async (actionItem: ViewContainerItem) => {
        if (!vscode.workspace.workspaceFolders) {
          return;
        }

        const isTask =
          actionItem.contextValue?.localeCompare("debug-task") === 0;

        if (isTask) {
          await Utils.addTaskToTasksJson(actionItem);
        } else {
          const mainFolder = actionItem.commandArgs[0];
          const filePath = `${mainFolder?.uri.fsPath}/.vscode/launch.json`;
          openFileAtLocation(filePath, actionItem.label);
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cfs.copyAndEditTask",
      async (actionItem: ViewContainerItem) => {
        if (!vscode.workspace.workspaceFolders) {
          return;
        }

        const isTask =
          actionItem.contextValue?.localeCompare("copy-and-edit-task") === 0;

        if (isTask) {
          await Utils.addTaskToTasksJson(actionItem);
        } else {
          const mainFolder = actionItem.commandArgs[0];
          const filePath = `${mainFolder?.uri.fsPath}/.vscode/launch.json`;
          openFileAtLocation(filePath, actionItem.label);
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      START_DEBUG_COMMAND_ID,
      async (actionItem: ViewContainerItem) => {
        if (actionItem) {
          const [workspaceFolder, configName] = actionItem.commandArgs;
          const activeSession = vscode.debug.activeDebugSession;
          if (activeSession && activeSession.name === configName) {
            const answer = await vscode.window.showInformationMessage(
              `"${configName}" is already running. Do you want to start another instance?`,
              { modal: true },
              "Yes",
            );
            if (answer === "Yes") {
              await vscode.debug.startDebugging(workspaceFolder, configName);
            }
          } else {
            await vscode.debug.startDebugging(workspaceFolder, configName);
          }
        } else {
          await vscode.commands.executeCommand(VSCODE_START_DEBUG_COMMAND_ID);
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(RUN_BUILD_TASK_COMMAND_ID, async () => {
      const activeContext = getActiveWorkspace();
      await Utils.executeStatusBarTask(BUILD, activeContext);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(RUN_CLEAN_TASK_COMMAND_ID, async () => {
      const activeContext = getActiveWorkspace();
      await Utils.executeStatusBarTask(CLEAN, activeContext);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      RUN_OPENOCD_FLASH_TASK_COMMAND_ID,
      async () => {
        const activeContext = getActiveWorkspace();
        await Utils.executeStatusBarTask(FLASH_OPENOCD, activeContext);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      RUN_JLINK_FLASH_TASK_COMMAND_ID,
      async () => {
        const activeContext = getActiveWorkspace();
        await Utils.executeStatusBarTask(FLASH_JLINK, activeContext);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_HOME_PAGE_COMMAND_ID, () => {
      HomePagePanel.render(context.extensionUri);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_SYSTEM_PLANNER_COMMAND_ID, () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        return;
      }
      for (const folder of workspaceFolders) {
        if (folder.name === ".cfs") {
          vscode.workspace
            .findFiles(new vscode.RelativePattern(folder, "*.cfsconfig"))
            .then((cfsConfigFiles) => {
              if (cfsConfigFiles.length === 0) {
                return;
              }
              vscode.commands.executeCommand(
                "vscode.openWith",
                cfsConfigFiles[0],
                MCU_EDITOR_ID,
              );
            });
        }
      }
    }),
  );

  // context.subscriptions.push(
  //   vscode.commands.registerCommand(
  //     WORKSPACE_CREATION_COMMANDS.LOAD_CONFIG_FILE,
  //     async () => {
  //       await vscode.commands.executeCommand(
  //         VSCODE_OPEN_FOLDER_COMMAND_ID,
  //         vscode.workspace.workspaceFolders![0].uri,
  //       );
  //     },
  //   ),
  // );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      CONTEXT_VIEW_ID,
      new ContextPanelProvider(),
    ),
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      QUICK_ACCESS_TREE_VIEW_ID,
      new QuickAccessProvider(),
    ),
  );

  const actionsViewProvider = new ActionsViewProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      ACTIONS_TREE_COMMAND_ID,
      actionsViewProvider,
    ),
  );

  const deviceTreeViewProvider = new DeviceTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      DEVICE_TREE_VIEW_ID,
      deviceTreeViewProvider,
    ),
  );

  vscode.workspace.onDidChangeConfiguration(
    async (event: vscode.ConfigurationChangeEvent) => {
      // refresh the actions panel when launch configurations change
      if (event.affectsConfiguration("launch")) {
        const debugActionElement = actionsViewProvider.getElement(DEBUG_ACTION);
        if (debugActionElement) {
          actionsViewProvider.refreshEvent.fire(debugActionElement);
        }
      }

      // refresh the actions panel when tasks change
      if (event.affectsConfiguration("tasks")) {
        actionsViewProvider.updateTaskActions();
      }
    },
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      OPEN_ONLINE_DOCUMENTATION_COMMAND_ID,
      async () => {
        const uri = vscode.Uri.parse(DOCUMENTATION_URL);
        await vscode.env.openExternal(uri);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      BROWSE_MAXIM_EXAMPLES_COMMAND_ID,
      async () => {
        browseExamples();
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cfs.migrateMsdkProjects", async () => {
      const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
      const sdkPath = conf.get(SDK_PATH);
      const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        canSelectFiles: false,
        canSelectFolders: true,
        defaultUri: vscode.Uri.file(sdkPath + "/SDK/MAX/Examples"),
        openLabel: "Select folder",
      };

      const folderUri = await vscode.window.showOpenDialog(options);
      if (folderUri && folderUri[0]) {
        try {
          msdk.migrateProjects(folderUri[0].fsPath);
        } catch (error) {
          vscode.window.showErrorMessage(`Could not migrate projects ${error}`);
        }
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      SHOW_HOME_PAGE_AT_STARTUP_COMMAND_ID,
      async () => {
        const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
        const openHomePageAtStartup = conf.get(
          CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP,
        );
        if (openHomePageAtStartup === YesNoEnum[YesNoEnum.Yes]) {
          vscode.commands.executeCommand(OPEN_HOME_PAGE_COMMAND_ID);
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      SHOW_SYSTEM_PLANNER_AT_STARTUP_COMMAND_ID,
      async () => {
        const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
        const open = conf.get(OPEN_SYSTEM_PLANNER_AT_STARTUP);
        if (open === YesNoEnum[YesNoEnum.Yes]) {
          vscode.commands.executeCommand(OPEN_SYSTEM_PLANNER_COMMAND_ID);
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.debug.onDidStartDebugSession((session) => {
      if (session.name === RISCV_DEBUG) {
        setDefaultBreakpoints();
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(SELECT_ZEPHYR_WORKSPACE, async () => {
      selectZephyrWorkspace();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      LAUNCH_DEBUG_WITH_OZONE_COMMAND_ID,
      async () => {
        await OzoneDebugConfiguration.launchOzoneCommandHandler();
      },
    ),
  );

  const loadELfFile = registerLoadElfFileCommand();
  const loadConfigFile = registerLoadConfigFileCommand();
  const viewConfigFileSource = registerViewConfigFileSourceCommand();
  const viewWorkspaceConfigFileSource =
    registerViewWorkspaceConfigFileSourceCommand();

  context.subscriptions.push(
    loadELfFile,
    loadConfigFile,
    viewConfigFileSource,
    viewWorkspaceConfigFileSource,
  );
}

/**
 * Asynchronous function to set default breakpoints for RISC-V debug sessions.
 */
async function setDefaultBreakpoints() {
  const functionName = "main"; // Hardcoded for now - to be updated later.
  const existingBreakpoints = vscode.debug.breakpoints;
  // Checks if breakpoint has already been set
  const breakpointExists = existingBreakpoints.some((bp) => {
    if (bp instanceof vscode.FunctionBreakpoint) {
      return bp.functionName === functionName;
    }
    return false;
  });
  if (!breakpointExists) {
    const breakPoint = new vscode.FunctionBreakpoint(functionName);
    vscode.debug.addBreakpoints([breakPoint]);
  }
}

/**
 * Asynchronously prompt the user to activate the workspace if they haven't already.
 * @param context - the extension context
 */
async function activateWorkspace(context: vscode.ExtensionContext) {
  // Adding commands and tasks when the user chooses to configure the workspace as a CFS workspace
  // Do nothing if there aren't any open workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  let conf = vscode.workspace.getConfiguration(EXTENSION_ID);
  const configureWorkspaceSetting = conf.get(
    ADI_CONFIGURE_WORKSPACE_SETTING,
    ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.No],
  );
  let choiceSelected = false;
  if (
    configureWorkspaceSetting ===
    ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.No]
  ) {
    // Waiting for user's selection
    await vscode.window
      .showInformationMessage(
        INFO.configureWorkspace,
        ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.Yes],
        ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.No],
        ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.Never],
      )
      .then(async (choice: string | undefined) => {
        if (choice === undefined) {
          return;
        }

        if (
          choice ===
          ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.Yes]
        ) {
          vscode.commands.executeCommand(SHOW_HOME_PAGE_AT_STARTUP_COMMAND_ID);
          vscode.commands.executeCommand(
            SHOW_SYSTEM_PLANNER_AT_STARTUP_COMMAND_ID,
          );
        }

        await conf.update(ADI_CONFIGURE_WORKSPACE_SETTING, choice, false);
        choiceSelected = true;
      });
  }

  conf = vscode.workspace.getConfiguration(EXTENSION_ID);
  if (
    conf.get(ADI_CONFIGURE_WORKSPACE_SETTING) ===
    ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.Yes]
  ) {
    configureWorkspace(context, !choiceSelected);
    vscode.commands.executeCommand(SHOW_HOME_PAGE_AT_STARTUP_COMMAND_ID);
    vscode.commands.executeCommand(SHOW_SYSTEM_PLANNER_AT_STARTUP_COMMAND_ID);
  }

  //Configuring workspace as ADI workspace on change of ADI_CONFIGURE_WORKSPACE_SETTING property
  vscode.workspace.onDidChangeConfiguration((event) => {
    conf = vscode.workspace.getConfiguration(EXTENSION_ID);
    if (
      event.affectsConfiguration(
        EXTENSION_ID + "." + ADI_CONFIGURE_WORKSPACE_SETTING,
      )
    ) {
      if (
        conf.get(ADI_CONFIGURE_WORKSPACE_SETTING) ===
        ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.Yes]
      )
        configureWorkspace(context);
    }
  });

  // Build Status Bar Icon
  const statusBarBuild = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarBuild.command = RUN_BUILD_TASK_COMMAND_ID;
  context.subscriptions.push(statusBarBuild);
  updateStatusBarItem(statusBarBuild, BUILD);

  // Clean Status Bar Icon
  const statusBarClean = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarClean.command = RUN_CLEAN_TASK_COMMAND_ID;
  context.subscriptions.push(statusBarClean);
  updateStatusBarItem(statusBarClean, CLEAN);

  // Flash Status Bar Icon
  const statusBarFlash = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarFlash.command = RUN_JLINK_FLASH_TASK_COMMAND_ID;
  context.subscriptions.push(statusBarFlash);
  updateStatusBarItem(statusBarFlash, FLASH_JLINK);

  // Debug Status Bar Icon
  const statusBarDebug = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );

  statusBarDebug.command = START_DEBUG_COMMAND_ID;
  context.subscriptions.push(statusBarDebug);
  updateStatusBarItem(statusBarDebug, DEBUG);
}

/**
 * Adds actions to the status bar, and defines their tooltips.
 * @param statusBarItem - vscode status bar item that has actions added
 * @param itemType - string to indicate which status bar item is passed into the function
 */
const updateStatusBarItem = (
  statusBarItem: vscode.StatusBarItem,
  itemType: string,
): void => {
  switch (itemType) {
    case BUILD:
      statusBarItem.text = `$(tools)`;
      statusBarItem.tooltip = CFS_BUILD;
      break;

    case CLEAN:
      statusBarItem.text = `$(trash)`;
      statusBarItem.tooltip = CFS_CLEAN;
      break;

    case FLASH_JLINK:
      statusBarItem.text = `$(zap)`;
      statusBarItem.tooltip = CFS_FLASH;
      break;

    case DEBUG:
      statusBarItem.text = `$(debug)`;
      statusBarItem.tooltip = CFS_DEBUG;
      break;

    default:
      break;
  }
  statusBarItem.show();
};

/**
 * Opens MSDK examples directory so user can browse examples projects
 */
const browseExamples = async () => {
  const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
  const sdkPath = conf.get(SDK_PATH);
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    canSelectFiles: false,
    canSelectFolders: true,
    defaultUri: vscode.Uri.file(
      path.join(sdkPath as string, "SDK", "MAX", "Examples"),
    ),
    openLabel: "Open Example",
  };

  const folderUri = await vscode.window.showOpenDialog(options);
  if (folderUri && folderUri[0]) {
    try {
      await vscode.commands.executeCommand(
        VSCODE_OPEN_FOLDER_COMMAND_ID,
        folderUri[0],
        { forceNewWindow: false },
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Could not open folder ${error}`);
    }
  }
};

/**
 * Opens users directory so user can browse existing projects
 */
const openExistingProjects = async () => {
  const userHomePath = resolveVariables("${userHome}");
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    canSelectFiles: false,
    canSelectFolders: true,
    defaultUri: vscode.Uri.file(userHomePath),
    openLabel: "Open Project",
  };

  const folderUri = await vscode.window.showOpenDialog(options);
  if (folderUri && folderUri[0]) {
    try {
      await vscode.commands.executeCommand(
        VSCODE_OPEN_FOLDER_COMMAND_ID,
        folderUri[0],
        { forceNewWindow: false },
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Could not open folder ${error}`);
    }
  }
};

const selectZephyrWorkspace = async () => {
  const options: vscode.OpenDialogOptions = {
    title: "Select Zephyr Workspace",
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
  };

  vscode.window
    .showOpenDialog(options)
    .then((uris: vscode.Uri[] | undefined) => {
      if (uris === undefined) {
        return;
      }

      let uri = uris[0];

      if (uri === undefined) {
        return;
      }

      const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
      try {
        conf.update(ZEPHYR_WORKSPACE, uri.fsPath, false);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error setting the Zephyr Workspace\n${error}`,
        );
      }
    });
};

/**
 * Checks cfs.activeContext setting and searches for the corresponding workspace folder
 * @returns active workspace or undefined
 */
const getActiveWorkspace = () => {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const context = config.get(ACTIVE_CONTEXT) as string;
  if (context === "Workspace") {
    return context;
  } else {
    const wrksp = vscode.workspace.workspaceFolders?.find(
      (w) => w.name === context,
    );
    return wrksp;
  }
};

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  msdk.deactivate();
  zephyr.deactivate();
}
