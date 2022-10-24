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

/*
 * The purpose of this file is to define the CPP and Cortex debug configurations for ARM Embedded debug, ARM AARch64 debug, and ARM AARch32 debug.
 * The configurations are constructed using constants since these configurations do not contain any states.
 * These configuration definitions are used to ensure that the appropriate CFS debug settings are included in the launch.json for CFS IDE projects.
 */

import * as vscode from "vscode";

import {
  ARM_AARCH32_GCC_PATH,
  JLINK_PATH,
  OPENOCD,
  OPENOCD_PATH,
  TOOLCHAIN,
} from "../constants";
import { getPropertyName } from "../properties";

const debugConfigCommon = {
  program: "${command:cfs.selectProgramFile}",
  riscvProgram: "${command:cfs.selectRiscvProgramFile}",
  debugServerPathWindows:
    getPropertyName(OPENOCD, OPENOCD_PATH) + "/bin/openocd.exe",
  debugServerPathOsxLinux:
    getPropertyName(OPENOCD, OPENOCD_PATH) + "/bin/openocd",
  debugServerArgs:
    "-s '" +
    getPropertyName(OPENOCD, OPENOCD_PATH) +
    "/share/openocd/scripts/' -f " +
    "${command:cfs.openocd.selectInterface}" +
    " -f " +
    "${command:cfs.openocd.selectTarget}",
  debugServerArgsCmsis:
    "-s '" +
    getPropertyName(OPENOCD, OPENOCD_PATH) +
    "/share/openocd/scripts/'" +
    " -f " +
    "${command:cfs.openocd.selectInterface}" +
    " -f " +
    "${command:cfs.openocd.selectTarget}",
};

export const CORTEX_DEBUG_ARM_EMBEDDED_DEBUG_CONFIGURATION: vscode.DebugConfiguration =
  {
    name: "CFS: Debug with GDB and OpenOCD (ARM Embedded)",
    executable: debugConfigCommon.program,
    cwd: "${command:cfs.setDebugPath}",
    request: "launch",
    type: "cortex-debug",
    runToEntryPoint: "main",
    servertype: "openocd",
    serverpath: getPropertyName(OPENOCD, OPENOCD_PATH) + "/bin/openocd",
    armToolchainPath: getPropertyName(TOOLCHAIN, ARM_AARCH32_GCC_PATH) + "/bin",
    svdFile: "${command:cfs.cmsis.selectSvdFile}",
    searchDir: ["${config:cfs.openocd.path}/share/openocd/scripts"],
    configFiles: [
      "${command:cfs.openocd.selectInterface}",
      "${command:cfs.openocd.selectTarget}",
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
    cwd: "${command:cfs.setDebugPath}",
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
    device: "${command:cfs.jlink.setDevice}",
    interface: "swd",
    armToolchainPath: getPropertyName(TOOLCHAIN, ARM_AARCH32_GCC_PATH) + "/bin",
    svdFile: "${command:cfs.cmsis.selectSvdFile}",
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

export const CPP_RISCV_DEBUG_CONFIGURATION: vscode.DebugConfiguration = {
  name: "CFS: Debug with GDB and OpenOCD (RISC-V)",
  type: "cppdbg",
  request: "launch",
  program: debugConfigCommon.riscvProgram,
  args: [],
  stopAtEntry: false,
  cwd: "${command:cfs.setRiscvDebugPath}",
  environment: [],
  externalConsole: false,
  MIMode: "gdb",
  linux: {
    miDebuggerPath:
      "${config:cfs.toolchain.riscVGCC.path}/bin/riscv-none-elf-gdb",
    debugServerPath: getPropertyName(OPENOCD, OPENOCD_PATH) + "/bin/openocd",
  },
  windows: {
    miDebuggerPath:
      "${config:cfs.toolchain.riscVGCC.path}/bin/riscv-none-elf-gdb.exe",
    debugServerPath:
      getPropertyName(OPENOCD, OPENOCD_PATH) + "/bin/openocd.exe",
  },
  osx: {
    miDebuggerPath:
      "${config:cfs.toolchain.riscVGCC.path}/bin/riscv-none-elf-gdb",
    debugServerPath: getPropertyName(OPENOCD, OPENOCD_PATH) + "/bin/openocd",
  },
  logging: {
    exceptions: true,
  },
  miDebuggerServerAddress: "localhost:3334",
  debugServerArgs:
    '-c "gdb_port 3334" -s ${config:cfs.openocd.path}/share/openocd/scripts -f ${command:cfs.openocd.selectRiscvInterface} -f ${command:cfs.openocd.selectRiscvTarget}',
  serverStarted: "Info : Listening on port 3334 for gdb connections",
  filterStderr: true,
  customLaunchSetupCommands: [
    {
      text: "-list-features",
    },
  ],
  targetArchitecture: "arm",
  setupCommands: [
    {
      text: "set logging overwrite on",
    },
    {
      text: "set logging file debug-riscv.log",
    },
    {
      text: "set logging on",
    },
    {
      text: "cd ${command:cfs.setRiscvDebugPath}",
    },
    {
      text: "set architecture riscv:rv32",
      ignoreFailures: false,
    },
    {
      text: "exec-file" + debugConfigCommon.riscvProgram,
      ignoreFailures: false,
    },
    {
      text: "symbol-file" + debugConfigCommon.riscvProgram,
      ignoreFailures: false,
    },
    {
      text: "target remote localhost:3334",
    },
    {
      text: "set $pc=Reset_Handler",
      ignoreFailures: false,
    },
  ],
};

export const CPP_DEBUG_CONFIGURATIONS = [CPP_RISCV_DEBUG_CONFIGURATION];
export const CORTEX_DEBUG_CONFIGURATIONS = [
  CORTEX_DEBUG_ARM_EMBEDDED_DEBUG_CONFIGURATION,
  CORTEX_DEBUG_JLINK_DEBUG_CONFIGURATION,
];
