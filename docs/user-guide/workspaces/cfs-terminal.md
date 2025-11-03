---
description: The CFS Terminal
author: Analog Devices
date: 2024-08-26
---

# CFS Terminal

CodeFusion Studio (CFS) introduces a new terminal called the CFS Terminal.

The CFS Terminal is the default terminal that opens when interacting with CodeFusion Studio and provides additional paths for CodeFusion Studio without needing any additional user configuration.
The underlying shell depends on your host operating system:

- `cmd` on Windows
- `zsh` on Mac
- `bash` on Linux

## Launch new terminal

1. Open the terminal:

    - On macOS/Linux, select **Terminal > New Terminal**.
    - On Windows, select **View > Terminal**.
    - Use the ``Ctrl + Shift + ` `` keyboard shortcut.

2. In the terminal panel, click the dropdown arrow next to the **+** icon in the top right corner.

3. Choose **CFS Terminal** from the list.

    ![New CFS Terminal](./images/terminal-new-dark.png#only-dark)  
    ![New CFS Terminal](./images/terminal-new-light.png#only-light)

4. Run `cfsutil` or `cfsai` in the terminal to confirm it's working correctly.

## Clear the terminal

Click on the **Views and More Actions...** menu (...) in the top right corner of the terminal window and select **Clear Terminal**.

## Copy and Paste in the terminal

To copy text from the terminal, select the text, and right-clicking on the selected text. Keyboard shortcut: **CONTROL+C** (**COMMAND+C** on Mac).

To paste text to the terminal, right-clicking in the desired location. Keyboard shortcut **CONTROL+V** (**COMMAND+C** on Mac).
