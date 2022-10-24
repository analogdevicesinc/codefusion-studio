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

/**
 * Definition of constants shared throughout the extension.
 */

export const EXTENSION_ID = "cfs";
export const CONFIG_TOOLS_ID = "cfgtools";
export const CONFIG_FILE_EXTENSION = "cfsconfig";

// Settings
export const ADI_CONFIGURE_WORKSPACE_SETTING = "configureWorkspace";
export const C_CPP = "C_Cpp.default";
export const CFS_IDE_OPEN_HOME_PAGE_AT_STARTUP = "openHomePageAtStartup";

export const SDK_PATH = "sdk.path";
export const CFS_UTIL_PATH = "cfsutil.path";

export const PROGRAM_FILE = "programFile";
export const RISCV_PROGRAM_FILE = "riscvProgramFile";
export const DEBUG_PATH = "debugPath";
export const RISCV_DEBUG_PATH = "riscvDebugPath";

export const OPENOCD = "openocd";
export const OPENOCD_PATH = "path";
export const OPENOCD_INTERFACE = "interface";
export const OPENOCD_TARGET = "target";
export const OPENOCD_RISCV_INTERFACE = "riscvInterface";
export const OPENOCD_RISCV_TARGET = "riscvTarget";

export const TOOLS = "tools";
export const BEAKER = "beaker";
export const TRASH = "trash";
export const ZAP = "zap";
export const DEBUG_ALT = "debug-alt";
export const SEARCH_DIRECTORIES = "searchDirectories";

export const TOOLCHAIN = "toolchain";
export const ARM_AARCH64_GCC_PATH = "armAArch64GCC.path";
export const ARM_AARCH32_GCC_PATH = "armAArch32GCC.path";
export const RISC_V_GCC_PATH = "riscVGCC.path";
export const SELECTED_TOOLCHAIN = "selectedToolchain";

export const CMSIS = "cmsis";
export const ROOT = "root";
export const PACK = "pack";
export const SVD_FILE = "svdFile";
export const JLINK_PATH = "jlink.path";
export const JLINK_DEVICE = "jlink.device";

export const PROJECT = "project";
export const NAME = "name";
export const TARGET = "target";
export const BOARD = "board";
export const FIRMWARE_PLATFORM = "firmwarePlatform";
export const SYMBOL_FILE = "symbolFile";
export const DEBUGGER_SWD = "debugger.SWD";

export const ZEPHYR = "zephyr";
export const ZEPHYR_WORKSPACE = `${ZEPHYR}.workspace.path`;
export const ZEPHYR_SDK = `${ZEPHYR}.sdk.path`;

export const BROWSE_STRING = "Browse...";
export const CFS_PREFIX = "CFS: ";
export const BUILD = "build";
export const CLEAN = "clean";
export const OPENOCD_FLASH = "flash (OpenOCD)";
export const JLINK_FLASH = "flash (JLink)";
export const OPENOCD_ERASE_FLASH = "erase flash (OpenOCD)";
export const JLINK_ERASE_FLASH = "erase flash (JLink)";
export const DEBUG = "debug";
export const CFS_BUILD = `${CFS_PREFIX}${BUILD}`;
export const CFS_CLEAN = `${CFS_PREFIX}${CLEAN}`;
export const CFS_FLASH = `${CFS_PREFIX}${OPENOCD_FLASH}`;
export const CFS_DEBUG = `${CFS_PREFIX}${DEBUG}`;

export const CREATE_NEW_CONFIG_FILE = "createNewConfigFile";
export const CREATE_NEW_PROJECT = "createNewProject";
export const OPEN_EXISTING_PROJECT = "openExistingProject";
export const OPEN_EXISTING_CONFIG_FILE = "openExistingConfigFile";
export const OPEN_ELF_FILE = "openElfFile";
export const BROWSE_EXAMPLES = "browseExamples";
export const BROWSE_FOLDERS = "browseFolders";
export const BROWSE_FOR_BOARDS = "browseForBoards";
export const VIEW_ONLINE_DOCUMENTATION = "viewOnlineDocumentation";
export const OPEN_WALKTHROUGH = "openWalkthrough";
export const SHOW_HOME_PAGE_AT_STARTUP_CHECKBOX =
  "showHomePageAtStartupCheckbox";
export const REQUEST_HOME_PAGE_CHECKBOX_STATE = "requestHomePageCheckboxState";
export const GET_DEFAULT_LOCATION = "getDefaultLocation";
export const CHECK_FILE_EXISTS = "checkFileExists";
export const CHECK_CUSTOM_BOARD = "checkCustomBoard";
export const SUBMIT_NEW_PROJECT_FORM = "submitNewProjectForm";
export const CLOSE_NEW_PROJECT_WIZARD_TAB = "closeNewProjectWizardTab";
export const GET_SOC_DATA = "getSocData";

// Quick Access Panel Items

export const PROJECTS = "Projects";
export const ACTIONS = "Actions";
export const EXAMPLES = "Browse Examples";
export const HOME = "CFS Home Page";
export const CONFIG_TOOLS = "Config Tools";
export const ELF_FILE_EXPLORER = "ELF File Explorer";

// Action Panel Actions
export const BUILD_ACTION = "Build";
export const CLEAN_ACTION = "Clean";
export const ERASE_ACTION = "Erase";
export const FLASH_ACTION = "Flash";
export const DEBUG_ACTION = "Debug";
export const OZONE_DEBUG_ACTION = "Debug with Ozone";
export const JLINK_ACTION = "(JLink)";
export const OPENOCD_ACTION = "(OpenOCD)";

export const DEBUG_LAUNCH_CONTEXT = "debug-launch";

export const FLASH_OPENOCD_ACTION = `${FLASH_ACTION} ${OPENOCD_ACTION}`;
export const FLASH_JLINK_ACTION = `${FLASH_ACTION} ${JLINK_ACTION}`;
export const ERASE_OPENOCD_ACTION = `${ERASE_ACTION} ${OPENOCD_ACTION}`;
export const ERASE_JLINK_ACTION = `${ERASE_ACTION} ${JLINK_ACTION}`;

export const DEBUG_ARM_OPENOCD_ACTION = "Debug (Arm Cortex-M4, OpenOCD)";
export const DEBUG_ARM_JLINK_ACTION = "Debug (Arm Cortex-M4, JLink)";
export const DEBUG_RISCV_OPENOCD_ACTION = "Debug (RISC-V, OpenOCD)";
export const RISCV_DEBUG = "CFS: Debug with GDB and OpenOCD (RISC-V)";

export const CLI_ID = "cfsutil";

export const PIN_CONFIG_USER_GUIDE_URL =
  "https://developer.analog.com/docs/codefusion-studio/1.0.0/";
