export default {
	configurations: [
		{
			name: "CFS: Debug with GDB and OpenOCD (ARM Embedded)",
			executable: "${command:cfs.selectProgramFile}",
			cwd: "${command:cfs.setDebugPath}",
			request: "launch",
			type: "cortex-debug",
			runToEntryPoint: "main",
			servertype: "openocd",
			serverpath: "${config:cfs.openocd.path}/bin/openocd",
			armToolchainPath:
				"${config:cfs.toolchain.armAArch32GCC.path}/bin",
			svdFile: "${command:cfs.cmsis.selectSvdFile}",
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
				"set remotetimeout 60",
				"tbreak abort",
				"tbreak _exit"
			]
		},
		{
			name: "CFS: Debug with JlinkGDBServer and JLink (ARM Embedded)",
			executable: "${command:cfs.selectProgramFile}",
			cwd: "${command:cfs.setDebugPath}",
			request: "launch",
			type: "cortex-debug",
			runToEntryPoint: "main",
			servertype: "jlink",
			linux: {
				serverpath:
					"${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCLExe"
			},
			windows: {
				serverpath:
					"${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCL.exe"
			},
			osx: {
				serverpath:
					"${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCLExe"
			},
			device: "${command:cfs.jlink.setDevice}",
			interface: "swd",
			armToolchainPath:
				"${config:cfs.toolchain.armAArch32GCC.path}/bin",
			svdFile: "${command:cfs.cmsis.selectSvdFile}",
			gdbTarget: "localhost:2331",
			preLaunchCommands: [
				"set logging overwrite on",
				"set logging file debug-arm.log",
				"set logging on",
				"set remotetimeout 60",
				"tbreak abort",
				"tbreak _exit"
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
