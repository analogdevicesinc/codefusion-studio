---
description: Download and installation instructions for CodeFusion Studio
author: Analog Devices
date: 2024-09-26
---

# Installing CodeFusion Studio

## Download

1. Navigate to [:octicons-link-external-24: CodeFusion Studio](https://analog.com/CodeFusionStudio){:target="_blank"}
2. Click on **Downloads And Related Software**.
3. Select the version and operating system you require.

## Install

!!! note
     The Linux installer downloads without execute permissions. Run `chmod a+x <installer>` to grant execute permissions before continuing.
     The CodeFusion Studio installer doesn't require elevated `sudo` permissions to run.

1. Open the downloaded installer wizard to begin the installation process. ![Installer Setup](images/installer-setup.png)
2. Click **Next** to continue the setup.
3. Specify the folder destination for the install, and click **Next**.
4. Select the Default or desired components to install, and click **Next**.
5. Read the license agreement and click the box if you accept the license, then click **Next**.
6. Select the Start Menu in which to create a shortcut, and click **Next**.
7. Review setup selections and click **Install**.
8. Click **Finish** to close the installer.

!!! warning
    Installation path cannot contain spaces.

## Command line installation

Invoke the installer with the `install` switch to install to the full package to the default location, with the following switches:

| Switch   | Effect                         |
| -------- | ------------------------------ |  
| `--help` | Provide help output            |
| `-t`     | Specify the path to install to |
| `-c`     | Confirms prompts               |
| `--al`   | Accept license                 |

!!! note
    If using the `--al` switch to accept the license, refer to the `Licenses` directory for the licence text and ensure you agree with them before using CodeFusion Studio.

To run the installer headless, use the following:

``` bash
CodeFusion_Studio_1.0.0 install -c --al
```
