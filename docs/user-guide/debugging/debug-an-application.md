---
description: Debugging an application using CodeFusion Studio
author: Analog Devices
date: 2024-09-23
---

# Debug an application

A default debug configuration is automatically generated with each new project. To manually create or adjust a debug configuration, refer to the [Create New Debug Configuration](#create-new-debug-configuration) and [Modify an Existing Debug Configuration](#modify-an-existing-debug-configuration) sections below.

!!! warning

    Make sure you have a successful build for the core you intend to debug. Each project generates a build directory in the respective project folder. For more information, refer to [CFS build task](../projects/tasks.md).

## Supported microcontrollers

See [Supported processors](../about/supported-processors.md) for a full list of supported processors.

If debugging a single Arm core application, continue with these instructions.
For debugging multiple cores together, follow the [Debugging a multi core application](debug-multi-core-application.md) instructions.

## Settings

Debug configuration settings are automatically selected using your CFS workspace settings. Follow the extension prompts for any undefined settings. Adjust settings manually under the **File**  > **Preferences** > **Settings** menu.

When using the **CFS: Debug with GDB and OpenOCD (ARM Embedded)** configuration, CFS automatically searches for and adds the SVD file from the CMSIS Pack directory.
For other parts, the SVD file can be selected manually when prompted.

For more information regarding these settings, refer to [CFS Settings](../projects/cfs-settings.md).

## Activate single debug session

1. Select the **Run and Debug** icon on the activity bar.
2. Select the **CFS: Debug with GDB and OpenOCD (ARM Embedded)** from the dropdown menu.
3. Click on the **Start Debugging** Icon to the left of your selection (green play icon) or press **F5**.

![Launch Debug Session](images/launch-debug-session-dark.png#only-dark)
![Launch Debug Session](images/launch-debug-session-light.png#only-light)

!!! tip

    To activate the previously utilized debug configuration, click the **CFS:Debug** icon on the left status bar.

## Create new debug configuration

New debug configurations can be created using the following steps:

1. Click the **Run** tab, and select **Add Configuration...**

2. Select the appropriate debugger.

    !!! tip

        For CMSIS devices (such as Cortex-M based targets), the **Cortex Debug** debugger is recommended since it supports peripheral registers using SVD files.

3. Select the debug configuration template matching your target:

    | Supported Targets | Type                                                           |
    | ----------------- | -------------------------------------------------------------- |
    | Cortex-M (CMSIS)  | CFS: Debug with GDB and OpenOCD (ARM Embedded)                 |
    | Cortex-M (CMSIS)  | CFS: Debug with JlinkGDBServer and JLink (ARM Embedded)        |
    | RISC-V            | CFS: Debug with GDB and OpenOCD (RISC-V)                       |

4. Save the `launch.json` file which now contains the chosen debug configuration.

## Modify an existing debug configuration

Use the following steps too modify an existing debug configuration:

1. Open the `.vscode/launch.json` file.

2. Click the **Run** tab, and select **Open Configuration**.
3. Make any necessary edits and save the file.

   ![Open Debug Configuration](images/open-configuration-dark.png#only-dark)
   ![Open Debug Configuration](images/open-configuration-light.png#only-light)

## Debugging interface

Debugging in VS Code is done using the **Run and Debug** View, available in the **Activity Bar** or under **View** > **Open View** and selecting **Run and Debug**.

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

### Variables

The variables view presents all of the variables visible to the current scope and file of debugging.
They are split into different sections for each of use, detailed below.
Double clicking on a value allows you to edit the value, right clicking provides a menu of additional options.

#### Local

Local variables are the variables in the current function scope.
![Local Variables](images/viewing-variables-local-dark.png#only-dark)
![Local Variables](images/viewing-variables-local-light.png#only-light)

#### Global

Global variables are the variables in the global scope, visible to anywhere in the application.
![Global Variables](images/viewing-variables-global-dark.png#only-dark)
![Global Variables](images/viewing-variables-global-light.png#only-light)

#### Static

Static variables are shown for the current file being viewed from the current PC or call stack selection.
![Static Variables](images/viewing-variables-static-dark.png#only-dark)
![Static Variables](images/viewing-variables-static-light.png#only-light)

#### Registers

Registers provides a list of all of the core (non-memory-mapped) registers.
![Register](images/viewing-variables-registers-dark.png#only-dark)
![Register](images/viewing-variables-registers-light.png#only-light)

### Watch

Allows you to set expressions which are evaluated. These can be simple variables or complex statements.
!!! warning
    Expressions aren't context aware, so viewing a local variable from another context will fail to evaluate.
    Expressions can set variable values, which will happen each time the expression is evaluated (on step or pause).

![Watch](images/viewing-watch-dark.png#only-dark)
![Watch](images/viewing-watch-light.png#only-light)

### Call stack

Displays the current call stack, with function name, PC address and source information where known.
Selecting a function in the call stack will show the registers and local variables applicable to that function.

![Call Stack](images/viewing-call-stack-dark.png#only-dark)
![Call Stack](images/viewing-call-stack-light.png#only-light)

### Breakpoints

The breakpoints view allows you to see currently set breakpoints, toggle them on/off, and add new breakpoints.
To add a new breakpoint, click on the **+** icon in the breakpoints view, click in the gutter of the source line, or right click on a source file and select **Add inline breakpoint** or click **SHIFT + F9**.
Right-click on a breakpoint to view a list of operations that can be performed on the selected breakpoint and all breakpoints in general.

![View Breakpoints](images/viewing-breakpoints-dark.png#only-dark)
![View Breakpoints](images/viewing-breakpoints-light.png#only-light)

To make a breakpoint conditional; right click on the breakpoint and select **Edit breakpoint...** then selected **Expression** from the drop-down and enter your expression in the text field.

![View Conditional Breakpoints](images/viewing-breakpoints-conditional-dark.png#only-dark)
![View Conditional Breakpoints](images/viewing-breakpoints-conditional-light.png#only-light)

### Peripheral registers

The **XPeripherals** view provides a nested structure of peripheral registers and user-modifiable bits.
Hover over a register or bit to view more information, copy the value to the clipboard or modify the value.
!!! warning
    Some bits are reserved and not provided in the list. Care should be taken when writing to an entire register that any reserved bits are not set.

### Memory

The **Memory** tab in the toolbar above the terminal shows the working memory. This displays a detailed image of what is currently being stored in memory as the program executes.

  ![View Memory](images/viewing-memory-dark.png#only-dark)
  ![View Memory](images/viewing-memory-light.png#only-light)

#### Customizing the memory view

To view a specific region of memory, click on the **+** icon and enter a memory address.

To customize that memory view, click on the pencil icon which will allow you to change the address, display name, width and endianness:

  ![Customize Memory](images/viewing-memory-edit-dark.png#only-dark)
  ![Customize Memory](images/viewing-memory-edit-light.png#only-light)

### Disassembly view

1. Right-click on the main program being executed in the **Call Stack** view and select **Open Disassembly View** to view details of the machine-level instructions generated by the source code during a debugging session.

!!! note

    Stepping while this view is in focus performs a single assembly instruction step.

  ![View Disassembly](images/viewing-disassembly-dark.png#only-dark)
  ![View Disassembly](images/viewing-disassembly-light.png#only-light)

### Serial output

#### Minicom

[Minicom](https://help.ubuntu.com/community/Minicom) is a command line utility for serial port communication on Unix platforms.

!!! note
    You will need **minicom** if not already installed.

1. Run the following from a terminal:

    `$ minicom -D /dev/tty.usbxxx -b 115200`

    where `/dev/tty.usbxxx` matches your serial device.

!!! example

    When using the example "Hello World" program, the output looks like this:

    ```
    Welcome to minicom 2.9

    OPTIONS:
    Compiled on Sep 22 2023, 21:10:41.
    Port /dev/tty.usbmodem21302, 10:07:03

    Press Meta-Z for help on special keys

    Hello World!
    count = 0
    count = 1
    count = 2
    count = 3
    count = 4
    count = 5
    ```

#### PuTTY

[PuTTY](https://www.putty.org/) is an open source SSH and telnet client for Windows.

!!! note
    You will need **PuTTY** if not already installed.

1. In the **Session** category, select **Serial** as the **Connection type**.
2. Set the **Serial line** to the correct COM port for your device. Use the Windows **Device Manager** to find your device under **Ports (COM & LPT)**.
3. Set the **Speed** (baud rate) to **115200**.
4. Click **Open** to start the serial terminal.

    ![PuTTY Configuration](images/putty-configuration.png)

!!! example

    When using the example "Hello World" program, the output looks like this:

    ![PuTTY Serial Output](images/putty-serial-output.png)

#### VS Code Serial Monitor

!!! warning

    Arm CMSIS-DAP debuggers, including the MAXPICO and MAX32xxxx onboard debuggers, use the serial `Break` to trigger a target reset.
    Microsoft's Serial Monitor in VS Code sends the `Break` before connecting to the serial port, which will reset the processor when using these debuggers. JLink debuggers do not experience this behavior.
    It is recommended to connect to the serial port _before_ starting a debug session, or use an external serial terminal like [Minicom](#minicom) or [PuTTY](#putty).

!!! note
    You will need the **Serial Monitor** extension for VS Code if not already installed.

1. Click on **Serial Monitor** in the toolbar above the terminal.
2. Set the Monitor Mode to **Serial**.
3. Set the Port to the port in use by the hardware.
4. Set the Baud rate to **115200**
5. Click **Start Monitoring**. This prints the outputs associated with the source code.

!!! info
    To determine the correct port, view the available ports with the required port disconnected, connect the port and see which value appears in the dropdown list

!!! example

    When using the example "Hello World" program, the output looks like this:

    ![Serial Output Monitor](images/serial-output-dark.png#only-dark)
    ![Serial Output Monitor](images/serial-output-light.png#only-light)

#### Linux configuration

On Linux the user may need to be added to the **dialout** group in order to use your serial ports.

``` bash
    sudo usermod -aG dialout <username>
```

### RTOS status

When running an RTOS like Zephyr, you can view essential thread information for the RTOS at a breakpoint using the **XRTOS** tab.

  ![XRTOS View](images/viewing-xrtos-dark.png#only-dark)
  ![XRTOS View](images/viewing-xrtos-light.png#only-light)

#### RTOS requirements

Some RTOSes may require changes in order to provide the debug information required by the XRTOS View.  

For **Zephyr**, the following config flags must be enabled in your prj.conf file:

``` kconfig
# Enable thread awareness when debugging
CONFIG_THREAD_NAME=y
CONFIG_DEBUG_THREAD_INFO=y
CONFIG_THREAD_ANALYZER=y
```

Other RTOSes will have their own required config flags. Please consult the relevant documentation for configuration information.

!!! note
    You will need the **RTOS Views** extension for VS Code if not already installed.
