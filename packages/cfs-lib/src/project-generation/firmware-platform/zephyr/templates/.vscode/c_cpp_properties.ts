export default {
	configurations: [
		{
			name: "Win32",
			includePath: [
				"${workspaceFolder}/**",
				"${workspaceFolder}/build/zephyr/include/generated",
				"${config:cfs.zephyr.sdk.path}/arm-zephyr-eabi/arm-zephyr-eabi/include",
				"${config:cfs.zephyr.workspace.path}/include/zephyr",
				"${config:cfs.zephyr.workspace.path}/include"
			],
			defines: ["${config:cfs.project.board}", "__GNUC__"],
			intelliSenseMode: "gcc-arm",
			compilerPath:
				"${config:cfs.zephyr.sdk.path}/arm-zephyr-eabi/bin/arm-zephyr-eabi-gcc.exe",
			browse: {
				path: [
					"${workspaceFolder}/**",
					"${workspaceFolder}/build/zephyr/include/generated",
					"${config:cfs.zephyr.sdk.path}/arm-zephyr-eabi/arm-zephyr-eabi/include",
					"${config:cfs.zephyr.workspace.path}/include/zephyr",
					"${config:cfs.zephyr.workspace.path}/include"
				]
			}
		},
		{
			name: "Linux",
			includePath: [
				"${workspaceFolder}/**",
				"${workspaceFolder}/build/zephyr/include/generated",
				"${config:cfs.zephyr.sdk.path}/arm-zephyr-eabi/arm-zephyr-eabi/include",
				"${config:cfs.zephyr.workspace.path}/include/zephyr",
				"${config:cfs.zephyr.workspace.path}/include"
			],
			defines: ["${config:cfs.project.board}", "__GNUC__"],
			intelliSenseMode: "gcc-arm",
			compilerPath:
				"${config:cfs.zephyr.sdk.path}/arm-zephyr-eabi/bin/arm-zephyr-eabi-gcc",
			browse: {
				path: [
					"${workspaceFolder}/**",
					"${workspaceFolder}/build/zephyr/include/generated",
					"${config:cfs.zephyr.sdk.path}/arm-zephyr-eabi/arm-zephyr-eabi/include",
					"${config:cfs.zephyr.workspace.path}/include/zephyr",
					"${config:cfs.zephyr.workspace.path}/include"
				]
			}
		},
		{
			name: "Mac",
			includePath: [
				"${workspaceFolder}/**",
				"${workspaceFolder}/build/zephyr/include/generated",
				"${config:cfs.zephyr.sdk.path}/arm-zephyr-eabi/arm-zephyr-eabi/include",
				"${config:cfs.zephyr.workspace.path}/include/zephyr",
				"${config:cfs.zephyr.workspace.path}/include"
			],
			defines: ["${config:cfs.project.board}", "__GNUC__"],
			intelliSenseMode: "gcc-arm",
			compilerPath:
				"${config:cfs.zephyr.sdk.path}/arm-zephyr-eabi/bin/arm-zephyr-eabi-gcc",
			browse: {
				path: [
					"${workspaceFolder}/**",
					"${workspaceFolder}/build/zephyr/include/generated",
					"${config:cfs.zephyr.sdk.path}/arm-zephyr-eabi/arm-zephyr-eabi/include",
					"${config:cfs.zephyr.workspace.path}/include/zephyr",
					"${config:cfs.zephyr.workspace.path}/include"
				]
			}
		}
	]
};
