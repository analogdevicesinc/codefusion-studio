---
description: CFSUtil - myAnalog Authentication
author: Analog Devices
date: 2026-10-12
---

# myAnalog authentication

The `myanalog` commands allow you to authenticate with a myAnalog account in order to retrieve, install, and manage SDKs, plugins, and toolchains distributed using the Package Manager.

These commands are the command-line equivalents of the authentication options available in the Command Palette, documented in [Access restricted packages](../installation/package-manager/auth.md).

## Login

`cfsutil myanalog login [-f json|text] [-v | -q]`

Login with a myAnalog account. A dialog will prompt you to open an external website where you can log in with your myAnalog credentials.
Once authenticated, VS Code will confirm that you can now proceed to install packages.

| Flag              | Description                  |
| ----------------- | ---------------------------- |
| `-v, --verbose`   | After a new login, also show the user ID and scopes of the session. If you're already logged in, use `cfsutil myanalog status --verbose` instead. Mutually exclusive with `--quiet`. |
| `-q, --quiet`     | Suppress non-error output, including warnings. Mutually exclusive with `--verbose`. |
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! note
    Aliases: `cfsutil auth login`

!!! example
    ```sh
    cfsutil myanalog login
    cfsutil myanalog login --verbose
    ```

## Logout

`cfsutil myanalog logout [-f json|text]`

Log out of the current myAnalog session. With `--format json`, output uses the [JSON output envelope](index.md#json-output-envelope).

!!! note
    Aliases: `cfsutil auth logout`

!!! example
    ```sh
    cfsutil myanalog logout
    ```

## Status

`cfsutil myanalog status [-v | -q] [--format text|json]`

Show myAnalog authentication status.

| Flag              | Description                  |
| ----------------- | ---------------------------- |
| `-v, --verbose`   | Also show the user ID and scopes of the session. Mutually exclusive with `--quiet`. |
| `-q, --quiet`     | Suppress non-error output, including warnings. Mutually exclusive with `--verbose`. |
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! note
    Aliases: `cfsutil auth status`

!!! example
    ```sh
    cfsutil myanalog status
    cfsutil myanalog status --verbose
    ```
