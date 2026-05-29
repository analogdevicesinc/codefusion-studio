# CLI development configuration

The `cfsutil` CLI uses [Oclif configuration](https://oclif.io/docs/config) to load custom runtime settings, including additional search paths for development packages such as SoC data models, plugins, or toolchains.

## Configuration directory

The CLI reads configuration from `config.json`. The installer creates this file automatically at:

| Platform     | Default Location                           |
|--------------|--------------------------------------------|
| Linux/macOS  | `~/.config/cfsutil/config.json`            |
| Windows      | `%LOCALAPPDATA%\cfsutil\config.json`       |

The default file contains:

```json
{
  "cfs.jlink.path": ""
}
```

**Note:** The installer only creates the file if it doesn't already exist, preserving any user modifications.

You can override this directory using environment variables:

- `CFSUTIL_CONFIG_HOME` – overrides the config directory path
- `XDG_CONFIG_HOME` – (Linux only) follows XDG base directory spec

## Configure package paths during development

Define custom search paths for development packages in your `config.json` file. A template is available in `packages/cli/config/cfsutil/config.json` for development use.

### Example configuration

For development workflows, you can customize `config.json` with the following options:

```json
{
  "dataModelSearchPaths": ["/absolute/path/to/packages/cfs-data-models/socs"],
  "toolSearchPaths": ["/opt/toolchains/arm-gnu-toolchain/bin"],
  "catalogStorePath": "/custom/path/to/catalog",
  "cfsInstallPath": "/absolute/path/to/cfs/install",
  "env": {
    "ARM_GCC_DIR": "/opt/toolchains/arm-gnu-toolchain/bin",
    "PATH": "/opt/toolchains/arm-gnu-toolchain/bin"
  }
}
```

**Configuration options:**

- **`dataModelSearchPaths`** – Array of absolute paths to search for SoC data model packages. Use this to override the default packaged data models with local development versions.
- **`toolSearchPaths`** – Array of absolute paths to search for tools and toolchains. The CLI searches these paths when resolving tool commands.
- **`catalogStorePath`** – Optional custom path for storing catalog data. Defaults to `~/cfs/<version>/.catalog`, where `<version>` is the version-specific CodeFusion Studio subdirectory.
- **`cfsInstallPath`** – Fallback path to the CFS installation directory (must contain `cfs.json`). Used when `CFS_INSTALL_DIR` environment variable and `cfs.sdk.path` are not set. Setting this avoids expensive directory traversal during startup.
- **`env`** – CLI-wide environment variables added to every task execution. Variables defined here are available to all CLI commands.

For the complete, authoritative list of valid configuration fields, see the TypeScript definition in `src/types/cli-config.ts`.

### Settings resolution order

The CLI resolves configuration from these sources, in this order:

1. Built-in CFS setting defaults packaged inside `cfsutil`
2. User `config.json`
3. Workspace `.code-workspace` settings (when running within a workspace file)
4. Project `.vscode/settings.json` (when running tasks within a workspace folder)

Settings from later sources override earlier ones. For example, project `.vscode/settings.json` values take precedence over workspace `.code-workspace` settings, and workspace settings override user `config.json`.

## Settings defaults extraction

The CLI loads baseline `cfs.*` defaults from `cfs-lib` at runtime. These defaults are generated from the IDE configuration metadata in `packages/ide/package.json` by:

- Script file: `packages/cfs-lib/scripts/extract-setting-defaults.js`
- Workspace script: `yarn ws:lib extract-defaults` (defined in `packages/cfs-lib/package.json`)

Run extraction whenever IDE setting defaults change and before running CLI tests or packaging flows that should use the latest defaults:

```bash
yarn ws:lib extract-defaults
```

This generates:

- `packages/cfs-lib/src/resources/cfs-setting-defaults.json`

CI workflows for CLI tests and tarball/release packaging run this command when building the cfs-lib.

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

To use custom SoC data model paths during development, set the `dataModelSearchPaths` option in your `config.json` (see example configuration above).

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

## Testing

### Running tests

**Development test scripts** (no coverage, no auto-cleanup, accepts mocha flags):

```bash
yarn ws:cli test:dev                    # All command tests

# Development scripts support mocha flags:
yarn ws:cli test:dev --grep "socs info"   # Run specific test
yarn ws:cli test:dev --watch               # Watch mode
yarn ws:cli test:dev --bail                # Stop on first failure
```

The development scripts are designed for iterative testing during development. They skip coverage instrumentation for faster execution and don't automatically clean fixtures, allowing you to inspect test artifacts between runs.

### Test fixtures cleanup

The CLI tests use fixtures that simulate catalog data and package structures. During test execution, the CatalogManager may create temporary directories and cache files in the fixtures directory.

**Automatic cleanup:** The CI test scripts (`test`, `test-plugins`, `test-gen`) automatically clean fixtures after each run (regardless of pass/fail) via the `clean-fixtures` script. Development scripts (`test:dev*`) do not auto-cleanup, allowing you to inspect artifacts.

**Preserve fixtures for debugging:** Set the `PRESERVE_TEST_FIXTURES` environment variable to skip cleanup:

```bash
PRESERVE_TEST_FIXTURES=1 yarn ws:cli test
```

**Manual cleanup:** Remove auto-generated test artifacts manually:

```bash
yarn clean-fixtures
```

**Auto-generated artifacts** (excluded from git):

- `test/fixtures/catalog/soc/db.*.tmp/` – Temporary directories created during catalog operations
- `test/fixtures/catalog/soc/db/A/` – Lowdb cache directory

### Test environment variables

The test suite uses several environment variables to configure the test environment:

- **`CFS_INSTALL_DIR`** – Points to the test fixtures directory to avoid expensive filesystem traversal. Set to `test/fixtures` in test scripts.
- **`CFSUTIL_CONFIG_HOME`** – Overrides the config directory to use test-specific configuration at `test/config/cfsutil/`
- **`XDG_CONFIG_HOME`** – Alternative config directory override (Linux/macOS)
- **`PRESERVE_TEST_FIXTURES`** – When set to `1`, skips automatic cleanup of test artifacts after test runs

These are configured in `test/setup.js` and the test scripts in `package.json`.
