/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import type { CfsProject, Task } from "cfs-types";

const computeBuildCommand = (
	buildSystem: string | undefined,
	isPristine = false
) => {
	const pristine = isPristine ? " --pristine=always" : "";
	const buildCmd = `west build -b \${config:cfs.project.board}${pristine}`;

	if (buildSystem === "ninja" || typeof buildSystem === "undefined") {
		return buildCmd;
	}

	return `${buildCmd} -- -G'Unix Makefiles'`;
};

export default function (
	platformConfig?: CfsProject["platformConfig"]
): Task.File {
	return {
		version: "2.0.0",
		type: "shell",
		tasks: [
			{
				label: "build",
				id: "build",
				type: "shell",
				command: computeBuildCommand(
					platformConfig?.BuildSystem as string | undefined
				),
				group: {
					kind: "build",
					isDefault: true
				},
				problemMatcher: ["$gcc"]
			},
			{
				label: "pristine build",
				id: "pristine build",
				type: "shell",
				command: computeBuildCommand(
					platformConfig?.BuildSystem as string | undefined,
					true
				),
				group: {
					kind: "build",
					isDefault: false
				},
				problemMatcher: ["$gcc"]
			},
			{
				label: "clean",
				id: "clean",
				type: "shell",
				command: "rm -rf build",
				group: {
					kind: "build",
					isDefault: false
				},
				problemMatcher: ["$gcc"]
			},
			{
				label: "flash (OpenOCD)",
				id: "flash-openocd",
				type: "shell",
				command:
					'west flash --runner openocd --no-reset --config "${config:cfs.openocd.interface}"',
				group: {
					kind: "build",
					isDefault: false
				},
				problemMatcher: ["$gcc"]
			},
			{
				label: "flash (JLink)",
				type: "shell",
				command: "west flash --runner jlink --no-reset --speed 4000",
				group: {
					kind: "build",
					isDefault: false
				},
				problemMatcher: [],
				dependsOn: ["build"]
			},
			{
				label: "flash & run (OpenOCD)",
				type: "shell",
				command:
					'west flash --runner openocd --config "${config:cfs.openocd.interface}"',
				args: [],
				group: {
					kind: "build",
					isDefault: false
				},
				problemMatcher: [],
				dependsOn: ["build"]
			},
			{
				label: "flash & run (JLink)",
				id: "flash-run-jlink",
				type: "shell",
				command: "west flash --runner jlink",
				group: {
					kind: "build",
					isDefault: false
				},
				problemMatcher: [],
				dependsOn: ["build"]
			},
			{
				label: "erase (OpenOCD)",
				type: "shell",
				command:
					'openocd -s ${config:cfs.openocd.path}/share/openocd/scripts -f ${config:cfs.openocd.interface} -f ${config:cfs.openocd.target} -c "init; reset halt; max32xxx mass_erase 0;" -c exit',
				group: {
					kind: "build",
					isDefault: false
				},
				problemMatcher: [],
				dependsOn: []
			},
			{
				label: "erase (JLink)",
				id: "erase-jlink",
				type: "shell",
				windows: {
					command:
						'(echo erase && echo q) | "${command:cfs.jlink.setJlinkPath}/JLink.exe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1'
				},
				osx: {
					command:
						'(echo erase && echo q) | "${command:cfs.jlink.setJlinkPath}/JLinkExe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1'
				},
				linux: {
					command:
						'(echo erase && echo q) | "${command:cfs.jlink.setJlinkPath}/JLinkExe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1'
				},
				group: {
					kind: "build",
					isDefault: false
				},
				problemMatcher: [],
				dependsOn: []
			},
			{
				label: "retrieve core dump (JLink)",
				id: "retrieve-core-dump-jlink",
				type: "shell",
				windows: {
					command:
						'(echo savebin ${config:cfs.coreDump.binFile} ${config:cfs.coreDump.address} ${config:cfs.coreDump.size} && echo q) | "${command:cfs.jlink.setJlinkPath}/JLink.exe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1'
				},
				osx: {
					command:
						'(echo savebin ${config:cfs.coreDump.binFile} ${config:cfs.coreDump.address} ${config:cfs.coreDump.size} && echo q) | "${command:cfs.jlink.setJlinkPath}/JLinkExe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1'
				},
				linux: {
					command:
						'(echo savebin ${config:cfs.coreDump.binFile} ${config:cfs.coreDump.address} ${config:cfs.coreDump.size} && echo q) | "${command:cfs.jlink.setJlinkPath}/JLinkExe" -device ${config:cfs.jlink.device} -if SWD -speed 4000 -autoconnect 1 -NoGui 1 -ExitOnError 1'
				},
				group: {
					kind: "analyze",
					isDefault: false
				},
				problemMatcher: [],
				dependsOn: []
			},
			{
				label: "start Zephyr core dump GDB server",
				id: "start-zephyr-core-dump-gdb-server",
				type: "shell",
				command:
					'python "${config:cfs.zephyrCoreDumpScriptsPath}/coredump_gdbserver.py" "${config:cfs.coreDump.elfFile}" "${config:cfs.coreDump.binFile}" --port ${config:cfs.coreDump.gdbServerPort} -v',
				group: {
					kind: "analyze",
					isDefault: false
				},
				problemMatcher: [],
				dependsOn: []
			},
			{
				label: "start Zephyr core dump log parser",
				id: "coredump-serial-log-parser",
				type: "shell",
				command:
					'python "${config:cfs.zephyrCoreDumpScriptsPath}/coredump_serial_log_parser.py" "${config:cfs.coreDump.logFile}" "${config:cfs.coreDump.binFile}"',
				group: {
					kind: "analyze",
					isDefault: false
				},
				problemMatcher: [],
				dependsOn: []
			}
		]
	};
}
