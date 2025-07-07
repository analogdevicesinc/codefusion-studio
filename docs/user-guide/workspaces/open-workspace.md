---
description: Open an existing workspace in CodeFusion Studio.
author: Analog Devices
date: 2025-04-26
---

# Open an existing workspace

## Open a workspace file

If the project contains a `*.code-workspace` file, open the file directly.

1. Click the CodeFusion Studio icon in the VS Code activity bar.
    ![CodeFusion Studio Icon](../about/images/cfs-icon-light.png){.only-light}
    ![CodeFusion Studio Icon](../about/images/cfs-icon-dark.png){.only-dark}

2. Click **Open Workspace** to open the file explorer.
3. Select the desired workspace and click **Open Workspace**.
4. After opening the workspace, the contents are displayed in the **Explorer** view in the primary sidebar.

```{note}
On some systems, files starting with `.` are hidden by default.
```

## Open a folder

If the project doesn't contain a `*.code-workspace` file, open the workspace directory using the following steps.

1. Click on the **Explorer** icon in the VS Code activity bar.
2. Click **Open Folder**.

    ![VS Code Explorer](images/explorer-empty-dark.png){.only-dark}
    ![VS Code Explorer](images/explorer-empty-light.png){.only-light}

    ```{tip}
    Alternatively, click **File > Open Folder** from the menu.
    ```

3. If you receive the notification **Do you trust the authors of the files in this workspace?**, click **Yes, I trust the authors** to continue.
4. If a **Configuring** dialog box appears, wait for it to complete before proceeding.
