---
description: Open an existing project in CodeFusion Studio.
author: Analog Devices
date: 2024-09-18
---

# Open an existing project

If the project contains a `*.code-workspace` file this should be opened directly rather than opening the project's root directory.  

!!! note
    On some systems, files starting with `.` are hidden by default.

1. Click on **File** then **Open Workspace from File...**.
2. Navigate to and open the `*.code-workspace` file.

If the project doesn't contain a `*.code-workspace` file the workspace directory can be opened using the following steps.  

1. Click the CodeFusion Studio icon in the VS Code activity bar.

    ![CodeFusion Studio Icon](../about/images/cfs-icon-light.png#only-light)
    ![CodeFusion Studio Icon](../about/images/cfs-icon-dark.png#only-dark)

2. Click **Home** in the primary side bar.
3. Under Quick access, click **Open Project** to open the file explorer.
4. Select the desired project and click **Open project**.
5. After opening the project, the contents are displayed in the **Explorer** view in the primary side bar.

    !!! note
        If your existing project has not been configured as a CodeFusion Studio project, follow the notifications and prompts that appear after opening the project to configure the workspace and migrate the project to CFS.

    ![Project Contents in Explorer View Container](images/project-explorer.png)
