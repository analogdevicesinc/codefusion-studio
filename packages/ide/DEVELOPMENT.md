# Set up the development environment

The **Debug System Planner** launch configuration starts both the System Planner and Workspace Creation UIs. It supports full configuration debugging, from workspace creation to code generation.

## Setup requirements

Before launching **Debug System Planner** in VS Code, ensure that you have completed the following:

- [Configured the SoC catalog](#configure-the-soc-catalog) to display available devices in the Workspace Creation UI.
- [Built the plugins](#build-plugins) to populate available templates.
- [Configured the SoC data models](#configure-the-soc-data-models) so the System Planner UI can resolve the active SoC/Package.

> [!IMPORTANT]
> The catalog and data models must be configured independently.
> The **SoC catalog** is used by the **Workspace Creation UI**.
> The **SoC data models** are used by the **System Planner UI**.

### Authentication configuration

To enable authentication during development, you must define the following environment variables (for example, in a local `.env` file that is not checked into source control):

- **`CFS_AUTH_URL`** – URL of the authentication service.
- **`CFS_AUTH_CLIENT_ID`** – the client ID registered for this CLI application.
- **`CFS_AUTH_CALLBACK`** – the redirect URL to listen for the callback in the OAuth2 login flow (must be a valid URL with host `localhost` and protocol `http`).
- **`CFS_API_URL`** – the CCM service endpoint.
- **`CFS_AUTH_SCOPE`** – optional scopes; usually left blank to use the default set of scopes.

When the IDE is built, the configuration file `auth.json` is created automatically from these environment variables if it does not already exist. It should not be checked in. You can also create it manually by running:

```sh
yarn ws:ide auth-cfg
```

### Configure the SoC catalog

To render available SoCs in the Workspace Creation Wizard, the IDE requires a valid SoC catalog. This catalog contains metadata for supported SoCs, cores, packages, and boards.

You can configure the catalog in one of two ways:

1. [Extract the catalog from the CodeFusion Studio SDK](#extract-the-catalog-from-the-codefusion-studio-sdk).
2. [Build the catalog manually](#build-the-catalog-manually).

#### Extract the catalog from the CodeFusion Studio SDK

- Download the [VS Code SDK](../../docs/user-guide/installation/install-cfs.md).
- The catalog is available at: `CFS_INSTALL_DIR/Data/Soc/catalog.zip`.
- At runtime, the IDE extracts this archive to: `<userHome>/cfs/<version>/.catalog`.

To use a local version, extract `catalog.zip` manually and [update the catalog settings in VS Code](#update-the-catalog-settings-in-vs-code).

#### Build the catalog manually

You can build the SoC catalog from source using the following command:

```bash
yarn ws:ccm-lib build
```

The output is located at `packages/cfs-ccm-lib/dist/catalog`.

To ensure the IDE uses your local build, [update the catalog settings in VS Code](#update-the-catalog-settings-in-vs-code).

#### Update the catalog settings in VS Code

1. Open VS Code Settings (`Cmd+,` on macOS, or `Ctrl+,` on Windows/Linux).
2. Search for `catalogManager`.
3. Set `catalogManager.catalogLocation` to the extracted or built directory.
4. Disable `checkForUpdates` to avoid errors when working offline or with local `.catalog` copies.
5. Verify the following settings:

| Setting                              | Description                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `cfs.catalogManager.catalogLocation` | Path to the working copy of the `.catalog` directory.                       |
| `cfs.catalogManager.checkForUpdates` | Set to `false` for offline use or static catalogs.                          |

### Build plugins

To load workspace templates, CodeFusion Studio must discover valid plugins. These plugins must be built from source.

#### Clone and build plugins

##### Option 1: Use the `submodules/` directory

1. From the root of the CFS repository, initialize the submodule:

```bash
git submodule update --init --recursive
```

2. Install dependencies:

```bash
cd submodules/cfs-plugins
yarn install
```

3. Build the plugins:

```bash
yarn build
```

##### Option 2: Clone the CFS plugin repository

If you're not using submodules:

```bash
git clone https://github.com/analogdevicesinc/cfs-plugins.git ~/cfs-plugins
cd ~/cfs-plugins
yarn install
yarn build

```

> To learn about creating or modifying plugins, see the [CFS Plugins development guide](https://github.com/analogdevicesinc/cfs-plugins/blob/main/DEVELOPMENT.md).

> For available build scripts, see [package.json](https://github.com/analogdevicesinc/cfs-plugins/blob/main/package.json)

#### Update plugin search path in VS Code

In VS Code **Settings**, search for `cfs.plugins.searchDirectories` and update the following path:

```json
"cfs.plugins.searchDirectories": [
  "/your/path/to/cfs-plugins/dist"
]
```

### Configure the SoC data models

To resolve the active SoC and Package in the System Planner UI, the IDE requires valid SoC data models. These models are discovered via a local index file (`.cfsdatamodels`) located alongside your model folders and contain metadata for pins, peripherals, package variants, and board constraints.

#### Generate the data model index

To generate the index file, run:

```bash
yarn ws:data-models generate-index
```

This command scans `packages/cfs-data-models/socs/` and creates a `.cfsdatamodels` file in that directory.

> For information on developing SoC data models, see [CLI development configuration](../cli/DEVELOPMENT.md).
>

#### Update data model search path in VS Code

In VS Code **Settings**, search for `cfs.plugins.dataModelSearchDirectories` and point to the location where the index file is generated:

```json
"cfs.plugins.dataModelSearchDirectories": [
  "/your/path/to/codefusion-studio/packages/cfs-data-models/socs"
]
```

## Launch **Debug System Planner** in VS Code

Follow these steps to debug the System Planner or Workspace Creation UIs:

1. Open the CFS repository in VS Code.
2. Launch **Debug System Planner** from the debug console.
3. In the Extension Development Host, create a workspace or open a config file to launch the System Planner.
4. Open **Developer Tools**:
   - Open the Command Palette (`Ctrl+Shift+P`) and search for `Toggle Developer Tools`, or:
   - Go to **Help > Toggle Developer Tools** from the menu.
5. In the **Sources** tab, search for the file you want to debug (`Cmd + P` on macOS, `Ctrl + P` on Windows/Linux).
6. Click the line number to add a breakpoint.
7. Interact with the System Planner UI in the Extension Development Host.
8. When the code is triggered, execution will pause at your breakpoint in the main window.

> **Note**
> The full debugger configuration for **Debug System Planner** is defined in [.vscode/launch.json](../../.vscode/launch.json).

> **Note**
> The **Debug System Planner** launch action automatically triggers the `system-planner: build` task. This task, in turn, runs related build scripts such as `cfgtools:build` and `wrksp:build` in watch mode to keep your build artifacts up to date during development.
