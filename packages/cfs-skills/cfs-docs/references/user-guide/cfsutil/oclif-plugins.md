---
description: CFSUtil - Oclif Plugins
author: Analog Devices
date: 2026-03-23
---

# Oclif plugins

These plugins extend the `cfsutil` command-line interface. They allow users to add new commands to the CLI by installing plugins from npm or Git URLs. These plugins follow the Oclif plugin framework and are managed independently of CFS. They can be used for a variety of purposes, from verifying environment variables to integrating custom tooling into your CLI workflow.

## List plugins

`cfsutil plugins [--json] [--core]`

List installed plugins.

| Flag     | Description           |
|----------|-----------------------|
| `--core` | Show core plugins     |
| `--json` | Format output as JSON |

!!! example
    ```sh
    cfsutil plugins
    ```

## Inspect plugin

`cfsutil plugins inspect <PLUGIN>`

Displays installation properties of a plugin.

| Flag           | Description             |
|----------------|-------------------------|
| `-h, --help`   | Show CLI help          |
| `--json`       | Format output as JSON   |
| `-v, --verbose`| Show verbose output     |

!!! example
    ```sh
    cfsutil plugins inspect myplugin
    ```

## Install plugin

`cfsutil plugins install <PLUGIN>`

Installs a plugin into the CLI from npm or a Git URL. Installation of a user-installed plugin will override a core plugin. If the installed plugin defines a command with the same name as an existing command, the installed plugin version will take priority and override the default.

| Flag           | Description                          |
|----------------|--------------------------------------|
| `-f, --force`  | Run yarn install with force flag     |
| `-h, --help`   | Show CLI help                        |
| `-s, --silent` | Silences yarn output                 |
| `-v, --verbose`| Show verbose yarn output             |
| `--json`       | Format output as JSON                |

!!! note
    Aliases: `cfsutil plugins add`

!!! example
    ```sh
    cfsutil plugins install myplugin
    cfsutil plugins install https://github.com/someuser/someplugin
    ```

## Link plugin

`cfsutil plugins link <PATH>`

Links a plugin into the CLI for development. Installation of a linked plugin will override a user-installed or core plugin. If the linked plugin defines a command with the same name as a user-installed or core plugin, the linked version will take priority and override the existing implementation.

| Flag              | Description                                 |
|-------------------|---------------------------------------------|
| `-h, --help`   | Show CLI help                                  |
| `-v, --verbose`   | Show verbose output                         |
| `--[no-]install`  | Install dependencies after linking plugin   |

!!! example
    ```sh
    cfsutil plugins link ./myplugin
    ```

## Reset plugins

`cfsutil plugins reset [--hard] [--reinstall]`

Removes user-installed and linked plugins.

| Flag          | Description                                           |
|---------------|-------------------------------------------------------|
| `--hard`      | Also delete node_modules and related files            |
| `--reinstall` | Reinstall all plugins after uninstalling             |

## Uninstall plugin

`cfsutil plugins uninstall <PLUGIN>`

Removes a plugin from the CLI.

| Flag           | Description           |
|----------------|-----------------------|
| `-v, --verbose`| Show verbose output   |
| `-h, --help`   | Show CLI help         |

!!! note
    Aliases: `cfsutil plugins remove`, `cfsutil plugins unlink`

!!! example
    ```sh
    cfsutil plugins uninstall myplugin
    ```

## Update plugins

`cfsutil plugins update [-v]`

Update installed plugins.

| Flag           | Description           |
|----------------|-----------------------|
| `-v, --verbose`| Show verbose output   |
| `-h, --help`   | Show CLI help         |
