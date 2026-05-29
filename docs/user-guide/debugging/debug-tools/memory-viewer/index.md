---
description: Inspect and navigate device memory during live and retrospective debug sessions using the Memory Viewer.
author: Analog Devices
date: 2026-05-19
---

# Memory Viewer

The Memory Viewer lets you inspect device memory during live and retrospective debug sessions. It is a multi-core-aware, CFS-native tool that integrates directly with the CodeFusion Studio debug infrastructure and replaces the Memory Viewer bundled with Cortex-Debug.

It has three main areas:

- **Toolbar** — address navigation, copy, refresh, and session status
- **Memory grid** — scrollable hex and ASCII display
- **Footer** — display settings

![Memory Viewer panel showing the toolbar with address field and session status badges, the hex and ASCII memory grid, and footer display controls](./images/memory-viewer-overview-light.png#only-light) ![Memory Viewer panel showing the toolbar with address field and session status badges, the hex and ASCII memory grid, and footer display controls](./images/memory-viewer-overview-dark.png#only-dark)

## Open the Memory Viewer

The Memory Viewer is available as the **CFS Memory** tab in the bottom panel. It appears alongside the Terminal, Debug Console, and other panel views.

To open the panel, start a debug session. The **CFS Memory** tab appears in the bottom panel automatically.

You can also open it at any time from the Command Palette: press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) and run **CFS Memory: Focus on CFS Memory Viewer View**.

![Memory Viewer with no memory loaded, showing Go to field and LIVE/Halted session badges in the toolbar](./images/memory-viewer-initial-state-light.png#only-light) ![Memory Viewer with no memory loaded, showing Go to field and LIVE/Halted session badges in the toolbar](./images/memory-viewer-initial-state-dark.png#only-dark)

## Navigate to an address

Use the **Go to** field in the toolbar to jump to a specific memory location.

1. In the **Go to** field, enter an address in hexadecimal (for example, `0x20000000`) or decimal (for example, `536870912`) format.
2. Press **Enter**.

The memory grid loads data starting from that address. If the address is already within the loaded region, the grid scrolls to it without fetching new data.

If the input is invalid or the session is not in a state that allows a read, the **Go to** field shows an inline error:

| Error | Message |
|---|---|
| Invalid address | Enter a valid hex or decimal address (e.g., 0x2000 or 1024). |
| No active session | No active debug session. Start a debug session to view memory. |
| Target running | Target not halted / Cannot execute this command while the target is running. |
| Read in progress | Already reading memory data. Please wait. |

## Read memory

The memory grid displays memory as a scrollable table with three columns:

- **Address** — the memory address of the first byte in each row, displayed in hexadecimal
- **Hex values** — the byte values in the selected display format, grouped according to the byte grouping setting
- **ASCII** — a printable ASCII representation of the same bytes; non-printable characters appear as `.`

![Memory grid showing address, hex, and ASCII columns with 4-byte grouping in hexadecimal](./images/memory-grid-4-byte-grouping-light.png#only-light) ![Memory grid showing address, hex, and ASCII columns with 4-byte grouping in hexadecimal](./images/memory-grid-4-byte-grouping-dark.png#only-dark)

Use the [display settings](#display-settings) in the footer to adjust how the grid presents data — switch between hexadecimal and decimal, change the number of columns, or group bytes together to get a layout that suits your needs.

![Memory grid showing 4-byte grouping in big endian decimal display](./images/memory-grid-4-byte-grouping-decimal-light.png#only-light) ![Memory grid showing 4-byte grouping in big endian decimal display](./images/memory-grid-4-byte-grouping-decimal-dark.png#only-dark)

The grid uses infinite scroll. As you scroll toward the end of the loaded region, the viewer fetches the next chunk of memory from the debug adapter automatically.

## Copy memory

To copy the contents of the memory grid:

1. Select a region of text in the grid.
2. Click the **Copy** ![Copy](./images/copy-icon-light.png#only-light) ![Copy](./images/copy-icon-dark.png#only-dark) button in the toolbar, or use your system copy shortcut.

The viewer strips leading and trailing whitespace and line breaks from the copied text, so the result is a single contiguous string of hex or ASCII characters.

The **Copy** ![Copy](./images/copy-icon-light.png#only-light) ![Copy](./images/copy-icon-dark.png#only-dark) and **Refresh** ![Refresh](./images/refresh-icon-light.png#only-light) ![Refresh](./images/refresh-icon-dark.png#only-dark) buttons are both disabled when no memory data is loaded.

## Refresh memory

### Auto-refresh

Once you have navigated to an address, the viewer automatically re-reads memory at that address each time the debugger halts. This means you do not need to manually refresh between steps or breakpoints, the grid updates silently whenever execution stops.

When a session resumes (continues), the viewer marks the current data as **stale** to indicate the values may no longer reflect the target state.

### Example: watching a variable update in memory

A practical way to see auto-refresh in action is to watch a variable change value as you step through code.

Declare a `static` variable in your source so the compiler gives it a fixed address in SRAM:

```c
static int count = 0;
```

Then, once your debug session is halted at a breakpoint:

1. Get the variable's memory address — either add `&count` as a Watch expression in the debug sidebar, or run `print &count` in the **Debug Console**.
2. Enter that address in the **Go to** field in the Memory Viewer.
3. Set the footer to **1 Byte** grouping and **Decimal** display for easier reading.
4. Press F10 (**Step Over**) in the debug toolbar to advance one line at a time without descending into library function calls.

Each time execution halts, the Memory Viewer re-reads the address automatically. You can watch the bytes at `count`'s address change as the value increments — without pressing **Refresh** manually.

![Memory Viewer showing count = 1 at address 0x20000908 in decimal display, with the Watch panel confirming the address and the Variables panel showing the current value](./images/memory-viewer-refresh-light.png#only-light) ![Memory Viewer showing count = 1 at address 0x20000908 in decimal display, with the Watch panel confirming the address and the Variables panel showing the current value](./images/memory-viewer-refresh-dark.png#only-dark)

### Manual refresh

If you need to re-read memory while already halted (for example, after writing a value directly from the Debug Console), click the **Refresh** button in the toolbar. The button is disabled unless a session is halted and an address has been entered.

## Display settings

The footer contains controls for adjusting how memory is formatted and laid out.

![Footer controls showing 2 Bytes grouping, Big Endian, Columns 16, and Hexadecimal display](./images/footer-controls-light.png#only-light) ![Footer controls showing 2 Bytes grouping, Big Endian, Columns 16, and Hexadecimal display](./images/footer-controls-dark.png#only-dark)

### Byte grouping

Select the byte grouping label (for example, **1 Byte**) in the footer to cycle through grouping sizes: **1 Byte**, **2 Bytes**, **4 Bytes**. The grouping determines how many bytes are combined into a single hex cell.

Combined with the column count, byte grouping controls how many bytes appear per row. For example, **2 Bytes** grouping with 8 columns displays 16 bytes per row.

### Endianness

When byte grouping is set to **2 Bytes** or **4 Bytes**, an endianness control appears next to the byte grouping label. Click it to toggle between **Big Endian** and **Little Endian**. The endianness control is hidden when byte grouping is set to **1 Byte**.

### Columns

Select the **Columns** dropdown to set the number of hex cells per row. Available options are **4**, **8**, **16** (default), **32**, or **64**.

### Display format

Click the display format label (for example, **Hexadecimal**) to toggle between **Hexadecimal** and **Decimal** display of byte values.

## Session status

The toolbar displays status information for the active debug session when one is present:

- **Session name** — the name of the currently active debug session
- **LIVE** ![LIVE badge](./images/memory-viewer-live-light.png#only-light) ![LIVE badge](./images/memory-viewer-live-dark.png#only-dark) or **POST-MORTEM** ![POST-MORTEM badge](./images/memory-viewer-post-mortem-light.png#only-light) ![POST-MORTEM badge](./images/memory-viewer-post-mortem-dark.png#only-dark) — whether the session is connected to a running target or reading from a core dump
- **Halted** ![Halted badge](./images/memory-viewer-halted-light.png#only-light) ![Halted badge](./images/memory-viewer-halted-dark.png#only-dark) or **Stale** ![Stale badge](./images/memory-viewer-stale-light.png#only-light) ![Stale badge](./images/memory-viewer-stale-dark.png#only-dark) — whether the target is currently stopped (data is current) or running (data may be out of date)

## Retrospective debugging

The Memory Viewer supports retrospective debugging sessions that read from a core dump file rather than a live target. These sessions are indicated by the **POST-MORTEM**![POST-MORTEM badge](./images/memory-viewer-post-mortem-light.png#only-light) ![POST-MORTEM badge](./images/memory-viewer-post-mortem-dark.png#only-dark) badge in the toolbar. The viewer operates in read-only mode during retrospective sessions.

To set up a retrospective session, see [Core Dump Analysis](../core-dump-analysis/core-dump-analyze.md). Once the session is open, enter a memory address in the **Go to** field as you would in a live session.

## Empty states

When memory cannot be displayed, the viewer shows a message explaining why:

| State | Title | Description |
|---|---|---|
| No debug session | No active debug session | Start a debug session to view memory. |
| Target running | Execution is running | Halt execution to read memory. Memory can only be read when the target is halted. |
| No address entered | No memory loaded | Enter an address in 'Go to' (e.g., 0x20000000) to inspect target memory. |

## Multi-core support

The Memory Viewer tracks all active debug sessions simultaneously. In a multi-core environment, it displays memory for the session you select in the call stack view and updates automatically when you switch between sessions.

When you switch context, the viewer:

1. Identifies the newly active session.
2. If that session is halted, fetches memory at the last requested address.
3. If that session is running, marks the current data as stale.

Each session's lifecycle (start, halt, continue, and stop) is tracked independently, so switching between cores does not disrupt memory data from other sessions.

![Memory Viewer showing two active debug sessions in the Call Stack — ARM Cortex-M4 and RISC-V — with memory loaded at the shared region address](./images/memory-viewer-multicore-light.png#only-light) ![Memory Viewer showing two active debug sessions in the Call Stack — ARM Cortex-M4 and RISC-V — with memory loaded at the shared region address](./images/memory-viewer-multicore-dark.png#only-dark)

## Error handling

The Memory Viewer handles debug adapter and transport errors without blocking your workflow:

- **Unmapped addresses**: If you navigate to an address that cannot be read, the viewer shows an error message: `Read memory error: Unable to read memory`.
- **Read timeout**: If a memory read does not complete within five seconds, the request is cancelled and an error is shown.
- **Session disconnect**: If the debug adapter disconnects or the session terminates, the viewer clears the memory data and updates the session list.
- **Target running**: The viewer does not issue read requests while the target is running — use **Refresh** after the target halts.
