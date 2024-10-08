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

// vscode commands

export const VSCODE_OPEN_FOLDER_COMMAND_ID = "vscode.openFolder";
export const VSCODE_OPEN_SETTINGS_COMMAND_ID = "workbench.action.openSettings";
export const VSCODE_OPEN_WALKTHROUGH_COMMAND_ID =
  "workbench.action.openWalkthrough";
export const VSCODE_START_DEBUG_COMMAND_ID = "workbench.action.debug.start";
export const VSCODE_SELECT_START_DEBUG_COMMAND_ID =
  "workbench.action.debug.selectandstart";

// ADI commands

export const BROWSE_SDK_PATH_COMMAND_ID = "cfs.SDK.browseSdkPath";
export const GET_CONTEXT_COMMAND_ID = "cfs.getContext";
export const NEW_PROJECT_COMMAND_ID = "cfs.newProject";
export const OPEN_OPENOCD_TARGET_SETTING_COMMAND_ID =
  "cfs.openocd.openTargetSetting";
export const OPEN_PROJECT_SETTING_COMMAND_ID = "cfs.projectSetting";
export const OPEN_PROJECT_BOARD_SETTING_COMMAND_ID =
  "cfs.project.openBoardSetting";
export const OPEN_CFS_UTIL_PATH_SETTING_COMMAND_ID =
  "cfs.cfsUtil.openPathSetting";
export const OPEN_PROJECT_COMMAND_ID = "cfs.openProject";
export const OPEN_SDK_PATH_SETTINGS_COMMAND_ID = "cfs.SDK.openSdkPathSetting";
export const OPEN_SDK_SETTINGS_COMMAND_ID = "cfs.openSettings";
export const OPEN_WALKTHROUGH_COMMAND_ID = "cfs.openWalkthrough";
export const OPEN_CONFIG_TOOLS_GETTING_STARTED_COMMAND_ID =
  "cfs.openConfigToolsGettingStarted";
export const SELECT_SDK_PATH_COMMAND_ID = "cfs.SDK.selectSdkPath";
export const SELECT_SVD_FILE_COMMAND_ID = "cfs.cmsis.selectSvdFile";
export const SET_JLINK_PATH_COMMAND_ID = "cfs.jlink.setJlinkPath";
export const SET_JLINK_DEVICE_COMMAND_ID = "cfs.jlink.setDevice";
export const SELECT_CMSIS_PACK_COMMAND_ID = "cfs.cmsis.selectCmsisPack";
export const SELECT_PROGRAM_FILE_COMMAND_ID = "cfs.selectProgramFile";
export const SELECT_RISCV_PROGRAM_FILE_COMMAND_ID =
  "cfs.selectRiscvProgramFile";
export const SELECT_OPENOCD_INTERFACE_COMMAND_ID =
  "cfs.openocd.selectInterface";
export const SELECT_OPENOCD_TARGET_COMMAND_ID = "cfs.openocd.selectTarget";
export const SELECT_OPENOCD_RISCV_INTERFACE_COMMAND_ID =
  "cfs.openocd.selectRiscvInterface";
export const SELECT_OPENOCD_RISCV_TARGET_COMMAND_ID =
  "cfs.openocd.selectRiscvTarget";
export const SET_DEBUG_PATH_COMMAND_ID = "cfs.setDebugPath";
export const SET_RISCV_DEBUG_PATH_COMMAND_ID = "cfs.setRiscvDebugPath";
export const START_DEBUG_COMMAND_ID = "cfs.debug.start";
export const SELECT_START_DEBUG_ARM_COMMAND_ID = "cfs.selectStartDebuggingArm";
export const SELECT_START_DEBUG_ARM_JLINK_COMMAND_ID =
  "cfs.selectStartDebuggingArmJlink";
export const SELECT_START_DEBUG_RISCV_COMMAND_ID =
  "cfs.selectStartDebuggingRiscV";
export const RUN_BUILD_TASK_COMMAND_ID = "cfs.runBuildTask";
export const RUN_OPENOCD_FLASH_TASK_COMMAND_ID = "cfs.runOpenocdFlashTask";
export const RUN_JLINK_FLASH_TASK_COMMAND_ID = "cfs.runJlinkFlashTask";
export const RUN_CLEAN_TASK_COMMAND_ID = "cfs.runCleanTask";
export const RUN_OPENOCD_ERASE_FLASH_TASK_COMMAND_ID =
  "cfs.runOpenocdEraseFlashTask";
export const RUN_JLINK_ERASE_FLASH_TASK_COMMAND_ID =
  "cfs.runJlinkEraseFlashTask";
export const OPEN_HOME_PAGE_COMMAND_ID = "cfs.openHomePage";
export const OPEN_ONLINE_DOCUMENTATION_COMMAND_ID =
  "cfs.openOnlineDocumentation";
export const BROWSE_MAXIM_EXAMPLES_COMMAND_ID = "cfs.browseMaximExamples";
export const SHOW_HOME_PAGE_AT_STARTUP_COMMAND_ID = "cfs.showHomePageAtStartup";
export const QUICK_ACCESS_TREE_COMMAND_ID = "cfs.quickAccessTree";
export const ACTIONS_TREE_COMMAND_ID = "cfs.actionsView";

export const CONFIG_TOOLS_COMMANDS = {
  LOAD_CONFIG_FILE: "cfgtools.loadConfig",
  VIEW_CONFIG_FILE_SOURCE: "cfgtools.viewConfigFileSource",
} as const;

export const ELF_EXPLORER_COMMANDS = {
  LOAD_ELF_FILE: "cfs-elf.loadElf",
} as const;

export const SELECT_ZEPHYR_WORKSPACE = "cfs.selectZephyrWorkspace";

export const CONFIG_FILE_EXTENSION = "cfsconfig";
