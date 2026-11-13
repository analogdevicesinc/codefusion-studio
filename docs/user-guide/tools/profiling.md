---
description: Enable Zephelin profiling for Zephyr projects
author: Analog Devices
date: 2026-11-05
---

# Profiling

Use the Profiling feature in CodeFusion Studio to capture and visualize profiler traces from your Zephyr project. The profiler provides detailed, operator-level profiling for AI models, enabling deep analysis of inference performance alongside system-level metrics.

!!! note "Beta feature"
    The Profiling tool is currently in **beta**. Some options or trace formats may change in future releases.

## About Zephelin

[:octicons-link-external-24: Antmicro](https://github.com/antmicro/zephelin) developed Zephelin as a middleware layer for Analog Devices. It extends Zephyr RTOS with advanced tracing and profiling capabilities, specializing in detailed AI operator-level performance analysis. Zephelin also captures system-level events such as task switches, interrupts, and timing information, providing a complete view of both AI inference and runtime behavior.

## Before you start

Before you begin, create a Zephyr workspace using the [**Workspace Creation Wizard**](../workspaces/create-new-workspace.md). What you can profile depends on your processor and template:

- **Basic system profiling** (CPU load, memory usage, and application call graph) is available for **any** Zephyr project — including non-AI templates such as **Zephyr Single Core Blinky**. Enable the Zephelin Profiler in System Planner. For processor-specific limitations, see the [release notes](../../release-notes/2.4.0.md#known-issues-and-limitations). To add AI model profiling to an existing non-AI project, add a model configuration as described in [Manage AI Models](./manage-ai-models.md).
- **AI inference profiling** (per-operator TensorFlow Lite Micro timing) requires an AI-capable processor and a configured model. The **Zephyr Single Core TensorFlow AI Inference Profiling** template is the recommended starting point. It runs the same inference as the **Zephyr Single Core TensorFlow AI Model** template, with the Zephelin Profiler already configured. Supported processors include **MAX32690** and **MAX78002**. This template runs its inferences once at startup. Use **UART** to capture inference traces; UART is selected by default.
- **USB trace capture** is supported on **MAX32690** on macOS and Linux hosts. Other supported processors capture traces over UART.

    !!! note
        On **MAX78002**, **MAX32650**, and **MAX32666**, USB trace capture is not available in this release because the High-Speed USB peripheral is not yet supported in the Zephyr devicetree, and selecting **USB** generates code that fails to build. Use UART to capture profiling traces on these processors. See the [release notes](../../release-notes/2.3.0.md#known-issues-and-limitations).

## Configure and capture a profiling trace

To capture profiling traces from your Zephyr project, set up the trace peripheral and configure the profiling options in System Planner, build and flash your project, then use the Trace Capture panel to collect trace data.

### Step 1. Set up the trace peripheral

Open **System Planner** in your Zephyr workspace. The trace peripheral is configured in the **Peripheral Allocation** and **Clock Configuration** tools, both within System Planner. Set up the peripheral for the interface you plan to use before you configure the profiler in [Step 2](#step-2-configure-profiling-options), so it is available when you select the trace interface.

#### For UART

1. Open **Peripheral Allocation**. If a UART peripheral is not already allocated to the application core, allocate one and configure its pin assignments as needed.
2. With the peripheral selected, select **Configure** ![Configure](./images/icon-config-dark.png#only-dark) ![Configure](./images/icon-config-light.png#only-light) to open the Peripheral Settings Sidebar.
3. In the **Code Generation Plugin** section, set (or confirm) the **baud rate**. This is the single source of truth for the UART baud rate: it is compiled into your firmware during code generation, and it is the value shown (read-only) in the **Baud Rate** field on the Profiling screen.
4. When you later capture a trace (see [Step 4](#step-4-capture-the-profiler-trace)), set the **same** baud rate in the **Trace Capture** panel. The host and the device must agree. If they do not match, the capture typically fails with a **Capture interrupted** error (see [Capture interrupted](#capture-interrupted)), or produces unreadable trace data.

    For complete details on allocating and configuring peripherals, see [Peripheral Allocation](./peripheral-allocation.md).

#### For USB

USB trace capture is supported on **MAX32690** in this release. These steps apply to MAX32690.

1. Open **Peripheral Allocation**. If the USB peripheral is not already assigned to the application core, assign it. It typically appears as **USBHS** in the peripheral list.
2. Open **Clock Configuration**, expand the **Peripheral** section, and select and enable the USB peripheral. It typically appears as **High-Speed USB**.
3. Complete any additional clock settings the tool exposes. On MAX32690, this includes a selectable **Clock Source for USB PHY**. CodeFusion Studio provides a valid default; if you change the system clock configuration, follow any signposts or validation messages shown in Clock Configuration to keep the USB clock within the range the peripheral requires.
4. Connect an **additional USB cable** from your host PC to the USB device-controller connector on the board. USB trace data streams from the USB device controller on the processor, which is a **dedicated connector**, separate from the connectors used for power, debug, and serial output in your normal board setup. If this cable is not connected, the trace device does not enumerate and does not appear in the Trace Capture device list.

    Connector labels differ by board — check the documentation for your board. For example, on the **MAX32690 EVKIT**, power and serial output come in over **CN2** and debug over **J3**, while USB trace data is carried on **CN1**.

    Keep your normal board connections in place and add the USB trace cable in addition to them. For general guidance on connecting your board, see [Connect hardware](../debugging/connect-hardware.md).

### Step 2. Configure profiling options

1. In **System Planner**, click the **Profiling** tab to see a list of cores in your workspace.
2. Turn on **Enable Zephelin Profiler** for each core you want to profile.

    ![Profiler Configuration showing core selection](images/profiling-core-selection-dark.png#only-dark)
    ![Profiler Configuration showing core selection](images/profiling-core-selection-light.png#only-light)

3. Click the expand arrow to configure profiling options for the selected core.

    ![Expanded profiling configuration form](images/profiling-config-expanded-dark.png#only-dark)
    ![Expanded profiling configuration form](images/profiling-config-expanded-light.png#only-light)

4. Configure the **Profiling Options**:
      - **Application Callgraph** – Enables instrumentation subsystem for capturing function call graphs and application-level tracing. Instrumentation starts when the trigger function enters and stops when the stopper function exits. By default, CodeFusion Studio uses the `main` function, capturing execution from when `main()` starts until it returns (if it returns). To customize the instrumentation scope, enter the corresponding symbol names in the **Trigger Function** and **Stopper Function** fields shown when this option is selected — see [Advanced: Customize instrumentation trigger and stopper functions](#advanced-customize-instrumentation-trigger-and-stopper-functions).
      - **AI Model Profiling** – Enables TensorFlow Lite for Microcontrollers (TFLM) inference tracing for supported processors. Only available when AI models are configured. For details, see [Supported processors and model formats](../about/supported-ai-model-formats.md) and [Manage AI Models](./manage-ai-models.md). By default, the profiler records up to 256 operator events per inference — a fixed value that isn't calculated from your model. Depending on your model, this can leave the trace incomplete or reserve memory for events your model never emits. See [Advanced: Adjust the TFLM profiler event limit](#advanced-adjust-the-tflm-profiler-event-limit) before capturing a trace.
      - **CPU Load** – Monitors CPU usage by sampling at regular intervals. When enabled, specify the profiling interval in milliseconds. The system reads the CPU load value at this interval and reports it to the host PC.
      - **Memory Usage** – Tracks memory consumption by sampling at regular intervals. When enabled, specify the profiling interval in milliseconds. The system reads the memory usage value at this interval and reports it to the host PC.

5. Configure the **Interface Options**:
      - **Select Trace Interface Type** – Select the interface used to transmit trace data to the host PC. Options include **UART** and **USB**.

      **If you select UART:**

      - **Trace Interface** – Select the UART peripheral used for trace output (for example, **UART0**, **UART2**, or **LPTUART0**). The available options depend on your SoC and which UART peripherals are allocated to this project in Peripheral Allocation.
      - **Baud Rate** – Displays the baud rate of the selected UART peripheral (typically 115200 for profiling). This field is read-only and reflects the value set in Peripheral Allocation.

      The UART peripheral you select here is the one you allocated in [Step 1](#for-uart), and its baud rate is set there too.

      **If you select USB:**

      - USB requires no additional fields on this screen. You assigned the USB peripheral and configured its clock in [Step 1](#for-usb).

### Step 3. Generate, build, and flash

1. In System Planner, click **[Generate Code](generate-code.md)**.
   - Enable **Generate AI Models** if your project includes an AI model.
2. Run the following [CFS tasks](../build-and-flash/tasks.md):
      - **CFS: build** – Compiles your project (for example, creates `m4/build/zephyr/zephyr.elf`).
      - **CFS: flash** or **CFS: flash & run** – Programs your board using your configured debugger/runner (for example, OpenOCD or J-Link).

      You can run these tasks from the Command Palette, Actions view, or using `cfsutil` from the terminal.

### Step 4. Capture the profiler trace

1. Go to the **Trace Capture** section in the CFS sidebar.

2. If you see either a **Setup required** or **Source not available** message, select **Configure capture** to open the trace capture settings and select or reselect your trace source — the serial port for UART, or the USB device for USB.

    ![Trace Capture setup required](./images/trace-capture-setup-required-dark.png#only-dark)
    ![Trace Capture setup required](./images/trace-capture-setup-required-light.png#only-light)

3. In the **Trace Configuration** view, configure the following settings:

    ![Trace Configuration view](./images/trace-configuration-page-dark.png#only-dark)
    ![Trace Configuration view](./images/trace-configuration-page-light.png#only-light)

    **Trace Source Options:**

      - **Trace Interface Type** – Select the interface used to transmit trace data.

      **If you select UART:**

      - **Serial Port** – Select the serial port connected to your board. On Linux/WSL, this appears as `/dev/ttyUSB0` or similar. On macOS, this typically appears as `/dev/tty.usbserial*` or `/dev/cu.usbserial*`. On Windows, this appears as `COM3`, `COM4`, or another COM port. Ensure the port name matches your system exactly.
      - **Baud Rate** – Set the baud rate for the trace interface. This field defaults to 115200. Ensure this value matches the baud rate configured in your application's firmware. Click the reset indicator to restore the setting to its default value.

      **If you select USB:**

      - **USB Device** – Select the connected USB device from the list. The profiler firmware advertises itself as **Zephelin**, so the entry usually appears as **Zephelin - Bus *xxx*, Device *xxx***. If the host can't read the product name, the entry falls back to **Bus *xxx*, Device *xxx*** with no name. The bus and device numbers are assigned by the host and can change when you reconnect or reflash the board, so use them only to tell devices apart, not as a fixed identifier. If no devices appear, build and flash firmware with USB tracing enabled, and confirm that the firmware is running. The **USB Device** list only shows connected Zephelin devices running on the USB bus. Reopen the list to refresh it.

    **General Settings:**

      - **Output Directory** – Specifies where trace files will be saved. By default, this is derived from the first non-`.cfs` workspace folder, for example `<core>/tracefiles`. Click **Browse** to select a different location if needed.
      - **ELF File** (Optional) – The application binary file passed as metadata during trace conversion from binary format to TEF (Trace Event Format). By default, this is derived from the first non-`.cfs` workspace folder, for example `<core>/build/zephyr/zephyr.elf`. Providing the ELF file enables symbolization of trace data, allowing the trace viewer to display function names and source code locations in the profiling results. Click **Browse** to select a different file if your binary is located elsewhere. If you leave this field empty, you can still start capture and conversion, but the UI displays a warning: **ELF not set. Trace conversion may fail depending on your configuration**.
      - **Build Directory** (Optional) – The application build output directory passed as metadata during trace conversion. By default, this is derived from the first non-`.cfs` workspace folder, for example `<core>/build`. This helps locate debug symbols and source mappings when converting trace data to TEF. Click **Browse** to select a different directory if your build output is located elsewhere.

    **Live Tracing:**

      - **Enable Zephelin Live Tracing** – Streams trace data to the Zephelin Trace Viewer during capture rather than saving it to trace files for later viewing. When enabled, the remaining fields in this section become available. For the full workflow, see [Stream traces live](#stream-traces-live).
      - **TCP Server Host** – Address of the TCP server that receives the trace stream from CodeFusion Studio. Defaults to `127.0.0.1`.
      - **TCP Server Port** – Port of that TCP server. Defaults to `5000`. Accepts values from 1 to 65535. Values outside this range are adjusted to the nearest valid port.

      - **Backend Host** – Address of the Zephelin backend that serves the live viewer. Defaults to `127.0.0.1`.
      - **Backend Port** – Port of the Zephelin backend. Defaults to `8000`. Accepts values from 1 to 65535. Values outside this range are adjusted to the nearest valid port.

    !!! warning "Live tracing replaces file-based capture"
        When **Enable Zephelin Live Tracing** is enabled, trace data is streamed to the viewer and no `.ctf` or `.tef` files are written. To capture trace files instead, disable live tracing.

4. Return to the **TRACE CAPTURE** panel and click **Start Capture**.

    ![Trace Capture panel ready](./images/trace-capture-ready-dark.png#only-dark)
    ![Trace Capture panel ready](./images/trace-capture-ready-light.png#only-light)

    !!! tip
        The **Configure** button (highlighted in the screenshot above) lets you modify trace settings in the **Trace Configuration** view after initial setup.

    !!! note
        Trace capture needs exclusive access to the trace device. For **UART**, close any serial monitor or terminal using the port before starting capture. For **USB**, make sure no other application has claimed the device.
        If another process is using the same device, the capture will fail with an error message.

5. While capture is running, the **TRACE CAPTURE** panel displays an elapsed time timer. The configuration settings are disabled until you stop the capture.
6. Begin trace data transmission. The method depends on your trace interface.

    **For UART**, restart your application while capture is running. The two most practical approaches are:

    - **Reset button** – If your board has a reset button, press it while capture is running.
    - **CFS: flash & run** – Run the **CFS: flash & run** task and wait for flashing to complete. Depending on your runner, the target may reset more than once during the operation, which can result in multiple trace files being generated during a single capture session.

    For applications that run once and exit (for example, the **Zephyr Single Core TensorFlow AI Inference Profiling** template), you may need to restart multiple times to capture additional trace data.

    **For USB**, trace capture is handled differently. The trace cannot start while the device is flashing or held in reset, and the device disappears from the **USB Device** list at those moments. Do not reset or reflash the board to trigger transmission. Instead, flash and start your application first, confirm it is running, then start capture. You can start capture at any point while the device is connected and running.

    !!! note
        USB captures only traced activity that occurs after capture starts. It therefore cannot capture inference traces from applications that run their inferences once at startup, such as the **Zephyr Single Core TensorFlow AI Inference Profiling** template. The inferences finish before capture can attach, and resetting the board to re-run them disconnects the USB device. Periodic metrics such as **CPU Load** and **Memory Usage** remain available. Use UART to capture traces from applications that run their inferences at startup.

7. Click **Stop Capture** when you have collected sufficient trace data.
8. When the capture completes successfully, a notification displaying **Traces captured successfully** appears with links to the generated trace files. Click a file link to open it directly, or click **Choose a file to open** to select from the full list.

    If you used **CFS: flash & run**, open the `.tef` file with the latest timestamp. If multiple `.tef` files share the latest timestamp, choose the `.tef` file created most recently (typically the one with the highest numeric suffix), for example `tracefile_20260622_161602_1.tef`.

!!! note
    Trace files are saved in your output directory using the naming pattern `tracefile_YYYYMMDD_HHMMSS[_N]`, where a numeric suffix is added if multiple traces share the same timestamp. Two formats are generated:

    - **`.ctf`** – Binary trace data.
    - **`.tef`** – JSON trace data for the Zephelin Trace Viewer.

    Each application restart produces a separate pair of trace files.

!!! tip "CLI-based trace capture"
    For a terminal-based workflow, you can use `cfsutil tasks run` with the `--capture` and `--port` flags to automatically capture and convert trace data:
    ```bash
    cfsutil tasks run flash_run_JLink --capture --port /dev/ttyUSB0 --project m4
    ```
    The CLI automatically detects CTF tracing and generates TEF files when you stop capture with Ctrl+C. For more information on running tasks, see [CFS Tasks](../cfsutil/tasks.md).

    The `--capture` and `--port` flags support UART serial ports only. To capture over USB, use the **Trace Capture** panel in VS Code.

## Visualize trace data

The [:octicons-link-external-24: Zephelin Trace Viewer](https://marketplace.visualstudio.com/items?itemName=Antmicro.zephelin-trace){:target="_blank"} extension is automatically installed as a dependency of the CodeFusion Studio extension. To verify installation, view the **Dependencies** tab in the CodeFusion Studio extension details.

You can open trace files in two ways:

- **Immediately after capture**: When the capture completes successfully, a notification displays **Traces captured successfully** with links to the generated trace files. Click a file link to open it directly, or click **Choose a file to open** to select from the full list.
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

## Stream traces live

Live tracing forwards trace data to the Zephelin Trace Viewer while the capture is running. This allows you to monitor CPU load, memory usage, and AI inference timing as your application executes without opening a trace file afterwards.

### Requirements

Live tracing requires the following two components:

- **The [:octicons-link-external-24: Zephelin Trace Viewer](https://marketplace.visualstudio.com/items?itemName=Antmicro.zephelin-trace){:target="_blank"} extension** is installed as a dependency of the CodeFusion Studio extension. It provides the viewer and launches the backend, but it does **not** include the backend. If the extension is disabled, live capture fails with `The Zephelin Trace extension is not installed or enabled.`
- **The Zephelin backend**, which the extension runs from a copy of the [:octicons-link-external-24: Zephelin repository](https://github.com/antmicro/zephelin){:target="_blank"} using a Python interpreter. CFS finds the repository in your Zephyr package and offers to create the interpreter in your workspace, which needs network access. If your Zephyr package doesn't include the Zephelin repository, or you want to use your own clone, see [Advanced: Set up the Zephelin backend manually](#advanced-set-up-the-zephelin-backend-manually).

!!! warning
    The `zephyr/4.4.2` package contains Zephelin revision `77ade5b`, whose backend can't find the Zephyr repository, so live tracing fails to start with an error that begins with `Failed to start Zephelin backend`. Set up the backend from your own clone before you start a live tracing session, as described in [Advanced: Set up the Zephelin backend manually](#advanced-set-up-the-zephelin-backend-manually).

The remaining steps are the same as for file-based capture: configure the Zephelin profiler in System Planner, then generate, build, and flash your project as described in [Step 2](#step-2-configure-profiling-options) and [Step 3](#step-3-generate-build-and-flash).

### Start a live tracing session

1. Go to the **Trace Capture** section in the CodeFusion Studio sidebar and select **Configure** to open the **Trace Configuration** view.
2. Set the **Trace Source Options** for your board exactly as you would for a file-based capture. Live tracing supports UART and USB capture.
3. Under **Live Tracing**, turn on **Enable Zephelin Live Tracing**.
4. Leave **TCP Server Host**, **TCP Server Port**, **Backend Host**, and **Backend Port** at their defaults unless those ports are already in use on your machine, or the backend runs somewhere other than the local host.
5. Return to the **TRACE CAPTURE** panel and select **Start Capture**.
6. If CodeFusion Studio prompts you to create the Python environment for the Zephelin backend, select **Create the Python environment** and wait for the installation to finish. This prompt can appear the first time you start a capture. The Zephelin Trace Viewer then opens automatically and starts displaying data as it arrives.
7. For UART, restart your application so it begins transmitting trace data. Press the board's reset button, or run the **CFS: flash & run** task, as described in [Step 4](#step-4-capture-the-profiler-trace). For **USB**, skip this step: resetting disconnects the device, and CodeFusion Studio starts the stream when the capture begins, so it attaches to an already-running application.
8. Select **Stop Capture** to end the session. The viewer stops receiving data. Live sessions don't create trace files, so there's no conversion step and no **Traces captured successfully** notification.

### How the connection is established

When you start a live capture, CodeFusion Studio:

1. Activates the Zephelin Trace Viewer extension and opens the live viewer. It passes the configured backend endpoint and the AI model paths from your trace configuration.
2. Passes the backend and interpreter paths derived from your Zephyr package, unless you set `zephelin.backendPath` or `zephelin.pythonPath` yourself, as described in [Advanced: Set up the Zephelin backend manually](#advanced-set-up-the-zephelin-backend-manually). The extension starts the backend from those paths.
3. Connects to the TCP server at **TCP Server Host** and **TCP Server Port**.
4. Forwards trace data from the trace interface to the TCP server throughout the capture. The backend passes the data to the viewer, which displays it as it arrives.

### Advanced: Set up the Zephelin backend manually

CodeFusion Studio looks for the Zephelin repository in the `modules/zephelin` directory of your [Zephyr package](../installation/package-manager/available-packages.md#zephyr-projects), and for the interpreter at `.venv-zephelin/bin/python` in the root of your open workspace, or `.venv-zephelin\Scripts\python.exe` on Windows. The repository must contain the backend (`server/run_backend.py`). A package that includes only the Zephelin library doesn't work. If CodeFusion Studio can't find the backend, or you want to use your own clone, follow these steps to set it up manually:

1. Clone the Zephelin repository and check out revision `2ffa839`. Earlier revisions of the backend can't find the Zephyr repository, so live tracing fails to start.

    ```bash
    git clone https://github.com/antmicro/zephelin
    git -C zephelin checkout 2ffa839f47bafb697ed1a9a0e623cdc6472d58ce
    ```

2. Create a virtual environment and install both requirements files from the clone:

    ```bash
    cd zephelin
    python3 -m venv .venv
    source .venv/bin/activate
    python3 -m pip install -r requirements.txt -r server/requirements.txt
    ```

    On Windows, activate the environment with `.venv\Scripts\activate` instead.

3. Point the Zephelin Trace Viewer extension at the repository clone and the interpreter, either in VS Code **Settings** or directly in `settings.json`:

    | Setting | Value |
    | --- | --- |
    | `zephelin.backendPath` | Absolute path to the Zephelin repository clone. |
    | `zephelin.pythonPath` | Absolute path to the Python executable in the virtual environment where the requirements are installed, for example `<clone>/.venv/bin/python`, or `<clone>\.venv\Scripts\python.exe` on Windows. |

    Both settings take precedence over the paths CodeFusion Studio derives from the Zephyr package.

4. Run **Developer: Reload Window** from the Command Palette.
5. Follow [Start a live tracing session](#start-a-live-tracing-session) to configure and start live capture.

For the backend's own command line options and the standalone workflow outside VS Code, see the [:octicons-link-external-24: Zephelin live tracing documentation](https://antmicro.github.io/zephelin/live_tracing.html){:target="_blank"}.

#### Zephelin settings managed by CodeFusion Studio

CodeFusion Studio sets the following settings from the **Trace Configuration** view each time you save it, so you don't need to edit them.

| Setting | Set from |
| --- | --- |
| `zephelin.tcpServerHost` | **TCP Server Host** |
| `zephelin.tcpServerPort` | **TCP Server Port** |
| `zephelin.backendHost` | **Backend Host** |
| `zephelin.backendPort` | **Backend Port** |
| `zephelin.buildDir` | **Build Directory** |
| `zephelin.tflmModelPaths` | **AI Models** |

## Troubleshooting

### Capture interrupted

If the connection to the trace device is lost during capture — for example, the serial connection drops or the USB device is disconnected — the Trace Capture panel displays **Capture interrupted** with two options:

![Capture interrupted error](./images/capture-interrupted-dark.png#only-dark)
![Capture interrupted error](./images/capture-interrupted-light.png#only-light)

- **Reconnect and retry** – Reconnects to the selected trace device and starts a new capture with your existing settings. This begins a new trace file rather than continuing the interrupted one. For USB, this works only if the device still has the same bus number and address. If it re-enumerates with a new address after disconnecting, use **Select source** to reselect it.
- **Select source** – Opens the Trace Configuration view so you can reselect the serial port or USB device, adjust the baud rate (UART only), or change the output directory.

Common causes of interrupted captures:

- Another application claimed exclusive access to the serial port
- The USB cable was disconnected or the board lost power
- The serial port device name changed (common on Windows after reconnecting USB devices)
- A mismatch between the baud rate in the Trace Capture panel and the baud rate compiled into the firmware (UART only), which can interrupt capture or produce unreadable trace data

If reconnection fails repeatedly, verify the correct trace source is selected (serial port for UART, USB device for USB) and that no other application (such as a serial monitor or terminal) is using it.

### Live tracing fails to start

The Trace Capture panel reports an error beginning with **Failed to start recording**, followed by the underlying cause. Common causes:

- `The Zephelin Trace extension is not installed or enabled` – Install or re-enable the [:octicons-link-external-24: Zephelin Trace Viewer](https://marketplace.visualstudio.com/items?itemName=Antmicro.zephelin-trace){:target="_blank"} extension, then run **Developer: Reload Window** from the Command Palette.
- **The Zephyr package doesn't contain Zephelin** – CodeFusion Studio looks for the backend in your Zephyr package and can't find it. Find where the package is installed with `cfsutil pkg path zephyr`, as described in [Verify installation](../installation/package-manager/manage-packages-cfsutil.md#verify-installation), and confirm that `modules/zephelin/server/run_backend.py` exists there. If it doesn't, set up the backend as described in [Advanced: Set up the Zephelin backend manually](#advanced-set-up-the-zephelin-backend-manually).
- **The Python environment is missing** – CodeFusion Studio found the backend but there's no interpreter at `.venv-zephelin/bin/python` (or `.venv-zephelin\Scripts\python.exe` on Windows) in the root of your workspace, because you declined or cancelled the prompt to create one. Start the capture again and select **Create the Python environment**.
- **The manual backend settings are incorrect** – If you set `zephelin.backendPath` or `zephelin.pythonPath` yourself, those values take precedence over the paths CodeFusion Studio derives from the Zephyr package, so a wrong value breaks live tracing even when the package is fine. In VS Code **Settings** or `settings.json`, confirm that `zephelin.backendPath` is the absolute path to a Zephelin repository that contains `server/run_backend.py`, and that `zephelin.pythonPath` is the absolute path to the Python executable of a virtual environment where the requirements are installed. To use the Zephyr package again, clear both settings.
- **The TCP connection could not be established** – CodeFusion Studio retries for about 20 seconds, then gives up if nothing is listening at **TCP Server Host** and **TCP Server Port**. Confirm that the Zephelin backend started and that it listens on that host and port. If another application uses the port, select a different **TCP Server Port** in the **Trace Configuration** view.
- **The serial port is unavailable** – As with file-based capture, close any serial monitor or terminal holding the trace UART before starting capture.

If a session starts and then drops, the panel shows **Recording error** with the reason, and the session is torn down so the serial port and TCP connection are released. Resolve the cause and start a new capture.

### No data appears in the live viewer

If the viewer opens but stays empty, the application is most likely not transmitting yet. For UART, restart the application after starting the capture: press the board's reset button or run **CFS: flash & run**. Live tracing doesn't reset the target for you. For USB, don't reset the board. Stop the capture and start it again.

If data still doesn't appear, confirm that the profiling options are enabled for the core you are capturing from (see [Step 2](#step-2-configure-profiling-options)). For UART, also confirm that **Serial Port** and **Baud Rate** match the trace interface configured in your firmware.

### Trace file fails to open

If selecting a `.tef` file produces an unexpected error — for example, a dialog similar to:

```text
Unable to open 'tracefile_YYYYMMDD_HHMMSS.tef'. Assertion Failed: Argument is undefined or null.
```

a compatibility issue with the installed version of the Zephelin Trace extension may be the cause.

To recover:

- **If automatic extension updates are enabled (default):**
    1. Reload the VS Code window to apply any pending extension updates — open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Developer: Reload Window**.
    2. If the error persists, [disable automatic extension updates](../installation/manage-extension-versions.md#disable-automatic-extension-updates) for the Zephelin Trace Viewer extension, then [try installing a different version](../installation/manage-extension-versions.md#install-a-specific-version).
- **If automatic extension updates are disabled:** Try updating the Zephelin Trace Viewer extension first — the issue may already be fixed in a newer release. If that doesn't resolve it, [try installing a different version](../installation/manage-extension-versions.md#install-a-specific-version).

### Build fails with memory overflow after enabling profiling

Enabling Zephelin profiling options increases memory usage and may cause the build to fail with linker errors.

**Error signature:**

```text
section 'XXXXX' will not fit in region 'XXXXX'
region 'XXXXX' overflowed by XXX bytes
ld returned 1 exit status
```

If you encounter this error, the device may not have sufficient memory to support profiling in the current application. You can try disabling some profiling options to reduce memory usage, but this may not resolve the issue.

### USB capture shows metrics but no inference traces

If USB capture shows periodic metrics such as **CPU Load** and **Memory Usage**, but no inference traces, the application likely completed its inferences before capture attached. This occurs with applications that run their traced activity once at startup, including the **Zephyr Single Core TensorFlow AI Inference Profiling** template.

Capture over UART instead. Start capture, then press the reset button or run **CFS: flash & run** to re-run the inferences. The profiling template selects UART by default. For instructions, see [Capture the profiler trace](#step-4-capture-the-profiler-trace).

## Advanced: Customize instrumentation trigger and stopper functions

When you enable the **Application Callgraph** profiling option, the instrumentation subsystem captures function call graphs and application-level tracing. Instrumentation starts when the trigger function enters and stops when the stopper function exits. By default, CodeFusion Studio uses the `main` function as both trigger and stopper, capturing the entire execution from when `main()` starts until it returns.

To scope instrumentation to a different function, enter its symbol name in the **Trigger Function** and **Stopper Function** fields, shown under **Application Callgraph** on the **Profiling** tab in System Planner. The trigger and stopper can be the same function or two different functions. After entering these values, regenerate the code and rebuild the project to apply them to the Zephyr instrumentation configuration.

To use a function other than `main`:

1. **Ensure the function is not inlined.** To prevent inlining, specify the `__noinline` attribute in the function definition. This attribute is available from the `<zephyr/toolchain.h>` header.

    ```c
    #include <zephyr/toolchain.h>

    __noinline void run_inference(void) {
        // Your code here
    }
    ```

2. **Run a pristine build** to generate the ELF file containing the function symbols.
3. **Extract the function symbol name** from the built ELF file. For C projects, the symbol name matches the function name. For C++ projects, the function symbol is typically mangled and must be extracted from the ELF file.

    ```bash
    nm <core>/build/zephyr/zephyr.elf | grep <function_name>
    ```

    For example, if your function is named `run_inference`:

    ```bash
    nm m4/build/zephyr/zephyr.elf | grep run_inference
    ```

    The output shows the symbol name. For C projects, this is typically the function name itself (`run_inference`). For C++ projects, this will be a mangled name like `_Z13run_inferencev`.

    ```text
    10002888 T _Z13run_inferencev
    ```

4. **Enter the symbol names in System Planner.** If the trigger and stopper are different functions, repeat steps 1–3 for each function. In **System Planner**, on the **Profiling** tab, expand the core and select **Application Callgraph**. In the **Trigger Function** field, enter the exact trigger symbol name. In the **Stopper Function** field, enter the exact stopper symbol name. If both roles use the same function, enter the same symbol name in both fields.

5. Save your changes.

6. **Regenerate code and run a pristine build** to apply the configuration changes, then reflash your project using **CFS: flash** or **CFS: flash & run** (see [Generate, build, and flash](#step-3-generate-build-and-flash)).

    ```bash
    cfsutil tasks run pristine_build --project <core>
    cfsutil tasks run <flash-task> --project <core>
    ```

7. Capture a new profiling trace following the steps in [Capture the profiler trace](#step-4-capture-the-profiler-trace).

For more details about the instrumentation mechanism, see the [:octicons-link-external-24: Zephyr Instrumentation documentation](https://docs.zephyrproject.org/4.3.0/services/instrumentation/index.html){:target="_blank"}.

## Advanced: Adjust the TFLM profiler event limit

By default, the TFLM profiler reserves memory for 256 operator events per inference and records up to that limit. Each operator emits at least one event, and an operator that runs more than once during an inference emits an event each time.

Operators beyond the limit are not traced, and a warning is logged. A limit that is too low truncates the trace; a limit that is too high reserves unused memory.

Adjust the limit to match the operator events your inference produces. If you don't know the event count, use the layer or operator count of the model as a starting point:

1. **Open the `prj.conf` file** in your project core directory. For example, if your core is named `m4`, the file is located at `<your-project>/m4/prj.conf`.
2. **Set the event limit** to the number of operator events your inference produces:

    ```text
    # Support up to 512 TFLM events
    CONFIG_ZPL_TFLM_PROFILER_MAX_EVENTS=512
    ```

3. Save the file.
4. Run **[CFS: pristine build](../build-and-flash/tasks.md#cfs-pristine-build)** to apply the configuration change, then reflash your project using **CFS: flash** or **CFS: flash & run**.

5. Capture a profiling trace following the steps in [Capture the profiler trace](#step-4-capture-the-profiler-trace).
