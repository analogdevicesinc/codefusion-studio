# CLI development configuration

The `cfsutil` CLI uses [Oclif configuration](https://oclif.io/docs/config) to load custom runtime settings, including additional search paths for development packages such as SoC data models, plugins, or toolchains.

## Configuration directory

The CLI reads configuration settings from the default directory depending on the operating system.

| Platform     | Default Location                          |
|--------------|--------------------------------------------|
| Linux/macOS | `~/.config/cfsutil/config.json`           |
| Windows     | `%LOCALAPPDATA%\cfsutil\config.json`     |

You can override this directory using environment variables:

- `CFSUTIL_CONFIG_HOME` – overrides the config directory path
- `XDG_CONFIG_HOME` – (Linux only) follows XDG base directory spec

## Configure package paths during development

Define custom search paths for development packages in your `config.json` file. This file is typically located in the default configuration directory, or in `packages/cli/config/config.json` for development use.

## Authentication configuration

Some CLI functions, such as package management, require authentication configuration. During development, this configuration is read from environment variables. In packaged builds, it is included as a configuration file in the CLI tarball.

To build the CLI tarball manually or to use authentication commands, you must set the following environment variables. The CLI checks the environment first, and will also look for a `.env` file in the current working directory, the CLI package directory, or the repository root directory (if the `dotenv` module is available). Make sure that any `.env` file you create is not checked into source control.

- **`CFS_AUTH_URL`** – URL of the authentication service.
- **`CFS_AUTH_CLIENT_ID`** – the client ID registered for this CLI application.
- **`CFS_AUTH_CALLBACK`** – the redirect URL to listen for the callback in the OAuth2 login flow (must be a valid URL with host `localhost` and protocol `http`).
- **`CFS_API_URL`** – the CCM service endpoint.
- **`CFS_AUTH_SCOPE`** – optional scopes; usually left blank to use the default set of scopes.

The configuration file `src/config/auth.json` is generated automatically from these environment variables when the CLI is packed, and should also not be checked in. It can also be created manually by running:

```sh
yarn ws:cli auth-cfg
```

### Data model package paths

Specify custom SoC data model paths to override the default packaged set:

#### Sample `config.json`

```json
{
  "dataModelSearchPaths": [
    "/absolute/path/to/packages/cfs-data-models/socs"
  ]
}
```

#### Generate the `.cfsdatamodels` index file

The `.cfsdatamodels` index file marks a directory as containing valid SoC data models. It is required by both the CLI and the IDE to resolve available models.

To generate this file, run the following command from the root of the repository:

```bash
    yarn ws:data-models generate-index
```

This scans the `packages/cfs-data-models/socs/` directory and creates a `.cfsdatamodels` index file:

```text
Generated data model index file: /path/to/packages/cfs-data-models/socs/.cfsdatamodels
MAX32650: TQFP, WLP
MAX32655: CTBGA, WLP
MAX32657: WLP
MAX32658: WLP
MAX32670: TQFN, WLP
MAX32690: TQFN, WLP
MAX78000: CTBGA
MAX78002: CSBGA
```

## Debug the CLI in development

The VS Code launch configuration **Execute CLI Dev Command** launches the CLI in development mode and uses the appropriate configuration files.

```json
{
  "env": {
    "CFSUTIL_CONFIG_HOME": "${workspaceFolder}/packages/cli/config",
    "XDG_CONFIG_HOME": "${workspaceFolder}/packages/cli/config"
  }
}
```

You can view or modify the full configuration in [.vscode/launch.json](../../../.vscode/launch.json).

### Debug a CLI command in VS Code

1. Open a source file inside `src/commands`.
2. Add a breakpoint where you want to pause execution.
3. Launch the **Execute CLI Dev Command** from the debug console.

This allows you to step through the CLI logic and inspect how the command executes in real time.
