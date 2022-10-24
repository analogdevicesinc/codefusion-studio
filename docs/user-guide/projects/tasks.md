---
description: Tasks available in a configured CFS workspace.
author: Analog Devices
date: 2024-09-02
---

# Tasks to build, clean, flash and debug

After [creating a project](./create-new-project.md) and configuring the workspace, you can run various tasks to create, flash, clean, and run applications.

## Access the tasks

Tasks can be accessed in the following ways:

- Open the **Terminal** menu and select **run build task**, and select the task.
- Open the command palette and enter the task name.
- Click on the CodeFusion Studio icon on the activity bar and then select a task from the Actions view (**3** in the diagram below).
- Click on the icon in the left side of the status bar (**5** in the diagram below).
- Select the desired build task:

![CodeFusion Studio interface](../about/images/cfs-homepage-interface-dark.png#only-dark)
![CodeFusion Studio interface](../about/images/cfs-homepage-interface-light.png#only-light)

!!! Note
    All tasks operate in the same way independent of the mechanism used to invoke them.

## Tasks

### CFS: build

The **CFS: build** task compiles the code using **make**. Options are passed into the make file on the command line based on the project's `settings.json` file. It creates the `./build` directory, which contains the output binary and all intermediary object files.

The build configuration variables used by the makefiles are set during project creation or in the workspace, user or system settings.

!!! Note
    Shortcut: `Ctrl` + `Shift` + `B` (Windows/Linux) or `Command` + `Shift` + `B` (Mac).  
    The build task is also available with shortcuts on the left-hand side of the status bar.  
    ![Build Task Status Bar](images/status-bar-build-dark.png#only-dark)
    ![Build Task Status Bar](images/status-bar-build-light.png#only-light)

### CFS: clean

The **CFS: clean** task cleans the build output, removing the `./build` directory and all of its contents.

!!! Note
    The clean task is available with the shortcut on the left-hand side of the status bar.  
    ![CFS Clean Task Status Bar](images/status-bar-clean-dark.png#only-dark)
    ![CFS Clean Task Status Bar](images/status-bar-clean-light.png#only-light)

### CFS: clean-periph

The **CFS: clear-periph** tasks runs [CFS: clean](#cfs-clean) as well as removes the build output for the MSDK's peripheral drivers. Use **CFS: clean-periph** to recompile the peripheral drivers from source on the next build.

### CFS: flash

The **CFS: flash** task first runs the [CFS: build](#cfs-build) task. Then, it flashes the output binary to the microcontroller. It uses the **GDB** load and compare-sections commands, and launches an **OpenOCD** internally using a pipe connection. This halts the flashed program until the microcontroller is reset, power cycled, or a debugger is connected. A debugger must be connected correctly to use this task. Refer to the data sheet of your microcontroller's evaluation board for instructions.

!!! Note
    The flash task is available with the shortcut on the left-hand side of the status bar.  
    ![Flash Task Status Bar](images/status-bar-flash-dark.png#only-dark)
    ![Flash Task Status Bar](images/status-bar-flash-light.png#only-light)

### CFS: flash and run

The **CFS: flash and run** task runs the [CFS: flash](#cfs-flash) task and resumes execution of the program after flashing is complete.

### CFS: erase flash

The **CFS: erase flash** task erases all of the application code in the flash memory bank. After running this task, the target microcontroller is effectively blank. This is useful for recovering from low power (LP) lockouts, bad firmware, or other issues.

### CFS: debug

The **CFS: debug** task will launch the previous debug session. This may run the [CFS: flash](#cfs-flash) command before running the applicationand halting at the breapoint at `main()`. The executable file will need to be built using the [CFS: build](#cfs-build) command before debugging. Care should be made to ensure the executable is up to date before debugging.  

Using the activity view you can select a debug session to launch. See [Debugging an application](../debugging/debug-an-application.md) for more information.
!!! Note
    The clean task is available with the shortcut on the left-hand side of the status bar.  
    ![CFS Clean Task Status Bar](images/status-bar-debug-dark.png#only-dark)
    ![CFS Clean Task Status Bar](images/status-bar-debug-light.png#only-light)

## Modify build tasks

To modify the default build and flash tasks, click the **Terminal** menu and select **Configure Tasks...**. Select the task you wish to modify. A copy of the task will be added to your project's `.vscode/tasks.json` file, where it can be adjusted to suit your application's needs.

For information on modifying build tasks, see [:octicons-link-external-24: https://code.visualstudio.com/docs/editor/tasks#_custom-tasks](https://code.visualstudio.com/docs/editor/tasks#_custom-tasks){:target="_blank"}
