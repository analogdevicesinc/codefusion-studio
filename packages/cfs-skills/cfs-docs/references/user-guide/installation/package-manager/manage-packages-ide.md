---
description: Use the Package Manager UI in CodeFusion Studio to browse, install, and uninstall packages directly from VS Code.
author: Analog Devices
date: 2026-07-21
---

# Manage packages from the Package Manager UI

The Package Manager UI lets you browse, filter, and install packages directly in VS Code without using the Command Palette or command line. You can view package details, select versions, review licenses, and uninstall packages — all from a single panel.

## Open the Package Manager

To open the Package Manager UI:

1. Click the CodeFusion Studio icon ![CodeFusion Studio Icon](../../about/images/cfs-icon-dark.png#only-dark) ![CodeFusion Studio Icon](../../about/images/cfs-icon-light.png#only-light) in the VS Code activity bar.
2. Click **Manage Packages** in the **Home** section.

    ![CFS sidebar Home section showing Manage Packages](./images/manage-packages-dark.png#only-dark)
    ![CFS sidebar Home section showing Manage Packages](./images/manage-packages-light.png#only-light)

!!! tip
    You can also open the Package Manager from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) by running **(CFS) Open Package Manager**.

![Package Manager UI showing the sign-in banner, package list, filters, and pagination](./images/package-manager-ui-dark.png#only-dark)
![Package Manager UI showing the sign-in banner, package list, filters, and pagination](./images/package-manager-ui-light.png#only-light)

## Sign in to access restricted packages

Some packages require a myAnalog account. When the Package Manager opens, a sign-in prompt appears at the top of the panel if you are not already logged in. You can dismiss the prompt and browse public packages without signing in.

To sign in:

1. Select **Sign In**. A browser prompt appears in VS Code.
2. Select **Open** to open the browser. If the browser does not open, select **Copy** to copy the link and paste it into your browser manually.

    ![Launch browser prompt in VS Code](./images/launch-browser.png)

3. On the myAnalog login page, use the sign-in method associated with your account:

    - **Email and password:** Enter your registered email address and password, then select **Log in**. If you don’t have a myAnalog account, [:octicons-link-external-24: register at analog.com/myAnalog](https://www.analog.com/myAnalog){:target="_blank"}.
    - **Google Account:** Select **Google Account**, then sign in with your Google credentials.
    - **LinkedIn Account:** Select **LinkedIn Account**, then sign in with your LinkedIn credentials.
    - **Analog Devices Account:** If you are an Analog Devices employee or contractor on a managed device, select **Analog Devices Account**, then sign in with your Analog Devices credentials.

    ![myAnalog login page](./images/login_with-my-analog.png)

4. When the **Sign-in Successful** page appears, close the browser and return to VS Code.
5. A VS Code notification confirms you are logged in.

    ![VS Code notification confirming successful myAnalog login](./images/cfs_my_analog_login-successful-dark.png#only-dark)
    ![VS Code notification confirming successful myAnalog login](./images/cfs_my_analog_login-successful-light.png#only-light)

!!! tip
    To check your login status at any time, run **(CFS) myAnalog Status** from the Command Palette. For session expiry and reauthentication guidance, see [Access restricted packages](auth.md).

## Browse and filter packages

The Package Manager displays all available packages in a paginated list. Use the search bar and filters to find what you need.

### Search

Enter a package name in the search bar to filter packages. The total number of matching packages updates as you type.

### Filters

The following filters are available:

| Filter | Options |
|---|---|
| **Required** | Show only packages required by the current workspace |
| **Status** | Installed, Not Installed, Update Available |
| **SoC** | Filter by supported processor |
| **Type** | Data Model, Plugin, SDK, Toolchain |

Select multiple options within a filter to broaden results. Combine filters to narrow the list.

### Select All

Use the **Select All** checkbox to select all packages on the current page.

## View package details

Select the expand arrow on a package card to view details:

- **Description** — what the package provides
- **Type** — Data Model, Plugin, SDK, or Toolchain
- **CFS compatibility** — which CFS versions this package supports
- **License** — the license name with a **View License** link
- **Cached versions** — versions already downloaded locally
- **Supported SoCs** — processors this package targets

## Select a version

Each package card includes a version menu. The installed version and latest version are labeled in the list. Select a different version before installing if needed.

If a workspace requires a specific version range, the required range appears beneath the version menu. Selecting a version outside the required range shows a warning.

## Install packages

1. Check the box on one or more package cards to select them.
2. Select **Continue**.
3. A review summary lists all selected packages and their versions. Any dependencies required by the selected packages are resolved and shown automatically. Review the details, then select **Continue**.

    ![Review Summary screen showing package details including description, type, CFS compatibility, license, and supported SoCs](./images/package-manager-ui-review-summary-dark.png#only-dark)
    ![Review Summary screen showing package details including description, type, CFS compatibility, license, and supported SoCs](./images/package-manager-ui-review-summary-light.png#only-light)

4. The license review screen appears. Review each license — a checkmark indicates you have opened it. The **Accept License(s) and Install** button becomes active once all licenses have been reviewed. Select **Accept License(s) and Install** to proceed.

    ![Review Licenses screen showing the license sidebar with reviewed status and the Accept License(s) and Install button](./images/package-manager-ui-license-acceptance-dark.png#only-dark)
    ![Review Licenses screen showing the license sidebar with reviewed status and the Accept License(s) and Install button](./images/package-manager-ui-license-acceptance-light.png#only-light)

5. Installation begins. A progress indicator appears during installation.

!!! note
    Built-in packages ship with CFS and cannot be uninstalled. They are indicated by a tool icon (![tool icon](./images/package-manager-ui-tool-icon-dark.png#only-dark)![tool icon](./images/package-manager-ui-tool-icon-light.png#only-light)) rather than a delete icon.

## Uninstall packages

1. Select the delete icon to the right of the package card (installed packages only).
2. If the package has dependent packages that will also be removed, a confirmation modal lists them.
3. Select **Uninstall** (or **Yes, Uninstall All** when dependent packages are listed) to confirm, or **Cancel** to exit without changes.

Select **Don't show this message again** in the confirmation modal to skip the confirmation dialog for future uninstalls where the package has no dependents. The confirmation dialog always appears when dependent packages will also be removed.

!!! tip
    To remove cached packages after uninstalling, use the **(CFS) Delete Package from Cache** command in the Command Palette. See [Manage packages from the Command Palette](manage-packages-command-palette.md#delete-a-package-from-cache).
