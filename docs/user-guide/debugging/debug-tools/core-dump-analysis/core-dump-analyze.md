---
description: How to retrieve Core Dumps for the Core Dump Analysis Tool
author: Analog Devices
date: 2025-10-23
---

# Retrieve and analyze core dumps

The Core Dump Analysis Tool supports retrieving and analyzing core dumps with JTAG (from flash) and UART (from serial log output).

Once a fault has occurred, the resulting core dump can be retrieved from the backend specified in the `prj.conf` file. You can then analyze its contents to examine the state of the program at the time of the crash, including active threads, stack usage, register values, and memory state.

## Prepare your environment

Before analyzing a core dump, ensure your board and toolchain are correctly configured.

### JTAG debug setup

- Connect your board to your PC using a JLink debugger.  
- [Install Segger J-Link drivers](../../install-jlink-drivers.md) if you haven't already.  
- Review your project's `.vscode/launch.json` file to confirm your J-Link debugger settings are correct. Make sure the following values are properly configured:

      - `"device"`: should match your target device. For example, `MAX32690`.
      - `"interface"`: typically `swd` for ARM devices
      - GDB and server paths under the `linux`, `windows`, or `osx` sections, depending on your host OS.

### macOS Python setup

On macOS, the GDB binary used for Core Dump Analysis is not Python-enabled by default. Install Python 3.10 and update your `launch.json` to use the Python-enabled GDB binary. For details, see the [Release Notes](../../../../release-notes/2.0.0.md#debug-and-analysis-tools).

### UART log output

By default, CFS projects are already configured to store the core dump in flash and retrieve it as a binary (`.bin`) file. You don’t need to change anything in your `prj.conf` for this to work.

(Optional) If you want the entire core dump to be sent over UART instead of stored in flash, enable:

    ```ini
    CONFIG_DEBUG_COREDUMP_BACKEND_LOGGING=y
    ```

In this case, the tool expects the `#CD:...` formatted output from Zephyr. See the [:octicons-link-external-24: Zephyr Core Dump documentation](https://docs.zephyrproject.org/latest/services/debugging/coredump.html) for details.

To capture UART output, set up a serial terminal such as:  

- [:octicons-link-external-24: MiniCom](https://help.ubuntu.com/community/Minicom)  
- [:octicons-link-external-24: Tera Term](https://github.com/TeraTermProject/teraterm/releases)  
- [:octicons-link-external-24: PuTTY](https://www.putty.org/)  

See [Debug an application](../../debug-an-application.md#serial-output) for setup instructions.

Save the captured output (containing `#CD:` records) to a file such as `coredump.log`. When analyzed in CodeFusion Studio using **Analyze Existing Core Dump**, the tool automatically decodes the log and converts it to a binary `.bin` file for inspection.

## Configure Core Dump settings in VS Code

Before running the Core Dump Analysis tool, make sure the core dump settings in your VS Code environment are correct. These settings control how the tool locates, retrieves, and analyzes the core dump file. You can configure these settings either in your user settings (for all projects) or in your workspace settings (for just the current project).

1. Open **Settings** in VS Code (`Ctrl+,` or `Cmd+,` on macOS).
2. In the search bar, type `cfs.coreDump`.
3. Review and update the settings listed in the table below.
4. Save and restart VS Code for your changes to take effect.

| Setting                         | Description                                                                        |
|---------------------------------|------------------------------------------------------------------------------------|
| `cfs.coreDump.address`          | Start address in flash where the core dump is stored. Default is `0x102F0000`.     |
| `cfs.coreDump.elfFile`          | Path to the ELF file built from your application. Required for symbol resolution.  |
| `cfs.coreDump.logFile`          | (Optional) Path to a runtime log file. Can help correlate logs with the crash.     |
| `cfs.coreDump.binFile`          | Path to save the retrieved core dump file. Default is `core-dump.bin`.             |
| `cfs.coreDump.size`             | Size of the core dump to retrieve from flash. Default is `0x10000`.                |
| `cfs.coreDump.projectFolder`    | Project folder used during analysis. Useful for multi-project workspaces.          |
| `cfs.zephyrCoreDumpScriptsPath` | Path to Zephyr's Python core dump utilities. Usually set automatically by the SDK. |
| `cfs.coreDump.gdbServerPort`    | Port number used by GDB server for core dump analysis (default 1234 for J-Link).   |

!!! tip
    Settings with both **user** and **workspace** scope can be customized per project by opening `.vscode/settings.json` and overriding them there.

### Verify that System Planner and VS Code settings match

Core dumps are stored in a dedicated flash partition defined in [System Planner → Memory Allocation](../../../tools/config-tool/memory-allocation.md). This partition is identified by the **Plugin Option** `coredump-partition`, which determines where Zephyr saves crash data in flash memory. The address and size must match the Core Dump settings in VS Code so the Core Dump Analysis Tool can retrieve the data correctly.

Use the following workflow to update the core dump flash partition in System Planner and align your VS Code project settings accordingly.

1. In **System Planner**, go to the **Memory Allocation** tab.  
2. Click **Configure** ![Configure](../../../tools/config-tool/images/icon-config-dark.png#only-dark) ![Configure](../../../tools/config-tool/images/icon-config-light.png#only-light) next to the core dump partition.  
   ![Configure Partition](../core-dump-analysis/images/configure_core_dump_partition_dark.png#only-dark) ![Configure Partition](../core-dump-analysis/images/configure_core_dump_partition_light.png#only-light)
3. In the **Edit Partition** form, note the **Starting Address** and **Size** values.  
   ![Core Dump Partition](../core-dump-analysis/images/core_dump_partition_memory_allocation_dark.png#only-dark) ![Core Dump Partition](../core-dump-analysis/images/core_dump_partition_memory_allocation_light.png#only-light)

    If you update the System Planner configuration, click [Generate Code](../../../tools/config-tool/generate-code.md).

4. Open **Settings** in VS Code and review the following values under **Core Dump**:

      - `cfs.coreDump.address`  
      - `cfs.coreDump.size`  

    If you update VS Code settings, save and restart VS Code for the changes to take effect.

!!! warning
    If the core dump settings in VS Code do not match the values set in **Memory Allocation**, the tool may display:

    ```
    Core dump analysis failed. Error: Neither Zephyr core dump magic header nor 'ZE' marker found in bin file.
    ```

## Trigger a crash

1. In CodeFusion Studio, click **Build** in the **Actions** panel to generate the ELF file used during analysis.
2. Flash the application to your board.
3. To simulate a crash for testing, add a call to `k_panic();` in `main.c`. This triggers a kernel panic and forces a core dump for analysis.
4. (Flash only) After the crash occurs, reset or power-cycle the board to ensure the dump is fully written to flash before running Core Dump Analysis.

## Open the Core Dump Analysis view

1. In VS Code, go to the **Run and Debug** view.
2. Under your existing debug configurations, look for the **Core Dump Analysis** section.

![Core Dump View](./images/core-dump-view-dark.png#only-dark)
![Core Dump View](./images/core-dump-view-light.png#only-light)

This section contains four actions:

| Button                             | Description                                                                                                                                                                       |
|------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Retrieve Core Dump (JLink)**     | Downloads the core dump from the device to the path set in `cfs.coreDump.binFile`, but does not open it. Use this if you want to save the dump for later inspection.              |
| **Analyze Existing Core Dump**     | Opens the previously saved core dump (`.bin`) or log file for analysis. Use this if the dump has already been retrieved.                                                          |
| **Retrieve and Analyze Core Dump** | Performs both of the above actions in one step. It retrieves the core dump and immediately opens it in the Core Dump Analysis view. Use this for the full workflow after a crash. |
| **Export Core Dump Report**        | Packages the current analysis into a ZIP archive.                                                                                                                                 |

!!! tip
    You can customize paths and related options in the [Configure Core Dump settings in VS Code](#configure-core-dump-settings-in-vs-code) section.

### Retrieve Core Dump (JLink)

Use this option to download the core dump (`.bin`) from the device’s flash memory without launching the debugger.

In the Core Dump Analysis view, click **Retrieve Core Dump (JLink)**.

This action will:

- Connect to the device through J-Link.
- Read the memory region defined by `cfs.coreDump.address` and `cfs.coreDump.size`.
- Save the core dump to the path defined in `cfs.coreDump.binFile`.

### Analyze Existing Core Dump

If you already have a core dump (retrieved manually or from a previous session), you can analyze it without connecting to the device.

The tool accepts either:  

- A binary dump (`.bin`) retrieved from flash.
- A UART log file captured during the crash. The tool expects the `#CD:...` formatted output from Zephyr. See the [Zephyr Core Dump documentation](https://docs.zephyrproject.org/latest/services/debugging/coredump.html) for details.

Before using this option, make sure your VS Code settings are correctly configured:

- Set `cfs.coreDump.elfFile` to the ELF file built from your application.
- If you're using UART, set `cfs.coreDump.logFile` to the captured log output.
- Confirm `cfs.coreDump.binFile` points to the `.bin` file you want to analyze.

Then follow these steps:

1. In the Core Dump Analysis view, click **Analyze Existing Core Dump**.  
2. Select your bin file from the list.
    - If a UART log (`.log`) is provided, it will be decoded first.

This action will:

- Launch a debugger session.
- Parse and analyze the specified `.bin` file.
- Populate the Core Dump Analysis view with detailed crash data.

!!! note
    Click **Stop** or **Disconnect** in the debugger to exit the session.

### Retrieve and Analyze Core Dump

This option combines both retrieval and analysis in a single step. Use it after a crash when you want to inspect the results immediately.

In the Core Dump Analysis view, click **Retrieve and Analyze Core Dump**.

This action performs the same steps as **Retrieve Core Dump (JLink)** followed by **Analyze Existing Core Dump**, in sequence. It works only with core dumps stored in flash (`.bin`).

!!! tip
    See [Interpret core dump results](core-dump-interpret.md) for help understanding the output.

### Export Core Dump Report

This option packages the current analysis and related files into a single ZIP archive for sharing or offline inspection.

In the Core Dump Analysis view, click **Export Core Dump Report**.

The archive includes the following files for each project:

- **Markdown report** – An export of the Core Dump Analysis view, including crash cause, thread state, and memory usage.
- **ELF file** – The application ELF needed for symbol resolution.  
- **Core dump binary (.bin)** – The raw dump retrieved from the device.  

The report also includes metadata used during core dump analysis, such as the paths to the required `.bin` and `.elf` files and the memory address and size of the dump. If any required files are missing, they are clearly noted in the report.

The ZIP file is saved to the directory of the first valid `.bin` file, or to the workspace root if no `.bin` file is found.

## (Optional) Run core dump commands from the Command Palette

You can also run core dump actions directly from the VS Code **Command Palette**, instead of using the Core Dump Analysis view.

1. Open the **Command Palette**:

      - Click the ⚙️ **Manage** gear icon (bottom-left corner), then select **Command Palette**, or  
      - Use the shortcut `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS).

2. Start typing the name of a command from the list below.

      - **Retrieve Core Dump (JLink)** – `cfs.retrieveCoreDump`
      - **Analyze Existing Core Dump** – `cfs.analyzeExistingCoreDump`
      - **Retrieve and Analyze Core Dump** – `cfs.retrieveAndAnalyzeCoreDump`
      - **Extract Core Dump Report** – `cfs.downloadCoreDumpReport`

This is useful for advanced users or keyboard-driven workflows.
