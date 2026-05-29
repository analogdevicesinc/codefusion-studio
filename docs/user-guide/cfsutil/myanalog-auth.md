---
description: CFSUtil - myAnalog Authentication
author: Analog Devices
date: 2026-03-23
---

# myAnalog authentication

The `myanalog` commands allow you to authenticate with a myAnalog account in order to retrieve, install, and manage SDKs, plugins, and toolchains distributed using the Package Manager.

These commands are the command-line equivalents of the authentication options available in the Command Palette, documented in [Access restricted packages](../installation/package-manager/auth.md).

## Login

`cfsutil myanalog login [--verbose]`

Login with a myAnalog account. A dialog will prompt you to open an external website where you can log in with your myAnalog credentials.
Once authenticated, VS Code will confirm that you can now proceed to install packages.

| Flag              | Description                  |
| ----------------- | ---------------------------- |
| `-v, --verbose`   | Enable verbose output.       |

!!! note
    Aliases: `cfsutil auth login`

!!! example
    ```sh
    cfsutil myanalog login
    cfsutil myanalog login --verbose
    ```

## Logout

`cfsutil myanalog logout`

Logout of the current myAnalog session.

!!! note
    Aliases: `cfsutil auth logout`

!!! example
    ```sh
    cfsutil myanalog logout
    ```

## Status

`cfsutil myanalog status [--verbose]`

Show myAnalog authentication status.

| Flag              | Description                  |
| ----------------- | ---------------------------- |
| `-v, --verbose`   | Enable verbose output.       |

!!! note
    Aliases: `cfsutil auth status`

!!! example
    ```sh
    cfsutil myanalog status
    cfsutil myanalog status --verbose
    ```
