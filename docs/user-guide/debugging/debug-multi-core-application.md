---
description: Debugging a multi core application in CodeFusion Studio
author: Analog Devices
date: 2024-09-02
---

# Debug a multi core application

CodeFusion Studio provides debugging for supported microcontrollers with multiple cores.

The multi-core architecture of the `MAX32xxx` and `MAX78xxx` microcontrollers requires secondary images contained within the image for the primary core.
This means only a single image is required to boot and run a mulit-core microcontroller.

The secondary core is enabled with a code sequence on the primary core. Debugging the secondary core is available after `MXC_SYS_RISCVRun()` has been called on the primary core.

!!! Note
    Not all of the dual core evaluation boards have external debug ports for the secondary core. Care should be taken when selecting a board to work with.

See [Supported processors](../about/supported-processors.md) for a full list of supported processors.

## RV_ARM_Loader example

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

### Set up a workspace

!!! Warning
    Copy the example it into a new directory before modifying it so the original example can be restored.

1. Place the `MAX78002` `Hello_World` example (or the example you'd like to run on the RISC-V processor) in the same directory as the `MAX78002` `RV_ARM_Loader` example.

    !!! note
        If the `Hello_World` project doesn't reside at `../Hello_World` relative to `RV_ARM_Loader` or you want to use a different project, you will need to update the `project.mk` within the `RV_ARM_Loader` example.

2. Click **File** > **Open Folder** to open the `MAX78002` `RV_ARM_Loader` example in a single-folder workspace.

3. Click **File** > **Add Folder to Workspace** to add the `MAX78002` `Hello_World` example to the workspace.

    !!! note
        Convert the projects to CodeFusion Studio projects if required. See [Open and Migrate Example](../projects/open-and-migrate-example.md) for more info.

4. Run the [CFS: build](../projects/tasks.md) to create the build directory which contains the ELF files for the Arm processor. These files are used for the program file settings.
    - `build/RV_ARM_Loader.elf`
    - `build/buildrv/riscv.elf`

### Debug settings

1. Launch the Arm debug instance using the **CFS: Cortex Debug with GDB and OpenOCD (ARM Embedded)** debug configuration.
2. Select configuration/image files if prompted.
3. After the Arm debug session reaches the breakpoint in the main.c code, press **Continue** on the debugging tool bar or **F5**.
4. Confirm RISC-V is running by observing LED0 blinking, or pause the Arm core to check it has passed the call to `MXC_SYS_RISCVRun();`
5. Launch the RISC-V debug instance using the **CFS: Debug with GDB and OpenOCD (RISC-V)** debug configuration.
6. Select configuration/image files if prompted.

## Control the session

The **Call Stack** can be used to navigate between each debug instance. This provides quick access to the debugging taking place on each processor.
