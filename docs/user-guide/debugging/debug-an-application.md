---
description: Debugging an application using CodeFusion Studio
author: Analog Devices
date: 2026-01-16
---

# Debug an application

CodeFusion Studio automatically generates a default debug configuration for each new project. In most cases, you can start debugging immediately without any manual setup.

## Before you start

- If you are debugging using external hardware probes, ensure the required drivers are installed. Refer to the relevant setup guides:
    - [Install Segger J-Link drivers](debug-drivers/install-jlink-drivers.md)
    - [Install Olimex Arm JTAG drivers (RISC-V)](debug-drivers/install-olimex-drivers.md)
    - [Install ICE drivers (SHARC-FX devices)](debug-drivers/install-ice-drivers.md)
- Make sure you have a successful build for the project you intend to debug. Debugging requires a generated ELF file in the project’s build folder, for example `build/m4.elf`. For information on how to build a project, refer to [CFS build task](../build-and-flash/tasks.md).
- Debug configuration settings are automatically selected based on your CFS workspace. If any required settings are undefined, CFS prompts you to resolve them. For information on how to adjust settings, see [CFS Settings](../build-and-flash/cfs-settings.md).

## Start a debug session

1. Select the **Run and Debug** icon ![Run and Debug icon](images/run-and-debug-icon-dark.png#only-dark) ![Run and Debug icon](images/run-and-debug-icon-light.png#only-light) in the Activity Bar.
2. Select a debug configuration from the dropdown menu that matches your target and debugger, such as  **CFS: Debug with GDB and OpenOCD (Arm Embedded)**.
3. Click on the **Start Debugging** icon to the left of your selection (green play icon) or press **F5**.

![Launch Debug Session](images/launch-debug-session-dark.png#only-dark)
![Launch Debug Session](images/launch-debug-session-light.png#only-light)
  
!!! note
    When using the **CFS: Debug with GDB and OpenOCD (Arm Embedded)** configuration, CFS automatically locates and loads the appropriate SVD file from the CMSIS Pack directory. For other targets, you may be prompted to select an SVD file manually.

### Controls

When connected to a debug session, the **Run and Debug** view provides a toolbar to control the application execution. This debugging toolbar contains the following debugging actions:

![Debugging Session Tool Bar](images/debug-session-toolbar-dark.png#only-dark)
![Debugging Session Tool Bar](images/debug-session-toolbar-light.png#only-light)

| Name      | Action                                                             |
|-----------|--------------------------------------------------------------------|
| Reset     | Performs a stop and reload                                         |
| Pause     | Suspends execution to allow debugging                              |
| Step Over | Steps to the next line, stepping over any function calls           |
| Step Into | Steps into any callee functions                                    |
| Step Out  | Steps out of the current function to the calling function          |
| Restart   | Resets the PC to reset address without disconnecting or reloading  |
| Stop      | Terminates execution and closes the debug session                  |

### Next steps

While a debug session is active, use the debugging features in the **Run and Debug** view to inspect variables, control execution, and analyze program state. For more information, see [Debugging interface](debug-interface.md).

## Advanced debugging options

For advanced debugging options, including how to create and customize debug configurations, and connect to remote hardware, refer to the sections below.

### Create new debug configuration

New debug configurations can be created using the following steps:

1. Click the **Run** tab, and select **Add Configuration...**

2. Select the appropriate debugger.

    !!! tip

        For CMSIS devices (such as Cortex-M based targets), the **Cortex Debug** debugger is recommended since it supports peripheral registers using SVD files.

3. Select the debug configuration template matching your target:

    | Supported Targets | Type                                                           |
    | ----------------- | -------------------------------------------------------------- |
    | Cortex-M (CMSIS)  | CFS: Debug with GDB and OpenOCD (Arm Embedded)                 |
    | Cortex-M (CMSIS)  | CFS: Debug with JlinkGDBServer and JLink (Arm Embedded)        |
    | RISC-V            | CFS: Debug with GDB and OpenOCD (RISC-V)                       |

4. Save the `launch.json` file which now contains the chosen debug configuration.

The new configuration is added to your workspace and can be selected from the **Run and Debug** dropdown.

### Modify an existing debug configuration

Use the following steps to modify an existing debug configuration:

1. From the VS Code menu bar, select **Run > Open Configurations**, or open the `.vscode/launch.json` file directly.  
2. Make any necessary edits, then save the file.

   ![Open Debug Configuration](images/open-configuration-dark.png#only-dark)
   ![Open Debug Configuration](images/open-configuration-light.png#only-light)

### Debug remotely using an external GDB server

You can debug hardware that is physically connected to a different machine by running a GDB server on the remote machine and connecting to it over the network from your local CodeFusion Studio environment. This setup is useful when hardware is located on a shared system or in a lab, while development is done from a personal laptop.

#### Prerequisites

- The remote machine must have physical access to the debug probe and target hardware.
- Your local machine must be able to reach the remote machine over the network.
- You must know the target device name (for example, MAX32690), and the IP address and port on which the GDB server is listening.

#### Start the GDB server on the remote machine

On the remote machine that is connected to the hardware, start the GDB server. For example, using a SEGGER J-Link GDB server:

```bash
# Windows (GUI version)
JLinkGDBServer.exe -device <device-name> [-port <port>]

# macOS / Linux (command-line version)
./JLinkGDBServerCLExe -device <device-name> [-port <port>]
```

If you are connecting from a different machine over the network:

- Select the correct debug interface (for example, `-if SWD`).
- Use `-nolocalhostonly` so the server allows remote connections.
- Restrict the GDB server port to trusted hosts (for example, by using a firewall or VPN). This ensures the GDB server port is not exposed on untrusted or public networks, since remote debug access can allow intrusive control over the target.

!!! example

    ```cmd
    "C:\Program Files\SEGGER\JLink\JLinkGDBServerCL.exe" ^
    -device MAX32690 ^
    -if SWD ^
    -nolocalhostonly ^
    -port 2331
    ```
By default, the J-Link GDB server listens on TCP port 2331. In this example, the port is specified explicitly to avoid ambiguity and prevent port conflicts.

!!! note
    To debug a multi-core device, start a separate J-Link GDB server instance for each core. Each instance must use a unique TCP port (for example, 2331 for one core and 3334 for another). Ensure that the `gdbTarget` setting in `launch.json` matches the port used for the corresponding core.

The GDB server listens for a GDB client connection. Keep the server running for the duration of the debug session.

!!! note
    If the GDB server cannot connect to the J-Link probe (for example, you encounter a `Connecting to J-Link failed` error), ensure that no other J-Link tools (such as another GDB server instance or JLinkExe) are currently using the probe. Only one process can access the probe at a time.

![JLink GDB Server GUI](images/jlink-gdbserver-gui.png)

#### Configure `launch.json` to use an external server

On your local machine, open the `.vscode/launch.json` file in your CFS workspace. In the **CFS: Debug with JlinkGDBServer and JLink** configuration, update the following settings:

- Set "servertype" to "external"
- Set "gdbTarget" to `<remote-ip-address>:<port>`.

!!! example

    ```json
    {
      "servertype": "external",
      "gdbTarget": "192.168.1.50:2331"
    }
    ```

Start debugging from the **Run and Debug** view. CodeFusion Studio connects to the remote GDB server over the network and debugs the target as if it were locally connected. When the connection succeeds, the debugger is active in VS Code and the server output updates to indicate a GDB client has connected.

!!! example "Example GDB server output (on the remote machine)"

    ```text
    Connecting to target...
    Connected to target
    Waiting for GDB connection...
    Connected to 192.168.1.50:2331
    GDB client (conn. 18) requested target.xml from GDB Server
    ```
