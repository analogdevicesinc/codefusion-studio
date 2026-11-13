<!-- markdownlint-disable -->

# Release Notes

## 2.4.0

### ✨ New Features

- **Package Manager — Remotes tab:** The new **Remotes** tab in the Package Manager lists your package remotes. You can add custom remotes, enable or disable any remote, change the authentication of a custom remote, and delete a custom remote without using the command line.
- **Package Manager — Packages view:** The new **Packages** view in the CodeFusion Studio sidebar lets you browse, search, and filter the contents of installed packages. By default it shows the packages your workspace depends on.
- **Package Manager — update checks:** CodeFusion Studio now notifies you when newer versions of the installed workspace packages are available. You can also check on demand with the `(CFS) Check for Package Updates` command.
- **West Editor:** Open the `west.yml` manifest of a west workspace that you manage in a graphical editor. View the current status of each project, search and filter projects, edit revisions and groups, and turn groups on or off.
- **`cfspkg://` Git protocol:** `west` can clone a package installed with the Package Manager into your own application through a `cfspkg://<name>/<version>` URL in `west.yml`.
- **SRU Config:** New tab in System Planner for configuring Signal Routing Unit (SRU) connections graphically on SHARC-FX processors, replacing manual register-level configuration.
- **Tasks — `dependsOn` support:** Add a `dependsOn` property to a custom task in `cfs.tasks.json` to run one or more other tasks first when you run the task from the CodeFusion Studio **Actions** view.
- **AI Hardware Profiling — Runtime Profile Report:** For captures that generate a `.tef` file, selecting **Stop** also creates a **Runtime Profile Report** (`.cfsreport`) alongside it and opens the report automatically. The report shows measured latency, throughput, and per-layer timing from the target hardware.
- **AI-Assisted Development Skills — workspace bootstrap and AI model evaluation:** Three new skills extend what your AI assistant can do: `cfs-workspace-bootstrap` sets up a workspace and checks that your environment is ready to build; `cfs-ai-evaluation` evaluates an AI model on a connected ADI board; and `cfs-ai-report` turns the results into an engineering report. They are available in GitHub Copilot, Claude Code, OpenAI Codex, and other supported agents. For installation and usage, see [AI-Assisted Development Skills](https://developer.analog.com/docs/codefusion-studio/latest/user-guide/developer-tools/cfs-ai-skills/) in the CodeFusion Studio User Guide.

### ⛔ Breaking Changes

- **AI Debug Assistant — chat participant and source-search interfaces removed:** The `@cfs-debug` GitHub Copilot chat participant has been removed. The MCP `debug_search_source` tool and `source-search-and-debug` prompt have also been removed; use the file-search capabilities of your AI client instead. Use the CFS MCP debug server for AI-assisted debugging with GitHub Copilot Agent Mode, Claude Code, or another MCP-compatible AI client.

### 🐞 Bug fixes, Minor Improvements

- **Debug with Ozone — per-core actions:** The **Actions** panel shows a separate **Debug with Ozone (`<core>`)** action for each Ozone-capable core (Arm Cortex-M and RISC-V), so you can open the debugger for a specific core from either the **Workspace** context or a core context. Cores that don't support Ozone, such as SHARC-FX, no longer show the action.
- **AI Debug Assistant — automatic client connection:** When you start the CFS MCP debug server, the built-in MCP client in VS Code connects automatically, so debug tools are ready to use in GitHub Copilot Agent Mode without an extra manual step.
- **GDB Toolbox — SHARC-FX fault analysis:** The **Analyze Faults** script supports SHARC-FX targets. During a halted debug session, it reads and decodes the SHARC-FX exception status registers and prints a fault summary.
- **Installer — smaller, more flexible installation:** Install toolchains and SDKs separately through the Package Manager, reducing the initial installer download and allowing you to install only the components you need. See [Commonly available packages](https://developer.analog.com/docs/codefusion-studio/latest/user-guide/installation/package-manager/available-packages/) for the toolchain and SDK packages that replace the removed installer components. The setup wizard copies the CodeFusion Studio extension VSIX to your system, installs OpenOCD for ADI processors, and can install ADI ICE Drivers on Windows.
- **Create a workspace from an AI model — single-core selection:** In the **Cores** section, selecting a core clears the previous selection, so only one core can run the model.
- **Manage AI Models — reports saved to your project:** Compatibility and profiling reports now save to the `reports` folder of the project assigned to the same core as the model, instead of always saving to the temp directory.
- **Manage AI Models — renamed tab:** The **Embedded AI Tools** tab in System Planner has been renamed to **Manage AI Models**. Functionality is unchanged.
- **Manage AI Models — identifier collision detection:** Adding or updating a model reports `This identifier is already in use by another model` when the normalized **Model Name** or **Symbol for data** value (when set) collides case-insensitively with either value from another model in the workspace.
- **Pin Config — fixed-function pins and configuration display:** Fixed-function pins on SHARC-FX peripherals, such as DAI0, now display their physical pin mappings. **Enable** and **Configure** controls appear only for pins that support those actions. This behavior also applies to peripherals that contain a mix of assignable and fixed signals, such as SYS. In the configuration sidebar, the **Configuration** and **Code Generation Plugin** sections appear only when they contain applicable controls.
- **Pin Config — pin description editor:** Peripherals that allow assignment at the pin level, such as GPIO, now show a **Details** section in the configuration sidebar with a **Description** field for documenting the purpose of the pin.
- **AI Hardware Profiling — Clean & Build:** The AI Hardware Profiling view now uses the standard build task for your project by default and adds **Clean & Build** to rebuild the AI application from scratch.
- **Profiling — instrumentation trigger and stopper functions:** Set the functions that start and stop Application Callgraph instrumentation directly in System Planner, using the new **Trigger Function** and **Stopper Function** fields on the **Profiling** tab.
- **Package Manager — dependency conflict detection:** The review summary screen now checks whether the packages you selected pull in incompatible versions of the same package — whether that package is one of your direct selections or a dependency they share — and reports the conflict before you accept licenses. The disputed package is highlighted, and **Continue** is unavailable until you resolve the conflict.
- **Profiling — Zephelin live tracing:** Stream trace data to the Zephelin Trace Viewer while the capture runs, instead of saving `.ctf` and `.tef` files for later viewing. Turn on **Enable Zephelin Live Tracing** in the **Trace Configuration** view to monitor CPU load, memory usage, and AI inference timing in real time over UART or USB.

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 2.3.0

### ✨ New Features

- **Quick Access Panel:** The CFS sidebar now includes a **Help and Support** section with links to the Getting Started walkthrough, online documentation, Engineer Zone, and technical support.
- **Workspace Creation Wizard:** Templates in the **Workspace Template** section are now listed in alphabetical order. A search bar lets you filter templates by name or description.
- **Package Manager UI:** A new graphical interface for managing packages directly from VS Code. Browse, filter by name, status, SoC, or type, view package details and version history, and install or uninstall packages - all without leaving the editor.
- **Peripheral Allocation — automatic signal assignment:** Allocating a peripheral to a project automatically assigns required signals that have a single possible pin, reducing manual setup.
- **Telemetry:** Anonymous, opt-in telemetry covers System Planner configuration, code generation, build, flash, debug, and artificial intelligence (AI) model workflows. Disabled by default; no personally identifying information is collected. View the Telemetry documentation for more information about the collected data.
- **AI-Assisted Development Skills:** New `cfs-docs` and `cfs-cli` skills give your AI assistant doc-backed, product-specific answers about CodeFusion Studio. They are bundled with the extension for GitHub Copilot (requires VS Code 1.109 or later), and follow the open Agent Skills standard so they also work in Claude Code, OpenAI Codex, and other supported agents.
- **Model Zoo:** The **Browse** button in the Embedded AI Tools and the Workspace from AI Model wizard now opens the Model Zoo, a library of AI models hosted by Analog Devices. Search and filter models by platform, core, and category, compare sizes across quantizations, and select a model to populate its file and, when available, sample data fields. Local model files and URLS are still supported, and you can add custom repositories through the `cfs.modelZoo.urls` setting.
- **Profiling — USB trace capture:** Capture Zephelin profiling traces over USB in addition to UART. Select **USB** as the trace interface in System Planner and select the connected USB device in the Trace Capture panel.
- **Machine-readable documentation (`llms.txt`):** The online User Guide is available in an AI-friendly format that follows the `llms.txt` standard. Point your AI assistant at [`llms.txt`](https://developer.analog.com/docs/codefusion-studio/latest/llms.txt) for an indexed list of documentation sections, or [`llms-full.txt`](https://developer.analog.com/docs/codefusion-studio/latest/llms-full.txt) for the full documentation content in a single file.

### 📦 Workspace Templates

- Added new MSDK templates: MSDK Single Core AES, MSDK Single Core Coremark, MSDK Single Core CRC, MSDK Single Core CTB AES, MSDK Single Core ECC, MSDK Single Core Flash, MSDK Single Core GPIO, MSDK Single Core Hash, MSDK Single Core RTC Backup, MSDK Single Core SPI.
- Added new Zephyr templates: Zephyr Single Core ADC Devicetree, Zephyr Single Core CRC, Zephyr Single Core Eventfd, Zephyr Single Core Hello World User, Zephyr Single Core LVGL Basic, Zephyr Single Core UART Async API.
- Extended existing Zephyr templates (Basic Synchronization, Hello World C++, Synchronization C++, Dining Philosophers, Counter Alarm) to support MAX32657, MAX32658, MAX32666, MAX32672, and MAX78000.
- Extended existing MSDK template (MSDK Single Core ICC — Instruction Cache Controller) to support MAX32672 and MAX78000.

### ⛔ Breaking Changes

- **Registers-Only Plugin deprecated:** The Registers-Only (bare-metal) Plugin is deprecated and will be removed in a future release. It remains available in this release for advanced workflows that generate code accessing memory-mapped registers (MMRs) directly.

### 🐞 Bug fixes, Minor Improvements

- **Memory Viewer — go to symbol:** The **Go to** field in the Memory Viewer now accepts symbol names (for example, `count`) in addition to hex and decimal addresses. Symbol lookup requires a halted debug session.
- **System Planner version resolution:** When the remote package repository can't be accessed (no network access or not logged in to myAnalog), the version resolution screen now shows compatible locally installed versions (if available) instead of an empty menu. The **Upgrade to latest compatible downloadable version** option now appears when no compatible version is installed locally or when the remote version is newer than the best compatible version installed locally.
- **Workspace from AI Model — automatic board and core selection:** When creating a workspace from an AI model, the board is selected automatically when only one board is available for the selected SoC. A supported processor core is initially pre-selected. When compatibility results are available, the selection is updated to a compatible core if one is found; otherwise, it is cleared. You can change the core selection or target additional cores.
- **Embedded AI Tools — model name length limit:** AI model names are limited to 64 characters. The **Model Name** field in the model editor stops accepting input at 64 characters.


### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 2.2.1

### ✨ New Features

- **Zephyr 4.4.0 packages for MAX32657 and MAX32658:** Added the `zephyr/4.4.0-b.1` and `zephyr_arm_toolchain/1.0.1` packages (toolchain installed automatically as a dependency). Install using **(CFS) Install Package** or `cfsutil pkg install zephyr/4.4.0-b.1`. These packages currently target MAX32657 and MAX32658 only.
- **Zephyr Single Core PM GPIO Wakeup template (MAX32657/MAX32658):** Added a new workspace template demonstrating Zephyr power management on MAX32657/MAX32658 — runtime idle, standby, and suspend to RAM states with GPIO wakeup. Requires `zephyr/4.4.0-b.1` to build.

### 🐞 Bug fixes, Minor Improvements

- **Workspace Creation Wizard:** Fixed a crash when entering special characters in the SoC filter field. The filter now escapes regex special characters before building the search pattern.
- **Core Dump Analysis:** Removed the `cfs.zephyrCoreDumpScriptsPath` setting. The Zephyr core dump scripts path now resolves automatically from the toolchain; any existing setting is ignored.
- **System Planner (MAX32657/MAX32658):** Fixed an issue where enabling all three I3C pins produced an undefined node for the Pull-Up Resistor (PUR) pin in generated overlay files.
- **System Planner version resolution:** When resolving missing data models or plugins, the automated version resolution screen now shows a progress ring and a "This operation can take several minutes, please wait..." message while resolutions are loading, and displays an error notification if the package search fails.
- General bug fixes and stability improvements.

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 2.2.0

### ✨ New Features

- **Memory Viewer:** A new debug tool that lets you inspect device memory during live and retrospective debug sessions. Features configurable display options (byte grouping, column count, endianness, format), auto-refresh on debugger halt, multi-core session tracking, and read-only support for core dump sessions.
- **Package Manager enhancements:** Some packages require license acceptance before installation. When installing packages using the VS Code Command Palette, a license acceptance prompt appears during installation. Added **(CFS) Delete Package from Cache** command in the Command Palette for bulk deletion of cached packages.
- **Embedded AI Tools enhancements:** Improved UX for Compatibility and Resource Profiling report outputs with better visualization and interpretation. Added **Open Report** option on the CFS Home page for accessing previously generated reports.
- **System Planner improvements:** Enhanced Pin Config search with categorized results and navigation in the Pin Mux view for faster pin, signal, and peripheral identification.
- **Expanded System Planner support:** Added full System Planner support (Memory Allocation, Peripheral Allocation, Pin Config, and Registers) for MAX32660, MAX32662, MAX32666, MAX32672, and MAX32675C microcontrollers.
- **Expanded RTOS support:** Added support for Zephyr 4.3.0 across all supported MAX32xxx and MAX78xxx microcontrollers.
- **Profiling - streamlined Zephelin trace capture workflow:** New **Trace Capture** panel in CFS Home Page sidebar for one-click profiling trace capture with automatic `.ctf` and `.tef` generation. Includes Zephelin Trace Viewer extension for visualizing traces directly in VS Code and new profiling options for CPU Load, Memory Usage, and function call graphs.
- **Workspace from AI Model:** Create AI-ready workspaces directly from a model file with automatic compatibility checking, guided wizard for SoC/board selection, and pre-configured AI application with model integration and one-click hardware deployment.
- **Core Dump Analysis - expanded SoC support:** Core dump support expanded to nine additional MAX devices (MAX32650, MAX32655, MAX32660, MAX32662, MAX32666, MAX32670, MAX32672, MAX78000, and MAX78002), bringing total support to 12 SoCs.

### 📦 Workspace Templates
- Added new MSDK templates including Library generation, Library usage, and Watchdog.
- Added new Zephyr templates including Basic threading, Button handling, POSIX philosophers, and UART echo.
- Extended existing MSDK templates (DMA, Hello World (C++), I2C scan, RTC, UART Loopback) to support MAX78000.
- Extended existing Zephyr templates (ADC sequence, I2C custom target, LittleFS, Watchdog) to support MAX32666 and MAX78000.

### ⛔ Breaking Changes

- None

### 🐞 Bug fixes, Minor Improvements

- **Workspace Creation Wizard:** Improved SoC selection page with expandable family cards, sticky search with match count and highlighting, and responsive layout enhancements.
- Removed manual TrustZone configuration option for MAX32657 and MAX32658 in the Workspace Creation Wizard. TrustZone support remains available through the verified TF-M Secure Partition template.
- System Planner displays automated version resolution options when opening a `.cfsconfig` file with missing data models or plugins.
- **AI Debug Assistant:** General bug fixes and stability improvements. We recommend using the MCP server for production workflows for maximum portability and future compatibility.
- **Plugins SDK:** The Plugins SDK has been reorganized as the `cfs-plugins-sdk` package in the CodeFusion Studio repository, providing better version alignment with CFS releases and clearer dependency tracking. For complete documentation on developing plugins, including API reference and templating guide, see the [CFS Plugins SDK README](https://github.com/analogdevicesinc/codefusion-studio/blob/main/packages/cfs-plugins-sdk/README.md).
- General stability and performance improvements across workspace creation, AI Tools, System Planner, and Package Manager workflows.

## 2.1.0

### ✨ New Features

- Introduced the **AI Debug Assistant**, a preview agentic debugging tool that connects compatible AI clients, such as GitHub Copilot and Claude Code, directly to your live debug sessions. Built on the Model Context Protocol (MCP), it enables AI models to autonomously investigate faults, inspect hardware state, and coordinate across multiple cores in real time.

### 🐞 Bug fixes, Minor Improvements
- Plugin options are now filtered by core during manual workspace creation. Users can no longer select unsupported plugins for a given architecture — for example, the Zephyr plugin is hidden for RISC-V cores such as MAX32690.
- Cores in the workspace creation wizard are now ordered with the primary core listed first.
- Fixed an issue where adding a myAnalog remote with an incorrect URL caused Package Manager to fail when attempting to obtain credentials.
- Fixed an issue where adding a package remote could be accidentally cancelled by clicking outside the prompt in the Command Palette.
- Updated installer UI with a refreshed look and feel.

## 2.0.2

### 🐞 Bug fixes, Minor Improvements
- Fixed a regression that prevented CFS Telemetry events from being collected.

## 2.0.1

### ✨ New Features
- Added support for the MAX32658 SoC, including System Planner integration, Zephyr support, and TESA security configuration.
- Added Zephyr 4.3.0 support for MAX32657 and MAX32658.

### 📦 Workspace Templates
- Added 16 new MSDK and Zephyr workspace templates.

### 🐞 Bug fixes, Minor Improvements
- General stability and performance improvements across project setup, AI Tools, System Planner, and Package Manager workflows.

## 2.0.0

## ⛔ Breaking Changes

- None

## ✨ New Features

- Develop AI-enabled applications with the new suite of **Embedded AI Tools** for supported processors, including MAX32657, MAX32690, MAX78002, and the SHARC-FX (ADSP-2183x/SC83x family).
  - Import and configure AI models directly in the **System Planner**, assign them to cores, run compatibility and profiling checks, and generate deployment code.
  - Capture runtime and AI inference-level performance data with **Zephelin profiling**, and visualize traces in the **Zephelin Trace Viewer**.
- Accelerate setup and updates with the new **Package Manager**, which lets you download SDKs, toolchains, and plugins on demand without requiring a full reinstallation.
- Debug faster with new and enhanced **Debugging Tools**.
  - Use the **Core Dump Analysis Tool** to inspect captured core dumps and identify crash causes directly in CodeFusion Studio.
  - Run default or custom GDB or Python scripts with the new **GDB Toolbox** to automate inspection and debugging during halted sessions.
- Benefit from major UX improvements in **System Planner** for faster, more intuitive hardware setup.
  - Define memory partitions using an interactive memory bar, allowing direct editing from the visual layout.
  - Allocate and configure peripherals through a guided setup flow with clearer navigation, visual cues, and simplified deletion. Pins can also be enabled directly from the Peripheral Allocation page for a faster, more cohesive workflow.
- Simplify workspace setup with the improved **Workspace Creation Wizard**.
  - A guided sidebar now shows your progress at every step for easier navigation.
  - Manual configuration has been streamlined with an intuitive per-core sequence.
  - Added **Arm® TrustZone® support**, available through templates or manual setup for supported devices.
- Extended platform and processor support.
  - Access the latest RTOS features with Zephyr plugins now compatible with **Zephyr 4.2**.
  - Introduced build and debug support for **ADSP-2183x / SC83x SHARC-FX** devices on Windows.
- Anonymous telemetry added to improve the functionality and user experience of CodeFusion Studio.

## 🐞 Bug fixes, Minor Improvements

- General stability and performance improvements across project setup and System Planner workflows.

## 🚧 Experimental Features

- None

## 👷 CI Improvements

- None

## 1.1.0

## ⛔ Breaking Changes

- None

## ✨ New Features

- Navigate and configure your system with the new System Planner, with tools to orchestrate development at both the system and core level:
  - Visualize and manage your entire system from the System Planner dashboard showing cores, allocated peripherals, assigned pins, and memory partitions
  - Define and configure memory partitions for each core with the Memory Allocation tool
  - Assign and configure peripheral blocks to specific cores with the Peripheral Allocation tool
  - Benefit from major UX improvements in the Registers and Pin Config pages for faster, more intuitive hardware setup
- Explore Zephyr-based projects with the Device Tree View that provides instant visibility into hardware components and configurations
- Create and manage single or multi-core projects with the Workspace Creation wizard that provides out-of-the-box templates or custom per-core setup options
- Filter actions by project with the Context View in the Activity Bar, reducing complexity in multi-project environments
- Stay current with hardware definitions through the cloud-based Catalog Manager that automatically syncs SoC metadata in the background
- Configure plugins independently from code generation with each plugin now exposing config settings directly in the GUI
- Extend CodeFusion Studio with your own plugins using the modular, API-driven architecture that can be tailored to specific project needs, such as upgrading RTOS versions
- Develop and debug multi-core applications in a unified environment with improved heterogeneous multi-core debugging capabilities
- Access the latest RTOS features with Zephyr plugins now compatible with Zephyr 4.1

## 🐞 Bug fixes, Minor Improvements


## 🚧 Experimental Features

- None

## 👷 CI Improvements

- None

## 1.0.2

### ⛔ Breaking Changes

- None

### ✨ New Features

- None

### 🐞 Bug fixes, Minor Improvements

- Fix incompatibility issue with VS Code 1.98 (February 2025)

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 1.0.0

### ⛔ Breaking Changes

- None

### ✨ New Features

- Access quick links and documentation from the CodeFusion Studio (CFS) Home Page
- Create new projects for the MAX32xxx and MAX7800x processors from the New Project Wizard in the CFS Home Page
- Open examples for the MAX32xxx and MAX7800x processors from the CFS Home Page
- Build Arm and RISC-V applications using `make` through VS Code tasks
- Debug single-core projects and heterogeneous projects with Arm and RISC-V cores
- Select Arm and RISC-V debug settings through VS Code quick picks
- Develop multiple projects in a single workspace
- Access CodeFusion Studio specific content through the Activity Bar
- Access build, debug, flash, and erase tasks from status bar shortcuts and the CFS action panel
- Build and debug through the command line using the `CodeFusion Studio Terminal`
- Analyze compiled binaries with the ELF file explorer, reduce debugging and profiling time while gaining insights into the application structure

### 🐞 Bug fixes, Minor Improvements

- None

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None
