export default {
  configurations: [
    {
      name: "CFS: Debug with GDB and OpenOCD (ARM Embedded)",
      executable: "${config:cfs.programFile}",
      cwd: "${command:cfs.setDebugPath}",
      request: "launch",
      type: "cortex-debug",
      runToEntryPoint: "main",
      servertype: "openocd",
      serverpath: "${config:cfs.openocd.path}/bin/openocd",
      linux: {
        gdbPath:
          "${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb",
      },
      windows: {
        gdbPath:
          "${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb.exe",
      },
      osx: {
        gdbPath:
          "${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb",
      },
      svdPath: "${command:cfs.cmsis.selectSvdFile}",
      searchDir: ["{config:cfs.openocd.path}/share/openocd/scripts"],
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
    },
    {
      name: "CFS: Debug with JlinkGDBServer and JLink (Arm Embedded)",
      executable: "${config:cfs.programFile}",
      cwd: "${command:cfs.setDebugPath}",
      request: "launch",
      type: "cortex-debug",
      runToEntryPoint: "main",
      servertype: "jlink",
      linux: {
        serverpath: "${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCLExe",
        gdbPath:
          "${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb",
      },
      windows: {
        serverpath: "${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCL.exe",
        gdbPath:
          "${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb.exe",
      },
      osx: {
        serverpath: "${command:cfs.jlink.setJlinkPath}/JLinkGDBServerCLExe",
        gdbPath:
          "${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb",
      },
      device: "${config:cfs.jlink.device}",
      interface: "swd",
      svdPath: "${command:cfs.cmsis.selectSvdFile}",
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
    },
    {
      name: "CFS: Debug with GDB and OpenOCD (RISC-V)",
      executable: "${command:cfs.programFile}",
      cwd: "${command:cfs.setDebugPath}",
      request: "attach",
      type: "cortex-debug",
      runToEntryPoint: "main",
      servertype: "openocd",
      serverpath: "${config:cfs.openocd.path}/bin/openocd",
      gdbPath:
        "${config:cfs.toolchain.riscVGCC.path}/bin/riscv-none-elf-gdb.exe",
      svdPath: "${command:cfs.cmsis.selectSvdFile}",
      searchDir: ["{config:cfs.openocd.path}/share/openocd/scripts"],
      configFiles: [
        "${command:cfs.openocd.selectRiscvInterface}",
        "${command:cfs.openocd.selectRiscvTarget}",
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
    },
  ],
};
