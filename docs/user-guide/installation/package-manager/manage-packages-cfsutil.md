---
description: Use the CFS command-line utility (cfsutil) to install, view, or remove packages in CodeFusion Studio.
author: Analog Devices
date: 2025-10-30
---

# Manage packages from the command line (`cfsutil`)

You can use `cfsutil` to install, view, and remove packages in CodeFusion Studio as they become available.

To access `cfsutil`, open a new terminal (**View > Terminal** or `Ctrl+``). Then complete the following steps:

!!! note
    To run cfsutil from a system terminal outside VS Code, see [CFS command line utility](../../tools/cfsutil.md)

1. In the terminal panel, click the dropdown arrow next to the **+** icon.
2. Select **CFS Terminal** from the list.
3. Run your command, for example:

```sh
   cfsutil pkg --help
```

![Accessing cfsutil ](./images/access-cfs-terminal-dark.png#only-dark)
![Accessing cfsutil ](./images/access-cfs-terminal-light.png#only-light)

For additional information see [CFS Terminal](../../workspaces/cfs-terminal.md).

## Find available packages

To see what packages you can install, run:

```sh
cfsutil pkg search "*"
```

!!! note
    Wrap the pattern in quotes to avoid issues with wildcard expansion.

You can also view details about a package, whether or not it’s installed:

!!! example "Example: View package details"

    ```sh
    cfsutil pkg info zephyr/4.2.0
    ```

## Install a package

To install a package, run the following command with the package reference. The package reference is written in the format `<name>/<version>`.

```sh
cfsutil pkg install <package-reference>
```

Only one version of a package can be installed at a time. Installing a new version replaces the one currently installed.

See the following examples:

!!! example "Example: Install CFS plugins for workspace creation, System Planner configuration, and code generation"

    ```sh
    cfsutil pkg install cfs_base_plugins/<version>
    ```

!!! note
    Replace `<version>` with the latest version shown in the Package Manager.

!!! example "Example: Install CFS data models for System Planner"

    ```sh
    cfsutil pkg install cfs_base_data_models/<version>
    ```

!!! example "Example: Install Zephyr to develop Zephyr projects"

    ```sh
    cfsutil pkg install zephyr/<version>
    ```

!!! example "Example: Install MSDK to develop MAX32xxx and MAX7800x projects"

    ```sh
    cfsutil pkg install msdk/<version>
    ```

## Verify installation

To check what you’ve installed run:

```sh
cfsutil pkg list
```

To narrow the results, use a pattern with a wildcard:

!!! example "Example: List all Zephyr versions installed"

    ```sh
    cfsutil pkg list "zephyr*"
    ```

## Uninstall a package

To uninstall a package, first check if other packages depend on it:

```sh
cfsutil pkg local-consumers <name>
```

!!! example "Example: Check for dependent packages before uninstalling"

    ```sh
    cfsutil pkg local-consumers msdk
    ```

If dependencies are listed, you must uninstall those dependent packages first. If no dependencies are listed, you can uninstall the package. Only include the package name (not the version) in the command:

```sh
cfsutil pkg uninstall <name>
```

!!! example "Example: Uninstall the MSDK package"

    ```sh
    cfsutil pkg uninstall msdk
    ```

## Clean up unused packages

After uninstalling packages, you can remove any unused cached packages from your local storage:

```sh
cfsutil pkg delete "*"
```

This command deletes all packages that are not actively installed. If some packages are still in use, the command reports which ones remain. You can then uninstall those with:

```sh
cfsutil pkg uninstall <name>
```

and run the delete command again to complete the cleanup.

!!! Tip
    To view the full list of commands, run `cfsutil pkg --help` or refer to [cfsutil](../../tools/cfsutil.md#package-manager).

    Each command also provides its own help. For example: `cfsutil pkg install --help`.
