---
description: Debugging a multi core application in CodeFusion Studio
author: Analog Devices
date: 2025-04-22
---

# Debug a multi core application

CodeFusion Studio provides debugging for supported microcontrollers with multiple cores.

The multi-core architecture of the `MAX32xxx` and `MAX78xxx` microcontrollers requires secondary images contained within the image for the primary core.
This means only a single image is required to boot and run a mulit-core microcontroller.

The secondary core is enabled with a code sequence on the primary core. Debugging the secondary core is available after `MXC_SYS_RISCVRun()` has been called on the primary core.

!!! Note
    Not all of the dual core evaluation boards have external debug ports for the secondary core. Care should be taken when selecting a board to work with.

See [Supported processors](../about/supported-processors.md) for a full list of supported processors.

## Create a multi-core workspace

To get started, you need to create a multi-core workspace. There are two options:

1. [Create a multi-core workspace using the Workspace Creation Wizard](debug-multi-core-application.md#option-1-create-a-multi-core-workspace-using-the-workspace-creation-wizard)
2. [Create a multi-core workspace by combining two SDK examples](debug-multi-core-application.md#option-2-create-a-multi-core-workspace-by-combining-sdk-examples)

## Option 1: Create a multi-core workspace using the Workspace Creation wizard

1. Click the CodeFusion Studio icon ![CodeFusion Studio Icon](../about/images/cfs-icon-dark.png#only-dark) ![CodeFusion Studio Icon](../about/images/cfs-icon-light.png#only-light) in the VS Code activity bar.
1. Click **New Workspace**.
1. Select the **MAX78002** processor and **EvKIT_V1** board.
1. Choose **Select a workspace template** and select the MSDK multi-core example.
1. Click **Continue**.
1. Enter a name for your workspace and click **Create Workspace**.

## Option 2: Create a multi-core workspace by combining SDK examples

The `MAX78002` RV_ARM_Loader example is located within the CodeFusion Studio installation at `<CodeFusion Studio Install>/SDK/MAX/Examples/MAX78002/RV_ARM_Loader`. This example uses the Arm processor to load and prepare the RISC-V processor to run a chosen program.

!!! Note
    By default, the example runs the `MAX78002` Hello_World example on the RISC-V processor, found at `<CodeFusion Studio Install>/SDK/MAX/Examples/MAX78002/Hello_World`. To run a different program on the RISC-V processor, change the RISCV_APP variable in `RV_ARM_LOADER/project.mk` to point to the root directory of the program to build and run:

    **project.mk**
    ```makefile
    # This file can be used to set build configuration
    # variables.  These variables are defined in a file called
    # "Makefile" that is located next to this one.

    # For instructions on how to use this system, see
    # https://analogdevicesinc.github.io/msdk/USERGUIDE/#build-system

    # **********************************************************

    # Enable the RISC-V loader
    RISCV_LOAD = 1

    # The RISCV application can be changed.
    # It defaults to Hello_World
    RISCV_APP=../Hello_World
    ```

1. Create a new directory, such as `MAX78002_Multicore`, outside of the SDK examples folder.

2. Copy the `MAX78002` `Hello_World` example (or the example you'd like to run on the RISC-V processor) and the `MAX78002` `RV_ARM_Loader` example into the `MAX78002_Multicore` directory.

    !!! note
        If the `Hello_World` project isn't located at `../Hello_World` relative to `RV_ARM_Loader`, or if you are using a different project, you will need to update the `RISCV_APP` path in `RV_ARM_Loader/project.mk`.

3. Click **File** > **Open Folder** to open the copied `RV_ARM_Loader` folder as single-folder workspace.

4. Click **File** > **Add Folder to Workspace** to add the copied `Hello_World` folder.

    !!! note
        Convert the projects to CodeFusion Studio workspaces if required. See [Open and Migrate Example](../workspaces/open-and-migrate-example.md) for more info.

## Build the projects

Run the [CFS: build](../workspaces/tasks.md) to create the build directory and generate the ELF files needed for debugging.

- Click the **CFS icon** ![cfs-icon](../about/images/cfs-icon-light.png#only-light) ![cfs-icon](../about/images/cfs-icon-dark.png#only-dark) in the **Activity Bar**.
- Select **Build (m4)** or **Build (RV_ARM_Loader)** in the **Actions** view.

This action creates the following files:

- `build/m4.elf` or `build/RV_ARM_Loader.elf`
- `build/buildrv/riscv.elf`

## Debug settings

1. Select the **Run and Debug** icon on the activity bar.
2. Select the **CFS: Debug with GDB and OpenOCD (Arm Embedded)** from the dropdown menu.
3. Click on the **Start Debugging** icon (green play button) to the left of your selection or press **F5**.
4. Select configuration or image files if prompted.

    !!! note
        If prompted to specify the Arm ELF binary, the path depends on your project layout:

        - If you are using the `m4` core directory from the template use:  
        `<workspace-folder>/m4/build/m4.elf`

        - If you are using the `RV_ARM_Loader` example use:  
        `<workspace-folder>/RV_ARM_Loader/build/RV_ARM_Loader.elf`.

5. When the Arm debug session reaches the breakpoint in the main.c code, press **Continue** on the debugging tool bar or **F5**.
6. Confirm RISC-V is running by observing LED0 blinking, or pause the Arm core to check it has passed the call to `MXC_SYS_RISCVRun();`
7. Launch the RISC-V debug instance using the **CFS: Debug with GDB and OpenOCD (RISC-V)** debug configuration.
8. Select configuration/image files if prompted.

    !!! note
        If prompted to specify the RISC-V ELF binary, the path depends on your project layout:

        - If you are using the `m4` core directory from the template use:  
        `<workspace-folder>/m4/build/buildrv/riscv.elf`

        - If you are using the `RV_ARM_Loader` example use:  
        `<workspace-folder>/RV_ARM_Loader/build/buildrv/riscv.elf`

## Control the session

The **Call Stack** can be used to navigate between each debug instance. This provides quick access to the debugging taking place on each processor.
