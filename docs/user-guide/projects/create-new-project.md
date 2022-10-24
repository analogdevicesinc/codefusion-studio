---
description: Create a new project in CodeFusion Studio.
author: Analog Devices
date: 2024-09-02
---

# Create a new project

New projects are created with the New Project Wizard.

## Launch the new project wizard

1. Click the CodeFusion Studio icon in the VS Code activity bar.

    ![CodeFusion Studio Icon](../about/images/cfs-icon-dark.png#only-dark)
    ![CodeFusion Studio Icon](../about/images/cfs-icon-light.png#only-light)

2. Click **Home** in the primary side bar.
3. Under Quick access, click **New project** to open the new project wizard.

    ![New Project Wizard](images/new-project-wizard-dark.png#only-dark)
    ![New Project Wizard](images/new-project-wizard-light.png#only-light)

## Create a project

1. Enter the project name.
1. Select desired processor from the dropdown menu. Type a partial name to filter.
1. For an ADI board, select the **Standard** option and then desired board from the dropdown menu.
1. For an custom board, select the **Custom** option and then provide your custom board file.
1. Select a firmware platform from the dropdown menu. Either **MSDK** for bare metal or **Zephyr** to use the Zephyr RTOS.
1. Select a template project from the dropdown menu. Type to filter.
1. Use the default location or uncheck the box to choose a different location.

    !!! note
        The project location can be edited manually or a new project location can be set using the **Browse** button.

1. Click **Generate**.

1. CFS provides a notification to indicate the new project has been created. To open the new project, click **Open Project**.

    ![New Project Wizard Project Creation Notification](images/new-project-created-notification-dark.png#only-dark)
    ![New Project Wizard Project Creation Notification](images/new-project-created-notification-light.png#only-light)
