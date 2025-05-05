<!-- markdownlint-disable -->

# Release Notes

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
