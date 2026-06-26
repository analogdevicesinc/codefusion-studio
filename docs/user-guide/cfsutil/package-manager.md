---
description: CFSUtil - Package Manager
author: Analog Devices
date: 2026-05-20
---

# Package Manager

The CFS Package Manager allows you to retrieve, install, and manage SDKs, plugins, and toolchains directly from a remote server, enabling access to new features and updates independently of full IDE releases. For additional information see [Install CFS components using the Package Manager](../installation/package-manager/index.md).

## Add remote

`cfsutil pkg add-remote <remote-name> <url>`

Registers a new package server to retrieve packages.

| Argument        | Description                                                                                                                                           |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `<remote-name>` | The name used to identify the remote, such as `myserver`. This name is required to use other commands such as `login`, `logout`, and `delete-remote`. |
| `<url>`         | The URL of the package server.                                                                                                                        |

!!! example
    ```sh
    cfsutil pkg add-remote myserver https://my.server.url
    ```

## Authenticate remote

`cfsutil pkg auth-remote <remote-name>`

Configures authentication for a remote package server.

This command defines how `cfsutil` authenticates when accessing the specified remote, using either credentials, a myAnalog session, or no authentication.

| Argument        | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| `<remote-name>` | The name of the remote to authenticate. This must match a remote added using `add-remote`. |

| Flag                    | Description                                                            |
| ----------------------- | ---------------------------------------------------------------------- |
| `--user <username>`     | Authenticate using a username. Prompts for a password if not provided. |
| `--password <password>` | Password, API key, or token for authentication.                        |
| `--myanalog`            | Authenticate automatically using your active myAnalog session.         |
| `--none`                | Disable authentication for the remote.                                 |

!!! example
    ```sh
    cfsutil pkg auth-remote myserver --user USERNAME --password PASSWORD
    cfsutil pkg auth-remote myserver --myanalog
    cfsutil pkg auth-remote myserver --none
    ```

!!! note
    `--myanalog` uses your current myAnalog session. If you are not logged in, run `cfsutil myanalog status` to check your session and `cfsutil myanalog login` to sign in, then run the command again.

## Delete

`cfsutil pkg delete <pattern>`

Deletes packages from the local cache.

!!! warning
    Deleting a package permanently removes it from the local cache. To use a deleted package again, reinstall it using the `cfsutil pkg install` command.

| Argument      | Description                                                                   |
|---------------|-------------------------------------------------------------------------------|
| `<pattern>`   | A package pattern in the form `<pkg_name>/<version>`. Wildcards (*) allowed.  |

!!! example "Delete all unused packages"
    ```sh
    cfsutil pkg delete "*"
    ```

!!! note
    Wrap the pattern in quotes to avoid issues with wildcard expansion.

## Delete remote

`cfsutil pkg delete-remote <remote-name>`

Unregisters a package server so it is no longer considered for package retrieval.

| Argument        | Description                                                                                                          |
|-----------------|----------------------------------------------------------------------------------------------------------------------|
| `<remote-name>` | The name of the remote to delete. The `<remote-name>` should match the name provided using the `add-remote` command. |

!!! example
    ```sh
    cfsutil pkg delete-remote myserver
    ```

## View dependencies

`cfsutil pkg dependencies <package-reference>`

Retrieves a list of all the dependencies of a given package, including transitive dependencies. The package does not need to be installed.

| Argument              | Description                                         |
| --------------------- | --------------------------------------------------- |
| `<package-reference>` | Package reference in the format `pkg_name/version`.  |

!!! example
    ```sh
    cfsutil pkg dependencies zephyr/4.3.0
    ```

## Package information

`cfsutil pkg info <package-reference>`

Retrieves metadata for a given package. The package does not need to be installed.

| Argument             | Description                                         |
|----------------------|-----------------------------------------------------|
| `<package-reference>` | Package reference in the format `pkg_name/version`. |

| Flag           | Description               |
|----------------|---------------------------|
| `-f, --format` | Output format (JSON only) |

!!! example

    ```sh
    cfsutil pkg info zephyr/4.3.0 -f=json
    ```

## Install

`cfsutil pkg install <reference> [-l|--local] [--acceptLicense]`

Install a CFS package, including all its dependencies.

| Argument             | Description                                         |
|----------------------|-----------------------------------------------------|
| `<reference>` | Package reference (`pkg_name/version`) or path to a manifest file (for example, `C:\Users\<username>\cfs\2.2.1\my-sample-workspace\.cfs\.cfsdependencies`). |

| Flag                | Description                            |
|---------------------|----------------------------------------|
| `-l, --local`       | Install packages from local cache only |
| `--acceptLicense`   | Accept package license(s). Required for packages that include a license agreement. If not provided, you will be prompted interactively. |

!!! example
    ```sh
    cfsutil pkg install zephyr/4.3.0
    ```

!!! example "Install packages from a workspace manifest file"
    ```sh
    cfsutil pkg install /path/to/workspace/.cfs/.cfsdependencies
    ```

### Version range syntax

The `cfsutil pkg install` command supports semantic versioning (SemVer) range expressions. Version ranges allow you to specify acceptable versions rather than a single fixed version.

CFS packages use the semantic version format: `MAJOR.MINOR.PATCH`.

!!! note "Version range syntax limitations"
    The `<packageName>/<version>` format supports a single version token only. This can be:

    - An exact version (for example, `2.1.0`)
    - A caret range (`^2.0.0`)
    - A tilde range (`~2.0.0`)
    - A single comparison operator (`>=2.0.0`)

    Compound constraints (for example, `>=2.0.0 <3.0.0`), logical OR (`||`), and wildcard patterns (`2.1.*`) are only supported when installing packages from a manifest file.

#### Caret ranges (`^`)

Allows updates that do not change the major version (minor and patch updates are permitted). Package Manager installs the newest available version that satisfies the range.

!!! example "Install plugins with ^2.0.0 - allows 2.0.1 through 2.x.x"
    ```sh
    cfsutil pkg install "cfs_base_plugins/^2.0.0"
    ```

**Result:** Installs `cfs_base_plugins/2.2.1` (highest available version within major version 2).

#### Tilde ranges (`~`)

Allows only patch-level updates within the specified minor version.

!!! example "Install latest patch version only"
    ```sh
    cfsutil pkg install "cfs_base_data_models/~2.0.0"
    ```

**Result:** Installs `cfs_base_data_models/2.0.1` (highest 2.0.x version, does not include 2.1.0 or 2.2.1)

#### Comparison operators (`>=`, `<=`, `>`, `<`, `=`)

Allows explicit version constraints using comparison operators.

!!! example "Greater than or equal to (>=)"
    ```sh
    cfsutil pkg install "cfs_base_plugins/>=2.0.0"
    ```
**Result:** Installs `cfs_base_plugins/2.2.1` (highest available version greater than or equal to 2.0.0).

!!! example "Less than (<)"
    ```sh
    cfsutil pkg install "cfs_base_plugins/<2.1.0"
    ```

**Result:** Installs `cfs_base_plugins/2.0.1` (highest available version lower than 2.1.0).

!!! example "Greater than (>)"
    ```sh
    cfsutil pkg install "cfs_base_data_models/>2.0.1"
    ```

**Result:** Installs `cfs_base_data_models/2.2.1` (highest available version greater than 2.0.1).

!!! note
    Version ranges must be enclosed in quotes to prevent shell interpretation of special characters.

!!! info "Default behavior"
    Package versions follow [:octicons-link-external-24: semantic versioning](https://semver.org/){:target="_blank"} in the form `MAJOR.MINOR.PATCH` with optional pre-release identifiers (for example, `-b.1`). When a version range is specified (for example, using caret `^`, tilde `~`, or comparison operators), Package Manager installs the newest available stable version that satisfies the constraint. For example, `cfsutil pkg install "cfs_base_data_models/~2.0.0"` installs the newest available `2.0.x` version.

!!! info "Pre-release versions"
    Pre-release versions follow the semantic versioning pre-release syntax and are not selected by default when resolving version ranges. They must be specified explicitly, so `packageName/1.0.0-b.1` installs exactly that pre-release version.

#### Manifest files

In addition to installing individual packages, you can install multiple packages using a manifest file. Manifest files also support more advanced version expressions, such as compound constraints, which are not supported in the `<packageName>/<version>` format.

In CodeFusion Studio, you can find an example manifest file (called `.cfsdependencies`) in the workspace `.cfs` directory. For example: `C:\Users\<username>\cfs\2.2.1\my-sample-workspace\.cfs\.cfsdependencies`. The `.cfsdependencies` file is the standard workspace manifest used by CodeFusion Studio. You can also install packages from any manifest file that follows the same JSON format by providing its path to `cfsutil pkg install`.

This file specifies the packages and versions required by the workspace.

Example manifest file:

```json
{
  "version": 1,
  "packages": [
    {
      "name": "msdk",
      "version": "2.2.1"
    },
    {
      "name": "cfs_base_data_models",
      "version": "2.2.1"
    },
    {
      "name": "cfs_base_plugins",
      "version": "2.2.1"
    }
  ]
}
```

The `version` field in a manifest file supports semantic version range syntax, including compound constraints.

Example:

```json
{
  "version": 1,
  "packages": [
    {
      "name": "cfs_base_plugins",
      "version": ">=2.0.0 <3.0.0"
    }
  ]
}
```

!!! example "Install the manifest file"
    ```sh
    cfsutil pkg install /path/to/workspace/.cfs/.cfsdependencies
    ```

**Result:** Installs the newest available version that satisfies the version constraint specified in the manifest file (for example, `cfs_base_plugins/2.2.1`).

### Install from local cache

Use the `-l` or `--local` flag to install packages only from the local cache, without accessing remote repositories.

Scenario: You have previously installed the following plugin versions, which are now available in the local cache:

- `cfs_base_plugins/2.0.0`
- `cfs_base_plugins/2.1.0`

You want to install a version from the local cache without checking for newer versions remotely.

!!! example "Install a specific cached version"

    ```sh
    cfsutil pkg install cfs_base_plugins/2.0.0 --local
    ```

This installs exactly version `2.0.0` from the local cache.

!!! example "Install the newest compatible cached version using a range"

    ```sh
    cfsutil pkg install "cfs_base_plugins/^2.0.0" --local
    ```

This installs the newest cached version that satisfies the range (for example, `2.1.0`), without accessing remote repositories.

!!! example "Install workspace dependencies from a manifest file using local cache only"

    ```sh
    cfsutil pkg install /path/to/workspace/.cfs/.cfsdependencies --local
    ```

This installs all required workspace packages from the local cache.

!!! note
    The `--local` flag restricts installation to packages available in the local cache only. If no cached version satisfies the specified version or range, the installation fails.

## List

`cfsutil pkg list [<pattern>]`

List installed packages.

| Argument     | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `<pattern>`  | Optional pattern to match package names and versions. Supports wildcards `*`. |

| Flag                     | Description                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `-f, --filter=KEY=VALUE` | Optional filter on package metadata. If used multiple times, all conditions must be satisfied.          |

!!! example
    ```sh
    # List all installed packages
    cfsutil pkg list

    # Search for a package that supports MAX32690
    cfsutil pkg list -f soc=MAX32690

    # Search for a package that supports CodeFusion Studio version 2.0.0 and SDK
    cfsutil pkg list -f cfsVersion=^2.0 -f type=sdk
    ```

!!! tip
    The `--filter` option accepts metadata keys shown by the `pkg info` command.

## List cache

`cfsutil pkg list-cache [<pattern>] [--format text|json]`

Lists all packages stored in the local cache, including those that are not currently installed.

| Argument     | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `<pattern>`  | Optional pattern to match package names and versions. Supports wildcards `*`. |

| Flag                     | Description                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `--format=<format>`      | Output format: `text` (default) or `json`                                                              |

!!! example
    ```sh
    # List all cached packages
    cfsutil pkg list-cache

    # Search cached packages matching a pattern
    cfsutil pkg list-cache "cfs_base*"

    # List specific package versions in cache
    cfsutil pkg list-cache "zephyr/4.*"

    # Output as JSON
    cfsutil pkg list-cache --format json
    ```

## List remotes

`cfsutil pkg list-remotes`

Lists all remote servers that have been registered for package retrieval.

!!! example
    ```sh
    Name           URL                                 Authentication  Default
    ────────────── ─────────────────────────────────── ─────────────── ───────
    my-remote      https://packages.example.com        None            Yes
    ```

### Output fields

| Column             | Description                                                    |
|--------------------|----------------------------------------------------------------|
| **Name**           | The name of the remote. |
| **URL**            | The URL of the package server.             |
| **Authentication** | Shows the authentication method configured for the remote. This may be `None`, `myAnalog session` (or `myAnalog session (inactive)` if not logged in), or a username-based authentication method. |
| **Default**        | Indicates whether the remote is a pre-configured remote (not user-added).           |

## Local consumers

`cfsutil pkg local-consumers <name>`

Retrieves a list of all installed packages that depend on a given package, including transitive consumers.

This command is useful when attempting to uninstall a package, as it helps identify which other packages depend on it.

| Argument | Description                    |
|----------|--------------------------------|
| `<name>` | Name of the installed package. |

!!! example
    ```sh
    cfsutil pkg local-consumers zephyr
    ```

!!! example "Sample output"
    ```sh
    zephyr is not required by any other package
    ```

## Search

`cfsutil pkg search <pattern>`

Retrieve packages available for install.

| Argument    | Description                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------- |
| `<pattern>` | Search pattern in the format `pkg_name/version`. Use * as a wildcard.|

!!! example
    ```sh
    cfsutil pkg search "zephyr*"
    ```
!!! note
    Wrap the pattern in quotes to avoid issues with wildcard expansion.

## Uninstall

`cfsutil pkg uninstall <name>`

Uninstalls a package. It remains in the local cache for reuse without re-downloading.

!!! warning
    A package cannot be uninstalled if it is required by another installed package.
    Use the `local-consumers` command to identify dependent packages that must be removed first.

| Argument | Description                    |
| -------- | ------------------------------ |
| `<name>` | Name of the installed package. |

!!! example
    ```sh
    cfsutil pkg uninstall zephyr
    ```
