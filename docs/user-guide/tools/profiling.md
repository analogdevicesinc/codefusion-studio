---
description: Enable Zephelin profiling for Zephyr projects
author: Analog Devices
date: 2026-05-28
---

# Profiling

Use the Profiling feature in CodeFusion Studio to capture and visualize profiler traces from your Zephyr project. The profiler provides detailed, operator-level profiling for AI models, enabling deep analysis of inference performance alongside system-level metrics.

!!! note "Beta feature"
    The Profiling tool is currently in **beta**. Some options or trace formats may change in future releases.

## About Zephelin

[:octicons-link-external-24: Antmicro](https://github.com/antmicro/zephelin) developed Zephelin as a middleware layer for Analog Devices. It extends Zephyr RTOS with advanced tracing and profiling capabilities, specializing in detailed AI operator-level performance analysis. Zephelin also captures system-level events such as task switches, interrupts, and timing information, providing a complete view of both AI inference and runtime behavior.

## Before you start

Before you begin, ensure you have created a Zephyr workspace using the [**Workspace Creation Wizard**](../workspaces/create-new-workspace.md). For example, create a MAX32690 workspace using the **Zephyr Single Core TensorFlow AI Model** template.

If you create a workspace from a non-AI template (for example, **Zephyr Single Core Blinky**), you can still capture basic system traces. However, for more detailed profiling — including AI inference timing — add a model configuration as described in [Embedded AI Tools](./manage-ai-models.md).

## Configure and capture a profiling trace

To capture profiling traces from your Zephyr project, configure the profiling options in System Planner, build and flash your project, then use the Trace Capture panel to collect trace data.

### Step 1. Configure profiling options

1. Open **System Planner** in your Zephyr workspace.
2. Click the **Profiling** tab to see a list of cores in your workspace.
3. Turn on **Enable Zephelin Profiler** for each core you want to profile.

    ![Profiler Configuration showing core selection](images/profiling-core-selection-dark.png#only-dark)
    ![Profiler Configuration showing core selection](images/profiling-core-selection-light.png#only-light)

4. Click the expand arrow to configure profiling options for the selected core.

    ![Expanded profiling configuration form](images/profiling-config-expanded-dark.png#only-dark)
    ![Expanded profiling configuration form](images/profiling-config-expanded-light.png#only-light)

5. Configure the **Profiling Options**:
      - **Application Callgraph** – Enables instrumentation subsystem for capturing function call graphs and application-level tracing.
      - **AI Model Profiling** – Enables TensorFlow Lite Micro inference tracing for supported processors. Only available when AI models are configured. For details, see [Supported processors and model formats](../about/supported-ai-model-formats.md) and [Embedded AI Tools](./manage-ai-models.md).
      - **CPU Load** – Monitors CPU usage by sampling at regular intervals. When enabled, specify the profiling interval in milliseconds. The system reads the CPU load value at this interval and reports it to the host PC.
      - **Memory Usage** – Tracks memory consumption by sampling at regular intervals. When enabled, specify the profiling interval in milliseconds. The system reads the memory usage value at this interval and reports it to the host PC.

6. Configure the **Interface Options**:
      - **Select Trace Interface Type** – Choose the interface used to transmit trace data to the host PC. Options include **UART** and **USB**. (Note: USB support is disabled and is planned for a future release.)
      - **Trace Interface** – Select the UART port number for trace output (for example, 0 for UART0, 2 for UART2). Available options depend on your SoC configuration and which UART peripherals are allocated to this project in Peripheral Allocation. To manage Trace Interface UART settings, navigate to Peripheral Allocation.
      - **Baud Rate** – Displays the baud rate for the selected trace interface (typically 115200 for profiling). This value applies specifically to the selected Trace Interface for the profiling session.

      !!! note "Managing UART and baud rate"
          To allocate UART peripherals to your project or configure UART pin assignments, navigate to the **Peripheral Allocation** page. Once a peripheral is assigned to a core, you can click **Configure** ![Configure](./images/icon-config-dark.png#only-dark) ![Configure](./images/icon-config-light.png#only-light) to open the Peripheral Settings Sidebar. The baud rate can be configured in the **Code Generation Plugin** section. For complete details, see [Peripheral Allocation](./peripheral-allocation.md).

### Step 2. Generate, build, and flash

1. In System Planner, click **[Generate Code](generate-code.md)**.  
   - Enable **Generate AI Models** if your project includes an AI model.  
2. Run the following [CFS tasks](../build-and-flash/tasks.md):  
      - **CFS: build** – Compiles your project (for example, creates `m4/build/zephyr/zephyr.elf`).  
      - **CFS: flash** or **CFS: flash & run** – Programs your board using your configured debugger/runner (for example, OpenOCD or J-Link).  

      You can run these tasks from the Command Palette, Actions view, or using `cfsutil` from the terminal.  

### Step 3. Capture the profiler trace

1. In the **CFS Home Page**, expand the **TRACE CAPTURE** section.

2. If you see either a **Setup required** or **Source not available** message, click **Configure capture** to open the trace capture settings and select or reselect the trace source and serial port.

    ![Trace Capture setup required](./images/trace-capture-setup-required-dark.png#only-dark)
    ![Trace Capture setup required](./images/trace-capture-setup-required-light.png#only-light)

3. In the **Trace Configuration** view, configure the following settings:

    ![Trace Configuration view](./images/trace-configuration-page-dark.png#only-dark)
    ![Trace Configuration view](./images/trace-configuration-page-light.png#only-light)

    **Trace Source Options:**

      - **Trace Interface Type** – Select the interface type for trace data. The UI may list **UART** and **USB**; however, only **UART** is currently supported. **USB** trace capture is currently disabled and reserved for a future release.
      - **Serial Port** – For **UART** trace capture, select the serial port connected to your board. On Linux/WSL, this appears as `/dev/ttyUSB0` or similar. On macOS, this typically appears as `/dev/tty.usbserial*` or `/dev/cu.usbserial*`. On Windows, this appears as `COM3`, `COM4`, or another COM port. Ensure the port name matches your system exactly.
      - **Baud Rate** – Set the baud rate for the trace interface. This field defaults to 115200. Ensure this value matches the baud rate configured in your application's firmware. Click the reset indicator to restore the setting to its default value.

    **General Settings:**

      - **Output Directory** – Specifies where trace files will be saved. By default, this is derived from the first non-`.cfs` workspace folder, for example `<core>/tracefiles`. Click **Browse** to select a different location if needed.
      - **ELF File** (Optional) – The application binary file passed as metadata during trace conversion from binary format to TEF (Trace Event Format). By default, this is derived from the first non-`.cfs` workspace folder, for example `<core>/build/zephyr/zephyr.elf`. Providing the ELF file enables symbolization of trace data, allowing the trace viewer to display function names and source code locations in the profiling results. Click **Browse** to select a different file if your binary is located elsewhere. If you leave this field empty, you can still start capture and conversion, but the UI displays a warning: **ELF not set. Trace conversion may fail depending on your configuration**.
      - **Build Directory** (Optional) – The application build output directory passed as metadata during trace conversion. By default, this is derived from the first non-`.cfs` workspace folder, for example `<core>/build`. This helps locate debug symbols and source mappings when converting trace data to TEF. Click **Browse** to select a different directory if your build output is located elsewhere.

4. Return to the **TRACE CAPTURE** panel and click **Start Capture**.

    ![Trace Capture panel ready](./images/trace-capture-ready-dark.png#only-dark)
    ![Trace Capture panel ready](./images/trace-capture-ready-light.png#only-light)

    !!! tip
        The **Configure** button (highlighted in the screenshot above) lets you modify trace settings in the **Trace Configuration** view after initial setup.

    !!! note
        Close any serial monitor or terminal before starting capture — the trace capture needs exclusive access to the UART port.  
        If another process is using the same device, the capture will fail with an error message.

5. While capture is running, the **TRACE CAPTURE** panel displays an elapsed time timer. The configuration settings are disabled until you stop the capture.
6. Press **Reset** on your board to restart the application and begin trace data transmission. The `.ctf` file will appear in your output directory once the device begins transmitting trace data. For applications that run once and exit (for example, the MAX32690 Single Core TensorFlow AI Model example), you may need to press Reset multiple times to capture additional trace data.
7. Click **Stop Capture** when you have collected sufficient trace data.
8. The capture generates timestamped trace files in the configured output directory using the naming pattern `tracefile_YYYYMMDD_HHMMSS`. If you reset your board multiple times during a single capture session, a separate pair of trace files is created for each reset. Two file formats are generated:
      - **`.ctf` file** – A binary trace file in Common Trace Format, optimized for efficient transmission over UART.
      - **`.tef` file** – A JSON-based Trace Event Format file that can be visualized in the Zephelin Trace Viewer.

9. When the capture completes successfully, a notification displaying **Traces captured successfully** appears with a list of the generated trace files. If multiple files are converted, click **Choose a file to open** to select which `.tef` file to view in the Zephelin Trace Viewer.

!!! tip "CLI-based trace capture"
    For a terminal-based workflow, you can use `cfsutil tasks run` with the `--capture` and `--port` flags to automatically capture and convert trace data:
    ```bash
    cfsutil tasks run flash_run_JLink --capture --port /dev/ttyUSB0 --project m4
    ```
    The CLI automatically detects CTF tracing and generates TEF files when you stop capture with Ctrl+C. For more information on running tasks, see [CFS Tasks](../cfsutil/tasks.md).

## Visualize trace data

The [:octicons-link-external-24: Zephelin Trace Viewer](https://marketplace.visualstudio.com/items?itemName=Antmicro.zephelin-trace){:target="_blank"} extension is automatically installed as a dependency of the CodeFusion Studio extension. To verify installation, view the **Dependencies** tab in the CodeFusion Studio extension details.

You can open trace files in two ways:

- **Immediately after capture**: When the capture completes successfully, a notification displays **Traces captured successfully** with a list of the generated trace files. If multiple files are converted, click **Choose a file to open** to select which `.tef` file to view.
- **From Explorer** (to revisit previously captured traces): In the VS Code **Explorer** view, locate the `.tef` file and click it to open in the Zephelin Trace Viewer.

For a better viewing experience, right-click the trace viewer and select **Move to New Window** to get a full-screen experience.

![Zephelin Trace Viewer showing layer-level profiling results for a TensorFlow Lite Micro model](./images/zephelin_trace_viewer.png)

The trace viewer displays detailed profiling information based on the options you enabled in the Profiling Configuration:

- **CPU Load** – Shows CPU usage sampled at the configured interval
- **AI Model Profiling** – Displays inference time per layer for TensorFlow Lite Micro models
- **Memory Usage** – Shows per-thread memory consumption with multiple visualization types

!!! tip
    You can also use the [:octicons-link-external-24: web-based Zephelin Trace Viewer](https://antmicro.github.io/zephelin-trace-viewer/){:target="_blank"}, though the integrated extension provides a more seamless experience.

!!! info "Zephelin documentation"
    For advanced configuration options—such as memory profiling and tracing scopes—see the official [:octicons-link-external-24: Zephelin documentation](https://antmicro.github.io/zephelin/){:target="_blank"}. These options can also be enabled in CodeFusion Studio through project configuration files.

## Troubleshooting

### Capture interrupted

If the serial connection is lost during trace capture, the Trace Capture panel displays **Capture interrupted** with two options:

![Capture interrupted error](./images/capture-interrupted-dark.png#only-dark)
![Capture interrupted error](./images/capture-interrupted-light.png#only-light)

- **Reconnect and retry** – Attempts to reconnect to the same serial port and resume capture with your existing settings.
- **Select source** – Opens the Trace Configuration view so you can reconfigure the serial port, baud rate, or output directory.

Common causes of interrupted captures:

- Another application claimed exclusive access to the serial port
- The USB cable was disconnected or the board lost power
- The serial port device name changed (common on Windows after reconnecting USB devices)

If reconnection fails repeatedly, verify that the correct serial port is selected and that no other application (such as a serial monitor or terminal) is using the port.

### Build fails with memory overflow after enabling profiling

Enabling Zephelin profiling options increases memory usage and may cause the build to fail with linker errors.

**Error signature:**

```text
section 'XXXXX' will not fit in region 'XXXXX'
region 'XXXXX' overflowed by XXX bytes
ld returned 1 exit status
```

If you encounter this error, the device may not have sufficient memory to support profiling in the current application. You can try disabling some profiling options to reduce memory usage, but this may not resolve the issue.
