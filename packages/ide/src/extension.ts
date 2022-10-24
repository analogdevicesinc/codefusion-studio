/**
 *
 * Copyright (c) 2022-2024 Analog Devices, Inc.
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
  NEW_PROJECT_COMMAND_ID,
  OPEN_CFS_UTIL_PATH_SETTING_COMMAND_ID,
  OPEN_HOME_PAGE_COMMAND_ID,
  OPEN_ONLINE_DOCUMENTATION_COMMAND_ID,
  OPEN_CONFIG_TOOLS_GETTING_STARTED_COMMAND_ID,
  OPEN_PROJECT_BOARD_SETTING_COMMAND_ID,
  OPEN_PROJECT_SETTING_COMMAND_ID,
  OPEN_WALKTHROUGH_COMMAND_ID,
  QUICK_ACCESS_TREE_COMMAND_ID,
  RUN_BUILD_TASK_COMMAND_ID,
  RUN_CLEAN_TASK_COMMAND_ID,
  RUN_OPENOCD_ERASE_FLASH_TASK_COMMAND_ID,
  RUN_JLINK_ERASE_FLASH_TASK_COMMAND_ID,
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
  RUN_JLINK_FLASH_TASK_COMMAND_ID,
} from "./commands/constants";
import {
  BROWSE_SDK_PATH_COMMAND_ID,
  OPEN_OPENOCD_TARGET_SETTING_COMMAND_ID,
  OPEN_PROJECT_COMMAND_ID,
  OPEN_SDK_PATH_SETTINGS_COMMAND_ID,
  OPEN_SDK_SETTINGS_COMMAND_ID,
  SELECT_SDK_PATH_COMMAND_ID,
} from "./commands/constants";
import { SdkPath } from "./commands/sdkPath";
import {
  configureWorkspace,
  configureWorkspaceCommandHandler,
  ConfigureWorkspaceOptionEnum,
  ShowHomePageAtStartupOptionEnum,
} from "./configurations/configureWorkspace";
import { HomePagePanel } from "./panels/homepage";
import * as msdk from "./toolchains/msdk";
import * as zephyr from "./toolchains/zephyr/zephyr";
import { resolveVariables } from "./utils/resolveVariables";
import { Utils } from "./utils/utils";
import { QuickAccessProvider } from "./view-container/quick-access";
import {
  ActionItem,
  ActionsViewProvider,
} from "./view-container/actions-panel";
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
  OPENOCD_FLASH,
  JLINK_FLASH,
  JLINK_ERASE_FLASH,
  OPENOCD_ERASE_FLASH,
  PIN_CONFIG_USER_GUIDE_URL,
} from "./constants";
import { INFO } from "./messages";
//TODO: move the file and update the import
import { NewProjectPanel } from "./panels/new-project";
import { CFS_TERMINAL, CFS_TERMINAL_ID } from "./toolchains/constants";
import { ToolManager } from "./toolchains/toolManager";
import { platform } from "node:process";
import { registerViewConfigFileSourceCommand } from "./commands/view-config-file-source";
import { registerLoadConfigFileCommand } from "./commands/load-config-file";
import { registerLoadElfFileCommand } from "./commands/load-elf-file";
import { McuEditor } from "./custom-editors/mcu-editor";
import { ElfEditor } from "./custom-editors/elf-editor";
import {
  DOWNLOAD_SDK,
  SDK_DOWNLOAD_URL,
  SELECT_SDK_PATH,
} from "./utils/constants";
import { SocDataObj } from "./panels/data/soc-data-obj";

const DOCUMENTATION_URL =
  "https://developer.analog.com/docs/codefusion-studio/1.0.0/";

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
  if (!isCfsSdkPathValid) {
    vscode.window
      .showWarningMessage(
        "The path to the CFS SDK is missing or not valid and this prevented the extension from loading correctly. Please download and install the CFS SDK, or set the path to the CFS SDK through the CodeFusion Studio extension settings.",
        DOWNLOAD_SDK,
        SELECT_SDK_PATH,
      )
      .then((choice) => {
        switch (choice) {
          case DOWNLOAD_SDK:
            vscode.env.openExternal(vscode.Uri.parse(SDK_DOWNLOAD_URL));
            break;
          case SELECT_SDK_PATH:
            vscode.commands.executeCommand(SELECT_SDK_PATH_COMMAND_ID);
            break;
        }
      });
  } else if (!isCfsUtilPathValid) {
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
  );

  registerCommands(context);

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
    vscode.commands.registerCommand(OPEN_PROJECT_COMMAND_ID, async () => {
      openExistingProjects();
    }),
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
      START_DEBUG_COMMAND_ID,
      (actionItem: ActionItem) => {
        if (actionItem) {
          const [workspaceFolder, configName] = [...actionItem.commandArgs];
          vscode.debug.startDebugging(workspaceFolder, configName);
        } else {
          vscode.commands.executeCommand(VSCODE_START_DEBUG_COMMAND_ID);
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(RUN_BUILD_TASK_COMMAND_ID, async () => {
      await executeTask(BUILD);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(RUN_CLEAN_TASK_COMMAND_ID, async () => {
      await executeTask(CLEAN);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      RUN_OPENOCD_FLASH_TASK_COMMAND_ID,
      async () => {
        await executeTask(OPENOCD_FLASH);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      RUN_JLINK_FLASH_TASK_COMMAND_ID,
      async () => {
        await executeTask(JLINK_FLASH);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      RUN_OPENOCD_ERASE_FLASH_TASK_COMMAND_ID,
      async () => {
        await executeTask(OPENOCD_ERASE_FLASH);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      RUN_JLINK_ERASE_FLASH_TASK_COMMAND_ID,
      async () => {
        await executeTask(JLINK_ERASE_FLASH);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_HOME_PAGE_COMMAND_ID, () => {
      HomePagePanel.render(context.extensionUri);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(NEW_PROJECT_COMMAND_ID, async () => {
      NewProjectPanel.render(context.extensionUri);
      await NewProjectPanel.currentPanel?.launchNewProjectWizard();
    }),
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      QUICK_ACCESS_TREE_COMMAND_ID,
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
  vscode.workspace.onDidChangeConfiguration(
    (event: vscode.ConfigurationChangeEvent) => {
      // refresh the actions panel when launch configurations change
      if (event.affectsConfiguration("launch")) {
        actionsViewProvider.refreshEvent.fire(
          actionsViewProvider.getChildren()[0],
        );
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
        if (
          openHomePageAtStartup ===
          ShowHomePageAtStartupOptionEnum[ShowHomePageAtStartupOptionEnum.Yes]
        ) {
          vscode.commands.executeCommand(OPEN_HOME_PAGE_COMMAND_ID);
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

  const loadELfFile = registerLoadElfFileCommand();
  const loadConfigFile = registerLoadConfigFileCommand();
  const viewConfigFileSource = registerViewConfigFileSourceCommand();

  context.subscriptions.push(loadELfFile, loadConfigFile, viewConfigFileSource);
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
  statusBarFlash.command = RUN_OPENOCD_FLASH_TASK_COMMAND_ID;
  context.subscriptions.push(statusBarFlash);
  updateStatusBarItem(statusBarFlash, OPENOCD_FLASH);

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
 * Executes the tasks, indicates an error if the task is not defined.
 * @param taskName - string to identify task name
 */
const executeTask = async (taskName: string) => {
  const tasks = (await vscode.tasks.fetchTasks()).filter((task) => {
    // Allow build tasks from CFS or from the User's workspace
    return (
      task.group === vscode.TaskGroup.Build &&
      (task.source === "CFS" || task.source === "Workspace")
    );
  });
  const selectedTask = tasks.find((task) => {
    return (
      (task.source === "CFS" && task.name === taskName) ||
      (task.source === "Workspace" && task.name === `CFS: ${taskName}`)
    );
  });
  if (selectedTask) {
    vscode.tasks.executeTask(selectedTask);
  } else {
    console.error(`Error: Task '${taskName}' not found`);
  }
};

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

    case OPENOCD_FLASH:
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
 * Deactivate the extension
 */
export function deactivate(): void {
  msdk.deactivate();
  zephyr.deactivate();
}
