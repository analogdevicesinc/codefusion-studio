---
description: Open MSDK examples in CodeFusion Studio.
author: Analog Devices
date: 2025-10-20
---

# Explore and open MSDK examples

The MSDK provides example projects for each supported microcontroller. These examples demonstrate peripheral APIs, middleware, and other libraries, serving as references and starting points for your own applications.

!!!note
    If you plan to migrate a project to System Planner, follow the steps in [migrate a project to System Planner](../workspaces/migrate-project-to-system-planner.md)

## Open an example project

1. Click the CodeFusion Studio icon ![CodeFusion Studio Icon](../about/images/cfs-icon-dark.png#only-dark) ![CodeFusion Studio Icon](../about/images/cfs-icon-light.png#only-light) in the VS Code activity bar.  
2. Click **Browse MSDK Examples**.

    ![Browse MSDK Examples dialog](images/browse-msdk-examples-dark.png#only-dark)
    ![Browse MSDK Examples dialog](images/browse-msdk-examples-light.png#only-light)

    !!! tip
        You can also open the **Command Palette** (`Ctrl+Shift+P` / `⇧⌘P` on macOS) and type **Browse MSDK Examples** to launch the same dialog.

3. In the dialog that appears, choose your target SoC.  
4. Browse or search for the desired example.  
5. Click **Select Example**.  
6. Choose a destination folder to create a local copy of the project.
7. A new VS Code window opens. If you receive the notification **Do you trust the authors of the files in this workspace?**, click **Yes, I trust the authors** to continue.  
8. If your existing project has not been configured as a CodeFusion Studio workspace, wait for the **Configuring** dialog box to complete before proceeding.

!!! note
    CodeFusion Studio automatically locates your installed MSDKs and examples. If the MSDK was installed using the Package Manager, examples are loaded from the Package Manager package. If no MSDK package exists, it defaults to the MSDK folder bundled with the installer (`SDK/MAX/Examples`).

## Open multiple examples together (optional)

You can open multiple example projects in a single workspace—for example, to compare code or build and run multi-core projects.

### Duplicate the example folder

!!! warning
    We strongly recommend copying the example projects before modifying any files to preserve the original examples.

1. Open **File Explorer**.  
2. Depending on how you installed the MSDK, examples are located in one of the following directories. Click **Browse MSDK Examples** to determine the correct location.
   - **Installer:** `C:\Analog\CFS\<version>\SDK\MAX\Examples`  
   - **Package Manager (Conan):**  
     - **Linux:** `/home/<username>/.local/share/com.analog.cfs/packages/conan/p/msdk<id>/p/Examples`  
     - **macOS:** `/Users/<username>/Library/Preferences/com.analog.cfs/packages/conan/p/msdk<id>/p/Examples`
     - **Windows:** `C:\Users\<username>\AppData\Local\com.analog.cfs\Data\packages\conan\p\msdk<id>\p\Examples`  
3. Copy the **Examples** folders to a writable location.

### Open the examples in VS Code

1. Launch **VS Code**.  
2. Click the **Explorer** icon in the activity bar.  
3. Click **Open Folder**.  

    ![VS Code Explorer](images/explorer-empty-dark.png#only-dark)
    ![VS Code Explorer](images/explorer-empty-light.png#only-light)

    !!! tip
        You can also select **File > Open Folder** from the top menu.

4. Navigate to the location where you saved the examples.
5. Select two example projects to open.

    ![Selection of Multiple Folders](images/select-multiple-folders.png)

    !!! warning
        You must select two distinct projects, each containing a **makefile** at the highest level in their respective folder structure.

6. If prompted with **Do you trust the authors of the files in this workspace?**, click **Yes, I trust the authors**.  
7. If your existing project has not been configured as a CodeFusion Studio workspace, wait for the **Configuring** dialog box to complete before proceeding.
8. Confirm the projects are ready by expanding each `.vscode` folder and verifying that `settings.json` contains valid project settings.  

    ![Migration Successful Notification](images/single-migration-successful-dark.png#only-dark)
    ![Migration Successful Notification](images/single-migration-successful-light.png#only-light)
