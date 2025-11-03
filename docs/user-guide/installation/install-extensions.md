---
description: Install the CodeFusion Studio VS Code extension
author: Analog Devices
date: 2025-10-30
---

# Install the CodeFusion Studio VS Code extension

Install the [:octicons-link-external-24: CodeFusion Studio VS Code extension](https://marketplace.visualstudio.com/items?itemName=AnalogDevices.cfs-ide){:target="_blank"} from the Visual Studio Code Marketplace.

## Manually install the VS Code extension

If you are unable to install the extension directly from the Visual Studio Code Marketplace due to firewall restrictions or an offline environment, you can install it manually.

To manually install the extension, locate the CodeFusion Studio VS Code extension VSIX file in the VS Code directory within the CodeFusion Studio installer.

1. Open Visual Studio Code.
2. Select the **Extensions** icon from the activity bar.
3. Click **Views and More Actions** (...) and select **Install from VSIX**.
4. Navigate to the `<codefusion-sdk-install>/VSCode` directory. The exact location depends on your installation path. The following are the default locations:
    - Linux: `/home/<username>/analog/cfs/<version>/VSCode`
    - macOS: `/Users/<username>/analog/cfs/<version>/VSCode`
    - Windows: `C:\analog\cfs\<version>\VSCode`
5. Select the `cfs-ide-*.vsix` file to install.
6. Restart VS Code for the changes to take effect.

![Extension Installation](images/extension-installation-dark.png#only-dark)
![Extension Installation](images/extension-installation-light.png#only-light)

## Next steps

To complete installation, [check that your SDK and tool paths are set correctly](set-up-cfs.md).
