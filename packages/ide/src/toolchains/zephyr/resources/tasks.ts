/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
      id: "build",
      type: "shell",
      command: "west build -b ${config:cfs.project.board}",
      group: {
        kind: "build",
        isDefault: true,
      },
      problemMatcher: ["$gcc"],
    },
    {
      label: "pristine build",
      id: "pristine build",
      type: "shell",
      command: "west build -b ${config:cfs.project.board} --pristine=always",
      group: {
        kind: "build",
        isDefault: false,
      },
      problemMatcher: ["$gcc"],
    },
    {
      label: "clean",
      id: "clean",
      type: "shell",
      command: "rm -rf build",
      group: {
        kind: "build",
        isDefault: false,
      },
      problemMatcher: ["$gcc"],
    },
    {
      label: "flash (OpenOCD)",
      id: "flash-openocd",
      type: "shell",
      command: "west flash",
      group: {
        kind: "build",
        isDefault: false,
      },
      problemMatcher: ["$gcc"],
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
      group: {
        kind: "build",
        isDefault: false,
      },
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
      group: {
        kind: "build",
        isDefault: false,
      },
      problemMatcher: [],
      dependsOn: ["build"],
    },
    {
      label: "erase (JLink)",
      id: "erase-jlink",
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
      group: {
        kind: "build",
        isDefault: false,
      },
      problemMatcher: [],
      dependsOn: [],
    },
  ],
};
