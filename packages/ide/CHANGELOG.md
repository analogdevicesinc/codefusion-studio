<!-- markdownlint-disable -->

# Release Notes

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
