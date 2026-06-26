---
description: Build, flash, and debug the Blinky example on MAX32657 or MAX32658 using Zephyr 4.4.0 in CodeFusion Studio
author: Analog Devices
date: 2026-06-18
---

# Blinky

Blinky is the simplest example and the one to run first — it verifies your board by flashing an LED and printing over UART.

Before you begin, complete the [prerequisites](index.md#prerequisites).

## Create the Blinky workspace

[Create a new workspace](../../user-guide/workspaces/create-new-workspace.md), selecting **MAX32657** or **MAX32658** as the device, the **EvKit_V1** board, and the **Zephyr Single Core Blinky** template.

## Build Blinky

1. In the **Actions** view, select **Pristine Build (m33)** to build the project.

    ![Pristine Build (m33) action in the Actions view](./images/pristine-build-dark.png#only-dark "Pristine Build")
    ![Pristine Build (m33) action in the Actions view](./images/pristine-build-light.png#only-light "Pristine Build")

2. Confirm that the build completes successfully — the terminal output ends with `zephyr.elf`.

    ![Terminal output showing the build ending with zephyr.elf](./images/blinky-terminal-output-dark.png#only-dark "Build output")
    ![Terminal output showing the build ending with zephyr.elf](./images/blinky-terminal-output-light.png#only-light "Build output")

## View the serial output

Blinky prints a message over the UART0 console each time the LED toggles. Set up the serial monitor before flashing so you capture the output. A USB connection creates a virtual serial port at **115200** baud. No extra hardware is required.

1. Identify which serial port the board is using:
    - **Windows:** Open Device Manager → **Ports (COM & LPT)** and note the COM port (for example, `COM3`).
    - **macOS:** Run `ls /dev/tty.*` in Terminal and look for `/dev/tty.usbserial-*` or `/dev/tty.usbmodem*`.
    - **Linux:** Run `ls /dev/ttyUSB* /dev/ttyACM*` in a terminal and look for `/dev/ttyUSB0` or `/dev/ttyACM0`.

    !!! tip
        Unsure which port? Disconnect the cable, note which ports disappear, then reconnect. For additional troubleshooting steps, see [Connect hardware](../../user-guide/debugging/connect-hardware.md#troubleshooting).

2. Open a serial terminal. To use the VS Code Serial Monitor:
    1. Install the [:octicons-link-external-24: Serial Monitor](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-serial-monitor){:target="_blank"} extension from the VS Code Marketplace, if it is not already installed.
    2. Select the **Serial Monitor** tab in the panel, next to the **Terminal** and **Output** tabs.
    3. Set the Monitor Mode to **Serial**.
    4. Set the Port to the port you identified in step 1.
    5. Set the Baud rate to **115200**.
    6. Click **Start Monitoring**.

    For other terminal options (Tera Term, Minicom, or PuTTY), see [Serial output](../../user-guide/debugging/debug-interface.md#serial-output).

## Flash and run

In the **Actions** panel, click **Flash & Run (J-Link)(m33)**.

![Flash and Run action in the Actions panel](./images/blinky-flash-and-run-dark.png#only-dark "Flash and Run")
![Flash and Run action in the Actions panel](./images/blinky-flash-and-run-light.png#only-light "Flash and Run")

When flashing completes, LED0 on the EV Kit blinks and the serial terminal prints a message each time the LED changes state.

![VS Code Serial Monitor tab showing Monitor Mode, Port, and Baud rate settings](./images/serial-monitor-dark.png#only-dark "VS Code Serial Monitor")
![VS Code Serial Monitor tab showing Monitor Mode, Port, and Baud rate settings](./images/serial-monitor-light.png#only-light "VS Code Serial Monitor")

## Modify and debug

1. In the **Explorer**, open `m33/src/main.c`, find the line that defines `SLEEP_TIME_MS`, and change the default from `1000` to `300` to make the LED blink faster.
2. Rebuild the project.
3. Select the **Run and Debug** icon ![Run & Debug](../../user-guide/debugging/images/run-and-debug-icon-dark.png#only-dark) ![Run & Debug](../../user-guide/debugging/images/run-and-debug-icon-light.png#only-light) on the **Activity Bar**.
4. From the menu, select **CFS: Debug with JlinkGDBServer and JLink (Arm Embedded)**.
5. Click the **Start Debugging** icon (green play button) or press **F5**. The debugger halts execution at the start of `main()`.
6. Use the debug action buttons in the VS Code toolbar to control execution.
    1. Click **Step Over** repeatedly to single-step through the `while (1)` loop. As you step past each toggle, the LED turns on, then off.
    2. Click **Continue** to resume running. The LED blinks at the new, faster rate, and the serial terminal shows the ON/OFF messages.

For more on breakpoints, variable inspection, and stepping, see [Debug an application](../../user-guide/debugging/debug-an-application.md). CFS also includes additional debugging tools. See [Debug tools](../../user-guide/debugging/debug-tools/index.md).
