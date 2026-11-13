# cfsutil

CodeFusion Studio CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![GitHub license](https://img.shields.io/github/license/oclif/hello-world)](https://github.com/oclif/hello-world/blob/main/LICENSE)

<!-- toc -->
* [cfsutil](#cfsutil)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g cfsutil
$ cfsutil COMMAND
running command...
$ cfsutil (--version)
cfsutil/2.4.0 linux-x64 node-v24.22.2
$ cfsutil --help [COMMAND]
USAGE
  $ cfsutil COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`cfsutil ai backends ACTION`](#cfsutil-ai-backends-action)
* [`cfsutil ai build`](#cfsutil-ai-build)
* [`cfsutil ai clean-cache`](#cfsutil-ai-clean-cache)
* [`cfsutil ai compat`](#cfsutil-ai-compat)
* [`cfsutil ai e2e`](#cfsutil-ai-e2e)
* [`cfsutil ai model add`](#cfsutil-ai-model-add)
* [`cfsutil ai model list`](#cfsutil-ai-model-list)
* [`cfsutil ai model remove`](#cfsutil-ai-model-remove)
* [`cfsutil ai model update`](#cfsutil-ai-model-update)
* [`cfsutil ai profile`](#cfsutil-ai-profile)
* [`cfsutil ai workspace create`](#cfsutil-ai-workspace-create)
* [`cfsutil auth login`](#cfsutil-auth-login)
* [`cfsutil auth logout`](#cfsutil-auth-logout)
* [`cfsutil auth status`](#cfsutil-auth-status)
* [`cfsutil catalog restore`](#cfsutil-catalog-restore)
* [`cfsutil catalog update`](#cfsutil-catalog-update)
* [`cfsutil cfsplugins list`](#cfsutil-cfsplugins-list)
* [`cfsutil convert`](#cfsutil-convert)
* [`cfsutil docker pull IMAGE`](#cfsutil-docker-pull-image)
* [`cfsutil dt parse [FILEPATH]`](#cfsutil-dt-parse-filepath)
* [`cfsutil elf analyze FILEPATH`](#cfsutil-elf-analyze-filepath)
* [`cfsutil elf info FILEPATH`](#cfsutil-elf-info-filepath)
* [`cfsutil elf memory FILEPATH`](#cfsutil-elf-memory-filepath)
* [`cfsutil elf symbols FILEPATH SQLQUERY`](#cfsutil-elf-symbols-filepath-sqlquery)
* [`cfsutil generate`](#cfsutil-generate)
* [`cfsutil help [COMMAND]`](#cfsutil-help-command)
* [`cfsutil myanalog apikey create`](#cfsutil-myanalog-apikey-create)
* [`cfsutil myanalog apikey delete APPKEY`](#cfsutil-myanalog-apikey-delete-appkey)
* [`cfsutil myanalog apikey list`](#cfsutil-myanalog-apikey-list)
* [`cfsutil myanalog login`](#cfsutil-myanalog-login)
* [`cfsutil myanalog logout`](#cfsutil-myanalog-logout)
* [`cfsutil myanalog status`](#cfsutil-myanalog-status)
* [`cfsutil pkg add-remote REMOTENAME URL`](#cfsutil-pkg-add-remote-remotename-url)
* [`cfsutil pkg:auth-remote REMOTENAME {--user USERNAME [--password PASSWORD] | --none}`](#cfsutil-pkgauth-remote-remotename---user-username---password-password----none)
* [`cfsutil pkg delete PATTERN`](#cfsutil-pkg-delete-pattern)
* [`cfsutil pkg delete-remote REMOTENAME`](#cfsutil-pkg-delete-remote-remotename)
* [`cfsutil pkg dependencies PACKAGEREFERENCE`](#cfsutil-pkg-dependencies-packagereference)
* [`cfsutil pkg disable-remote REMOTENAME`](#cfsutil-pkg-disable-remote-remotename)
* [`cfsutil pkg enable-remote REMOTENAME`](#cfsutil-pkg-enable-remote-remotename)
* [`cfsutil pkg info PACKAGEREFERENCE`](#cfsutil-pkg-info-packagereference)
* [`cfsutil pkg install [REFERENCE]`](#cfsutil-pkg-install-reference)
* [`cfsutil pkg list [PATTERN]`](#cfsutil-pkg-list-pattern)
* [`cfsutil pkg list-cache [PATTERN]`](#cfsutil-pkg-list-cache-pattern)
* [`cfsutil pkg list-remotes`](#cfsutil-pkg-list-remotes)
* [`cfsutil pkg local-consumers NAME`](#cfsutil-pkg-local-consumers-name)
* [`cfsutil pkg path PKGNAME`](#cfsutil-pkg-path-pkgname)
* [`cfsutil pkg search PATTERN`](#cfsutil-pkg-search-pattern)
* [`cfsutil pkg uninstall NAME`](#cfsutil-pkg-uninstall-name)
* [`cfsutil plugins`](#cfsutil-plugins)
* [`cfsutil plugins add PLUGIN`](#cfsutil-plugins-add-plugin)
* [`cfsutil plugins:inspect PLUGIN...`](#cfsutil-pluginsinspect-plugin)
* [`cfsutil plugins install PLUGIN`](#cfsutil-plugins-install-plugin)
* [`cfsutil plugins link PATH`](#cfsutil-plugins-link-path)
* [`cfsutil plugins remove [PLUGIN]`](#cfsutil-plugins-remove-plugin)
* [`cfsutil plugins reset`](#cfsutil-plugins-reset)
* [`cfsutil plugins uninstall [PLUGIN]`](#cfsutil-plugins-uninstall-plugin)
* [`cfsutil plugins unlink [PLUGIN]`](#cfsutil-plugins-unlink-plugin)
* [`cfsutil plugins update`](#cfsutil-plugins-update)
* [`cfsutil port list`](#cfsutil-port-list)
* [`cfsutil project create`](#cfsutil-project-create)
* [`cfsutil soc export [SOCNAME]`](#cfsutil-soc-export-socname)
* [`cfsutil soc info SOC`](#cfsutil-soc-info-soc)
* [`cfsutil soc list`](#cfsutil-soc-list)
* [`cfsutil socs export [SOCNAME]`](#cfsutil-socs-export-socname)
* [`cfsutil socs info SOC`](#cfsutil-socs-info-soc)
* [`cfsutil socs list`](#cfsutil-socs-list)
* [`cfsutil task run TASK`](#cfsutil-task-run-task)
* [`cfsutil tasks list`](#cfsutil-tasks-list)
* [`cfsutil tasks run TASK`](#cfsutil-tasks-run-task)
* [`cfsutil telemetry disable`](#cfsutil-telemetry-disable)
* [`cfsutil telemetry enable`](#cfsutil-telemetry-enable)
* [`cfsutil telemetry status`](#cfsutil-telemetry-status)
* [`cfsutil validate config`](#cfsutil-validate-config)
* [`cfsutil validate dependencies`](#cfsutil-validate-dependencies)
* [`cfsutil validate deps`](#cfsutil-validate-deps)
* [`cfsutil workspace configure`](#cfsutil-workspace-configure)
* [`cfsutil workspace create`](#cfsutil-workspace-create)

## `cfsutil ai backends ACTION`

List available AI backends.

```
USAGE
  $ cfsutil ai backends ACTION [-f json|text] [-v | -q] [-n <value>]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -n, --name=<value>     Backend to display more information about
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  List available AI backends.

EXAMPLES
  $ cfsutil ai backends list

  $ cfsutil ai backends list --name tflm
```

_See code: [src/commands/ai/backends.ts](src/commands/ai/backends.ts)_

## `cfsutil ai build`

Compile a model into source code.

```
USAGE
  $ cfsutil ai build [-f json|text] [-v | -q] [--config <value>] [-s <value>] [-p <value>] [-c <value>] [-a
    <value>] [-m <value>] [--dataset <value>] [--cwd <value>] [-o <value>] [--network-config <value>] [-b <value>] [-e
    <value>...] [-x <value>...] [--ignore-cache]

FLAGS
  -a, --acc=<value>             Target accelerator.
  -b, --backend=<value>         Name of backend to use
  -c, --core=<value>            Target core
  -e, --extension=<value>...    Backend specific fields provided as key=value pairs
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -m, --model=<value>           Path or URL to the model file
  -o, --output-path=<value>     Output directory for generated files, relative to cwd
  -p, --package=<value>         SoC package
  -q, --quiet                   Suppress non-error output
  -s, --soc=<value>             Target SoC
  -v, --verbose                 Enable verbose mode
  -x, --search-path=<value>...  Additional search path for templates and data models. Can be used multiple times
      --config=<value>          Path to .cfsconfig file
      --cwd=<value>             [default: .] Change the working directory to a specified path
      --dataset=<value>         Path or URL to the sample dataset for the model
      --ignore-cache            Bypass cache and fetch latest remote files
      --network-config=<value>  Path or URL to the Izer network configuration YAML. Required when `--backend` is "izer"

DESCRIPTION
  Compile a model into source code.

EXAMPLES
  $ cfsutil ai build --soc MAX32690 --core CM4 --model PATH_TO_MODEL

  $ cfsutil ai build --config PATH_TO_CONFIG

  $ cfsutil ai build --soc ae822fa0e5597xx0 --core M55_HP --model model.tflite --backend vela -e Optimise=Size
```

_See code: [src/commands/ai/build.ts](src/commands/ai/build.ts)_

## `cfsutil ai clean-cache`

Clear the cache which stores remote files.

```
USAGE
  $ cfsutil ai clean-cache [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Clear the cache which stores remote files.

EXAMPLES
  $ cfsutil ai clean-cache
```

_See code: [src/commands/ai/clean-cache.ts](src/commands/ai/clean-cache.ts)_

## `cfsutil ai compat`

Analyze model compatibility with target SoC and core.

```
USAGE
  $ cfsutil ai compat [-f json|text] [-v | -q] [-s <value>] [-p <value>] [-c <value>] [-a <value>] [-m <value>]
    [--report-file <value>] [-x <value>...] [--ignore-cache] [-d <value>]

FLAGS
  -a, --acc=<value>             Target accelerator
  -c, --core=<value>            Target core
  -d, --dataset=<value>         Path or URL to the dataset file to use for compatibility analysis
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -m, --model=<value>           Path or URL to the model file
  -p, --package=<value>         SoC Package
  -q, --quiet                   Suppress non-error output
  -s, --soc=<value>             Target SoC
  -v, --verbose                 Enable verbose mode
  -x, --search-path=<value>...  Additional search path for templates and data models. Can be used multiple times
      --ignore-cache            Bypass cache and fetch latest remote files
      --report-file=<value>     Path to output JSON report file

DESCRIPTION
  Analyze model compatibility with target SoC and core.

EXAMPLES
  $ cfsutil ai compat --soc MAX32690 --core CM4 --model PATH_TO_MODEL
```

_See code: [src/commands/ai/compat.ts](src/commands/ai/compat.ts)_

## `cfsutil ai e2e`

Full end-to-end workflow for ai model inference

```
USAGE
  $ cfsutil ai e2e -s <value> --board <value> -m <value> -d JLink|CMSIS-DAP --port <value> [-f json|text]
    [-v | -q] [-c <value>] [--dataset <value>] [-o <value>] [--name <value>] [--skip-compat] [--run-profiler] [-x
    <value>...] [--timeout <value>] [--create-reports]

FLAGS
  -c, --core=<value>            Target core
  -d, --debugger=<option>       (required) Debugger to use for flash & run after build e.g. JLink, CMSIS-DAP
                                <options: JLink|CMSIS-DAP>
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -m, --model=<value>           (required) Path or URL to a model file
  -o, --output=<value>          [default: .] Output path for new workspace (excluding workspace name)
  -q, --quiet                   Suppress non-error output
  -s, --soc=<value>             (required) Target SoC
  -v, --verbose                 Enable verbose mode
  -x, --search-path=<value>...  Additional search path for templates and data models. Can be used multiple times
      --board=<value>           (required) Board name
      --[no-]create-reports     Convert the captured TEF traces into CodeFusion Studio reports. Enabled by default; use
                                --no-create-reports to skip. Only supported by workspaces that output CTF traces
      --dataset=<value>         Path or URL to the sample dataset for the model
      --name=<value>            Name for new workspace, defaults to: ws.soc.core.timestamp
      --port=<value>            (required) Specify the serial port name (e.g., COM3, /dev/ttyUSB0)
      --run-profiler            Run static profiling analysis
      --skip-compat             Skip the model compatibility check
      --timeout=<value>         [default: 20] Terminate serial capture after the given number of seconds. Use 0 to
                                capture indefinitely.

DESCRIPTION
  Full end-to-end workflow for ai model inference

EXAMPLES
  $ cfsutil ai e2e --soc MAX32690 --board EvKit_V1 --model model.tflite --debugger JLink --port /dev/ttyUSB0
```

_See code: [src/commands/ai/e2e.ts](src/commands/ai/e2e.ts)_

## `cfsutil ai model add`

Add model to a workspace.

```
USAGE
  $ cfsutil ai model add --core <value> -m <value> [-f json|text] [-v | -q] [-w <value>] [--config <value>]
    [--dataset <value>] [-a <value>] [--network-config <value>] [-e <value>...] [--ignore-cache]

FLAGS
  -a, --acc=<value>             Target accelerator
  -e, --extension=<value>...    Backend specific fields provided as key=value pairs
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -m, --model=<value>           (required) Path or URL to the model file
  -q, --quiet                   Suppress non-error output
  -v, --verbose                 Enable verbose mode
  -w, --workspace=<value>       Path to workspace
      --config=<value>          Path to .cfsconfig file
      --core=<value>            (required) Target core
      --dataset=<value>         Path or URL to the sample dataset for the model
      --ignore-cache            Bypass cache and fetch latest remote files
      --network-config=<value>  Path or URL to the Izer network configuration YAML (required for 'izer' backend)

DESCRIPTION
  Add model to a workspace.

EXAMPLES
  $ cfsutil ai model add --config PATH_TO_CONFIG --core CM4 --model PATH_TO_MODEL
```

_See code: [src/commands/ai/model/add.ts](src/commands/ai/model/add.ts)_

## `cfsutil ai model list`

List workspace models.

```
USAGE
  $ cfsutil ai model list [-f json|text] [-v | -q] [-w <value>] [--config <value>] [-c <value>]

FLAGS
  -c, --core=<value>       Target Core
  -f, --format=<option>    [default: text] Output in desired format
                           <options: json|text>
  -q, --quiet              Suppress non-error output
  -v, --verbose            Enable verbose mode
  -w, --workspace=<value>  Path to workspace
      --config=<value>     Path to .cfsconfig file

DESCRIPTION
  List workspace models.

EXAMPLES
  $ cfsutil ai model list --config PATH_TO_CONFIG

  $ cfsutil ai model list --config PATH_TO_CONFIG --core CM4 --verbose
```

_See code: [src/commands/ai/model/list.ts](src/commands/ai/model/list.ts)_

## `cfsutil ai model remove`

Remove model from a workspace.

```
USAGE
  $ cfsutil ai model remove --name <value> [-f json|text] [-v | -q] [-w <value>] [--config <value>]

FLAGS
  -f, --format=<option>    [default: text] Output in desired format
                           <options: json|text>
  -q, --quiet              Suppress non-error output
  -v, --verbose            Enable verbose mode
  -w, --workspace=<value>  Path to workspace
      --config=<value>     Path to .cfsconfig file
      --name=<value>       (required) Name of model

DESCRIPTION
  Remove model from a workspace.

EXAMPLES
  $ cfsutil ai model remove --name NAME_OF_MODEL --config PATH_TO_CONFIG
```

_See code: [src/commands/ai/model/remove.ts](src/commands/ai/model/remove.ts)_

## `cfsutil ai model update`

Update a model in your workspace.

```
USAGE
  $ cfsutil ai model update --name <value> --set <value>... [-f json|text] [-v | -q] [-w <value>] [--config <value>]
    [-c <value>] [--ignore-cache]

FLAGS
  -c, --core=<value>       Target Core
  -f, --format=<option>    [default: text] Output in desired format
                           <options: json|text>
  -q, --quiet              Suppress non-error output
  -v, --verbose            Enable verbose mode
  -w, --workspace=<value>  Path to workspace
      --config=<value>     Path to .cfsconfig file
      --ignore-cache       Bypass cache and fetch latest remote files
      --name=<value>       (required) Name of model
      --set=<value>...     (required) Values to update

DESCRIPTION
  Update a model in your workspace.

EXAMPLES
  $ cfsutil ai model update --config PATH_TO_CONFIG --name MODEL_NAME --set key=value
```

_See code: [src/commands/ai/model/update.ts](src/commands/ai/model/update.ts)_

## `cfsutil ai profile`

Profile model resources with target SoC and core.

```
USAGE
  $ cfsutil ai profile [-f json|text] [-v | -q] [-s <value>] [-p <value>] [-c <value>] [-a <value>] [-m <value>]
    [--report-file <value>] [--report-format text|json] [-x <value>...] [--ignore-cache]

FLAGS
  -a, --acc=<value>             Target accelerator
  -c, --core=<value>            Target core
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -m, --model=<value>           Path or URL to the model file
  -p, --package=<value>         SoC package
  -q, --quiet                   Suppress non-error output
  -s, --soc=<value>             Target SoC
  -v, --verbose                 Enable verbose mode
  -x, --search-path=<value>...  Additional search path for templates and data models. Can be used multiple times
      --ignore-cache            Bypass cache and fetch latest remote files
      --report-file=<value>     Path to output report file
      --report-format=<option>  [default: json] Report output format: text or json
                                <options: text|json>

DESCRIPTION
  Profile model resources with target SoC and core.

EXAMPLES
  $ cfsutil ai profile --soc MAX32690 --core CM4 --model PATH_TO_MODEL
```

_See code: [src/commands/ai/profile.ts](src/commands/ai/profile.ts)_

## `cfsutil ai workspace create`

Generates a workspace based on a model file.

```
USAGE
  $ cfsutil ai workspace create -o <value> -n <value> -s <value> -b <value> -c <value> -m <value> [-f json|text] [-v |
    -q] [-x <value>...] [-d <value>] [--skip-compat] [--set <value>...]

FLAGS
  -b, --board=<value>           (required) Board name
  -c, --core=<value>            (required) Target core
  -d, --dataset=<value>         Path or URL to the sample dataset for the model
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -m, --model=<value>           (required) Path or URL to the model file
  -n, --name=<value>            (required) Name for new workspace
  -o, --output=<value>          (required) Output path for new workspace (excluding workspace name)
  -q, --quiet                   Suppress non-error output
  -s, --soc=<value>             (required) SoC name
  -v, --verbose                 Enable verbose mode
  -x, --search-path=<value>...  Additional search path for templates and data models. Can be used multiple times
      --set=<value>...          Model values to update
      --skip-compat             Skip the model compatibility check

DESCRIPTION
  Generates a workspace based on a model file.

EXAMPLES
  $ cfsutil ai workspace create -o c:/tmp --name myNewWorkspace --soc MAX32690 --board EvKit_V1 --core CM4 --model c:/models/model.tflite

  $ cfsutil ai workspace create -o c:/tmp --name myNewWorkspace --soc MAX32690 --board EvKit_V1 --core CM4 --model c:/models/model.tflite --set enabled=false
```

_See code: [src/commands/ai/workspace/create.ts](src/commands/ai/workspace/create.ts)_

## `cfsutil auth login`

Log in with a myAnalog account.

```
USAGE
  $ cfsutil auth login [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Log in with a myAnalog account.

  This will attempt to open your default web browser to log in to your myAnalog account.  It will also display a URL you
  can open manually if the browser does not open automatically.  The URL must be opened within 5 minutes and on the same
  machine this command is ran on.

ALIASES
  $ cfsutil auth login
```

## `cfsutil auth logout`

Log out of the current myAnalog session.

```
USAGE
  $ cfsutil auth logout [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Log out of the current myAnalog session.

ALIASES
  $ cfsutil auth logout
```

## `cfsutil auth status`

Show myAnalog session status.

```
USAGE
  $ cfsutil auth status [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Show myAnalog session status.

ALIASES
  $ cfsutil auth status
```

## `cfsutil catalog restore`

Restore the catalog to its original version using the backup stored in `<install_dir>/Data/SoC/catalog.zip`. This will delete the existing catalog.

```
USAGE
  $ cfsutil catalog restore [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Restore the catalog to its original version using the backup stored in `<install_dir>/Data/SoC/catalog.zip`. This will
  delete the existing catalog.

EXAMPLES
  $ cfsutil catalog restore
```

_See code: [src/commands/catalog/restore.ts](src/commands/catalog/restore.ts)_

## `cfsutil catalog update`

Updates the catalog to the latest version available online.

```
USAGE
  $ cfsutil catalog update [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Updates the catalog to the latest version available online.

EXAMPLES
  $ cfsutil catalog update
```

_See code: [src/commands/catalog/update.ts](src/commands/catalog/update.ts)_

## `cfsutil cfsplugins list`

Lists available plugins

```
USAGE
  $ cfsutil cfsplugins list [-f json|text] [-v | -q] [-s <value>...] [--soc <soc>] [--board <board>] [--service
    service] [--config-options]

FLAGS
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -q, --quiet                   Suppress non-error output
  -s, --search-path=<value>...  Specify additional plugin search path. Can be used multiple times.
  -v, --verbose                 Enable verbose mode
      --board=<board>           Filter results by supported board name
      --config-options          Include configuration options (properties.project) in output
      --service=service         Filter results by service type
      --soc=<soc>               Filter results by supported SoC name

DESCRIPTION
  Lists available plugins

EXAMPLES
  List all available plugins

    $ cfsutil cfsplugins list

  Filter plugins by SoC

    $ cfsutil cfsplugins list --soc MAX32690

  Filter plugins by board

    $ cfsutil cfsplugins list --board EvKit_V1

  Filter plugins by service type

    $ cfsutil cfsplugins list --service workspace

  Combine multiple filters

    $ cfsutil cfsplugins list --soc MAX32690 --board EvKit_V1 --service project

  Show configuration options

    $ cfsutil cfsplugins list --config-options

  Use custom plugin search path

    $ cfsutil cfsplugins list -s /path/to/plugins

  Multiple search paths with filtering

    $ cfsutil cfsplugins list -s /path1 -s /path2 --soc MAX78000
```

_See code: [src/commands/cfsplugins/list.ts](src/commands/cfsplugins/list.ts)_

## `cfsutil convert`

Convert a profiling trace into a CodeFusion Studio report.

```
USAGE
  $ cfsutil convert --input <value> [-f json|text] [-v | -q] [--input-format <tef>] [--output <value>]

FLAGS
  -f, --format=<option>     [default: text] Output in desired format
                            <options: json|text>
  -q, --quiet               Suppress non-error output
  -v, --verbose             Enable verbose mode
      --input=<value>       (required) Path to the file to convert
      --input-format=<tef>  Format of the input file. Detected from the file extension if not set
      --output=<value>      Path to output report file. Defaults to <input name>_runtime_report.cfsreport next to the
                            input file

DESCRIPTION
  Convert a profiling trace into a CodeFusion Studio report.

EXAMPLES
  $ cfsutil convert --input PATH_TO_TEF_FILE

  $ cfsutil convert --input PATH_TO_TEF_FILE --output PATH_TO_REPORT

  $ cfsutil convert --input PATH_TO_TRACE --input-format tef
```

_See code: [src/commands/convert.ts](src/commands/convert.ts)_

## `cfsutil docker pull IMAGE`

Pull a Docker image

```
USAGE
  $ cfsutil docker pull IMAGE [-f json|text] [-v | -q] [-u] [-n]

ARGUMENTS
  IMAGE  Docker image to pull

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -n, --nocredential     Do not use credentials when pulling the image
  -q, --quiet            Suppress non-error output
  -u, --update           Pull the docker image even if it already exists locally
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Pull a Docker image
```

_See code: [src/commands/docker/pull.ts](src/commands/docker/pull.ts)_

## `cfsutil dt parse [FILEPATH]`

Devicetree (text) file parser

```
USAGE
  $ cfsutil dt parse [FILEPATH] [-f json|text] [-v | -q] [-I <value>...] [-o <value>]

ARGUMENTS
  FILEPATH  Devicetree (text) file path

FLAGS
  -I, --includeDirs=<value>...  Include file paths. -Idir1 -Idir2 -Idir3 ...
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -o, --output=<value>          Output json file
  -q, --quiet                   Suppress non-error output
  -v, --verbose                 Enable verbose mode

DESCRIPTION
  Devicetree (text) file parser
```

_See code: [src/commands/dt/parse.ts](src/commands/dt/parse.ts)_

## `cfsutil elf analyze FILEPATH`

Heuristics from an ELF file

```
USAGE
  $ cfsutil elf analyze FILEPATH [-f json|text] [-v | -q]

ARGUMENTS
  FILEPATH  Path to an ELF file

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Heuristics from an ELF file
```

_See code: [src/commands/elf/analyze.ts](src/commands/elf/analyze.ts)_

## `cfsutil elf info FILEPATH`

ELF parser CLI

```
USAGE
  $ cfsutil elf info FILEPATH [-f json|text] [-v | -q] [-h] [-a] [-c] [-s]

ARGUMENTS
  FILEPATH  Path to an ELF file

FLAGS
  -a, --attributes       print ELF's attributes info
  -c, --core             print ELF's file basic info
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -h, --header           print ELF's header info
  -q, --quiet            Suppress non-error output
  -s, --fsize            print ELF's sizes info
  -v, --verbose          Enable verbose mode

DESCRIPTION
  ELF parser CLI
```

_See code: [src/commands/elf/info.ts](src/commands/elf/info.ts)_

## `cfsutil elf memory FILEPATH`

View relationships between segments, sections and symbols

```
USAGE
  $ cfsutil elf memory FILEPATH [-f json|text] [-v | -q] [-s] [-t] [-y] [-i <value>] [-n <value>] [-d]

ARGUMENTS
  FILEPATH  Path to an ELF file

FLAGS
  -d, --detail           Print detailed information. Use alongside -s, -t, -y
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -i, --id=<value>       Displays the sections/symbols contained in the specified segment/sections by id. Use only with
                         -y or -t
  -n, --name=<value>     Displays the sections/symbols contained in the specified segment/sections by name. Use only
                         with -y
  -q, --quiet            Suppress non-error output
  -s, --segment          Lists of segments
  -t, --section          List of sections contained in each segment
  -v, --verbose          Enable verbose mode
  -y, --symbol           List the symbols contained in each section

DESCRIPTION
  View relationships between segments, sections and symbols
  Note that this command can generate large amounts of output which might not be viewable in a terminal window. Consider
  piping the output to a file
```

_See code: [src/commands/elf/memory.ts](src/commands/elf/memory.ts)_

## `cfsutil elf symbols FILEPATH SQLQUERY`

Query symbols contained within the ELF file

```
USAGE
  $ cfsutil elf symbols FILEPATH SQLQUERY [-f json|text] [-v | -q] [--full]

ARGUMENTS
  FILEPATH  Path to an ELF file
  SQLQUERY  Sql query to execute

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode
      --full             Print full path

DESCRIPTION
  Query symbols contained within the ELF file
```

_See code: [src/commands/elf/symbols.ts](src/commands/elf/symbols.ts)_

## `cfsutil generate`

Generate source code from the provided .cfsconfig file.

```
USAGE
  $ cfsutil generate -i <value> [-v | -q] [-o <value>] [-s <value>...]

FLAGS
  -i, --input=<value>           (required) Set the .cfsconfig file.
  -o, --output=<value>          [default: .] Set the output directory for generated code.
  -q, --quiet                   Suppress non-error output
  -s, --search-path=<value>...  Specify additional search path. Can be used multiple times.
  -v, --verbose                 Enable verbose mode

DESCRIPTION
  Generate source code from the provided .cfsconfig file.
```

_See code: [src/commands/generate.ts](src/commands/generate.ts)_

## `cfsutil help [COMMAND]`

Display help for cfsutil.

```
USAGE
  $ cfsutil help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for cfsutil.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/6.2.49/src/commands/help.ts)_

## `cfsutil myanalog apikey create`

Create a new API key.

```
USAGE
  $ cfsutil myanalog apikey create [-f json|text] [-v | -q] [--description <value>]

FLAGS
  -f, --format=<option>      [default: text] Output in desired format
                             <options: json|text>
  -q, --quiet                Suppress non-error output
  -v, --verbose              Enable verbose mode
      --description=<value>  Optional description for the key.

DESCRIPTION
  Create a new API key.
```

_See code: [src/commands/myanalog/apikey/create.ts](src/commands/myanalog/apikey/create.ts)_

## `cfsutil myanalog apikey delete APPKEY`

Delete an API key.

```
USAGE
  $ cfsutil myanalog apikey delete APPKEY [-f json|text] [-v | -q]

ARGUMENTS
  APPKEY  API key ID to delete.

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Delete an API key.
```

_See code: [src/commands/myanalog/apikey/delete.ts](src/commands/myanalog/apikey/delete.ts)_

## `cfsutil myanalog apikey list`

List API keys.

```
USAGE
  $ cfsutil myanalog apikey list [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  List API keys.
```

_See code: [src/commands/myanalog/apikey/list.ts](src/commands/myanalog/apikey/list.ts)_

## `cfsutil myanalog login`

Log in with a myAnalog account.

```
USAGE
  $ cfsutil myanalog login [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Log in with a myAnalog account.

  This will attempt to open your default web browser to log in to your myAnalog account.  It will also display a URL you
  can open manually if the browser does not open automatically.  The URL must be opened within 5 minutes and on the same
  machine this command is ran on.

ALIASES
  $ cfsutil auth login
```

_See code: [src/commands/myanalog/login.ts](src/commands/myanalog/login.ts)_

## `cfsutil myanalog logout`

Log out of the current myAnalog session.

```
USAGE
  $ cfsutil myanalog logout [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Log out of the current myAnalog session.

ALIASES
  $ cfsutil auth logout
```

_See code: [src/commands/myanalog/logout.ts](src/commands/myanalog/logout.ts)_

## `cfsutil myanalog status`

Show myAnalog session status.

```
USAGE
  $ cfsutil myanalog status [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Show myAnalog session status.

ALIASES
  $ cfsutil auth status
```

_See code: [src/commands/myanalog/status.ts](src/commands/myanalog/status.ts)_

## `cfsutil pkg add-remote REMOTENAME URL`

Registers a new package server to retrieve packages.

```
USAGE
  $ cfsutil pkg add-remote REMOTENAME URL [-f json|text] [-v | -q]

ARGUMENTS
  REMOTENAME  Name of the remote package server.
  URL         URL of the remote package server.

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Registers a new package server to retrieve packages.
```

_See code: [src/commands/pkg/add-remote.ts](src/commands/pkg/add-remote.ts)_

## `cfsutil pkg:auth-remote REMOTENAME {--user USERNAME [--password PASSWORD] | --none}`

Set the method used to authenticate to a remote package server.

```
USAGE
  $ cfsutil pkg auth-remote REMOTENAME {--user USERNAME [--password PASSWORD] | --none}

ARGUMENTS
  REMOTENAME  Name of the remote package server.

FLAGS
  -f, --format=<option>    [default: text] Output in desired format
                           <options: json|text>
  -n, --none               Do not use any authentication.
  -p, --password=PASSWORD  User password, API key or token to authenticate with.
  -q, --quiet              Suppress non-error output
  -u, --user=USERNAME      Authenticate with a username and password. If no password is provided, you will be prompted
                           for one.
  -v, --verbose            Enable verbose mode

DESCRIPTION
  Set the method used to authenticate to a remote package server.

  To view the currently configured authentication methods, use 'cfsutil pkg list-remotes'.

EXAMPLES
  Specify a username and password

    $ cfsutil pkg auth-remote REMOTENAME --user USERNAME --password PASSWORD

  Specify a username and be prompted for password

    $ cfsutil pkg auth-remote REMOTENAME --user USERNAME

  Do not use any authentication

    $ cfsutil pkg auth-remote REMOTENAME --none
```

_See code: [src/commands/pkg/auth-remote.ts](src/commands/pkg/auth-remote.ts)_

## `cfsutil pkg delete PATTERN`

Delete packages from the local cache. To use a deleted package again, reinstall it using the `cfsutil pkg install` command.

```
USAGE
  $ cfsutil pkg delete PATTERN [-f json|text] [-v | -q]

ARGUMENTS
  PATTERN  A pattern in the form pkg_name/version that may contain '*' as a wildcard character.

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Delete packages from the local cache. To use a deleted package again, reinstall it using the `cfsutil pkg install`
  command.
```

_See code: [src/commands/pkg/delete.ts](src/commands/pkg/delete.ts)_

## `cfsutil pkg delete-remote REMOTENAME`

Unregister a package server so it is no longer considered for package retrieval.

```
USAGE
  $ cfsutil pkg delete-remote REMOTENAME [-f json|text] [-v | -q]

ARGUMENTS
  REMOTENAME  Name of the remote package server.

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Unregister a package server so it is no longer considered for package retrieval.
```

_See code: [src/commands/pkg/delete-remote.ts](src/commands/pkg/delete-remote.ts)_

## `cfsutil pkg dependencies PACKAGEREFERENCE`

Retrieves dependencies of a package (including transitive dependencies), showing concrete resolved versions by default.

```
USAGE
  $ cfsutil pkg dependencies PACKAGEREFERENCE [-f json|text] [-v | -q] [-u] [--local]

ARGUMENTS
  PACKAGEREFERENCE  Package reference that includes package name and package version. eg. somePkg/2.0.0

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -u, --unresolved       Show unresolved dependency requirements instead of concrete resolved versions
  -v, --verbose          Enable verbose mode
      --local            Resolve dependencies only from local cache and installed packages

DESCRIPTION
  Retrieves dependencies of a package (including transitive dependencies), showing concrete resolved versions by
  default.
```

_See code: [src/commands/pkg/dependencies.ts](src/commands/pkg/dependencies.ts)_

## `cfsutil pkg disable-remote REMOTENAME`

Disables a previously registered remote package server.

```
USAGE
  $ cfsutil pkg disable-remote REMOTENAME [-f json|text] [-v | -q]

ARGUMENTS
  REMOTENAME  Name of the remote package server.

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Disables a previously registered remote package server.
```

_See code: [src/commands/pkg/disable-remote.ts](src/commands/pkg/disable-remote.ts)_

## `cfsutil pkg enable-remote REMOTENAME`

Enables a previously registered remote package server.

```
USAGE
  $ cfsutil pkg enable-remote REMOTENAME [-f json|text] [-v | -q]

ARGUMENTS
  REMOTENAME  Name of the remote package server.

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Enables a previously registered remote package server.
```

_See code: [src/commands/pkg/enable-remote.ts](src/commands/pkg/enable-remote.ts)_

## `cfsutil pkg info PACKAGEREFERENCE`

Retrieve a given package metadata. The package does not need to be installed for this information to be retrieved.

```
USAGE
  $ cfsutil pkg info PACKAGEREFERENCE [-f json|text] [-v | -q]

ARGUMENTS
  PACKAGEREFERENCE  Package reference that includes package name and package version. eg. somePkg/2.0.0

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Retrieve a given package metadata. The package does not need to be installed for this information to be retrieved.
```

_See code: [src/commands/pkg/info.ts](src/commands/pkg/info.ts)_

## `cfsutil pkg install [REFERENCE]`

Install a cfs package, including all its dependencies or a list of packages as specified in a manifest file.

```
USAGE
  $ cfsutil pkg install [REFERENCE] [-f json|text] [-v | -q] [-l] [--acceptLicense] [-t <value>]

ARGUMENTS
  REFERENCE  Package reference (name/version) or path to a manifest file. eg. somePkg/2.0.0 or
             /absolute/path/to/.cfsdependencies

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -l, --local            Install packages from local cache only (without download from remotes)
  -q, --quiet            Suppress non-error output
  -t, --tar=<value>      Path to a package tarball to install from. Cannot be combined with a package reference.
  -v, --verbose          Enable verbose mode
      --acceptLicense    Accept package license(s). Required for packages that require license acceptance. If not
                         provided, you will be prompted interactively.

DESCRIPTION
  Install a cfs package, including all its dependencies or a list of packages as specified in a manifest file.
```

_See code: [src/commands/pkg/install.ts](src/commands/pkg/install.ts)_

## `cfsutil pkg list [PATTERN]`

List installed packages.

```
USAGE
  $ cfsutil pkg list [PATTERN] [-f json|text] [-v | -q] [--filter <value>...]

ARGUMENTS
  PATTERN  Optional pattern to be matched with package names. eg. "pkgName/1.*", "pkgNa*".

FLAGS
  -f, --format=<option>    [default: text] Output in desired format
                           <options: json|text>
  -q, --quiet              Suppress non-error output
  -v, --verbose            Enable verbose mode
      --filter=<value>...  Optional argument in the form KEY=VALUE used to filter returned packages only to the ones
                           with matching metadata. If this argument is used multiple times, all conditions must be
                           satisfied

DESCRIPTION
  List installed packages.
```

_See code: [src/commands/pkg/list.ts](src/commands/pkg/list.ts)_

## `cfsutil pkg list-cache [PATTERN]`

List cached packages.

```
USAGE
  $ cfsutil pkg list-cache [PATTERN] [-f json|text] [-v | -q]

ARGUMENTS
  PATTERN  Optional pattern to be matched with package names. e.g. "pkgName/1.*", "pkgNa*".

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  List cached packages.
```

_See code: [src/commands/pkg/list-cache.ts](src/commands/pkg/list-cache.ts)_

## `cfsutil pkg list-remotes`

Lists all remote servers that have been registered for package retrieval.

```
USAGE
  $ cfsutil pkg list-remotes [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Lists all remote servers that have been registered for package retrieval.
```

_See code: [src/commands/pkg/list-remotes.ts](src/commands/pkg/list-remotes.ts)_

## `cfsutil pkg local-consumers NAME`

Retrieves a list of all installed packages that depend on a given package, including transitive consumers.

```
USAGE
  $ cfsutil pkg local-consumers NAME [-f json|text] [-v | -q]

ARGUMENTS
  NAME  Name of the package to retrieve information about. Note that since only one version of a package can be
        installed at a given time, it is not required to provide the version.

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Retrieves a list of all installed packages that depend on a given package, including transitive consumers.
```

_See code: [src/commands/pkg/local-consumers.ts](src/commands/pkg/local-consumers.ts)_

## `cfsutil pkg path PKGNAME`

Retrieve path of an installed package.

```
USAGE
  $ cfsutil pkg path PKGNAME [-f json|text] [-v | -q]

ARGUMENTS
  PKGNAME  Name of the package, without version.

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Retrieve path of an installed package.
```

_See code: [src/commands/pkg/path.ts](src/commands/pkg/path.ts)_

## `cfsutil pkg search PATTERN`

Retrieve packages available for install.

```
USAGE
  $ cfsutil pkg search PATTERN [-f json|text] [-v | -q]

ARGUMENTS
  PATTERN  A pattern in the form pkg_name/version that may contain '*' as a wildcard character.

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Retrieve packages available for install.
```

_See code: [src/commands/pkg/search.ts](src/commands/pkg/search.ts)_

## `cfsutil pkg uninstall NAME`

Uninstall a package. Package will remain stored on local cache so it can be used again without triggering another download.

```
USAGE
  $ cfsutil pkg uninstall NAME [-f json|text] [-v | -q]

ARGUMENTS
  NAME  Name of the package to uninstall. Note that since only one version of a package can be installed at a given
        time, it is not required to provide the version.

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Uninstall a package. Package will remain stored on local cache so it can be used again without triggering another
  download.
```

_See code: [src/commands/pkg/uninstall.ts](src/commands/pkg/uninstall.ts)_

## `cfsutil plugins`

List installed plugins.

```
USAGE
  $ cfsutil plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ cfsutil plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/index.ts)_

## `cfsutil plugins add PLUGIN`

Installs a plugin into cfsutil.

```
USAGE
  $ cfsutil plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into cfsutil.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CFSUTIL_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CFSUTIL_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ cfsutil plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ cfsutil plugins add myplugin

  Install a plugin from a github url.

    $ cfsutil plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ cfsutil plugins add someuser/someplugin
```

## `cfsutil plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ cfsutil plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ cfsutil plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/inspect.ts)_

## `cfsutil plugins install PLUGIN`

Installs a plugin into cfsutil.

```
USAGE
  $ cfsutil plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into cfsutil.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CFSUTIL_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CFSUTIL_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ cfsutil plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ cfsutil plugins install myplugin

  Install a plugin from a github url.

    $ cfsutil plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ cfsutil plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/install.ts)_

## `cfsutil plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ cfsutil plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ cfsutil plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/link.ts)_

## `cfsutil plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ cfsutil plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cfsutil plugins unlink
  $ cfsutil plugins remove

EXAMPLES
  $ cfsutil plugins remove myplugin
```

## `cfsutil plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ cfsutil plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/reset.ts)_

## `cfsutil plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ cfsutil plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cfsutil plugins unlink
  $ cfsutil plugins remove

EXAMPLES
  $ cfsutil plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/uninstall.ts)_

## `cfsutil plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ cfsutil plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cfsutil plugins unlink
  $ cfsutil plugins remove

EXAMPLES
  $ cfsutil plugins unlink myplugin
```

## `cfsutil plugins update`

Update installed plugins.

```
USAGE
  $ cfsutil plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.68/src/commands/plugins/update.ts)_

## `cfsutil port list`

List available serial ports.

```
USAGE
  $ cfsutil port list [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  List available serial ports.
```

_See code: [src/commands/port/list.ts](src/commands/port/list.ts)_

## `cfsutil project create`

Generates the project

```
USAGE
  $ cfsutil project create -w <value> -p <value> [-f json|text] [-v | -q] [-s <value>...]

FLAGS
  -f, --format=<option>              [default: text] Output in desired format
                                     <options: json|text>
  -p, --project-name=<value>         (required) Name of the project to be generated as found in the workspace file.
  -q, --quiet                        Suppress non-error output
  -s, --search-path=<value>...       Specify additional directory paths to search for plugins and data models. Can be
                                     used multiple times.
  -v, --verbose                      Enable verbose mode
  -w, --workspace-file-path=<value>  (required) .cfsworkspace file path

DESCRIPTION
  Generates the project
```

_See code: [src/commands/project/create.ts](src/commands/project/create.ts)_

## `cfsutil soc export [SOCNAME]`

Output the SoC data model for the specified SoC.

```
USAGE
  $ cfsutil soc export [SOCNAME] [-f json|text] [-v | -q] [-p <value>] [-i <value>] [-m] [-n <value>] [--version
    <value>] [-o <value>] [-s <value>...]

ARGUMENTS
  SOCNAME  SoC to export, not including package

FLAGS
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -i, --indent=<value>          [default: 2] Set JSON indentation (number of spaces or 
\t' for tab).
  -m, --minify                  Minify the JSON output
  -n, --name=<value>            SoC name. [DEPRECATED] Use SOCNAME positional argument and --package flag instead.
  -o, --output=<value>          [default: stdio] Output destination (stdio or file path)
  -p, --package=<value>         Package name of the SoC to be exported
  -q, --quiet                   Suppress non-error output
  -s, --search-path=<value>...  Additional custom search path for SoC data models. Can be used multiple times
  -v, --verbose                 Enable verbose mode
      --version=<value>         Optional Data model version (defaults to latest if not specified)

DESCRIPTION
  Output the SoC data model for the specified SoC.

ALIASES
  $ cfsutil soc export

EXAMPLES
  $ cfsutil soc export max32690 --package tqfn
```

## `cfsutil soc info SOC`

Display detailed information about a specific SoC from the catalog.

```
USAGE
  $ cfsutil soc info SOC [-f json|text] [-v | -q] [-b] [-c] [-d] [-p]

ARGUMENTS
  SOC  SoC name (case-insensitive)

FLAGS
  -b, --boards           Display supported boards for the SoC.
  -c, --cores            Display supported cores for the SoC.
  -d, --docs             Display documentation links for the SoC.
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -p, --packages         Display supported packages for the SoC.
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Display detailed information about a specific SoC from the catalog.

ALIASES
  $ cfsutil soc info

EXAMPLES
  $ cfsutil soc info MAX32660

  $ cfsutil soc info MAX32660 --boards

  $ cfsutil soc info MAX32660 --packages --cores

  $ cfsutil soc info MAX32660 --docs --format=json
```

## `cfsutil soc list`

Lists all SoCs that have been installed through the package manager, as well as the ones present in custom search paths.

```
USAGE
  $ cfsutil soc list [-f json|text] [-v | -q] [-s <value>...] [-l]

FLAGS
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -l, --legacy                  Use legacy format for output.
  -q, --quiet                   Suppress non-error output
  -s, --search-path=<value>...  Additional custom search path for SoC data models. Can be used multiple times
  -v, --verbose                 Enable verbose mode

DESCRIPTION
  Lists all SoCs that have been installed through the package manager, as well as the ones present in custom search
  paths.

ALIASES
  $ cfsutil soc list

EXAMPLES
  $ cfsutil soc list

  $ cfsutil soc list --verbose
```

## `cfsutil socs export [SOCNAME]`

Output the SoC data model for the specified SoC.

```
USAGE
  $ cfsutil socs export [SOCNAME] [-f json|text] [-v | -q] [-p <value>] [-i <value>] [-m] [-n <value>] [--version
    <value>] [-o <value>] [-s <value>...]

ARGUMENTS
  SOCNAME  SoC to export, not including package

FLAGS
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -i, --indent=<value>          [default: 2] Set JSON indentation (number of spaces or 
\t' for tab).
  -m, --minify                  Minify the JSON output
  -n, --name=<value>            SoC name. [DEPRECATED] Use SOCNAME positional argument and --package flag instead.
  -o, --output=<value>          [default: stdio] Output destination (stdio or file path)
  -p, --package=<value>         Package name of the SoC to be exported
  -q, --quiet                   Suppress non-error output
  -s, --search-path=<value>...  Additional custom search path for SoC data models. Can be used multiple times
  -v, --verbose                 Enable verbose mode
      --version=<value>         Optional Data model version (defaults to latest if not specified)

DESCRIPTION
  Output the SoC data model for the specified SoC.

ALIASES
  $ cfsutil soc export

EXAMPLES
  $ cfsutil socs export max32690 --package tqfn
```

_See code: [src/commands/socs/export.ts](src/commands/socs/export.ts)_

## `cfsutil socs info SOC`

Display detailed information about a specific SoC from the catalog.

```
USAGE
  $ cfsutil socs info SOC [-f json|text] [-v | -q] [-b] [-c] [-d] [-p]

ARGUMENTS
  SOC  SoC name (case-insensitive)

FLAGS
  -b, --boards           Display supported boards for the SoC.
  -c, --cores            Display supported cores for the SoC.
  -d, --docs             Display documentation links for the SoC.
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -p, --packages         Display supported packages for the SoC.
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Display detailed information about a specific SoC from the catalog.

ALIASES
  $ cfsutil soc info

EXAMPLES
  $ cfsutil socs info MAX32660

  $ cfsutil socs info MAX32660 --boards

  $ cfsutil socs info MAX32660 --packages --cores

  $ cfsutil socs info MAX32660 --docs --format=json
```

_See code: [src/commands/socs/info.ts](src/commands/socs/info.ts)_

## `cfsutil socs list`

Lists all SoCs that have been installed through the package manager, as well as the ones present in custom search paths.

```
USAGE
  $ cfsutil socs list [-f json|text] [-v | -q] [-s <value>...] [-l]

FLAGS
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -l, --legacy                  Use legacy format for output.
  -q, --quiet                   Suppress non-error output
  -s, --search-path=<value>...  Additional custom search path for SoC data models. Can be used multiple times
  -v, --verbose                 Enable verbose mode

DESCRIPTION
  Lists all SoCs that have been installed through the package manager, as well as the ones present in custom search
  paths.

ALIASES
  $ cfsutil soc list

EXAMPLES
  $ cfsutil socs list

  $ cfsutil socs list --verbose
```

_See code: [src/commands/socs/list.ts](src/commands/socs/list.ts)_

## `cfsutil task run TASK`

Run a task by label from a workspace/project context. By default, uses the current directory.

```
USAGE
  $ cfsutil task run TASK [-f json|text] [-v | -q] [-w <value>] [-z <value>] [--timeout <value> [-c --port
    <value> -p <value>]]

ARGUMENTS
  TASK  The task to run.

FLAGS
  -c, --capture                  Capture serial port output after task execution. Capturing will continue until the
                                 process is terminated
  -f, --format=<option>          [default: text] Output in desired format
                                 <options: json|text>
  -p, --project=<value>          The project id to run the task from (resolved relative to the workspace path)
  -q, --quiet                    Suppress non-error output
  -v, --verbose                  Enable verbose mode
  -w, --workspace=<value>        [default: .] The workspace path used for task discovery. Defaults to the current
                                 directory
  -z, --zephyrTraceFile=<value>  [default: zephyr_trace-<timestamp>.tef] Trace Extended File for Zephyr-specific output
                                 (used with --capture)
      --port=<value>             Specify the serial port name (e.g., COM3, /dev/ttyUSB0). Used with --capture
      --timeout=<value>          Terminate serial capture after the given number of seconds. Requires --capture. Use 0
                                 to capture indefinitely.

DESCRIPTION
  Run a task by label from a workspace/project context. By default, uses the current directory.

ALIASES
  $ cfsutil task run
  $ cfsutil tasks run

EXAMPLES
  $ cfsutil tasks run build

  $ cfsutil tasks run build --workspace my-workspace --project project1

  $ cfsutil tasks run build --workspace my-workspace

  $ cfsutil tasks run flash_run_JLink  -w my-workspace --capture --port COM4 --project m4
```

## `cfsutil tasks list`

List tasks for a named workspace

```
USAGE
  $ cfsutil tasks list [-f json|text] [-v | -q] [-w <value>] [-p <value>]

FLAGS
  -f, --format=<option>    [default: text] Output in desired format
                           <options: json|text>
  -p, --project=<value>    The project for which tasks should be listed
  -q, --quiet              Suppress non-error output
  -v, --verbose            Enable verbose mode
  -w, --workspace=<value>  [default: .] The workspace for which tasks should be listed

DESCRIPTION
  List tasks for a named workspace
```

_See code: [src/commands/tasks/list.ts](src/commands/tasks/list.ts)_

## `cfsutil tasks run TASK`

Run a task by label from a workspace/project context. By default, uses the current directory.

```
USAGE
  $ cfsutil tasks run TASK [-f json|text] [-v | -q] [-w <value>] [-z <value>] [--timeout <value> [-c --port
    <value> -p <value>]]

ARGUMENTS
  TASK  The task to run.

FLAGS
  -c, --capture                  Capture serial port output after task execution. Capturing will continue until the
                                 process is terminated
  -f, --format=<option>          [default: text] Output in desired format
                                 <options: json|text>
  -p, --project=<value>          The project id to run the task from (resolved relative to the workspace path)
  -q, --quiet                    Suppress non-error output
  -v, --verbose                  Enable verbose mode
  -w, --workspace=<value>        [default: .] The workspace path used for task discovery. Defaults to the current
                                 directory
  -z, --zephyrTraceFile=<value>  [default: zephyr_trace-<timestamp>.tef] Trace Extended File for Zephyr-specific output
                                 (used with --capture)
      --port=<value>             Specify the serial port name (e.g., COM3, /dev/ttyUSB0). Used with --capture
      --timeout=<value>          Terminate serial capture after the given number of seconds. Requires --capture. Use 0
                                 to capture indefinitely.

DESCRIPTION
  Run a task by label from a workspace/project context. By default, uses the current directory.

ALIASES
  $ cfsutil task run
  $ cfsutil tasks run

EXAMPLES
  $ cfsutil tasks run build

  $ cfsutil tasks run build --workspace my-workspace --project project1

  $ cfsutil tasks run build --workspace my-workspace

  $ cfsutil tasks run flash_run_JLink  -w my-workspace --capture --port COM4 --project m4
```

_See code: [src/commands/tasks/run.ts](src/commands/tasks/run.ts)_

## `cfsutil telemetry disable`

Disable telemetry.

```
USAGE
  $ cfsutil telemetry disable [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Disable telemetry.

EXAMPLES
  $ cfsutil telemetry disable
```

_See code: [src/commands/telemetry/disable.ts](src/commands/telemetry/disable.ts)_

## `cfsutil telemetry enable`

Enable telemetry.

```
USAGE
  $ cfsutil telemetry enable [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Enable telemetry.

EXAMPLES
  $ cfsutil telemetry enable
```

_See code: [src/commands/telemetry/enable.ts](src/commands/telemetry/enable.ts)_

## `cfsutil telemetry status`

Show the current telemetry preference and privacy disclosure.

```
USAGE
  $ cfsutil telemetry status [-f json|text] [-v | -q]

FLAGS
  -f, --format=<option>  [default: text] Output in desired format
                         <options: json|text>
  -q, --quiet            Suppress non-error output
  -v, --verbose          Enable verbose mode

DESCRIPTION
  Show the current telemetry preference and privacy disclosure.

EXAMPLES
  $ cfsutil telemetry status

  $ cfsutil telemetry status --format json
```

_See code: [src/commands/telemetry/status.ts](src/commands/telemetry/status.ts)_

## `cfsutil validate config`

Validate a CFS workspace or a standalone .cfsconfig file against the schema.

```
USAGE
  $ cfsutil validate config [-f json|text] [-v | -q] [-w <value> | -i <value>] [-s <value>...]

FLAGS
  -f, --format=<option>         [default: text] Output in desired format
                                <options: json|text>
  -i, --input=<value>           Path to a standalone .cfsconfig file.
  -q, --quiet                   Suppress non-error output
  -s, --search-path=<value>...  Specify additional search path. Can be used multiple times.
  -v, --verbose                 Enable verbose mode
  -w, --workspace=<value>       Path to the CFS workspace. Defaults to the current directory.

DESCRIPTION
  Validate a CFS workspace or a standalone .cfsconfig file against the schema.

EXAMPLES
  $ cfsutil validate config

  $ cfsutil validate config --workspace ./my-workspace

  $ cfsutil validate config --input ./my.cfsconfig

  $ cfsutil validate config -w ./my-workspace -v
```

_See code: [src/commands/validate/config.ts](src/commands/validate/config.ts)_

## `cfsutil validate dependencies`

Validate that packages declared in CFS dependency manifests are installed.

```
USAGE
  $ cfsutil validate dependencies [-f json|text] [-v | -q] [-w <value> | -i <value>]

FLAGS
  -f, --format=<option>    [default: text] Output in desired format
                           <options: json|text>
  -i, --input=<value>      Path to a standalone .cfsdependencies manifest.
  -q, --quiet              Suppress non-error output
  -v, --verbose            Enable verbose mode
  -w, --workspace=<value>  Path to the CFS workspace. Defaults to the current directory.

DESCRIPTION
  Validate that packages declared in CFS dependency manifests are installed.

ALIASES
  $ cfsutil validate deps

EXAMPLES
  $ cfsutil validate dependencies

  $ cfsutil validate dependencies --workspace ./my-workspace

  $ cfsutil validate dependencies --input ./workspace/.cfs/.cfsdependencies

  $ cfsutil validate dependencies --format json
```

_See code: [src/commands/validate/dependencies.ts](src/commands/validate/dependencies.ts)_

## `cfsutil validate deps`

Validate that packages declared in CFS dependency manifests are installed.

```
USAGE
  $ cfsutil validate deps [-f json|text] [-v | -q] [-w <value> | -i <value>]

FLAGS
  -f, --format=<option>    [default: text] Output in desired format
                           <options: json|text>
  -i, --input=<value>      Path to a standalone .cfsdependencies manifest.
  -q, --quiet              Suppress non-error output
  -v, --verbose            Enable verbose mode
  -w, --workspace=<value>  Path to the CFS workspace. Defaults to the current directory.

DESCRIPTION
  Validate that packages declared in CFS dependency manifests are installed.

ALIASES
  $ cfsutil validate deps

EXAMPLES
  $ cfsutil validate deps

  $ cfsutil validate deps --workspace ./my-workspace

  $ cfsutil validate deps --input ./workspace/.cfs/.cfsdependencies

  $ cfsutil validate deps --format json
```

## `cfsutil workspace configure`

Generate a CFS configuration file from the command line options. The file can be edited then used as an input to the workspace create command.

```
USAGE
  $ cfsutil workspace configure --soc <value> --core <value>... --template-id <value>... [-f json|text] [-v | -q] [-w
    <value>] [--name <value>] [-o <value>] [--board <value>] [--package <value>] [--template-version <value>...] [-s
    <value>...]

FLAGS
  -f, --format=<option>              [default: text] Output in desired format
                                     <options: json|text>
  -o, --output=<value>               Output directory for the workspace.
  -q, --quiet                        Suppress non-error output
  -s, --search-path=<value>...       Additional search path for templates and data models. Can be used multiple times
  -v, --verbose                      Enable verbose mode
  -w, --workspace-file=<value>       [default: cfsworkspace.json] Name of the generated CFS workspace configuration
                                     file.
      --board=<value>                Board name. Required if a package is not specified with --package.
      --core=<value>...              (required) Core name. Can be specified more than once, each followed by
                                     --template-id
      --name=<value>                 Name for new workspace
      --package=<value>              Package name. Required if a board is not specified with --board.
      --soc=<value>                  (required) SoC name
      --template-id=<value>...       (required) Template ID for the preceding --core flag. Must be specified for each
                                     --core
      --template-version=<value>...  Optional template version for the preceding --template-id flag. Can be specified
                                     more than once

DESCRIPTION
  Generate a CFS configuration file from the command line options. The file can be edited then used as an input to the
  workspace create command.

EXAMPLES
  $ cfsutil workspace configure --soc ADSP-SC835 --core FX --template-id com.analog.project.sharcfx.plugin --core CM33 --template-id com.analog.project.sharcfx.plugin -o c:/tmp --name myNewWorkspace --board ADSPSC835-EV-SOM -w myWorkspaceConfig.json

  $ cfsutil workspace configure  -w myWorkspaceConfig.json // Creates workspace at c:/tmp/myNewWorkspace
```

_See code: [src/commands/workspace/configure.ts](src/commands/workspace/configure.ts)_

## `cfsutil workspace create`

Generates a workspace based on a configuration file or command line arguments.

```
USAGE
  $ cfsutil workspace create [-f json|text] [-v | -q] [-s <value>...] [-i <value>] [-o <value>] [--name <value>]
    [--soc <value>] [--board <value>] [--package <value>] [--template-id <value>] [--template-version <value>]

FLAGS
  -f, --format=<option>           [default: text] Output in desired format
                                  <options: json|text>
  -i, --input=<value>             File path for existing .cfsworkspace file
  -o, --output=<value>            Output path for new workspace (excluding workspace name)
  -q, --quiet                     Suppress non-error output
  -s, --search-path=<value>...    Additional search path for templates and data models. Can be used multiple times
  -v, --verbose                   Enable verbose mode
      --board=<value>             Board name
      --name=<value>              Name for new workspace
      --package=<value>           Package name
      --soc=<value>               SoC name
      --template-id=<value>       Template ID
      --template-version=<value>  Template version

DESCRIPTION
  Generates a workspace based on a configuration file or command line arguments.

EXAMPLES
  $ cfsutil workspace create --workspace-file-path ./my_workspace.cfsworkspace

  $ cfsutil workspace create -o c:/tmp --name myNewWorkspace --soc ADSP-SC835 --board ADSPSC835-EV-SOM --template-id com.analog.sharcfx.example --template-version 1.0.1
```

_See code: [src/commands/workspace/create.ts](src/commands/workspace/create.ts)_
<!-- commandsstop -->
