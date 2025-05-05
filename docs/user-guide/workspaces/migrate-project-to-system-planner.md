---
description: Migrate an existing project to the System Planner workspace.
author: Analog Devices
date: 2025-04-04
---

# Migrate a project to System Planner

To enable System Planner in an existing project, you'll need to create a new workspace using the latest format.

Most project files can be reused directly, but the .cfsconfig file must be recreated manually. This is because older .cfsconfig files are not compatible with the new System Planner format.

!!! warning
    It is strongly recommended to keep a backup copy of the original project files.

## Migrate a project

1. Save a local copy of the original `.cfsconfig` file from your existing project.
2. Create a new workspace using the [workspace creation wizard](create-new-workspace.md).
3. Open the original `.cfsconfig` file in a text editor.

    !!! tip
        In VS Code, right-click the file and select **Open with**, then choose **Text Editor**.

4. Compare the new `.cfsconfig` file to the locally saved original and identify any missing top-level fields.
5. Use [System Planner](../tools/index.md) to update configurations as needed. For example, you may need to:
     - Allocate and configure peripherals
     - Assign and configure pins
     - Configure clocks
     - Allocate and partition memory
     - View registers.

6. Save your changes.
7. Verify the pin and clock assignments with System Planner.
