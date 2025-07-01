---
description: Download and installation instructions for CodeFusion Studio
author: Analog Devices
date: 2025-01-27
---

# Install CodeFusion Studio

The CodeFusion Studio installation consists of two steps: [installing the SDK](#install-the-codefusion-studio-sdk) and the [VS Code Extension](#install-the-codefusion-studio-vs-code-extension).

## Install the CodeFusion Studio SDK

### Download

The CodeFusion Studio SDK version 1.1.0 can be downloaded from the following links.

- [Linux](https://download.analog.com/codefusion-studio/1.1.0/CodeFusionStudio_1.1.0.run)
- [macOS](https://download.analog.com/codefusion-studio/1.1.0/CodeFusionStudio_1.1.0.dmg)
- [Windows](https://download.analog.com/codefusion-studio/1.1.0/CodeFusionStudio_1.1.0.exe)

### Install

```{note}
The Linux installer downloads without execute permissions. Run `chmod a+x <installer>` to grant execute permissions before continuing.
The CodeFusion Studio installer doesn't require elevated `sudo` permissions to run.
```

1. Double click the SDK (`.exe`, `.dmg`, `.run`) to launch the setup wizard. ![Installer Setup](images/installer-setup.png)
2. Follow the on-screen instructions to begin setup.
3. Specify the installation folder when prompted. We recommend using the default location.
4. Select the default or desired components to install, then proceed to the next step.
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

```{note}
If using the `--al` switch to accept the license, refer to the `Licenses` directory for the licence text and ensure you agree with them before using CodeFusion Studio.
```

To run the installer from the command line, use the following:

**macOS:**

```bash
hdiutil mount CodeFusionStudio_1.1.0.dmg -mountpoint cfs
cfs/CodeFusionStudio_1.1.0.app/Contents/MacOS/CodeFusionStudio_1.1.0 install --am --al -c
hdiutil unmount cfs
```

**Windows:**

```bash
CodeFusionStudio_1.1.0.exe install --am --al -c
```

**Linux:**

```bash
./CodeFusionStudio_1.1.0.run install --am --al -c
```

## Install the CodeFusion Studio VS Code extension

Install the [CodeFusion Studio VS Code extension](https://marketplace.visualstudio.com/items?itemName=AnalogDevices.cfs-ide) from the Visual Studio Code Marketplace.

```{note}
If you are unable to install the extension directly from the marketplace due to firewall restrictions or an offline environment, you can install it manually. For more information, see [Manually install the VS Code Extension](./install-extensions.md).
```
