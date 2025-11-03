# How to start developing Code Fusion Studio

**Note:** We recommend using [NVM](https://github.com/nvm-sh) for installing and managing [NodeJS](https://nodejs.org/en) on your machine.

- Windows

  Ensure that you are running commands in an elevated terminal.
  Furthermore, ensure that there are no spaces in the installation folder for
  nvm. A failure to do this will result in an error in the nvm use command.

    - Download and install the latest version of `nvm` from <https://github.com/coreybutler/nvm-windows/releases>.

- Linux and macOS

  Follow the instructions found here: <https://github.com/nvm-sh/nvm#installing-and-updating>

## Development Machine Setup

The following section details how you build, run, and debug your checked out copy of this VS Code extension.

### Build and run the VS Code extension

We recommend using NVM to install and manage NodeJS on your machine.

#### Windows

1. Install NVM
    - Windows
        - NOTE: Do not include spaces in the installation folder for nvm as this will result in an error with the nvm use command. Run commands in an elevated terminal.
        - Download and install **nvm** from <https://github.com/coreybutler/nvm-windows/releases/download/1.1.7/nvm-setup.zip>.

    - Linux and macOS
        - Run the curl command.
        - `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.35.3/install.sh | bash`

2. Install NodeJS.

    - `nvm install 18.15`
    - `nvm use 18.15`

3. Install the dependencies.

    - Install Yarn package manager globally. `npm install -g yarn`
    - Install tools for building .vsix extension files. `npm install -g @vscode/vsce`
    - `yarn install`
    > You may get errors stating "There appears to be trouble with your network connection. Retrying..." If the number of packages increases every time you run the command, continue running it until it passes.

4. Build local dependencies.

    - `yarn ws:ide build-local-deps`

5. Build the VS Code extension for local deployment.

    - `yarn ws:ide build:extension`

6. Install the VS Code SDK for toolchains and debug.

Details can be found in the [User documentation](https://developer.analog.com/docs/codefusion-studio/latest/user-guide/installation/install-cfs/).

#### Development environment for the VS Code extension

Recommended VS Code extensions:

- Prettier - Code formatter (extension id: esbenp.prettier-vscode)

### Debug the VS Code extension

To debug the CFS IDE extension, select **Run IDE Extension** from the VS Code launch.

### Install the VS Code extension

1. Build the VSIX file `yarn ws:ide package`.
2. Select **Extensions** in the VS Code activity bar.
3. Click the **Views and More Actions** menu (...) and select **Install from VSIX**.
4. Select your **cfs-ide\<version\>.vsix** file, and click **install**.

## Getting help

For more information about the project, see the [User documentation](https://developer.analog.com/docs/codefusion-studio/latest/).

## Project Structure

The project uses yarn as a package manager, and yarn workspace as monorepo manager. The monorepo is formed by the following top level directories:

    .
    ├── packages              # Host the main packages of this repo
    |   |── cfs-lib           # Reusable utilities for CFS components
    |   |── cfs-ccm-lib       # Reusable utilities for CFS cloud components
    |   |── cli               # CodeFusion Studio CLI source files
    |   |── cli-plugins       # CodeFusion Studio CLI additional plugins
    |   |── elf-parser        # A parser for ELF Files
    |   |── ide               # Build and Debug applications for Analog Devices targets
    |   |── react-library     # Custom React components for CFS
    └── package.json          # Declares global dependencies and global scripts.

The project is configured to access all main scripts used by all workspaces from the root of the repo.

## Additional VS Code extensions

After installation, you will get prompted to install some VS Code extensions. Its important to install these extensions in case you are planning to contribute to the code base as they will keep the code consistent with the project's code style.

## Start the UI or CLI in development mode

To start the development environment, open the **Run and Debug** panel in VS Code (`Ctrl + Shift + D`).
From the dropdown, choose one of the following launch configurations:

- **Debug System Planner** – Launches the System Planner and Workspace Creation UI in debug mode.
This configuration includes inline source maps for the Workspace Creation and System Planner webviews, allowing you to set breakpoints directly in the VS Code **Developer Tools**.
Use this option for debugging the UI.
For setup and debug instructions, see [Set up the development environment](./packages/ide/DEVELOPMENT.md).
- **Run IDE Extension (Production)** – Launches a production build of the UI extension in VS Code.
This configuration does not include source maps for webviews and is intended to simulate VS Code with the extension installed in a production environment.
Use this option for final testing or QA purposes.
- **Debug ELF file explorer webview** – Opens the ELF parser in debug mode.
- **Execute CLI Dev Command** – Runs the `cfsutil` CLI in development mode and lets you set breakpoints inside CLI source files (for example, `src/commands`). For configuration steps, see [CLI configuration and data model setup](../packages/cli/DEVELOPMENT.md).

> **Note**
> You can view or edit these configurations in [.vscode/launch.json](.vscode/launch.json).

## Running test commands of the CLI

A symlink to the CLI package needs to be created globally by yarn. This is done by running the following command from the project root: `yarn ws:cli link`.

Build and test the CLI like this:

```bash
yarn ws:cli build-local-deps
yarn ws:cli build
yarn cfsutil --help
```

This should display the help menu of the CLI with the available commands.

## SoC configuration (using config.json)

The `cfsutil` CLI uses [Oclif configuration](https://oclif.io/docs/config) to load runtime settings. The `dataModelSearchPaths` defines where the CLI should look for SoC data models.

See [CLI development configuration](../packages/cli/DEVELOPMENT.md) for details on how to:

- Set default config locations
- Override configuration with environment variables
- Create and use a `config.json` file
- Set authentication configuration
- Generate the `.cfsdatamodels` index
- Debug the CLI with VS Code

## CLI Plugins

The following plugins are provided as extensions to the CLI:

- [add-soc](packages/cli-plugins/add-soc/README.md)
  Example plugin that demonstrates adding additional SoC data models to the CLI
- [add-codegen](packages/cli-plugins/add-codegen/README.md)
  Example plugin that demonstrates adding additional code generation engines to the CLI

## Adding dependencies

You can add new dependencies to a specific workspace (for example the main UI app) from the root directory, by using the identifier of the workspace. For example, to add a new dev dependency to the UI App, you can run:

```bash
yarn ws:app add my-dependency
```

The workspace identifiers are shorthands declared in the root package.json file.

### Available Workspace Identifiers

| Command         | Package                           |
| --------------- | --------------------------------- |
| `ws:ide`        | /packages/ide                     |
| `ws:cli`        | /packages/cfsutil                 |
| `ws:lib`        | /packages/cfs-lib                 |
| `ws:ccm-lib`    | /packages/cfs-ccm-lib             |
| `ws:react-lib`  | /packages/react-library           |
| `ws:add-engine` | /packages/cli-plugin/add-codegen  |
| `ws:add-soc`    | /packages/cli-plugin/add-soc      |

## Building the UI extension

You can generate a production build that can be installed locally in any instance of vscode by running the following command from the root:

```bash
yarn ws:ide package
```

This will generate a `cfs-ide-*.vsix` file in the build directory of the ui package (`packages/ide/`).

You can manually install the extension through the vscode extensions menu by selecting the `Install from VSIX...` option and navigating to the path where the package was generated, or you can run the following command:

```bash
code --install-extension packages/ide/*.vsix
```

Additionally, a packaged extension is generated with every pull request and uploaded to github artifacts. A link is provided as a comment in each pull request where you can download a zip file containing the extension.

## Building and authoring documentation

Our documentation is authored in [Markdown](https://en.wikipedia.org/wiki/Markdown) using [MkDocs](https://www.mkdocs.org/) to publish the resulting HTML.

### Installing MkDocs and dependencies

MkDocs requires that [Python](https://www.python.org/downloads/) version 3.10 or greater be installed on your development machine.

Poetry is used to build documentation.

To install MkDocs and related dependencies:

```sh
# install Poetry if not already available
$ pip install poetry
# install all dependencies into a virtual environment
$ poetry install
```

Once installed, you can run MkDocs and view the documentation in your browser:

```sh
$ poetry run mkdocs serve
INFO    -  Building documentation...
INFO    -  Cleaning site directory
INFO    -  Documentation built in 0.41 seconds
INFO    -  [15:24:48] Watching paths for changes: 'docs', 'mkdocs.yml'
INFO    -  [15:24:48] Serving on http://127.0.0.1:8000/
```

### Documentation guidelines

- Markdown files and images should be [kebab-cased](https://developer.mozilla.org/en-US/docs/Glossary/Kebab_case) (not camelCased or snake_cased)
- All end-user documentation should be placed in the appropriate spot within the `/docs` directory
- Place image files in a subdirectory named `images` next to the markdown file(s) it is used in
- Prefer ATX-style headings (`#`, `##`, ...) over setext-style headings (---, ===, ...)
- Prefer [fenced code blocks](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-and-highlighting-code-blocks#fenced-code-blocks) over indented code blocks and always [set a language identifier](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-and-highlighting-code-blocks#syntax-highlighting) when possible.

#### Linting markdown files

We use [markdownlint](https://github.com/DavidAnson/markdownlint) to ensure consistent adherence to our prefered markdown styles. To run the linter, ensure that you've followed the NodeJS setup instructions at the top of this file and run `yarn lint:docs` from the root folder to ensure that your markdown docs are clean before committing changes. Currently, only markdown files in the top-level `/docs` folder are checked.

If you're editing documentation in VS Code, we recommend installing the [markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) and [.editorconfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) extentions.

#### Adding new content

When adding a new page you'll want to also be sure to add it to the table of contents by adding an entry in the `nav` section of `mkdocs.yml`. See [Documentation Layout](https://www.mkdocs.org/user-guide/configuration/#documentation-layout) in the [mkdocs manual](https://www.mkdocs.org/user-guide) for additional information.

```yml
nav:
  - Section:
    ...
    # the key is the name of the page as it will appear in the ToC
    # the value is the relative link to the md page
    - My new page: folder/my-new-page.md
    ...
```

If you are adding a new _folder_ to the structure then you should also create a landing page called `index.md` for that page with, at minimum, links to the child pages. To add a `nav` entry to the ToC that points to your new `index.md` simply specify the path to the md file with no key as the first entry beneath the new section name. See [Section index pages](https://squidfunk.github.io/mkdocs-material/setup/setting-up-navigation/#section-index-pages) in the [mkdocs-material](https://squidfunk.github.io/mkdocs-material) manual.

```yml
nav:
  - A new section:
    - new-section/index.md
```
