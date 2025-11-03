# Overview

CodeFusion Studio (CFS) is a modern embedded software development ecosystem that integrates with Microsoft Visual Studio Code. Designed for Analog Devices microcontrollers and digital signal processors, CFS provides a unified development environment that eliminates the complexity of working across multiple toolchains, SDKs, and build systems. It combines graphical system design, code generation, and debugging within a single development and debugging environment.

## About CFS

- **Easy Project Setup:** Start new single- or multi-core projects in seconds with just a few clicks using the Workspace Creation Wizard. Example applications help you get up and running fast, with secure partitioning using Arm® TrustZone® available for supported devices.  
- **Broad Hardware Support:** Build for Arm® Cortex-M, RISC-V, and SHARC-FX architectures in supported ADI products.  
- **Visual System Design:** Visually configure pins, clocks, peripherals, memory, AI models, and data flows—all with the System Planner.  
- **AI at the Edge:** Build, validate, and deploy AI models directly in System Planner or from the command line. Run compatibility and performance profiling on your target hardware and visualize inference behavior in real time with the integrated Zephelin profiler and trace viewer.  
- **Advanced Debugging:** Provides an extended debugging ecosystem for multi-core systems with breakpoints, disassembly, cross-core support, and RTOS thread awareness. Automate complex inspections with the GDB Toolbox or analyze captured crashes using Core Dump Analysis.
- **Flexible Architecture:** An extensible plugin architecture and a platform-agnostic design let you customize your workflow and conceptually separate configuration and design decisions from code generation, giving you the freedom to choose RTOS, middleware, and firmware platforms.
- **On-Demand Updates:** Download SDKs, toolchains, and plugins as needed with the integrated Package Manager so your environment is always up to date.  
- **Personalized Homepage:** Quickly access recent projects, documentation, and learning resources from your CFS homepage.  

## Supported Processors

CodeFusion Studio currently supports the following processors in the following configurations:

| Processor                                                                 | Bare-metal SDK | Zephyr | Config Tools | AI Tools | TESA† |
|---------------------------------------------------------------------------|----------------|--------|--------------|----------|------|
| [MAX32650](https://www.analog.com/en/products/max32650.html)              | Yes            | Yes    | Yes          | No       | Yes  |
| [MAX32655](https://www.analog.com/en/products/MAX32655.html)              | Yes            | Yes    | Yes          | No       | Yes* |
| MAX32657                                                                  | No             | Yes    | Yes          | Yes      | Yes  |
| [MAX32660](https://www.analog.com/en/products/max32660.html)              | Yes            | Yes    | No           | No       | No   |
| [MAX32662](https://www.analog.com/en/products/max32662.html)              | Yes            | Yes    | No           | No       | Yes* |
| [MAX32666](https://www.analog.com/en/products/max32666.html)              | No             | Yes    | No           | No       | No   |
| [MAX32670](https://www.analog.com/en/products/max32670.html)              | Yes            | Yes    | Yes          | No       | Yes  |
| [MAX32672](https://www.analog.com/en/products/MAX32672.html)              | Yes            | Yes    | No           | No       | Yes* |
| [MAX32675C](https://www.analog.com/en/products/max32675c.html)            | Yes            | Yes    | No           | No       | No   |
| [MAX32690](https://www.analog.com/en/products/MAX32690.html)              | Yes            | Yes    | Yes          | Yes      | Yes  |
| [MAX78000](https://www.analog.com/en/products/MAX78000.html)              | Yes            | Yes    | Yes          | No       | Yes* |
| [MAX78002](https://www.analog.com/en/products/MAX78002.html)              | Yes            | Yes    | Yes          | Yes      | No   |
| [ADSP-21834 / 21834W](https://www.analog.com/en/products/adsp-21834.html) | Yes            | No     | Yes*         | Yes      | No   |
| [ADSP-21835 / 21835W](https://www.analog.com/en/products/adsp-21835.html) | Yes            | No     | Yes*         | Yes      | No   |
| [ADSP-21836 / 21836W](https://www.analog.com/en/products/adsp-21836.html) | Yes            | No     | Yes*         | Yes      | No   |
| [ADSP-21837 / 21837W](https://www.analog.com/en/products/adsp-21837.html) | Yes            | No     | Yes*         | Yes      | No   |
| [ADSP-SC834 / SC834W](https://www.analog.com/en/products/adsp-sc834.html) | Yes            | No     | Yes*         | Yes      | No   |
| [ADSP-SC835 / SC835W](https://www.analog.com/en/products/adsp-sc835.html) | Yes            | No     | Yes*         | Yes      | No   |

† **Trusted Edge Security Architecture (TESA)** – Analog Devices’ security framework for secure boot, cryptography, and firmware signing across supported devices.  
\* Limited support available.

## Install CFS

This section provides instructions for installing and setting up CodeFusion Studio for [supported processors](#supported-processors).

### Software Requirements

#### Dependencies

Tools VS Code extensions depend on:

- [Microsoft's Visual Studio Code](https://code.visualstudio.com/) version 1.100 or later (recommended).

#### Host OS Support

 CodeFusion Studio and extensions are supported on the following host operating systems:

- Windows 11 (64-bit)
- macOS 15 and macOS 26 (ARM64)
- Ubuntu 22.04 and 24.04 (64-bit)

*Earlier or newer OS versions may work but are not officially supported.*

#### Download CFS

Download CodeFusion Studio from the [CodeFusion Studio Developer Resources](https://developer.analog.com/solutions/codefusionstudio) page or use the links below:

- [Windows](https://download.analog.com/codefusion-studio/2.0.0/CodeFusionStudio_2.0.0.exe)
- [Linux](https://download.analog.com/codefusion-studio/2.0.0/CodeFusionStudio_2.0.0.run)
- [macOS](https://download.analog.com/codefusion-studio/2.0.0/CodeFusionStudio_2.0.0.dmg)

#### Install

> **Note:**
> The Linux installer downloads without execute permissions. Run `chmod a+x <installer>` to grant execute permissions before continuing.

1. Double click the SDK (`.exe`, `.dmg`, `.run`) to launch the setup wizard. ![Installer Setup](docs/user-guide/installation/images/installer-setup.png)
1. Follow the on-screen instructions to begin setup.
1. Specify the installation folder when prompted. We recommend using the default location.
1. Select the default or desired components to install, then proceed to the next step.
1. Review and accept the license agreement to continue.
1. (Windows only): Choose the Start Menu folder for the shortcut.
1. Review your selections and start the installation.
1. When the installation is complete, close the wizard.

### Set up CFS

#### Set CodeFusion Studio SDK path

Set or update your SDK path when prompted, or configure it manually in user settings.

1. Open **Settings**: select **File > Preferences > Settings** (on macOS: **Code > Settings > Settings**), or open the Command Palette (`Ctrl+Shift+P` / `⇧⌘P`) and search for **Preferences: Open Settings (UI)**, or use the keyboard shortcut (`Ctrl+,`, on Windows/Linux, `⌘,` on macOS).
2. Search for `cfs.sdk.path`.
3. Set the path to your CodeFusion Studio SDK installation directory, making sure it points to the correct version. For example, `C:\analog\cfs\2.0.0` on Windows.

> **Note:**
> You may need to restart VS Code after setting the path.

### Install the VS Code extension

> **Note:**
> The VS Code extension can be installed from the [VisualStudio Marketplace](https://marketplace.visualstudio.com/items?itemName=AnalogDevices.cfs-ide), or manually from the CodeFusion Studio installation.
> This step is only required if you need to manually install an extension.

#### **Manual Installation**

1. Open Visual Studio Code.
2. Go to the `Extensions` tab.
3. Click **Views and More Actions** `...` and select `Install from VSIX`.
4. Browse to the `<codefusion-sdk-install>/VSCode` directory and select the required `*.vsix` file.
5. Restart VS Code for the changes to take effect.

![Extension Installation](docs/user-guide/installation/images/extension-installation-dark.png)

### (Optional) Install Olimex Arm JTAG Drivers

The Olimex ARM-USB-OCD-H debugger is required to debug the RISC-V core on supported MAX parts. The Olimex drivers are not provided directly by CodeFusion Studio and need to be installed manually if RISC-V Debugging is required.

Download and installation instructions can be found in chapter 3 of the [Olimex ARM-USB-OCD-h User Manual](https://www.olimex.com/Products/ARM/JTAG/_resources/ARM-USB-OCD_and_OCD_H_manual.pdf)

## Additional Documentation

For more information, refer to the [User Guide for CodeFusion Studio](https://developer.analog.com/docs/codefusion-studio/latest/).
