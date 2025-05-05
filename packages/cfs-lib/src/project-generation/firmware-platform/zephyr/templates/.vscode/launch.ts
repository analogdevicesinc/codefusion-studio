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

export const secureLaunch = {
	configurations: [
		{
			name: "CFS: Debug with GDB and OpenOCD (Arm Embedded)",
			executable: "${command:cfs.selectProgramFile}",
			cwd: "${command:cfs.setDebugPath}",
			request: "launch",
			type: "cortex-debug",
			runToEntryPoint: "main",
			servertype: "openocd",
			serverpath: "${config:cfs.openocd.path}/bin/openocd",
			gdbPath:
				"${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb.exe",
			svdPath: "${command:cfs.cmsis.selectSvdFile}",
			searchDir: [
				"${command:cfs.cmsis.selectCmsisPack}/openocd/scripts"
			],
			configFiles: [
				"${command:cfs.openocd.selectInterface}",
				"${command:cfs.openocd.selectTarget}"
			],
			gdbTarget: "localhost:3333",
			preLaunchCommands: [
				"set logging overwrite on",
				"set logging file debug-arm.log",
				"set logging on",
				"set remotetimeout 60"
			]
		},
		{
			name: "CFS: Debug with JlinkGDBServer and JLink (Arm Embedded)",
			executable: "${command:cfs.selectProgramFile}",
			cwd: "${command:cfs.setDebugPath}",
			request: "launch",
			type: "cortex-debug",
			runToEntryPoint: "main",
			servertype: "jlink",
			linux: {
				serverpath:
					"${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCLExe",
				gdbPath:
					"${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb"
			},
			windows: {
				serverpath:
					"${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCL.exe",
				gdbPath:
					"${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb.exe"
			},
			osx: {
				serverpath:
					"${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCLExe",
				gdbPath:
					"${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb"
			},
			device: "${command:cfs.jlink.setDevice}",
			interface: "swd",
			svdPath: "${command:cfs.cmsis.selectSvdFile}",
			gdbTarget: "localhost:2331",
			preLaunchCommands: [
				"set logging overwrite on",
				"set logging file debug-arm.log",
				"set logging on",
				"set remotetimeout 60"
			],
			preLaunchTask: "CFS: build",
			overrideLaunchCommands: [
				"monitor halt",
				"monitor reset",
				"-target-download"
			],
			overrideResetCommands: ["monitor reset"],
			overrideRestartCommands: ["monitor reset"]
		}
	]
};

export const nonSecureLaunch = {
	configurations: [
		{
			name: "CFS: Debug with JlinkGDBServer and JLink (ARM Embedded, Non-Secure)",
			executable: "${command:cfs.selectProgramFile}",
			loadFiles: ["${workspaceFolder}/build/zephyr/tfm_merged.hex"],
			cwd: "${command:cfs.setDebugPath}",
			request: "launch",
			type: "cortex-debug",
			runToEntryPoint: "main",
			servertype: "jlink",
			linux: {
				serverpath:
					"${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCLExe",
				gdbPath:
					"${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb"
			},
			windows: {
				serverpath:
					"${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCL.exe",
				gdbPath:
					"${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb.exe"
			},
			osx: {
				serverpath:
					"${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCLExe",
				gdbPath:
					"${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb"
			},
			device: "${command:cfs.jlink.setDevice}",
			interface: "swd",
			svdPath: "${command:cfs.cmsis.selectSvdFile}",
			gdbTarget: "localhost:2331",
			preLaunchCommands: [
				"set logging overwrite on",
				"set logging file debug-arm.log",
				"set logging on",
				"set remotetimeout 60"
			],
			preLaunchTask: "CFS: build",
			overrideLaunchCommands: [
				"monitor halt",
				"monitor reset",
				"-target-download"
			],
			overrideResetCommands: ["monitor reset"],
			overrideRestartCommands: ["monitor reset"]
		}
	]
};
