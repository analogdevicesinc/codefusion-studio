<!-- markdownlint-disable -->

# Release Notes

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

- **CLI-first workspace workflows:** It is now possible to set up a workspace, build, and flash a project entirely from the command line without opening the IDE. New commands include `cfsutil socs list`, `cfsutil socs info`, `cfsutil workspace configure`, `cfsutil workspace create`, `cfsutil tasks list`, and `cfsutil tasks run`.
- **`cfsutil ai` command group:** The `cfsai` command-line tool has been migrated into `cfsutil` as the `cfsutil ai` command group, enabling end-to-end AI model workflows from the command line. Includes `cfsutil ai build`, `cfsutil ai compat`, `cfsutil ai profile`, `cfsutil ai model` (add, list, update, remove models), and `cfsutil ai backends list` (optionally with `--name`). `cfsai` remains available as a compatibility wrapper.
- **Memory Viewer:** A new debug tool that lets you inspect device memory during live and retrospective debug sessions. Features configurable display options (byte grouping, column count, endianness, format), auto-refresh on debugger halt, multi-core session tracking, and read-only support for core dump sessions.
- **Package Manager enhancements:** Some packages require license acceptance before installation. When installing packages using the VS Code Command Palette, a license acceptance prompt appears during installation. For automated workflows, the new `--acceptLicense` flag on `cfsutil pkg install` allows you to accept the license upfront, enabling installation in scripts and CI pipelines without interactive prompts. Added **(CFS) Delete Package from Cache** command in the Command Palette for bulk deletion of cached packages.
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

- **`cfsutil socs` command format changes:** The default output format of `cfsutil socs list` (text and JSON) and the usage of `cfsutil socs export` have changed to support SoC names containing hyphens (e.g., `adsp-21836`). For `socs export`, pass the SoC name as a positional argument and specify the package with `--package` (for example, `cfsutil socs export adsp-21836 --package <package-name>`). Use the `--legacy` flag for `socs list` or the deprecated `-n, --name` flag for `socs export` while migrating. Both legacy options will be removed in a future release.
- **`--json` flag deprecated:** The `--json` flag has been deprecated across all `cfsutil ai`, `cfsutil elf`, and `cfsutil socs` commands. Use `--format json` instead. The `--json` flag continues to work but displays a deprecation warning and will be removed in a future release.

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
- `cfsutil pkg install` now supports semantic version range expressions, including caret (`^`), tilde (`~`), and comparison operators (`>=`, `<=`, `>`, `<`).

### 🐞 Bug fixes, Minor Improvements
- Package Manager authentication handling has been improved. Authentication is now managed using `cfsutil myanalog` and `cfsutil pkg auth-remote`; the commands `cfsutil pkg login`, `cfsutil pkg logout`, and `cfsutil auth` are deprecated.
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
  - Access the same capabilities from the terminal using the new **`cfsai` command-line utility**, supporting model builds, compatibility reports, and profiling workflows.  
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
