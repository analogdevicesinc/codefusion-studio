export default {
	"cfs.configureWorkspace": "Yes",
	"cfs.project.board": "",
	"cfs.programFile": "${workspaceFolder}/build/zephyr/zephyr.elf",
	"cfs.debugPath": "${workspaceFolder}/build/zephyr",
	"cfs.cmsis.svdFile": "",
	"cfs.cmsis.pack": "None",
	"cfs.openocd.interface":
		"${config:cfs.openocd.path}/share/openocd/scripts/interface/cmsis-dap.cfg",
	"cfs.openocd.target": "",
	"cfs.toolchain.riscVGCC.path":
		"${config:cfs.sdk.path}/armToolchainPath",
	"cfs.openocd.riscvTarget": "",
	"cfs.openocd.riscvInterface":
		"interface/ftdi/olimex-arm-usb-ocd-h.cfg",
	"cfs.project.target": ""
};
