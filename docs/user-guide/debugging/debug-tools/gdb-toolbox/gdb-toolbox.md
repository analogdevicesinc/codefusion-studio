---
description: How to use the GDB Toolbox in CodeFusion Studio.
author: Analog Devices
date: 2025-10-23
---

# Using the GDB Toolbox

The following is an overview of GDB Toolbox features and how to create, edit, and run GDB Toolbox scripts.

!!! note "macOS users"
    On macOS, the GDB binary used for GDB Toolbox is not Python-enabled by default. Install Python 3.10 and update your `launch.json` to use the Python-enabled GDB binary. For details, see the [Release Notes](../../../../release-notes/2.0.0.md#debug-and-analysis-tools).

## Access the GDB Toolbox

1. Select the **Run and Debug** icon on the activity bar, or use the **CFS: debug** task.
1. Set breakpoints in your application and click the **Start Debugging** icon (green play button) to the left of your selection or press **F5**.
1. When the debug session is paused or halted, the GDB Toolbox becomes visible in the sidebar.

![GDB Toolbox](./images/gdb_toolbox_debug_light.png#only-light) ![GDB Toolbox](./images/gdb_toolbox_debug_dark.png#only-dark)

## Create a script

1. Click **Create Script** ![Create Script](./images/gdb-toolbox-create-icon-light.png#only-light) ![Create Script](./images/gdb-toolbox-create-icon-dark.png#only-dark).
1. Enter a name, for example: `Dump Stack`.
1. Press **Enter** to generate the initial template.
1. Modify the script using the JSON editor.
1. Save the script (`Ctrl+S` or `Cmd+S` on macOS).

User scripts are automatically saved in the workspace’s `.cfs` folder: `<${userHome}>/cfs/<cfs_version_number>/<project_name>/.cfs/gdb_toolbox/configs`

!!!note
    You can also manually drop files into the `gdb_toolbox` directory at `<${userHome}>/cfs/gdb_toolbox/configs`. Any valid script you add will automatically appear in the GDB Toolbox view the next time you start a debugging session.
    This directory is useful when storing scripts in a remote repository or syncing them across machines.

## Filter scripts

1. Click **Filter Scripts** ![Filter Script](./images/gdb-toolbox-filter-icon-light.png#only-light) ![Filter Script](./images/gdb-toolbox-filter-icon-black.png#only-dark)
1. Enter a script name or description in the search field.
1. Press **Enter**. The GDB Toolbox view updates to show only matching scripts.
1. To edit the filter, click the filter label in the GDB Toolbox view and enter a new search value.
1. To clear the filter, click **Clear Filter** ![Clear Filter](./images/gdb-toolbox-clear-filter-light.png#only-light) ![Clear Filter](./images/gdb-toolbox-clear-filter-dark.png#only-dark) next to the filter label.

## Run a script

To run a custom or built-in script:

1. Click the script name in the GDB Toolbox panel.

    !!! Important
        Scripts only run when the debug session is paused.

1. Check the output in the **Debug Console**.
1. In multi-core projects, the **Debug Console** is context-aware and shows output for the selected core. Use the dropdown in the **Debug Console** to switch between cores.

## Edit a script

To edit a custom script, hover over the script name and click **Edit Script** ![Edit Script](./images/gdb-toolbox-edit-icon-light.png#only-light) ![Edit Script](./images/gdb-toolbox-edit-icon-dark.png#only-dark)

## Delete a script

Scripts can be deleted from the `gdb_toolbox` directory: `<${userHome}>/cfs/<cfs_version_number>/<project_name>/.cfs/gdb_toolbox/configs`.
