---
description: Debugging a multi core application in CodeFusion Studio
author: Analog Devices
date: 2025-10-20
---

# Debug a multicore MSDK application

CodeFusion Studio provides debugging for supported MSDK microcontrollers with multiple cores.

The multi-core architecture of the `MAX32xxx` and `MAX78xxx` microcontrollers requires secondary images contained within the image for the primary core.
This means only a single image is required to boot and run a multi-core microcontroller.

The secondary core is enabled with a code sequence on the primary core. Debugging the secondary core is available after `MXC_SYS_RISCVRun()` has been called on the primary core.

!!! Note
    Not all of the dual core evaluation boards have external debug ports for the secondary core. Care should be taken when selecting a board to work with.

See [Supported processors](../about/supported-processors.md) for a full list of supported processors.

## Create a multi-core workspace

To get started, create a new multi-core workspace using the Workspace Creation Wizard.

1. Click the CodeFusion Studio icon ![CodeFusion Studio Icon](../about/images/cfs-icon-dark.png#only-dark) ![CodeFusion Studio Icon](../about/images/cfs-icon-light.png#only-light) in the VS Code activity bar.
1. Click **New Workspace**.
1. Select the **MAX78002** processor and **EvKIT_V1** board.
1. Choose **Select a workspace template** and select the MSDK multi-core example.
1. Click **Continue**.
1. Enter a name for your workspace and click **Create Workspace**.

## Build the project

Run the [CFS: build](../workspaces/tasks.md) to create the build directory and generate the ELF files needed for debugging.

- Click the **CFS icon** ![cfs-icon](../about/images/cfs-icon-light.png#only-light) ![cfs-icon](../about/images/cfs-icon-dark.png#only-dark) in the **Activity Bar**.
- Select **Build (m4)** in the **Actions** view.

This action creates the following files:

- `build/m4.elf`
- `build/buildrv/riscv.elf`

## Debug settings

1. Select the **Run and Debug** icon on the activity bar.
2. Select the **CFS: Debug with GDB and OpenOCD (Arm Embedded)** from the dropdown menu.
3. Click on the **Start Debugging** icon (green play button) to the left of your selection or press **F5**.
4. Select configuration or image files if prompted.

    !!! note
        If prompted to specify the Arm ELF binary, use the following path from your generated workspace:
        `<workspace-folder>/m4/build/m4.elf`

5. When the Arm debug session reaches the breakpoint in the main.c code, press **Continue** on the debugging tool bar or **F5**.
6. Confirm RISC-V is running by observing LED0 blinking, or pause the Arm core to check it has passed the call to `MXC_SYS_RISCVRun();`
7. Launch the RISC-V debug instance using the **CFS: Debug with GDB and OpenOCD (RISC-V)** debug configuration.
8. Select configuration/image files if prompted.

    !!! note
        If prompted to specify the RISC-V ELF binary, use the following path from your generated workspace:
        `<workspace-folder>/m4/build/buildrv/riscv.elf`

## Control the session

The **Call Stack** can be used to navigate between each debug instance. This provides quick access to the debugging taking place on each processor.

!!! note
    On MAX32xxx and MAX78xxx evaluation boards, clicking **Restart** during a RISC-V debug session causes a `Protocol error with Rcmd: FC`.  
    This is expected behavior and occurs because the RISC-V JTAG port must be re-enabled by the Arm core before reconnecting. For example, execute `MXC_SYS_RISCVRun()` on the Arm core (as documented in the previous section) to re-enable the RISC-V JTAG interface, allowing the RISC-V debug session to be restarted.
