---
description: Enable Zephelin profiling for Zephyr projects
author: Analog Devices
date: 2025-10-30
---

# Profiling

Use the Profiling feature in CodeFusion Studio to either capture profiler traces from your Zephyr project or prepare CTF traces for visualization. The profiler also supports inference-level profiling for TFLM models, allowing detailed analysis of AI workloads.

!!! note "Beta feature"
    The Profiling tool is currently in **beta**. Some options or trace formats may change in future releases.

## About Zephelin

Zephelin is a middleware layer developed by Antmicro for Analog Devices. It extends Zephyr RTOS with advanced tracing, profiling, and runtime metric capture. Zephelin records system-level events such as task switches, interrupts, and timing information, and can also capture AI operator-level performance data when using TFLM.

## Before you start

Before you begin, ensure you have created a Zephyr workspace using the [**Workspace Creation Wizard**](../../workspaces/create-new-workspace.md). For example, create a MAX32690 workspace using the **Zephyr Single Core TensorFlow AI Model** template.

If you create a workspace from a non-AI template (for example, **Zephyr Single Core Blinky**), you can still capture basic system traces. However, for more detailed profiling — including AI inference timing — add a model configuration as described in [Embedded AI Tools](./manage-ai-models.md).

## Configure and capture a profiling trace

All build, flash, and profiling operations in CodeFusion Studio are performed using **CFS tasks**. You can run these tasks from the **Actions** view, **Command Palette**, or other locations described in  [Build, clean, flash, and debug tasks](../../workspaces/tasks.md).

### Step 1. Configure profiling options

![Profiling tab in System Planner](images/profiling-tab-dark.png#only-dark)
![Profiling tab in System Planner](images/profiling-tab-light.png#only-light)

1. Open **System Planner** in your Zephyr workspace.
2. Click the **Profiling** tab.  
3. Configure the following options:
      - **Enable Zephelin Profiler** – Records Zephyr runtime activity such as task scheduling and interrupts.  
      - **Trace Interface** – Select the UART interface used to stream trace data (options depend on your SoC).  
      - **Enable AI Model Profiling** – Enables TensorFlow Lite Micro inference tracing for supported processors. For details, see [Supported processors and model formats](../../ai-tools/supported-ai-model-formats.md).

### Step 2. Generate, build, and flash

1. In System Planner, click **Generate Code**.  
   - Enable **Generate AI Models** if your project includes an AI model.  
2. Run the following **CFS tasks**:  
      - **CFS: build** – Compiles your project (for example, creates `m4/build/zephyr.elf`).  
      - **CFS: flash** or **CFS: flash and run** – Programs your board using JTAG or OpenOCD.  

### Step 3. Capture the profiler trace

1. Run the **Capture Profiler Trace** task.

    ![Zephelin Capture Profiler Trace task](./images/capture_profiler_trace_dark.png#only-dark)![Zephelin Capture Profiler Trace task](./images/capture_profiler_trace_light.png#only-light)

    !!! note
        Close any serial monitor or terminal before running **Capture profiler trace** — the task needs exclusive access to the UART port.  
        If another process is using the same device, the capture will fail with the error:  
        `serial.serialutil.SerialException: device reports readiness to read but returned no data`
2. When prompted:  
      - Enter your **serial port** (for example, `/dev/ttyUSB0` or `COM3`).  

        !!! note
            Ensure the serial port name is entered exactly as it appears in your system, without any trailing spaces or extra text. For example: `/dev/tty.usbserial-0001`

      - Select a **baud rate** (`115200`).  
      - Specify an **output file name**, for example `zephelin_trace`.  
      - When asked **Send enable command to device before collecting data?**, select **No** (recommended).  
        - Choose **No** if your application enables tracing automatically at startup (default).  
        - Choose **Yes** only if your project supports host-controlled tracing (`CONFIG_TRACING_HANDLE_HOST_CMD=y`).

3. Monitor the **Terminal** output — live trace data will appear.  
4. If your application finishes execution quickly (for example, the MAX32690 Single Core TensorFlow AI Model example), press **Reset** on your board.
5. Press **Ctrl + C** to stop capture.  
6. The generated trace file appears in your project folder in the **Explorer** view.

!!! example "Sample Zephelin AI profiling output"
    ```text
    ***Booting Zephyr OS build 7ec15cb5b25a***
    sys_trace_k_thread_info: 0x20002428
    zpl_inference_enter:
    zpl_tflm_enter_event: subgraph_idx=0 op_idx=0 tag=FULLY_CONNECTED arena_used_bytes=840 arena_tail_usage=88
    zpl_tflm_exit_event: subgraph_idx=0 op_idx=0 tag=FULLY_CONNECTED arena_used_bytes=840 arena_tail_usage=88
    zpl_inference_exit:
    ...
    ```

!!! note
    The output format may vary depending on the selected trace mode and platform configuration.

## Switch to CTF mode

By default, the profiler uses **Text** output. To capture traces in CTF for later visualization:

1. Add the following line to your `prj.conf` or `boards/<board>.conf` file:

      ```text
      CONFIG_ZPL_TRACE_FORMAT_CTF=y
      ```

2. Re-run the **CFS: build** and **CFS: flash** tasks to to rebuild and re-program your project.
3. Follow the steps in [Step 3. Capture the profiler trace](#step-3-capture-the-profiler-trace) to run the **Capture Profiler Trace** task again and record a new trace in CTF mode.
4. When a trace is captured in **CTF** format, Zephelin automatically creates two output files in your project’s directory:

      - `<output_name>_0` – the binary trace file containing the captured CTF data. This file is used later for TEF conversion.  
      - `<output_name>` – a readable text log showing application output, such as test results or boot messages.

      For example, if you entered `zephelin_trace` as your output file name, Zephelin will create the following files:

      - `zephelin_trace_0` – binary trace data (for TEF conversion)  
      - `zephelin_trace` – readable application log

      This behavior is implemented by **Zephelin**, including the automatic `_0` suffix for the binary trace file. Always select the file with `_0` appended when converting to **TEF** format.

!!! example "Sample log output"
    ```text
    Test 0 passed: pred=0.026405 calc=0.000000
    Test 1 passed: pred=0.863044 calc=0.841471
    Done – Success
    ***Booting Zephyr OS build 7ec15cb5b25a***
    ```

## Prepare CTF trace for visualization

1. Run the **Prepare CTF Trace for Visualization** task.  
2. Choose the generated CTF file (for example, `zephelin_trace_0`).  
3. Specify an output file path for the `.tef` file.  
4. Open the [:octicons-link-external-24: Zephelin Trace Viewer](https://antmicro.github.io/zephelin-trace-viewer/){:target="_blank"}.  
5. Upload your `.tef` file to visualize the captured trace data.

![Zephelin Trace Viewer showing layer-level profiling results for a TensorFlow Lite Micro model](./images/zephelin_trace_viewer.png)

!!! info "Zephelin documentation and version information"
    You can access the official Zephelin documentation at [:octicons-link-external-24: antmicro.github.io/zephelin](https://antmicro.github.io/zephelin/){:target="_blank"}. The site reflects the **latest Zephelin release**, which may differ slightly from the version integrated in CodeFusion Studio. CodeFusion Studio 2.0.0 uses the version from [:octicons-link-external-24: September 25, 2025](https://github.com/antmicro/zephelin/tree/164426c2a81c7ea84eb3db41a02f7a67127eaa5c){:target="_blank"}, and the corresponding documentation can be found in [:octicons-link-external-24: zephelin/docs](https://github.com/antmicro/zephelin/tree/164426c2a81c7ea84eb3db41a02f7a67127eaa5c/docs){:target="_blank"}. The documentation describes advanced configuration options—such as memory profiling and tracing scopes—that may also be enabled in CodeFusion Studio through project configuration.
