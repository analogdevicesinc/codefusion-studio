/**
 *
 * Copyright (c) 2023-2025 Analog Devices, Inc.
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

/*
 * The purpose of this file is to define the Cortex debug configurations for Arm Embedded debug and RISC-V debug.
 * The configurations are constructed using constants since these configurations do not contain any states.
 * These configuration definitions are used to ensure that the appropriate CFS debug settings are included in the launch.json for CFS IDE projects.
 */

import * as vscode from "vscode";

import {
  ARM_AARCH32_GCC_PATH,
  JLINK_PATH,
  OPENOCD,
  OPENOCD_PATH,
  RISC_V_GCC_PATH,
  TOOLCHAIN,
} from "../constants";
import { getPropertyName } from "../properties";

const debugConfigCommon = {
  program: "${config:cfs.programFile}",
  riscvProgram: "${config:cfs.riscvProgramFile}",
  debugServerPathWindows:
    getPropertyName(OPENOCD, OPENOCD_PATH) + "/bin/openocd.exe",
  debugServerPathOsxLinux:
    getPropertyName(OPENOCD, OPENOCD_PATH) + "/bin/openocd",
  debugServerArgs:
    "-s '" +
    getPropertyName(OPENOCD, OPENOCD_PATH) +
    "/share/openocd/scripts/' -f " +
    "${config:cfs.openocd.interface}" +
    " -f " +
    "${config:cfs.openocd.target}",
  debugServerArgsCmsis:
    "-s '" +
    getPropertyName(OPENOCD, OPENOCD_PATH) +
    "/share/openocd/scripts/'" +
    " -f " +
    "${config:cfs.openocd.interface}" +
    " -f " +
    "${config:cfs.openocd.target}",
  svdPath: "${config:cfs.cmsis.svdFile}",
};

export const CORTEX_DEBUG_ARM_EMBEDDED_DEBUG_CONFIGURATION: vscode.DebugConfiguration =
  {
    name: "CFS: Debug with GDB and OpenOCD (ARM Embedded)",
    executable: debugConfigCommon.program,
    cwd: "${config:cfs.debugPath}",
    request: "launch",
    type: "cortex-debug",
    runToEntryPoint: "main",
    servertype: "openocd",
    serverpath: getPropertyName(OPENOCD, OPENOCD_PATH) + "/bin/openocd",
    gdbPath:
      getPropertyName(TOOLCHAIN, ARM_AARCH32_GCC_PATH) +
      "/bin/arm-none-eabi-gdb.exe",
    svdPath: debugConfigCommon.svdPath,
    searchDir: ["${config:cfs.openocd.path}/share/openocd/scripts"],
    configFiles: [
      "${config:cfs.openocd.interface}",
      "${config:cfs.openocd.target}",
    ],
    gdbTarget: "localhost:3333",
    preLaunchCommands: [
      "set logging overwrite on",
      "set logging file debug-arm.log",
      "set logging on",
      "set remotetimeout 60",
      "tbreak abort",
      "tbreak _exit",
    ],
    preLaunchTask: "CFS: build",
  };

export const CORTEX_DEBUG_JLINK_DEBUG_CONFIGURATION: vscode.DebugConfiguration =
  {
    name: "CFS: Debug with JlinkGDBServer and JLink (ARM Embedded)",
    executable: debugConfigCommon.program,
    cwd: "${config:cfs.debugPath}",
    request: "launch",
    type: "cortex-debug",
    runToEntryPoint: "main",
    servertype: "jlink",
    linux: {
      serverpath: getPropertyName(JLINK_PATH) + "/JLinkGDBServerCLExe",
    },
    windows: {
      serverpath: getPropertyName(JLINK_PATH) + "/JLinkGDBServerCL.exe",
    },
    osx: {
      serverpath: getPropertyName(JLINK_PATH) + "/JLinkGDBServerCLExe",
    },
    device: "${config:cfs.jlink.device}",
    interface: "swd",
    gdbPath:
      getPropertyName(TOOLCHAIN, ARM_AARCH32_GCC_PATH) +
      "/bin/arm-none-eabi-gdb.exe",
    svdPath: debugConfigCommon.svdPath,
    gdbTarget: "localhost:2331",
    preLaunchCommands: [
      "set logging overwrite on",
      "set logging file debug-arm.log",
      "set logging on",
      "set remotetimeout 60",
      "tbreak abort",
      "tbreak _exit",
    ],
    preLaunchTask: "CFS: build",
    overrideLaunchCommands: [
      "monitor halt",
      "monitor reset",
      "-target-download",
    ],
    overrideResetCommands: ["monitor reset"],
    overrideRestartCommands: ["monitor reset"],
  };

export const CORTEX_DEBUG_RISCV_DEBUG_CONFIGURATION: vscode.DebugConfiguration =
  {
    name: "CFS: Debug with GDB and OpenOCD (RISC-V)",
    executable: debugConfigCommon.riscvProgram,
    cwd: "${config:cfs.riscvDebugPath}",
    request: "attach",
    type: "cortex-debug",
    runToEntryPoint: "main",
    servertype: "openocd",
    serverpath: getPropertyName(OPENOCD, OPENOCD_PATH) + "/bin/openocd",
    gdbPath:
      getPropertyName(TOOLCHAIN, RISC_V_GCC_PATH) +
      "/bin/riscv-none-elf-gdb.exe",
    svdPath: debugConfigCommon.svdPath,
    searchDir: ["${config:cfs.openocd.path}/share/openocd/scripts"],
    configFiles: [
      "${config:cfs.openocd.riscvInterface}",
      "${config:cfs.openocd.riscvTarget}",
    ],
    gdbTarget: "localhost:3334",
    preAttachCommands: [
      "set logging overwrite on",
      "set logging file debug-riscv.log",
      "set logging on",
      "set remotetimeout 60",
      "tbreak abort",
      "tbreak _exit",
      "set $pc=Reset_Handler",
    ],
    postAttachCommands: ["continue"],
  };

export const CORTEX_DEBUG_XTENSA_DEBUG_CONFIGURATION: vscode.DebugConfiguration =
  {
    type: "cortex-debug",
    name: "CFS: Debug with JlinkGDBServer and JLink (Xtensa)",
    request: "attach",
    executable: '^"\\${config:cfs.programFile}"',
    cwd: '^"\\${config:cfs.debugPath}"',
    showDevDebugOutput: "both",
    servertype: "jlink",
    windows: {
      serverpath: '^"\\${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCL.exe"',
      gdbPath:
        '^"\\${config:cfs.sdk.path}/Tools/xtensa/RJ-2024.4/XtensaTools/bin/xt-gdb.exe"',
    },
    linux: {
      serverpath: '^"\\${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCLExe"',
      gdbPath:
        '^"\\${config:cfs.sdk.path}/Tools/xtensa/RJ-2024.4/XtensaTools/bin/xt-gdb"',
    },
    device: '^"\\${config:cfs.jlink.device}"',
    interface: "swd",
    svdPath: '^"\\${config:cfs.cmsis.svdFile}"',
    gdbTarget: "localhost:3334",
    preAttachCommands: [
      "set logging overwrite on",
      "set logging file debug-xtensa.log",
      "set logging on",
      "set remotetimeout 60",
      "tbreak main",
    ],
    postAttachCommands: ["continue"],
    preLaunchTask: "CFS: build",
    overrideAttachCommands: [
      "monitor halt",
      "monitor reset",
      "-target-download",
    ],
    overrideResetCommands: ["monitor reset"],
    overrideRestartCommands: ["monitor reset"],
    debuggerArgs: ["--xtensa-core=${config:cfs.xtensa.core}"],
  };

export const CORTEX_DEBUG_CORE_DUMP_ANALYSIS_CONFIGURATION: vscode.DebugConfiguration =
  {
    name: "CFS: Launch Core Dump Analysis",
    type: "cortex-debug",
    request: "launch",
    servertype: "external",
    linux: {
      gdbPath:
        "${config:cfs.sdk.path}/Tools/zephyr-sdk/arm-zephyr-eabi/bin/arm-zephyr-eabi-gdb",
    },
    windows: {
      gdbPath:
        "${config:cfs.sdk.path}/Tools/zephyr-sdk/arm-zephyr-eabi/bin/arm-zephyr-eabi-gdb.exe",
    },
    osx: {
      gdbPath:
        "${config:cfs.sdk.path}/Tools/zephyr-sdk/arm-zephyr-eabi/bin/arm-zephyr-eabi-gdb",
    },
    gdbTarget: "localhost:1234",
    executable: "${workspaceFolder}/build/zephyr/zephyr.elf",
    cwd: "${workspaceFolder}",
    overrideLaunchCommands: [],
  };

export const CORTEX_DEBUG_CONFIGURATIONS = [
  CORTEX_DEBUG_ARM_EMBEDDED_DEBUG_CONFIGURATION,
  CORTEX_DEBUG_JLINK_DEBUG_CONFIGURATION,
  CORTEX_DEBUG_RISCV_DEBUG_CONFIGURATION,
  CORTEX_DEBUG_XTENSA_DEBUG_CONFIGURATION,
  CORTEX_DEBUG_CORE_DUMP_ANALYSIS_CONFIGURATION,
];
