/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

export default {
  version: "2.0.0",
  type: "shell",
  tasks: [
    {
      label: "build",
      type: "shell",
      command:
        "make -r -j 8 --output-sync=target --no-print-directory TARGET=${config:cfs.project.target} BOARD=${config:cfs.project.board} MAXIM_PATH=${config:cfs.sdk.path}/SDK/MAX MAKE=make PROJECT=${config:cfs.project.name}",
      group: "build",
      problemMatcher: [],
    },
    {
      label: "clean",
      type: "shell",
      command:
        "make -j 8 clean --output-sync=target --no-print-directory TARGET=${config:cfs.project.target} BOARD=${config:cfs.project.board} MAXIM_PATH=${config:cfs.sdk.path}/SDK/MAX MAKE=make PROJECT=${config:cfs.project.name}",
      group: "build",
      problemMatcher: [],
    },
    {
      label: "clean-periph",
      type: "shell",
      command:
        "make -j 8 distclean --output-sync=target --no-print-directory TARGET=${config:cfs.project.target} BOARD=${config:cfs.project.board} MAXIM_PATH=${config:cfs.sdk.path}/SDK/MAX MAKE=make PROJECT=${config:cfs.project.name}",
      group: "build",
      problemMatcher: [],
    },
    {
      label: "flash (OpenOCD)",
      type: "shell",
      command:
        'arm-none-eabi-gdb --cd="${workspaceFolder}" --se="${config:cfs.programFile}" --symbols=${config:cfs.programFile} -x="${workspaceFolder}/.vscode/flash.gdb" --ex="flash_m4 ${config:cfs.openocd.path} ${config:cfs.openocd.interface} ${config:cfs.openocd.target}" --batch',
      group: "build",
      problemMatcher: [],
      dependsOn: ["build"],
    },
    {
      label: "flash (JLink)",
      type: "shell",
      windows: {
        command:
          '(echo loadfile ${config:cfs.programFile} && echo q) | "${command:cfs.jlink.setJlinkPath}/JLink.exe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1',
      },
      osx: {
        command:
          '(echo loadfile ${config:cfs.programFile} && echo q) | "${command:cfs.jlink.setJlinkPath}/JLinkExe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1',
      },
      linux: {
        command:
          '(echo loadfile ${config:cfs.programFile} && echo q) | "${command:cfs.jlink.setJlinkPath}/JLinkExe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1',
      },
      group: "build",
      problemMatcher: [],
      dependsOn: ["build"],
    },
    {
      label: "flash & run (OpenOCD)",
      type: "shell",
      command:
        'arm-none-eabi-gdb --cd="${workspaceFolder}" --se="${config:cfs.programFile}" --symbols=${config:cfs.programFile} -x="${workspaceFolder}/.vscode/flash.gdb" --ex="flash_m4_run ${config:cfs.openocd.path} ${config:cfs.openocd.interface} ${config:cfs.openocd.target}" --batch',
      args: [],
      group: "build",
      problemMatcher: [],
      dependsOn: ["build"],
    },
    {
      label: "flash & run (JLink)",
      type: "shell",
      windows: {
        command:
          '(echo rst 0 && echo loadfile ${config:cfs.programFile} && echo r && echo q) | "${command:cfs.jlink.setJlinkPath}/JLink.exe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1',
      },
      osx: {
        command:
          '(echo rst 0 && echo loadfile ${config:cfs.programFile} && echo r && echo q) | "${command:cfs.jlink.setJlinkPath}/JLinkExe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1',
      },
      linux: {
        command:
          '(echo rst 0 && echo loadfile ${config:cfs.programFile} && echo r && echo q) | "${command:cfs.jlink.setJlinkPath}/JLinkExe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1',
      },
      group: "build",
      problemMatcher: [],
      dependsOn: ["build"],
    },
    {
      label: "erase (OpenOCD)",
      type: "shell",
      command:
        'openocd -s ${config:cfs.openocd.path}/share/openocd/scripts -f ${config:cfs.openocd.interface} -f ${config:cfs.openocd.target} -c "init; reset halt; max32xxx mass_erase 0;" -c exit',
      group: "build",
      problemMatcher: [],
      dependsOn: [],
    },
    {
      label: "erase (JLink)",
      type: "shell",
      windows: {
        command:
          '(echo erase && echo q) | "${command:cfs.jlink.setJlinkPath}/JLink.exe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1',
      },
      osx: {
        command:
          '(echo erase && echo q) | "${command:cfs.jlink.setJlinkPath}/JLinkExe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1',
      },
      linux: {
        command:
          '(echo erase && echo q) | "${command:cfs.jlink.setJlinkPath}/JLinkExe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1',
      },
      group: "build",
      problemMatcher: [],
      dependsOn: [],
    },
  ],
};
