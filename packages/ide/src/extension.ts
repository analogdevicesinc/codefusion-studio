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
import * as os from "os";
import * as fsPromises from "fs/promises";
import * as fs from "node:fs";
import debounce from "lodash.debounce";

import {
  ACTIONS_TREE_COMMAND_ID,
  BROWSE_MSDK_EXAMPLES_COMMAND_ID,
  GET_CONTEXT_COMMAND_ID,
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
  REFRESH_ACTIONS_PANEL_COMMAND_ID,
  GDB_TOOLBOX_VIEW_COMMAND_ID,
  EXECUTE_GDB_SCRIPT_COMMAND_ID,
  CREATE_GDB_USER_SCRIPT_COMMAND_ID,
  EDIT_GDB_SCRIPT_COMMAND_ID,
  FILTER_GDB_SCRIPTS_COMMAND_ID,
  VSCODE_OPEN_DISASSEMBLY_COMMAND_ID,
  OPEN_DISASSEMBLY_COMMAND_ID,
  CLEAR_FILTER_GDB_SCRIPTS_COMMAND_ID,
  OPEN_WITH_SSPLUS_COMMAND_ID,
  ZEPHYR_PACKAGE_PATH_COMMAND_ID,
  MSDK_PACKAGE_PATH_COMMAND_ID,
  CLOUD_CATALOG_AUTH,
  PACKAGE_MANAGER_COMMANDS,
  BROWSE_SDK_PATH_COMMAND_ID,
  OPEN_OPENOCD_TARGET_SETTING_COMMAND_ID,
  OPEN_SDK_PATH_SETTINGS_COMMAND_ID,
  OPEN_SDK_SETTINGS_COMMAND_ID,
  SELECT_SDK_PATH_COMMAND_ID,
} from "./commands/constants";
import { GDBToolbox } from "./debug-tools/gdb-toolbox/core/gdb-toolbox";
import { SdkPath } from "./commands/sdkPath";
import {
  configureWorkspace,
  configureWorkspaceCommandHandler,
  ConfigureWorkspaceOptionEnum,
  updateCppProperties,
  YesNoEnum,
} from "./configurations/configureWorkspace";
import { HomePagePanel } from "./panels/homepage";
import * as msdk from "./toolchains/msdk/msdk";
import * as zephyr from "./toolchains/zephyr/zephyr";
import { Utils } from "./utils/utils";
import {
  ActionsViewProvider,
  QuickAccessProvider,
  DeviceTreeProvider,
  ViewContainerItem,
  ContextPanelProvider,
} from "./view-container";
import { extractSessionId } from "./utils/utils";
import {
  ADI_CONFIGURE_WORKSPACE_SETTING,
  BOARD,
  BUILD,
  CFS_BUILD,
  CFS_CLEAN,
  CFS_DEBUG,
  CFS_FLASH,
  CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP,
  CLEAN,
  DEBUG,
  EXTENSION_ID,
  OPENOCD,
  OPENOCD_TARGET,
  PROJECT,
  SDK_PATH,
  PIN_CONFIG_USER_GUIDE_URL,
  FLASH_OPENOCD,
  DEBUG_ACTION,
  FLASH_JLINK,
  OPEN_SYSTEM_PLANNER_AT_STARTUP,
  MCU_EDITOR_ID,
  ACTIVE_CONTEXT,
  TOOLS,
  SEARCH_DIRECTORIES,
  BROWSE_STRING,
} from "./constants";
import { INFO, WARNING } from "./messages";
import { CFS_TERMINAL, CFS_TERMINAL_ID } from "./toolchains/constants";
import { IDEShellEnvProvider } from "./toolchains/shell-env-provider";
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
import WorkspaceCreationEditor from "./custom-editors/workspace-creation-editor";
import { registerAllCommands, registerCommand } from "./commands/commands";
import { AuthCommandManager } from "./commands/auth-command-mgr";
import { openFileAtLocation } from "./utils/open-file-location";
import { AbstractViewProvider } from "./view-provider/view-provider-abstract";
import type {
  CfsPackageManagerProvider,
  CfsPackageReference,
  CfsPackageRemoteCredentialProvider,
} from "cfs-package-manager";
import { ConanPkgManager, MANIFEST_FILE_NAME } from "cfs-package-manager";
import { registerPackageManagerCommands } from "./commands/package-manager";
import { GdbToolboxPanel } from "./debug-tools/gdb-toolbox/ui/gdb-toolbox-panel";
import { handleTelemetryNotification } from "./utils/notifications";
import { registerCoreDumpCommands } from "./debug-tools/core-dump-analysis/commands/register-core-dump-commands";
import { openWithSSPlusCommand } from "./commands/sigma-studio-plus";
import { SigmaStudioPlusProjectEditor } from "./custom-editors/sigma-studio-plus-project-editor";
import { CfsDataModelManager, CfsToolManager } from "cfs-lib";
import { resolveVariables } from "./utils/resolveVariables";
import { registerGDBToolboxValidator } from "./debug-tools/gdb-toolbox/scripts/config-validator";
import { glob } from "glob";
import { CfsIDETaskProvider } from "./providers/cfs-ide-task-provider";
import { CortexDebugConfigurationProvider } from "./providers/cortex-debug-configuration-provider";
import { getCredentialProvider } from "./utils/package-manager";
import { getTelemetryManager } from "./telemetry/telemetry";

// --- Constants ---
const DOCUMENTATION_URL =
  "https://developer.analog.com/docs/codefusion-studio/latest/";

const SCRIPT_TEMPLATE = `{
  "name": "New Script",
  "description": "Describe your script here.",
  "commands": [
    {
      "command": "your_command_here",
      "actions": [
        {
          "type": "log",
          "message": "This is a log message."
        }
      ]
    }
  ]
}`;

// --- Extension Activation & Deactivation ---

/**
 * Registers a file system watcher for the package manager index file.
 * Updates the managers cache when the index file is modified.
 * TODO: Add cache invalidation for other managers, current version only supports tool manager
 * @param context - The extension context
 * @param pkgManager - The package manager instance
 * @param toolManager - The tool manager instance
 * @param shellEnvProvider - The shell environment provider instance
 * @param actionsViewProvider - The actions view provider instance
 */
async function registerPackageIndexFileWatcher(
  context: vscode.ExtensionContext,
  pkgManager: CfsPackageManagerProvider,
  toolManager: CfsToolManager,
  shellEnvProvider: IDEShellEnvProvider,
  actionsViewProvider: ActionsViewProvider,
): Promise<void> {
  const indexFilePath = pkgManager.getIndexFilePath();
  const indexDir = path.dirname(indexFilePath);
  const indexFileName = path.basename(indexFilePath);

  // For files outside the workspace, we need to use RelativePattern with Uri
  // This ensures proper file watching for absolute paths outside workspace folders
  const pattern = new vscode.RelativePattern(
    vscode.Uri.file(indexDir),
    indexFileName,
  );

  const indexFileWatcher = vscode.workspace.createFileSystemWatcher(
    pattern,
    false, // ignoreCreateEvents
    false, // ignoreChangeEvents
    false, // ignoreDeleteEvents
  );

  const handleIndexFileChange = debounce(async () => {
    try {
      // Rediscover tool packages when package index changes
      await toolManager.discoverToolPackages();
      // Invalidate shell environment cache to ensure fresh tool env vars
      shellEnvProvider.invalidateToolEnvVarsCache();
      // Refresh actions view to get updated tasks with latest tool information
      await actionsViewProvider.taskActionsInit(true);
    } catch (error) {
      console.error("Error discovering tool packages:", error);
    }
  }, 200);

  indexFileWatcher.onDidChange(handleIndexFileChange);

  // Add to subscriptions for proper cleanup
  context.subscriptions.push(indexFileWatcher);
}

/**
 * Activate the extension
 * @param context - The context for this extension
 */
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  // Not using performance.now() as the timer can stop when the browser freezes
  // https://developer.mozilla.org/en-US/docs/Web/API/Performance/now#ticking_during_sleep
  const activationStart = Date.now();
  // Fix backslashes in Windows paths
  await verifyPathSettings();

  // Load default translations
  try {
    const defaultTranslationFileUri = vscode.Uri.joinPath(
      context.extensionUri,
      "l10n/bundle.l10n.en.json",
    );
    const translationsContent = await vscode.workspace.fs.readFile(
      defaultTranslationFileUri,
    );
    AbstractViewProvider.defaultTranslations = translationsContent.toString();
  } catch (error) {
    console.error("Failed to load default translations:", error);
  }

  const configuration = vscode.workspace.getConfiguration(EXTENSION_ID);

  let installDir = configuration.get<string>(SDK_PATH);

  let pkgManagerConfig: ConstructorParameters<typeof ConanPkgManager>[0] =
    installDir ? { cfsInstallDir: installDir } : {};
  let packageManagerCredsProvider:
    | CfsPackageRemoteCredentialProvider
    | undefined;
  try {
    packageManagerCredsProvider = await getCredentialProvider();
  } catch (error) {
    console.error("Failed to get package manager credentials provider:", error);
  }

  if (packageManagerCredsProvider) {
    pkgManagerConfig.credentialProviders = [packageManagerCredsProvider];
  }

  /**
   * Managers Initialization step
   **/
  // Package manager initialization
  let pkgManager: CfsPackageManagerProvider | undefined = new ConanPkgManager(
    pkgManagerConfig,
  );
  try {
    await pkgManager.init();
  } catch (error) {
    console.error(error);
    vscode.window.showWarningMessage(WARNING.packageManagerInitError);
    pkgManager = undefined;
  }

  registerPackageManagerCommands(context, pkgManager);

  // Data model manager initialization.
  const dataModelManager: CfsDataModelManager = new CfsDataModelManager(
    pkgManager,
    () => {
      // Dynamically get the latest configuration value
      return (
        configuration
          .get<string[]>("plugins.dataModelSearchDirectories")
          ?.map((dir) => resolveVariables(dir, true)) ?? []
      );
    },
  );

  // Tool manager initialization
  const toolManager = new CfsToolManager(
    pkgManager,
    // custom search paths getter
    () =>
      configuration
        .get<string[]>(`${TOOLS}.${SEARCH_DIRECTORIES}`)
        ?.map((dir) => resolveVariables(dir, true)) ?? [],
  );
  /**
   * Providers Init and registration step
   **/
  const shellEnvProvider = new IDEShellEnvProvider(toolManager);

  const cfsTaskProvider = new CfsIDETaskProvider(toolManager);

  context.subscriptions.push(
    vscode.tasks.registerTaskProvider("shell", cfsTaskProvider),
  );
  const zephyrTaskProvider = zephyr.registerZephyrTaskProvider(
    context,
    shellEnvProvider,
    toolManager,
  );
  const msdkTaskProvider = await msdk.registerTaskProvider(
    context,
    shellEnvProvider,
  );

  const actionsViewProvider = new ActionsViewProvider(
    cfsTaskProvider,
    zephyrTaskProvider,
    msdkTaskProvider,
  );

  // Debug providers registration
  const debugConfigProvider = new CortexDebugConfigurationProvider(toolManager);
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      "cortex-debug",
      debugConfigProvider,
    ),
  );

  // Sidebar panels data providers registration
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

  // Terminal provider registration
  registerTerminalProvider(shellEnvProvider);

  /**
   * Custom editors registration step
   **/
  context.subscriptions.push(
    McuEditor.register(context, dataModelManager, toolManager, pkgManager),
    ElfEditor.register(context),
    WorkspaceCreationEditor.register(context, dataModelManager, pkgManager),
    SigmaStudioPlusProjectEditor.register(context),
  );

  /**
   * Commands registration step
   **/
  // @TODO: Do a full review of all of the bellow commands registration functions and create
  // a more logical registration structure and remove deprecated/unused commands.
  registerPreActivationCommands(context);

  await activateWorkspace(context, toolManager);

  await registerCommands(context, actionsViewProvider, toolManager);
  registerAllCommands(context);
  AuthCommandManager.registerAllCommands(context, pkgManager);

  // @TODO: Find alternative to replace msdk and zephyr specific logic in IDE.
  msdk.activate(context);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      BROWSE_MSDK_EXAMPLES_COMMAND_ID,
      async () => {
        browseExamples(pkgManager);
      },
    ),
  );

  /**
   * Custom listeners registration step
   **/
  registerGDBToolboxValidator(context);

  // Register file watcher for package index changes
  if (pkgManager !== undefined) {
    await registerPackageIndexFileWatcher(
      context,
      pkgManager,
      toolManager,
      shellEnvProvider,
      actionsViewProvider,
    );
  }

  const activationEnd = Date.now();
  getTelemetryManager().then((telemetryManager) => {
    const activationDuration = activationEnd - activationStart;
    telemetryManager.logAction("Extension activated", {
      activationDuration,
    });
  });

  /**
   * Defered actions
   * Workspace specific operations that can be decoupled from the extension activation process can go here.
   **/
  try {
    setTimeout(async () => {
      vscode.commands.executeCommand(SHOW_HOME_PAGE_AT_STARTUP_COMMAND_ID);

      // Defered task provider and panel initialization
      // If any package installation is required from manifest, the package index watcher
      // will trigger a tasks refresh after installation is complete.
      await actionsViewProvider.taskActionsInit();

      if (pkgManager !== undefined) {
        // Handle workspace package manifest files processing
        await handleWorkspacePackageManifests(pkgManager, toolManager);
      }

      // Deferred opening of system planner after manifests are checked.
      vscode.commands.executeCommand(SHOW_SYSTEM_PLANNER_AT_STARTUP_COMMAND_ID);

      // Update c_cpp_properties.json
      updateCppProperties(toolManager);
    }, 0);
  } catch (error) {
    console.error(error);
    vscode.window.showErrorMessage(
      `Workspace activation failed with error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Deactivate the extension
 */
export async function deactivate(): Promise<Response | undefined> {
  msdk.deactivate();
  zephyr.deactivate();
  const telemetryManager = await getTelemetryManager();
  return telemetryManager.logAction("Extension deactivated", {});
}

// --- Configuration & Path Utilities ---

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

// --- Terminal Provider ---

/**
 * Register the CFS terminal provider
 */
async function registerTerminalProvider(shellEnvProvider: IDEShellEnvProvider) {
  // Register terminal profile
  vscode.window.registerTerminalProfileProvider(CFS_TERMINAL_ID, {
    async provideTerminalProfile(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _token: vscode.CancellationToken,
    ): Promise<vscode.TerminalProfile | null | undefined> {
      const profile = new vscode.TerminalProfile({
        name: CFS_TERMINAL,
        shellPath: Utils.getShellExecutable(platform),
        env: await shellEnvProvider.getShellEnvironment(),
      });

      return profile;
    },
  });
}
/**
 * Registers commands that need to be available before workspace configuration
 * @param context - The context for this extension
 */
function registerPreActivationCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      SHOW_HOME_PAGE_AT_STARTUP_COMMAND_ID,
      async () => {
        const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
        const openHomePageAtStartup = conf.get(
          CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP,
        );

        if (
          openHomePageAtStartup === YesNoEnum[YesNoEnum.Yes] &&
          conf.get(ADI_CONFIGURE_WORKSPACE_SETTING) ===
            ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.Yes]
        ) {
          vscode.commands.executeCommand(OPEN_HOME_PAGE_COMMAND_ID);
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_HOME_PAGE_COMMAND_ID, () => {
      HomePagePanel.render(context.extensionUri);
    }),
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
}

// --- Command Registration ---

/**
 * Register commands that can be used without configuring the workspace
 * @param context - the extension context
 */
async function registerCommands(
  context: vscode.ExtensionContext,
  actionsViewProvider: ActionsViewProvider,
  toolManager: CfsToolManager,
) {
  // Registering command handler for configuring workspace as a CFS workspace
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.${ADI_CONFIGURE_WORKSPACE_SETTING}`,
      () => {
        configureWorkspaceCommandHandler(toolManager);
      },
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
    vscode.commands.registerCommand(MSDK_PACKAGE_PATH_COMMAND_ID, async () => {
      return await toolManager.getToolPath("msdk");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      ZEPHYR_PACKAGE_PATH_COMMAND_ID,
      async () => {
        return await toolManager.getToolPath("zephyr");
      },
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
    vscode.commands.registerCommand(OPEN_DISASSEMBLY_COMMAND_ID, () => {
      vscode.commands.executeCommand(VSCODE_OPEN_DISASSEMBLY_COMMAND_ID);
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

  registerCommand(context, REFRESH_ACTIONS_PANEL_COMMAND_ID, () =>
    actionsViewProvider.initializeActionItems(),
  );

  // --- Core Dump Analysis Commands Registration ---

  registerCoreDumpCommands(context);

  // --- GDB Toolbox Panel and Commands Registration ---

  // Initialize GDBToolbox singleton and get core components
  const gdbToolbox = await GDBToolbox.initialize(context.extensionPath);
  const scriptManager = gdbToolbox.getScriptManager();
  const executor = gdbToolbox.getExecutor();

  await createDebugDirectoryStructure();

  // Register the GDB Toolbox panel in the sidebar
  const gdbToolboxPanel = new GdbToolboxPanel(scriptManager);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      GDB_TOOLBOX_VIEW_COMMAND_ID,
      gdbToolboxPanel,
    ),
  );

  // Register command to execute a GDB script
  context.subscriptions.push(
    vscode.commands.registerCommand(
      EXECUTE_GDB_SCRIPT_COMMAND_ID,
      (script, session) => {
        executor.executeScript(script.commands, script.inputs, session);
      },
    ),
  );

  // Register command to create a new user GDB script
  context.subscriptions.push(
    vscode.commands.registerCommand(
      CREATE_GDB_USER_SCRIPT_COMMAND_ID,
      async () => {
        const userScriptsDir = await getUserScriptsDir();

        if (!userScriptsDir) {
          return;
        }

        ensureUserScriptsDirExists(userScriptsDir);

        const scriptName = await vscode.window.showInputBox({
          prompt: "Enter a name for your new GDB script",
          validateInput: (value) =>
            value ? undefined : "Script name required",
        });
        if (!scriptName) return;

        const filePath = getScriptFilePath(userScriptsDir, scriptName);
        const scriptObj = JSON.parse(SCRIPT_TEMPLATE);
        scriptObj.name = scriptName;
        await fsPromises.writeFile(
          await filePath,
          JSON.stringify(scriptObj, null, 2),
          { flag: "wx" },
        );
        vscode.window.showInformationMessage(`Script "${scriptName}" created.`);
        vscode.window.showTextDocument(vscode.Uri.file(await filePath));
        scriptManager.loadScripts();
        gdbToolboxPanel.refresh();
      },
    ),
  );

  // Register command to edit a user GDB script
  context.subscriptions.push(
    vscode.commands.registerCommand(
      EDIT_GDB_SCRIPT_COMMAND_ID,
      async (treeItemOrScript) => {
        // Use the filePath property directly if available
        const script = treeItemOrScript?.script || treeItemOrScript;
        const filePath = script.filePath;
        if (!filePath) {
          vscode.window.showErrorMessage("Script file path not found.");
          return;
        }
        try {
          const doc = await vscode.workspace.openTextDocument(filePath);
          vscode.window.showTextDocument(doc);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to open script: ${(error as any).message || error}`,
          );
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      FILTER_GDB_SCRIPTS_COMMAND_ID,
      async (sessionId?: string | { id: string }) => {
        const sid =
          extractSessionId(sessionId) ??
          extractSessionId(vscode.debug.activeDebugSession);
        if (!sid) return;
        const currentFilter = gdbToolboxPanel.getFilter(sid);
        const input = await vscode.window.showInputBox({
          prompt: "Filter GDB Toolbox scripts by name or description",
          value: currentFilter,
          placeHolder: "Type to filter scripts, or leave empty to clear",
        });
        gdbToolboxPanel.setFilter(sid, input?.trim() ?? "");
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      CLEAR_FILTER_GDB_SCRIPTS_COMMAND_ID,
      async (sessionId?: string | { id: string }) => {
        const sid =
          extractSessionId(sessionId) ??
          extractSessionId(vscode.debug.activeDebugSession);
        if (!sid) return;
        gdbToolboxPanel.setFilter(sid, "");
      },
    ),
  );

  // --- Actions Panel Commands Registration ---

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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      OPEN_WITH_SSPLUS_COMMAND_ID,
      openWithSSPlusCommand,
    ),
  );
}

/**
 * Handles package manifests for the current workspace
 * @param pkgManager - The package manager instance
 */
async function handleWorkspacePackageManifests(
  pkgManager: CfsPackageManagerProvider | undefined,
  toolManager: CfsToolManager,
): Promise<void> {
  if (
    !pkgManager ||
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    return;
  }

  try {
    // Get the workspace root path
    let workspaceRootPath: string;
    if (vscode.workspace.workspaceFile) {
      // If we have a workspace file, use its directory as the root
      workspaceRootPath = path.dirname(vscode.workspace.workspaceFile.fsPath);
    } else {
      // Otherwise, we assume a single folder workspace
      workspaceRootPath = vscode.workspace.workspaceFolders[0]?.uri.fsPath;
    }

    if (workspaceRootPath === undefined) return;

    const allManifestPaths = await glob(`**/${MANIFEST_FILE_NAME}`, {
      cwd: workspaceRootPath,
      absolute: true,
      dot: true,
      nodir: true,
    });

    if (allManifestPaths.length === 0) {
      return;
    }

    // Check manifests for missing packages
    const missingPackages: CfsPackageReference[] = [];
    const manifestsWithMissingPackages: string[] = [];

    for (const manifestPath of allManifestPaths) {
      try {
        const packagesToInstall = await pkgManager.checkManifest(manifestPath);
        if (packagesToInstall.length > 0) {
          // Add packages to the flat list, avoiding duplicates
          for (const pkg of packagesToInstall) {
            // Given that we are still supporting fallback for tools and SDKs in the install dir,
            // we need to check if the package (package name/version) is already discoverable by the tool manager
            // In the custom search paths.
            const installedTools = await toolManager.getInstalledToolsForId(
              pkg.name,
            );
            if (
              installedTools.some(
                (tool) => tool.getInfo().version === pkg.version,
              )
            ) {
              continue;
            }

            if (
              !missingPackages.some(
                (p) => p.name === pkg.name && p.version === pkg.version,
              )
            ) {
              missingPackages.push(pkg);
            }
          }

          // Add manifest to the list of manifests with missing packages
          manifestsWithMissingPackages.push(manifestPath);
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error checking manifest ${path.basename(manifestPath)}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // If any manifests have missing packages, prompt the user
    if (missingPackages.length > 0) {
      // Format the package list for display
      const packageList = missingPackages
        .map((pkg) => `${pkg.name} (${pkg.version})`)
        .join(", ");

      const message = `Found ${missingPackages.length} required package${missingPackages.length > 1 ? "s" : ""} that need to be installed: ${packageList}`;
      const installAction = `Install ${missingPackages.length > 1 ? "All" : "Package"}`;

      const selection = await vscode.window.showInformationMessage(
        message,
        installAction,
        "Cancel",
      );

      if (selection === installAction) {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Installing required packages",
            cancellable: false,
          },
          async (progress) => {
            let installedCount = 0;
            let installedPackages: CfsPackageReference[] = [];

            // Install only from manifests that actually have missing packages
            for (const manifestPath of manifestsWithMissingPackages) {
              try {
                progress.report({
                  message: `from ${path.relative(workspaceRootPath, manifestPath)}...`,
                });

                const installed =
                  await pkgManager.installFromManifest(manifestPath);
                installedCount += installed.length;
                installedPackages.push(...installed);
              } catch (error) {
                // Continue with other manifests even if one fails
                const isLoggedIn = await vscode.commands.executeCommand(
                  CLOUD_CATALOG_AUTH.STATUS,
                );
                if (!isLoggedIn) {
                  const errMessage = `Some packages may require authentication. Try logging in with myAnalog and install them manually using the command palette.`;
                  vscode.window
                    .showWarningMessage(
                      `Failed to install packages from ${path.relative(
                        workspaceRootPath,
                        manifestPath,
                      )}: ${
                        error instanceof Error ? error.message : String(error)
                      }. ${errMessage}`,
                      "Login",
                    )
                    .then(async (selection) => {
                      if (selection === "Login") {
                        await vscode.commands.executeCommand(
                          CLOUD_CATALOG_AUTH.LOGIN,
                        );
                      }
                    });
                } else {
                  const errMessage = `Verify you have the necessary package remotes configured then install manually using the command palette.`;
                  vscode.window
                    .showWarningMessage(
                      `Failed to install packages from ${path.relative(
                        workspaceRootPath,
                        manifestPath,
                      )}: ${
                        error instanceof Error ? error.message : String(error)
                      }. ${errMessage}`,
                      "Remotes",
                    )
                    .then(async (selection) => {
                      if (selection === "Remotes") {
                        await vscode.commands.executeCommand(
                          PACKAGE_MANAGER_COMMANDS.MANAGE_REMOTES,
                        );
                      }
                    });
                }
              }
            }

            if (installedCount > 0) {
              // Show installed package names and versions
              const installedList = installedPackages
                .map((pkg) => `${pkg.name} (${pkg.version})`)
                .join(", ");
              vscode.window.showInformationMessage(
                `Successfully installed ${installedCount} required package${installedCount > 1 ? "s" : ""}: ${installedList}.`,
              );
            }
          },
        );
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error handling workspace package manifests: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// --- Status Bar & Workspace Activation ---

/**
 * Asynchronously prompt the user to activate the workspace if they haven't already.
 * @param context - the extension context
 */
async function activateWorkspace(
  context: vscode.ExtensionContext,
  toolManager: CfsToolManager,
) {
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

        await conf.update(ADI_CONFIGURE_WORKSPACE_SETTING, choice, false);
        choiceSelected = true;
      });
  }

  conf = vscode.workspace.getConfiguration(EXTENSION_ID);
  if (
    conf.get(ADI_CONFIGURE_WORKSPACE_SETTING) ===
    ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.Yes]
  ) {
    configureWorkspace(context, toolManager, !choiceSelected);
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
        configureWorkspace(context, toolManager);
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

// --- GDB Toolbox Utilities ---

/**
 * Returns the path to the user scripts directory in the current workspace.
 * Falls back to the user home directory if no workspace is open.
 */
async function getUserScriptsDir(): Promise<string | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
  const configureWorkspaceSetting = conf.get(ADI_CONFIGURE_WORKSPACE_SETTING);

  let scriptsDir: string;

  // Determine the base directory based on workspace configuration
  if (
    workspaceFolders &&
    workspaceFolders.length > 0 &&
    configureWorkspaceSetting ===
      ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.Yes]
  ) {
    // CFS Workspace: use <workspace>/.cfs/gdb_toolbox/configs
    scriptsDir = path.join(
      workspaceFolders[0].uri.fsPath,
      "gdb_toolbox",
      "configs",
    );
  } else {
    // Non-CFS Workspace or No Workspace: use ~/cfs/gdb_toolbox/configs
    scriptsDir = path.join(os.homedir(), "cfs", "gdb_toolbox", "configs");
  }

  // Ensure the directory exists before returning
  try {
    await fsPromises.mkdir(scriptsDir, { recursive: true });
    return scriptsDir;
  } catch (error) {
    // If we can't create the directory, show warning and return null
    console.warn(`Failed to create scripts directory ${scriptsDir}:`, error);
    return null;
  }
}

/**
 * Ensures the user scripts directory exists, creating it if necessary.
 */
async function ensureUserScriptsDirExists(dir: string) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.error(`Failed to create user scripts directory ${dir}:`, error);
    throw new Error(`Failed to create directory: ${error}`);
  }
}

/**
 * Returns the full file path for a script given its name and the scripts directory.
 */
async function getScriptFilePath(
  userScriptsDir: string,
  scriptName: string,
): Promise<string> {
  return path.join(userScriptsDir, `${scriptName}.json`);
}

// --- Miscellaneous Utilities ---

/**
 * Opens MSDK examples directory so user can browse example projects
 */
const browseExamples = async (pkgManager?: CfsPackageManagerProvider) => {
  let msdkPath: string | undefined;
  try {
    msdkPath = await pkgManager?.getPath("msdk");
  } catch (error) {
    // Ignore error and fallback to SDK path
  }

  if (!msdkPath) {
    // Fallback to SDK path
    const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
    const sdkPath = conf.get(SDK_PATH);
    msdkPath = path.join(sdkPath as string, "SDK", "MAX");
  }

  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    canSelectFiles: false,
    canSelectFolders: true,
    defaultUri: vscode.Uri.file(
      msdkPath ? path.join(msdkPath, "Examples") : os.homedir(),
    ),
    openLabel: "Select Example",
  };

  const exampleUri = await vscode.window.showOpenDialog(options);
  let exampleName = "";

  if (exampleUri && exampleUri[0]) {
    exampleName = path.basename(exampleUri[0].fsPath);

    let destinationFolder = (
      await vscode.window.showQuickPick(
        [
          {
            label: Utils.getDefaultLocation(),
          },
          { label: BROWSE_STRING, description: "Select a different folder" },
        ],
        { title: "Browse Examples", placeHolder: "Select destination folder" },
      )
    )?.label;

    if (destinationFolder === BROWSE_STRING) {
      const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        canSelectFiles: false,
        canSelectFolders: true,
        defaultUri: vscode.Uri.file(Utils.getDefaultLocation()),
        openLabel: "Select Folder",
      };

      const destinationUri = await vscode.window.showOpenDialog(options);

      if (destinationUri && destinationUri[0]) {
        destinationFolder = destinationUri[0].fsPath;
      } else {
        destinationFolder = "";
      }
    }

    if (!destinationFolder) {
      return;
    }

    if (!destinationFolder || destinationFolder.trim().length === 0) {
      vscode.window.showErrorMessage("Destination cannot be empty");
      return;
    }
    if (
      !fs.existsSync(destinationFolder) ||
      !fs.lstatSync(destinationFolder).isDirectory()
    ) {
      vscode.window.showErrorMessage("Destination folder does not exist");
      return;
    }
    if (fs.existsSync(path.join(destinationFolder, exampleName))) {
      vscode.window.showErrorMessage(
        "A folder with the same name already exists in the destination",
      );
      return;
    }

    const workspaceLocation = path.join(destinationFolder, exampleName);

    // Copy example project to destination
    try {
      await fsPromises.cp(exampleUri[0].fsPath, workspaceLocation, {
        recursive: true,
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Could not copy example project: ${error}`,
      );
      return;
    }

    try {
      await vscode.commands.executeCommand(
        VSCODE_OPEN_FOLDER_COMMAND_ID,
        vscode.Uri.file(workspaceLocation),
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

async function createDebugDirectoryStructure() {
  const userHome = os.homedir();
  const debugDir = path.join(userHome, "cfs", "gdb_toolbox");
  const configsDir = path.join(debugDir, "configs");
  const gdbDir = path.join(debugDir, "gdb");

  // Create directories if they do not exist
  for (const dir of [debugDir, configsDir, gdbDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// --- Telemetry ---

handleTelemetryNotification();
