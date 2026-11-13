---
description: CFSUtil - Package Manager
author: Analog Devices
date: 2026-10-14
---

# Package Manager

The CFS Package Manager allows you to retrieve, install, and manage SDKs, plugins, and toolchains directly from a remote server, enabling access to new features and updates independently of full IDE releases. For additional information see [Install CFS components using the Package Manager](../installation/package-manager/index.md).

Package remotes can be either managed or custom.

- Managed remotes are configured automatically by CodeFusion Studio.
- Custom remotes are user-defined remotes that you add manually.

Managed remotes cannot be deleted or edited, but you can enable or disable them. Additional managed remotes may be available when logged in with a myAnalog account or using an API key.

## Add remote

`cfsutil pkg add-remote <remote-name> <url> [--format text|json]`

Registers a new custom package server to retrieve packages from.

| Argument        | Description                                                                                                                                           |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `<remote-name>` | The name used to identify the remote, such as `myserver`. This name is required to use other commands such as `auth-remote`, `disable-remote`, and `delete-remote`. |
| `<url>`         | The URL of the package server.                                                                                                                        |

| Flag | Description |
|------|-------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example
    ```sh
    cfsutil pkg add-remote myserver https://my.server.url
    ```

!!! note
    CodeFusion Studio configures managed remotes automatically. If you log in with a myAnalog account, `cfsutil` can configure additional remotes for restricted content. To check the configured remotes, run `cfsutil pkg list-remotes`.

## Authenticate remote

`cfsutil pkg auth-remote <remote-name> [--format text|json]`

Configures authentication for a remote package server.

This command defines how `cfsutil` authenticates when accessing the specified remote, using either credentials you specify, or no authentication.

This command can only be used with custom remotes. Managed remotes authenticate automatically and cannot be configured with `auth-remote`.

| Argument        | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| `<remote-name>` | The name of the remote to authenticate. This must match a remote added using `add-remote`. |

| Flag                    | Description                                                            |
| ----------------------- | ---------------------------------------------------------------------- |
| `--user <username>`     | Authenticate using a username. Prompts for a password if not provided. |
| `--password <password>` | Password, API key, or token for authentication.                        |
| `--none`                | Disable authentication for the remote.                                 |
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). When you use `--user` with JSON output, also provide `--password`. |

!!! example
    ```sh
    cfsutil pkg auth-remote myserver --user USERNAME --password PASSWORD
    cfsutil pkg auth-remote myserver --none
    ```

!!! note
    Some managed remotes obtain credentials automatically when you are logged in to myAnalog or have set the `CFS_API_KEY` environment variable with a valid API key. Run `cfsutil myanalog status` to check your session and `cfsutil myanalog login` to sign in, then run `cfsutil pkg list-remotes` to check which remotes are using managed credentials.

## Delete

`cfsutil pkg delete <pattern> [--format text|json]`

Deletes packages from the local cache.

!!! warning
    Deleting a package permanently removes it from the local cache. To use a deleted package again, reinstall it using the `cfsutil pkg install` command.

| Argument      | Description                                                                   |
|---------------|-------------------------------------------------------------------------------|
| `<pattern>`   | A package pattern in the form `<pkg_name>/<version>`. Wildcards (*) allowed.  |

| Flag | Description |
|------|-------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example "Delete all unused packages"
    ```sh
    cfsutil pkg delete "*"
    ```

!!! note
    Wrap the pattern in quotes to avoid issues with wildcard expansion.

## Delete remote

`cfsutil pkg delete-remote <remote-name> [--format text|json]`

Unregisters a custom package server so it is no longer considered for package retrieval.

| Argument        | Description                                                                                                          |
|-----------------|----------------------------------------------------------------------------------------------------------------------|
| `<remote-name>` | The name of the remote to delete. The `<remote-name>` should match the name provided using the `add-remote` command. |

| Flag | Description |
|------|-------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example
    ```sh
    cfsutil pkg delete-remote myserver
    ```

!!! note
    Managed remotes cannot be deleted. Use `cfsutil pkg disable-remote <remote-name>` if you want to prevent a managed remote from being used.

## Enable remote

`cfsutil pkg enable-remote <remote-name> [--format text|json]`

Enables a previously disabled remote package server.

| Argument        | Description                                  |
|-----------------|----------------------------------------------|
| `<remote-name>` | The name of the remote to enable.            |

| Flag | Description |
|------|-------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example
    ```sh
    cfsutil pkg enable-remote myserver
    ```

## Disable remote

`cfsutil pkg disable-remote <remote-name> [--format text|json]`

Disables a remote package server.

| Argument        | Description                                  |
|-----------------|----------------------------------------------|
| `<remote-name>` | The name of the remote to disable.           |

| Flag | Description |
|------|-------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example
    ```sh
    cfsutil pkg disable-remote myserver
    ```

## View dependencies

`cfsutil pkg dependencies <package-reference> [--format text|json]`

Retrieves a list of all the dependencies of a given package, including transitive dependencies. The package does not need to be installed.

| Argument              | Description                                         |
| --------------------- | --------------------------------------------------- |
| `<package-reference>` | Package reference in the format `pkg_name/version`.  |

| Flag | Description |
|------|-------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

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
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example

    ```sh
    cfsutil pkg info zephyr/4.3.0 -f=json
    ```

## Install

`cfsutil pkg install [<reference>] [-l|--local] [-t|--tar <path>] [--acceptLicense] [--format text|json]`

Install a CFS package, including all its dependencies.

| Argument             | Description                                         |
|----------------------|-----------------------------------------------------|
| `<reference>` | Package reference (`pkg_name/version`) or path to a manifest file (for example, `C:\Users\<username>\cfs\2.4.0\my-sample-workspace\.cfs\.cfsdependencies`). Required unless you use `--tar`. |

| Flag                | Description                            |
|---------------------|----------------------------------------|
| `-l, --local`       | Install packages from local cache only |
| `-t, --tar <path>` | Install a package from a local tarball. Can't be combined with `<reference>`. |
| `--acceptLicense`   | Accept package license(s). Required for packages that include a license agreement. If not provided, you will be prompted interactively. Has no effect with `--tar`. |
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). For packages that require license acceptance, also use `--acceptLicense`. |

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

**Result:** Installs `cfs_base_plugins/2.4.0` (highest available version within major version 2).

#### Tilde ranges (`~`)

Allows only patch-level updates within the specified minor version.

!!! example "Install latest patch version only"
    ```sh
    cfsutil pkg install "cfs_base_data_models/~2.0.0"
    ```

**Result:** Installs `cfs_base_data_models/2.0.1` (highest 2.0.x version, does not include 2.1.0 or 2.4.0)

#### Comparison operators (`>=`, `<=`, `>`, `<`, `=`)

Allows explicit version constraints using comparison operators.

!!! example "Greater than or equal to (>=)"
    ```sh
    cfsutil pkg install "cfs_base_plugins/>=2.0.0"
    ```
**Result:** Installs `cfs_base_plugins/2.4.0` (highest available version greater than or equal to 2.0.0).

!!! example "Less than (<)"
    ```sh
    cfsutil pkg install "cfs_base_plugins/<2.1.0"
    ```

**Result:** Installs `cfs_base_plugins/2.0.1` (highest available version lower than 2.1.0).

!!! example "Greater than (>)"
    ```sh
    cfsutil pkg install "cfs_base_data_models/>2.0.1"
    ```

**Result:** Installs `cfs_base_data_models/2.4.0` (highest available version greater than 2.0.1).

!!! note
    Version ranges must be enclosed in quotes to prevent shell interpretation of special characters.

!!! info "Default behavior"
    Package versions follow [:octicons-link-external-24: semantic versioning](https://semver.org/){:target="_blank"} in the form `MAJOR.MINOR.PATCH` with optional pre-release identifiers (for example, `-b.1`). When a version range is specified (for example, using caret `^`, tilde `~`, or comparison operators), Package Manager installs the newest available stable version that satisfies the constraint. For example, `cfsutil pkg install "cfs_base_data_models/~2.0.0"` installs the newest available `2.0.x` version.

!!! info "Pre-release versions"
    Pre-release versions follow the semantic versioning pre-release syntax and are not selected by default when resolving version ranges. They must be specified explicitly, so `packageName/1.0.0-b.1` installs exactly that pre-release version.

### Manifest files

In addition to installing individual packages, you can install multiple packages using a manifest file. Manifest files also support more advanced version expressions, such as compound constraints, which are not supported in the `<packageName>/<version>` format.

In CodeFusion Studio, you can find an example manifest file (called `.cfsdependencies`) in the workspace `.cfs` directory. For example: `C:\Users\<username>\cfs\2.4.0\my-sample-workspace\.cfs\.cfsdependencies`. The `.cfsdependencies` file is the standard workspace manifest used by CodeFusion Studio. You can also install packages from any manifest file that follows the same JSON format by providing its path to `cfsutil pkg install`.

This file specifies the packages and versions required by the workspace.

Example manifest file:

```json
{
  "version": 1,
  "packages": [
    {
      "name": "msdk",
      "version": "2.4.0"
    },
    {
      "name": "cfs_base_data_models",
      "version": "2.4.0"
    },
    {
      "name": "cfs_base_plugins",
      "version": "2.4.0"
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

**Result:** Installs the newest available version that satisfies the version constraint specified in the manifest file (for example, `cfs_base_plugins/2.4.0`).

### Install from a local tarball

Use the `-t` or `--tar` flag to install a package from a tarball on disk. The package contents come from the tarball instead of a package server. Specify either a package reference or `--tar`, not both. On a machine without network access, also use `--local` to skip setting up package remotes.

!!! example "Install a package from a tarball"

    ```sh
    cfsutil pkg install --tar /path/to/plugins.tgz
    ```

!!! warning
    The package in the tarball must match your operating system, unless it's a generic package. If the installation fails, delete the package from the cache with `cfsutil pkg delete "<reference>"` before you retry.

#### Create a tarball

To create a tarball from a package that is already installed, use the `conan cache save` command. Conan is the package manager that CodeFusion Studio uses and it is installed by the CodeFusion Studio installer.

1. Add the folder that contains `conan` to your `PATH`. Replace `<cfs-install>` with your CodeFusion Studio installation folder.

    === "Windows"

        In Command Prompt:

        ```bat
        set PATH=<cfs-install>\Tools\python\Scripts;%PATH%
        ```

        In PowerShell:

        ```powershell
        $env:PATH = "<cfs-install>\Tools\python\Scripts;$env:PATH"
        ```

    === "Linux"

        ```sh
        export PATH="<cfs-install>/Tools/python/bin:$PATH"
        ```

    === "macOS"

        ```sh
        export PATH="<cfs-install>/Tools/python/bin:$PATH"
        ```

    To check that it worked, run `conan --version`.

2. Set the `CONAN_HOME` environment variable to the folder where the package manager stores your installed packages.

    === "Windows"

        In Command Prompt:

        ```bat
        set CONAN_HOME=%LOCALAPPDATA%\com.analog.cfs\Data\packages\conan
        ```

        In PowerShell:

        ```powershell
        $env:CONAN_HOME = "$env:LOCALAPPDATA\com.analog.cfs\Data\packages\conan"
        ```

    === "Linux"

        ```sh
        export CONAN_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/com.analog.cfs/packages/conan"
        ```

    === "macOS"

        ```sh
        export CONAN_HOME="$HOME/Library/Preferences/com.analog.cfs/packages/conan"
        ```

3. Save the package, including its binary packages, to a file. Replace `cfs_base_plugins/2.4.0` with the package you want to save.

    !!! example "Create a tarball"

        ```sh
        conan cache save --no-source --file plugins.tgz "cfs_base_plugins/2.4.0:*"
        ```

The variables you set in steps 1 and 2 apply only to the current terminal session. Copy the resulting file to the target machine and install it with `cfsutil pkg install --tar`.

!!! note
    The tarball contains only the package you save, not its dependencies. If the package has dependencies that aren't installed on the target machine, the installation fails. To install such a package, create a tarball for each dependency as well, and install the dependencies first.

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

`cfsutil pkg list [<pattern>] [--format text|json]`

List installed packages.

| Argument     | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `<pattern>`  | Optional pattern to match package names and versions. Supports wildcards `*`. |

| Flag                     | Description                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `--filter=KEY=VALUE` | Optional filter on package metadata. If used multiple times, all conditions must be satisfied.          |
| `--format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example
    ```sh
    # List all installed packages
    cfsutil pkg list

    # Search for a package that supports MAX32690
    cfsutil pkg list --filter soc=MAX32690

    # Search for a package that supports CodeFusion Studio version 2.0.0 and SDK
    cfsutil pkg list --filter cfsVersion=^2.0 --filter type=sdk
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
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

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

`cfsutil pkg list-remotes [--format text|json]`

Lists all remote servers that have been registered for package retrieval.

| Flag | Description |
|------|-------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example
    ```sh
    ┌────────────────┬───────────────────────────────────────────────────────┬──────────────────┬────────┬────────────────────┐
    │ Name           │ URL                                                   │ Auth             │ Custom │ Status             │
    ├────────────────┼───────────────────────────────────────────────────────┼──────────────────┼────────┼────────────────────┤
    │ cfs-public     │ https://conan.cloudsmith.io/adi/codefusion-public     │ None             │ No     │ OK                 │
    ├────────────────┼───────────────────────────────────────────────────────┼──────────────────┼────────┼────────────────────┤
    │ my-remote      │ https://packages.example.com/                         │ username: user1  │ Yes    │ OK                 │
    ├────────────────┼───────────────────────────────────────────────────────┼──────────────────┼────────┼────────────────────┤
    │ old-remote     │ https://old-server.example.com/                       │ N/A              │ Yes    │ Disabled           │
    └────────────────┴───────────────────────────────────────────────────────┴──────────────────┴────────┴────────────────────┘
    ```

### Output fields

| Column    | Description |
|-----------|-------------|
| **Name**  | The name of the remote. |
| **URL**   | The URL of the package server. |
| **Auth**  | Shows the configured authentication method for the remote. This may be `None`, `myAnalog session`, `username: <username>`, or `N/A` for disabled custom remotes. |
| **Custom** | Indicates whether the remote is user-defined (`Yes`) or managed by CodeFusion Studio (`No`). |
| **Status** | The remote status. This may be `OK`, `Disabled`, or an error status if remote configuration fails. |

## Local consumers

`cfsutil pkg local-consumers <name> [--format text|json]`

Retrieves a list of all installed packages that depend on a given package, including transitive consumers.

This command is useful when attempting to uninstall a package, as it helps identify which other packages depend on it.

| Argument | Description                    |
|----------|--------------------------------|
| `<name>` | Name of the installed package. |

| Flag | Description |
|------|-------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example
    ```sh
    cfsutil pkg local-consumers zephyr
    ```

!!! example "Sample output"
    ```sh
    zephyr is not required by any other package
    ```

## Path

`cfsutil pkg path <name> [--format json|text]`

Retrieves the absolute filesystem path of an installed package.

| Argument | Description                          |
|----------|---------------------------------------|
| `<name>` | Name of the package, without version. |

| Flag       | Description                                          |
|------------|-------------------------------------------------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! note
    The package must be installed. If it is not, the command returns an error: `Package <name> is not installed`.

!!! example
    ```sh
    cfsutil pkg path zephyr
    ```

## Search

`cfsutil pkg search <pattern> [--format text|json]`

Retrieve packages available for install.

| Argument    | Description                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------- |
| `<pattern>` | Search pattern in the format `pkg_name/version`. Use * as a wildcard.|

| Flag | Description |
|------|-------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example
    ```sh
    cfsutil pkg search "zephyr*"
    ```
!!! note
    Wrap the pattern in quotes to avoid issues with wildcard expansion.

## Uninstall

`cfsutil pkg uninstall <name> [--format text|json]`

Uninstalls a package. It remains in the local cache for reuse without re-downloading.

!!! warning
    A package cannot be uninstalled if it is required by another installed package.
    Use the `local-consumers` command to identify dependent packages that must be removed first.

| Argument | Description                    |
| -------- | ------------------------------ |
| `<name>` | Name of the installed package. |

| Flag | Description |
|------|-------------|
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example
    ```sh
    cfsutil pkg uninstall zephyr
    ```
