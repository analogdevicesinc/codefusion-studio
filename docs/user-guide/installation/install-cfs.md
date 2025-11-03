---
description: Download and installation instructions for CodeFusion Studio
author: Analog Devices
date: 2025-10-23
---

# Install CodeFusion Studio

To get started with CodeFusion Studio, first install the SDK using the CodeFusion Studio installer.

## Install the CodeFusion Studio SDK

### Download

The CodeFusion Studio installer (version 2.0.0) can be downloaded from the following links.

- [:octicons-link-external-24: Linux](https://download.analog.com/codefusion-studio/2.0.0/CodeFusionStudio_2.0.0.run){:target="_blank"}
- [:octicons-link-external-24: macOS](https://download.analog.com/codefusion-studio/2.0.0/CodeFusionStudio_2.0.0.dmg){:target="_blank"}
- [:octicons-link-external-24: Windows](https://download.analog.com/codefusion-studio/2.0.0/CodeFusionStudio_2.0.0.exe){:target="_blank"}

### Install

!!! note
     The Linux installer downloads without execute permissions. Run `chmod a+x <installer>` to grant execute permissions before continuing.
     The CodeFusion Studio installer doesn't require elevated `sudo` permissions to run.

1. Double click the installer (`.exe`, `.dmg`, `.run`) to launch the setup wizard. ![Installer Setup](images/installer-setup.png)
2. Follow the on-screen instructions to begin setup.
3. Specify the installation folder when prompted. We recommend using the default location.
4. Select the default or desired components to install, then proceed to the next step.

    !!! note "Install ICE drivers for SHARC-FX (Windows only)"
        To enable debugging for SHARC-FX processors, select the checkbox **ADI ICE Drivers (Requires Administrator)** during installation. When prompted, approve the Windows elevation dialog to complete driver installation. This installs the USB drivers required for ICE-1000, ICE-1500, and ICE-2000 emulators.  

        If you skip this option, you can install the drivers later. For details, see [Install ICE drivers manually](../debugging/install-ice-drivers.md).

5. Review and accept the license agreement to continue.
6. (Windows only). Choose the Start Menu folder for the shortcut.
7. Review your selections and start the installation.
8. When the installation is complete, close the wizard.

!!! warning
    Installation path cannot contain spaces.

### Command line install

Invoke the installer with the `install` switch to install the full package to the default location, with the following switches:

| Switch   | Effect                         |
| -------- | ------------------------------ |  
| `--help` | Provide help output            |
| `-t`     | Specify the path to install to |
| `-c`     | Confirms prompts               |
| `--al`   | Accept license                 |

!!! note
    If using the `--al` switch to accept the license, refer to the `Licenses` directory for the licence text and ensure you agree with them before using CodeFusion Studio.

To run the installer from the command line, use the following:

**macOS:**

``` bash
hdiutil mount CodeFusionStudio_2.0.0.dmg -mountpoint cfs
cfs/CodeFusionStudio_2.0.0.app/Contents/MacOS/CodeFusionStudio_2.0.0 install --am --al -c
hdiutil unmount cfs
```

**Windows:**

``` bash
CodeFusionStudio_2.0.0.exe install --am --al -c
```

**Linux:**

``` bash
./CodeFusionStudio_2.0.0.run install --am --al -c
```

## Next steps

Next, [install the CodeFusion Studio VS Code extension](install-extensions.md).
