---
description: Resolve missing or outdated package errors in CodeFusion Studio using the Package Manager.
author: Analog Devices
date: 2025-09-11
linked_in_ui: true
---

# Install required packages

Over time, you may need to update packages to newer versions or install missing ones that are not included in your current setup.  

For example, you might need to:  

- Add or update plugins
- Add or update SoC data models
- Install a missing package to resolve an error message

In these scenarios, use the Package Manager to install or update the required package.

## UI error messages

CodeFusion Studio may notify you about missing or incompatible packages. Messages vary depending on context, but they typically indicate that:

- **System Planner**
    - A required plugin is missing.
    - A required SoC data model is missing.

- **Workspace Creation**
    - One or more plugins are missing for Workspace templates.
    - A plugin is missing for code generation on a core.

!!! note
    The resolution is always the same: install or update the missing package.  
    - Some error messages include the plugin or data model name and version.  
    - Others only state that a required plugin is missing.  

    In either case, use the **Package Manager** to install the required dependency.  
    The name shown in the error message may not exactly match the package name you install. Use the package list in the Package Manager as the source of truth.

## Resolution

### Option 1: Use the Command Palette (recommended)

1. Open the **Command Palette** from the gear icon or press `Ctrl+Shift+P` (Windows/Linux) / `Cmd+Shift+P` (macOS).
2. In the **Command Palette**, type `CFS Install Package`.
3. Select the missing package from the list. A progress window will appear.
   After installation completes, a confirmation message will be shown.

### Option 2: Use the Command Line

1. Open the **CFS Terminal** (see [Manage packages from the command line (`cfsutil`)](manage-packages-cfsutil.md)).  

2. Search for available packages:  

    ```sh
    cfsutil pkg search "*"
    ```  

    !!! note
        Always wrap the search pattern in quotes to avoid issues with wildcard expansion.  

3. Identify the missing package and install it:  

    ```sh
    cfsutil pkg install <package-name>/<version>
    ```  

4. Verify installation:  

    ```sh
    cfsutil pkg list
    ```  

## Next steps

- If you are using restricted packages, make sure you are logged in with your myAnalog account. See [Log in to access restricted Packages](auth.md).
- For full package management instructions, see:  
    - [Manage Packages (Command Palette)](manage-packages-command-palette.md)  
    - [Manage Packages from the command line (`cfsutil`)](manage-packages-cfsutil.md)
