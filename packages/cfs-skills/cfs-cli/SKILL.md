---
name: cfs-cli
description: Provides guidance on using the CFSUtil command-line tool for CodeFusion Studio. USE FOR cfsutil commands, generating code from .cfsconfig files, generating workspace configuration files and creating CFS workspaces, regenerating projects in a workspace, listing, querying, or exporting SoC data models, installing and managing packages and SDKs, analyzing and querying ELF files, building, profiling, and checking compatibility of AI models, generating workspaces from AI models, updating or restoring the SoC catalog, device tree parsing, pulling Docker images, myAnalog authentication including API keys (creating, listing, and revoking a myAnalog apikey) for headless CI/CD and non-interactive login, converting TEF profiling traces to CodeFusion Studio reports (`.cfsreport`) with `cfsutil convert`, serial port info, listing and running workspace tasks, listing available CFS plugins (with IDs and configuration options), and validating CFS workspace/config files and dependency manifests.
---

# CFSUtil CLI Reference

**CFSUtil** (`cfsutil`) is the CodeFusion Studio command-line utility. It provides access to CFS functionality from a terminal.

- **Alias:** `cfs` works as an alias for all `cfsutil` commands.
- **Access:** Run from the CFS Terminal in VS Code (recommended) or from the system path:
  - Windows: `<CFS-Install>/Utils/cfsutil/bin/cfsutil.cmd`
  - macOS/Linux: `<CFS-Install>/Utils/cfsutil/bin/cfsutil`
- **Help:** Append `--help` at any command level, for example, `cfsutil --help`, `cfsutil ai --help`, `cfsutil ai build --help`.
- **Output format:** Most commands accept `--format text|json`; the oclif plugin-management commands use their own output flags. For a list of commands that return the structured JSON envelope, see the `cfs-docs` skill.
- **Verbose and quiet output:** Most commands accept `-v`/`--verbose` and `-q`/`--quiet`, which are mutually exclusive; the oclif plugin-management commands use their own output flags. `--quiet` suppresses non-error output, including warnings, but some commands differ (documented below). `--verbose` changes the output only for some commands; for the list of commands, see the `cfs-docs` skill.

**Important:** If `cfs` or `cfsutil` commands fail, add the directory containing CFSUtil to `PATH` or run from the CFS Terminal. The typical directories are:
- Windows: `C:/analog/cfs/<CFS_VERSION>/Utils/cfsutil/bin`
- Linux: `~/analog/cfs/<CFS_VERSION>/Utils/cfsutil/bin`
- macOS: `~/analog/cfs/<CFS_VERSION>/Utils/cfsutil/bin`

## AI commands (`cfsutil ai`)

Compile and manage AI models for Analog Devices embedded targets.

> **Windows note:** Requires the [Visual C++ Redistributable for Visual Studio 2015](https://aka.ms/vs/16/release/vc_redist.x64.exe) to be installed.

| Command | Description |
|---------|-------------|
| `cfsutil ai backends list` | List available AI backends and supported hardware. Use `-n`/`--name <backend>` to show details for a single backend. |
| `cfsutil ai build` | Compile a model into C/C++ source using a `.cfsconfig` file or CLI flags. With `-v`, backends that run in a container also print the container command and, if the container fails, the generated `input.json`. With `-q`, container image pull progress and progress messages are hidden. |
| `cfsutil ai clean-cache` | Clear the cache of remotely downloaded files. |
| `cfsutil ai compat` | Check model compatibility with a target SoC and core. |
| `cfsutil ai e2e` | Run the full workflow: compatibility check, workspace creation, build, flash, and serial capture on hardware. Converts captured TEF traces into reports by default; use `--no-create-reports` to skip. Does not support JSON output: `--format json` fails with an error, so run it in text mode. |
| `cfsutil ai model add` | Add a model to a workspace. Requires `--config` or `-w`/`--workspace`, `--core`, and `-m`/`--model`. |
| `cfsutil ai model list` | List the models in a workspace. Requires `--config` or `-w`/`--workspace`; filter to one core with `-c`/`--core`. |
| `cfsutil ai model update` | Edit model settings. Requires `--config` or `-w`/`--workspace`, `--name`, and `--set <key=value>` (repeatable). |
| `cfsutil ai model remove` | Remove a model from a workspace. Requires `--config` or `-w`/`--workspace` and `--name`. |
| `cfsutil ai profile` | Profile model resource usage before deployment. |
| `cfsutil ai workspace create` | Generate a workspace from an AI model file. Requires `--soc`, `--board`, `--core`, `--name`, `-m`/`--model`, and `-o`/`--output`. Optional `--set <key=value>` (repeatable) sets model fields; `name`, `symbol`, `model`, and `dataset` are not allowed. |

Common flags: `--search-path` / `-x` (additional data model directory, repeatable) — accepted by `build`, `compat`, `e2e`, `profile` and `workspace create`. Not all flags apply to every subcommand.

```sh
cfsutil ai backends list              # List all backends and supported hardware
cfsutil ai backends list --name tflm  # Details for a single backend
cfsutil ai build --soc MAX32690 --core CM4 --model model.tflite
cfsutil ai build --config .cfs/max32690-wlp.cfsconfig
cfsutil ai compat --soc MAX32690 --core CM4 --model model.tflite --report-file compat.json
cfsutil ai e2e --soc MAX32690 --board EvKit_V1 --model model.tflite --debugger JLink --port /dev/ttyUSB0
cfsutil ai profile --soc MAX32690 --core CM4 --model model.tflite --report-file profile.txt --report-format text
cfsutil ai model add --config <file.cfsconfig> --core CM4 --model model.tflite
cfsutil ai model list --config <file.cfsconfig> --core CM4
cfsutil ai model update --config <file.cfsconfig> --name mymodel --set key=value
cfsutil ai model remove --config <file.cfsconfig> --name mymodel
```

## Catalog commands (`cfsutil catalog`)

Update or restore the local SoC metadata catalog.

```sh
cfsutil catalog update   # Update to latest online version (warns for anonymous updates)
cfsutil catalog restore  # Restore the original installed version
```

## CFS Plugins commands (`cfsutil cfsplugins`)

List available CFS plugins with their IDs, versions, and configuration options. Filter by SoC, board, or service type.

```sh
cfsutil cfsplugins list --soc <SOC>
```

## Convert command (`cfsutil convert`)

Convert a TEF profiling trace into a CodeFusion Studio report (`.cfsreport`).

```sh
cfsutil convert --input trace.tef [--input-format tef] [--output report.cfsreport]
```

| Flag | Description |
|------|-------------|
| `--input` | **Required.** Path to the file to convert. |
| `--input-format` | Input format. Currently `tef`. Detected from the file extension if not set. |
| `--output` | Output report path. Default: `<input name>_runtime_report.cfsreport` next to the input. |

## Device Tree commands (`cfsutil dt`)

Parse and work with device tree files.

`cfsutil dt parse <FILEPATH>` flags: `-I` / `--includeDirs` (include directories; repeatable, in the form `-Idir1 -Idir2`), `-o <file>` / `--output <file>` (output JSON file), `-v` (prints a large parser trace to stdout along with the result; use `-o` to keep the JSON separate).

```sh
cfsutil dt parse <FILEPATH>
```

## Docker commands (`cfsutil docker`)

Pull Docker images used by CFS toolchains.

```sh
cfsutil docker pull <IMAGE>          # Pull an image
cfsutil docker pull <IMAGE> -u       # Pull even if it already exists locally
cfsutil docker pull <IMAGE> -n       # Do not use credentials when pulling
cfsutil docker pull <IMAGE> -q       # Suppress pull output
```

## ELF Utilities (`cfsutil elf`)

Analyze compiled ELF files.

| Command | Description |
|---------|-------------|
| `cfsutil elf analyze <FILEPATH>` | High-level info: platform, stack/heap, flash/SRAM sizes. |
| `cfsutil elf info <FILEPATH> [-h] [-a] [-c] [-s]` | In-depth ELF info (header, attributes, core, size). At least one of `-h`, `-a`, `-c`, or `-s` is required. |
| `cfsutil elf memory <FILEPATH> [-s] [-t] [-y]` | Symbols, sections, and segments. At least one of `-s`, `-t`, or `-y` is required. |
| `cfsutil elf symbols <FILEPATH> "<SQLQUERY>" [--full]` | SQL query on the symbol table (`name`, `type`, `address`, `section`, `size`, `bind`, `visibility`, `path`). `--full` prints the full path if debug info is available. |

```sh
cfsutil elf analyze build/output.elf
cfsutil elf info build/output.elf -h -s
cfsutil elf symbols build/output.elf "SELECT name, size FROM symbols WHERE type='Function' ORDER BY size DESC LIMIT 10"
```

## Generate command (`cfsutil generate`)

Generate source code from a `.cfsconfig` file.

```sh
cfsutil generate -i <file.cfsconfig> [-o <output-dir>] [-s <plugin-path>] [-v]
```

| Flag | Description |
|------|-------------|
| `-i=<file>` | **Required.** Input `.cfsconfig` file. |
| `-o=<dir>` | Output directory for generated code. |
| `-s=<path>` | Additional plugin search path (repeatable). |
| `-v` | Verbose output. |

```sh
cfsutil generate -i=max32690-wlp.cfsconfig -v
```

## myAnalog Authentication (`cfsutil myanalog`)

Authenticate with a myAnalog account for package access and restricted catalog data.

```sh
cfsutil myanalog login
cfsutil myanalog logout
cfsutil myanalog status
```

### API keys (`cfsutil myanalog apikey`)

API keys authenticate `cfsutil` without an active myAnalog session — useful in continuous integration and continuous delivery (CI/CD) and scripted environments. Set the `CFS_API_KEY` environment variable to the key value to use it. Creating, listing, and deleting keys require an active myAnalog session (run `cfsutil myanalog login` first).

| Command | Description |
|---------|-------------|
| `cfsutil myanalog apikey create` | Create an API key. The key value appears once — save it immediately. Flag: `--description <value>` (optional label). |
| `cfsutil myanalog apikey list` | List API keys with the ID, masked value, and expiration date of each key. |
| `cfsutil myanalog apikey delete <APPKEY>` | Delete an API key by ID (shown in `apikey list`). |

```sh
cfsutil myanalog apikey create --description "CI pipeline key"
cfsutil myanalog apikey list
cfsutil myanalog apikey delete apikey_01234567890abcdef
```

Set `CFS_API_KEY` to use a key without an interactive login. The syntax is shell-specific:

```sh
# bash/zsh
export CFS_API_KEY="<your-api-key>"
cfsutil catalog update
```

```powershell
# PowerShell
$env:CFS_API_KEY = "<your-api-key>"
cfsutil catalog update
```

```bat
:: Command Prompt
set "CFS_API_KEY=<your-api-key>"
cfsutil catalog update
```

Commands that support API key authentication include `catalog update`, `ai build`, `docker pull`, and package manager (`pkg`) commands.

## Package Manager (`cfsutil pkg`)

Install and manage SDKs, plugins, and toolchains.

| Command | Description |
|---------|-------------|
| `cfsutil pkg add-remote <name> <url>` | Register a new package server. |
| `cfsutil pkg auth-remote <name>` | Configure username/password authentication or no authentication (`--user`, optional `--password`, or `--none`). With `--format json`, `--password` is required when you use `--user`. |
| `cfsutil pkg delete <pattern>` | Delete packages from the local cache (wildcard `*` supported). |
| `cfsutil pkg delete-remote <name>` | Remove a registered remote. |
| `cfsutil pkg dependencies <ref>` | List a package's dependencies, including transitive ones. Flags: `-u` (unresolved requirements), `--local` (local cache only). |
| `cfsutil pkg disable-remote <name>` | Disable a registered remote without removing it. |
| `cfsutil pkg enable-remote <name>` | Re-enable a previously disabled remote. |
| `cfsutil pkg info <ref>` | Show package metadata without installing. |
| `cfsutil pkg install [<package>]` | Install a package and its dependencies. Flags: `-l` (local cache only), `-t`/`--tar <path>` (install from a local tarball; replaces the package argument; add `-l` on a machine without network access), `--acceptLicense` (accept package licenses non-interactively; otherwise, interactive sessions prompt and non-interactive sessions exit with an error; has no effect with `--tar`). With `--format json`, `--acceptLicense` is required for packages that require license acceptance. |
| `cfsutil pkg list [pattern]` | List installed packages. Filter with `--filter KEY=VALUE` (repeatable). |
| `cfsutil pkg list-cache [pattern]` | List packages in the local cache. |
| `cfsutil pkg list-remotes` | List registered remotes and their auth configuration. |
| `cfsutil pkg local-consumers <name>` | List installed packages that depend on a given package. |
| `cfsutil pkg path <name>` | Print the install path of an installed package. Takes the package name without a version. |
| `cfsutil pkg search <pattern>` | Search remotes for packages available to install. |
| `cfsutil pkg uninstall <name>` | Uninstall a package (remains in the local cache for reuse). |

```sh
cfsutil pkg auth-remote myserver --user <USERNAME>   # prompts for password if --password is omitted
cfsutil pkg auth-remote myserver --none              # no authentication
cfsutil pkg install <package-name>/<version>
```

## Plugins commands (`cfsutil plugins`)

Extend CFSUtil with additional oclif CLI plugins.

## Port command (`cfsutil port`)

List information about active serial ports.

```sh
cfsutil port list
```

## Project command (`cfsutil project`)

Regenerate projects defined in an existing `.cfsworkspace` file.

```sh
cfsutil project create -w <path/.cfsworkspace> -p <project-name> [-s <plugin-path>]
```

| Flag | Description |
|------|-------------|
| `-w=<path>` | **Required.** Path to the `.cfsworkspace` file. |
| `-p=<name>` | **Required.** Name of the project to regenerate (must match the `Name` field in the workspace JSON). |
| `-s=<path>` | Additional plugin/data-model search path (repeatable). |

> **Note:** The workspace must already exist. This command regenerates existing projects; it cannot create new ones. The `Projects` array must be populated.

```sh
cfsutil project create -w /path/to/workspace/.cfs/.cfsworkspace -p "Arm Cortex-M4F"
```

## SoCs commands (`cfsutil socs`)

List and query SoC data models.

| Command | Description |
|---------|-------------|
| `cfsutil socs list` | List all available SoCs. Supports `-v`, `-s <search-path>`. |
| `cfsutil socs info <SOC>` | Details for a specific SoC. Flags: `--boards`, `--cores`, `--packages`, `--docs`. |
| `cfsutil socs export <SOCNAME>` | Export the SoC data model as JSON. Flags: `-p <package>`, `-o <file>`, `-i <indent>`, `-m` (minify), `--version <version>` (`-v` is deprecated). `--gzip` has been removed. |

```sh
cfsutil socs list -f json
cfsutil socs info MAX32690 --boards --packages --cores
cfsutil socs export max32690 -p WLP -o model.json
```

## Tasks commands (`cfsutil tasks`)

List and run tasks defined for a CFS workspace. The `--workspace` flag defaults to the current directory, so bare commands only work when run from a generated workspace (or one of its project directories). Pass `--workspace` explicitly to run from anywhere.

| Command | Description |
|---------|-------------|
| `cfsutil tasks list` | List tasks for a workspace. Flags: `-w`/`--workspace`, `-p`/`--project`, `-v` (also show each task's command). |
| `cfsutil tasks run <task>` | Run a task by label. Flags: `-w`/`--workspace`, `-p`/`--project`, `-v` (show full task output as it runs), `-q` (on failure, shows only the failure message, not the task's error output; omit it when debugging a failed task), `-c`/`--capture` (capture serial output; requires `--port` and `--project`), `--port`, `--timeout` (requires `--capture`; stops capture automatically after N seconds, counted from task completion, not from when capture starts; set `0` or omit to capture indefinitely until stopped manually), `-z`/`--zephyrTraceFile`. |

```sh
cfsutil tasks list                                   # uses the current directory as the workspace
cfsutil tasks list --workspace <path>                # specify the workspace explicitly
cfsutil tasks run build                              # run the "build" task from the current directory
cfsutil tasks run build -w <path> -p <project>      # run within a specific workspace/project
cfsutil tasks run flash_run_JLink -w <path> -p <project> --capture --port COM4
cfsutil tasks run flash_run_JLink -w <path> -p <project> --capture --port COM4 --timeout 30
```

Some commands write to the connected board: tasks whose label contains `flash`, `erase`, or `program`, and `cfsutil ai e2e`, which flashes the board as part of its workflow. Before running one, tell the user which board, project, and port it uses, and wait for them to confirm.

## Telemetry commands (`cfsutil telemetry`)

Manage diagnostic and usage telemetry preferences for the CodeFusion Studio CLI.

```sh
cfsutil telemetry enable          # Enables telemetry and creates a random usage identifier if needed
cfsutil telemetry disable         # Disables telemetry.
cfsutil telemetry status          # Displays the preference and privacy disclosure; does not prompt or change configuration
```

## Validate commands (`cfsutil validate`)

Validate a CFS configuration file against its schema, and check that the packages declared in a dependency manifest are installed at compatible versions.

| Command | Description |
|---------|-------------|
| `cfsutil validate config` | Validate a CFS workspace or a standalone `.cfsconfig` file against the schema and, when available, the SoC data model. It reports physical pin conflicts through `pin-conflict`, persisted pin-control errors through `control-invalid`, and unconditional peripheral control values that violate type, range, or pattern constraints through `control-invalid-value`. Flags: `-w`/`--workspace <path>` and `-i`/`--input <path>` (mutually exclusive; workspace defaults to the current directory), `-s`/`--search-path` (additional data model path, repeatable), `-v`/`--verbose`, `--format text\|json`. |
| `cfsutil validate dependencies` | Validate that packages declared in a CFS dependency manifest are installed. Alias: `cfsutil validate deps`. Flags: `-w`/`--workspace <path>` and `-i`/`--input <path>` (mutually exclusive; workspace defaults to the current directory, discovering the nearest CFS workspace and validating its shared manifest plus the `.cfs/.cfsdependencies` of each project folder directly inside it; JSON output is an array with one result per manifest), `--format text\|json`. |

Both commands exit non-zero when validation fails, and `--format json` returns a structured result instead of printing text.

```sh
cfsutil validate config                                        # validate the workspace in the current directory
cfsutil validate config -w ./my-workspace -v                   # verbose validation of a specific workspace
cfsutil validate config -i ./my.cfsconfig --format json         # validate a standalone .cfsconfig file as JSON
cfsutil validate dependencies                                          # validate the workspace and project manifests
cfsutil validate dependencies -w ./my-workspace                        # validate a specific workspace
cfsutil validate dependencies -i ./workspace/.cfs/.cfsdependencies     # validate a standalone manifest file
cfsutil validate deps --format json                             # validate and return JSON output
```

## Workspace commands (`cfsutil workspace`)

Create a CFS workspace either in two steps — generate a workspace configuration file, then create the workspace from it — or in a single `workspace create` call that takes the parameters directly (see [One-step alternative](#one-step-alternative--create-directly-from-command-line-arguments) below).

### Step 1 — Discover SoC details

```sh
cfsutil socs list                                    # Find SoC name and packages
cfsutil socs info <SOC> --boards --packages --cores  # Find board, package, and core values
cfsutil cfsplugins list --soc <SOC>                  # Find template IDs
```

### Step 2 — Generate a workspace configuration file

```sh
cfsutil workspace configure \
  --soc <SOC> --board <BOARD> \
  --core <CORE> --template-id <TEMPLATE_ID> \
  --name <workspace-name> -o <output-path>
```

Specify the target with `--board`, `--package`, or both — at least one is required. With `--board <BOARD>`, the package is inferred from the board; with `--package <PACKAGE>`, the target is identified directly. Supplying both is also valid and is used together for template validation:

```sh
cfsutil workspace configure \
  --soc <SOC> --package <PACKAGE> \
  --core <CORE> --template-id <TEMPLATE_ID> \
  --name <workspace-name> -o <output-path>
```

For multi-core projects, repeat `--core`/`--template-id` pairs:

```sh
cfsutil workspace configure \
  --soc ADSP-SC835 --board ADSPSC835-EV-SOM \
  --core FX --template-id com.analog.project.sharcfx.plugin \
  --core CM33 --template-id com.analog.project.sharcfx.plugin \
  --name myNewWorkspace -o /path/to/output
```

### Step 3 — Create the workspace

```sh
cfsutil workspace create -i <workspace-config.json>
```

### One-step alternative — create directly from command-line arguments

`workspace create` also accepts the workspace parameters directly, skipping the separate `configure` step. Use this when you do not need a reusable `.cfsworkspace` config file:

```sh
cfsutil workspace create \
  --soc <SOC> --board <BOARD> \
  --template-id <TEMPLATE_ID> --template-version <VERSION> \
  --name <workspace-name> -o <output-path>
```

`--soc`, `--board`, `--template-id`, `--name`, and `-o`/`--output` are all required for the one-step form. `--package` is optional — it is inferred from the SoC and board when omitted. This form is mutually exclusive with `-i`/`--input`: pass the parameters directly for a new workspace, or pass `-i` for the two-step flow, but not both. Unlike `workspace configure`, `create` takes a single workspace-level template and has no `--core` flag; use the two-step flow for multi-core projects.

| Flag | Description |
| --- | --- |
| `-i`/`--input=<path>` | Path to an existing `.cfsworkspace` file (the two-step flow above). |
| `-o`/`--output=<path>` | Output path for the new workspace (excluding the workspace name). |
| `--name=<value>` | Name for the new workspace. |
| `--soc=<value>` | SoC name. |
| `--board=<value>` | Board name. |
| `--package=<value>` | Package name. |
| `--template-id=<value>` | Template ID. |
| `--template-version=<value>` | Template version. |
| `-s`/`--search-path=<path>` | Additional search path for templates and data models (repeatable). |

Example:

```sh
cfsutil workspace create -o /tmp --name myNewWorkspace \
  --soc ADSP-SC835 --board ADSPSC835-EV-SOM \
  --template-id com.analog.sharcfx.example --template-version 1.0.1
```

## Working with multiple .cfsconfig files

When multiple `.cfsconfig` files exist in `.cfs/`, auto-discovery can select the wrong file. Pass `--config <path>` where supported. For commands without `--config`, keep alternate configurations outside `.cfs/` or give them names that do not end in `.cfsconfig`, then copy the desired configuration to `.cfs/<soc>-<package>.cfsconfig` before running the command.
