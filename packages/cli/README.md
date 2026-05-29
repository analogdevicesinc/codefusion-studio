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
cfsutil/2.2.0 win32-x64 node-v24.13.0
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
* [`cfsutil docker pull IMAGE`](#cfsutil-docker-pull-image)
* [`cfsutil dt parse [FILEPATH]`](#cfsutil-dt-parse-filepath)
* [`cfsutil elf analyze [FILEPATH]`](#cfsutil-elf-analyze-filepath)
* [`cfsutil elf info [FILEPATH]`](#cfsutil-elf-info-filepath)
* [`cfsutil elf memory [FILEPATH]`](#cfsutil-elf-memory-filepath)
* [`cfsutil elf symbols [FILEPATH] [SQLQUERY]`](#cfsutil-elf-symbols-filepath-sqlquery)
* [`cfsutil generate`](#cfsutil-generate)
* [`cfsutil help [COMMANDS]`](#cfsutil-help-commands)
* [`cfsutil myanalog login`](#cfsutil-myanalog-login)
* [`cfsutil myanalog logout`](#cfsutil-myanalog-logout)
* [`cfsutil myanalog status`](#cfsutil-myanalog-status)
* [`cfsutil pkg add-remote REMOTENAME URL`](#cfsutil-pkg-add-remote-remotename-url)
* [`cfsutil pkg:auth-remote REMOTENAME {--user USERNAME [--password PASSWORD] | --myanalog | --none}`](#cfsutil-pkgauth-remote-remotename---user-username---password-password----myanalog----none)
* [`cfsutil pkg delete PATTERN`](#cfsutil-pkg-delete-pattern)
* [`cfsutil pkg delete-remote REMOTENAME`](#cfsutil-pkg-delete-remote-remotename)
* [`cfsutil pkg dependencies PACKAGEREFERENCE`](#cfsutil-pkg-dependencies-packagereference)
* [`cfsutil pkg info PACKAGEREFERENCE`](#cfsutil-pkg-info-packagereference)
* [`cfsutil pkg install REFERENCE`](#cfsutil-pkg-install-reference)
* [`cfsutil pkg list [PATTERN]`](#cfsutil-pkg-list-pattern)
* [`cfsutil pkg list-cache [PATTERN]`](#cfsutil-pkg-list-cache-pattern)
* [`cfsutil pkg list-remotes`](#cfsutil-pkg-list-remotes)
* [`cfsutil pkg local-consumers NAME`](#cfsutil-pkg-local-consumers-name)
* [`cfsutil pkg search PATTERN`](#cfsutil-pkg-search-pattern)
* [`cfsutil pkg uninstall NAME`](#cfsutil-pkg-uninstall-name)
* [`cfsutil plugins`](#cfsutil-plugins)
* [`cfsutil plugins:install PLUGIN...`](#cfsutil-pluginsinstall-plugin)
* [`cfsutil plugins:inspect PLUGIN...`](#cfsutil-pluginsinspect-plugin)
* [`cfsutil plugins:install PLUGIN...`](#cfsutil-pluginsinstall-plugin)
* [`cfsutil plugins:link PLUGIN`](#cfsutil-pluginslink-plugin)
* [`cfsutil plugins:uninstall PLUGIN...`](#cfsutil-pluginsuninstall-plugin)
* [`cfsutil plugins reset`](#cfsutil-plugins-reset)
* [`cfsutil plugins:uninstall PLUGIN...`](#cfsutil-pluginsuninstall-plugin)
* [`cfsutil plugins:uninstall PLUGIN...`](#cfsutil-pluginsuninstall-plugin)
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
* [`cfsutil workspace configure`](#cfsutil-workspace-configure)
* [`cfsutil workspace create`](#cfsutil-workspace-create)

## `cfsutil ai backends ACTION`

List available AI backends.

```
USAGE
  $ cfsutil ai backends ACTION [--format json|text] [-n <value>]

FLAGS
  -n, --name=<value>     Backend to display more information about
      --format=<option>  [default: text] Output in desired format
                         <options: json|text>

DESCRIPTION
  List available AI backends.

EXAMPLES
  $ cfsutil ai backends list

  $ cfsutil ai backends list --name tflm
```

_See code: [src/commands/ai/backends.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/ai/backends.ts)_

## `cfsutil ai build`

Compile a model into source code.

```
USAGE
  $ cfsutil ai build [--format json|text] [--config <value>] [-s <value>] [-p <value>] [-c <value>] [-a
    <value>] [-m <value>] [--dataset <value>] [--cwd <value>] [-o <value>] [--network-config <value>] [-b <value>] [-e
    <value>...] [-x <value>...] [--ignore-cache]

FLAGS
  -a, --acc=<value>             Target accelerator.
  -b, --backend=<value>         Name of backend to use
  -c, --core=<value>            Target core
  -e, --extension=<value>...    Backend specific fields provided as key=value pairs
  -m, --model=<value>           Path or URL to the model file
  -o, --output-path=<value>     Output directory for generated files, relative to cwd
  -p, --package=<value>         SoC package
  -s, --soc=<value>             Target SoC
  -x, --search-path=<value>...  Additional search path for templates and data models. Can be used multiple times
      --config=<value>          Path to .cfsconfig file
      --cwd=<value>             [default: .] Change the working directory to a specified path
      --dataset=<value>         Path or URL to the sample dataset for the model
      --format=<option>         [default: text] Output in desired format
                                <options: json|text>
      --ignore-cache            Bypass cache and fetch latest remote files
      --network-config=<value>  Path or URL to the Izer network configuration YAML. Required when `--backend` is "izer"

DESCRIPTION
  Compile a model into source code.

EXAMPLES
  $ cfsutil ai build --soc MAX32690 --core CM4 --model PATH_TO_MODEL

  $ cfsutil ai build --config PATH_TO_CONFIG
```

_See code: [src/commands/ai/build.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/ai/build.ts)_

## `cfsutil ai clean-cache`

Clear the cache which stores remote files.

```
USAGE
  $ cfsutil ai clean-cache [--format json|text]

FLAGS
  --format=<option>  [default: text] Output in desired format
                     <options: json|text>

DESCRIPTION
  Clear the cache which stores remote files.

EXAMPLES
  $ cfsutil ai clean-cache
```

_See code: [src/commands/ai/clean-cache.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/ai/clean-cache.ts)_

## `cfsutil ai compat`

Analyze model compatibility with target SoC and core.

```
USAGE
  $ cfsutil ai compat [--format json|text] [-s <value>] [-p <value>] [-c <value>] [-a <value>] [-m <value>]
    [--report-file <value>] [-x <value>...] [--ignore-cache] [-d <value>]

FLAGS
  -a, --acc=<value>             Target accelerator
  -c, --core=<value>            Target core
  -d, --dataset=<value>         Path or URL to the dataset file to use for compatibility analysis
  -m, --model=<value>           Path or URL to the model file
  -p, --package=<value>         SoC Package
  -s, --soc=<value>             Target SoC
  -x, --search-path=<value>...  Additional search path for templates and data models. Can be used multiple times
      --format=<option>         [default: text] Output in desired format
                                <options: json|text>
      --ignore-cache            Bypass cache and fetch latest remote files
      --report-file=<value>     Path to output JSON report file

DESCRIPTION
  Analyze model compatibility with target SoC and core.

EXAMPLES
  $ cfsutil ai compat --soc MAX32690 --core CM4 --model PATH_TO_MODEL
```

_See code: [src/commands/ai/compat.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/ai/compat.ts)_

## `cfsutil ai model add`

Add model to a workspace.

```
USAGE
  $ cfsutil ai model add --core <value> -m <value> [--format json|text] [-w <value>] [--config <value>] [--dataset
    <value>] [-a <value>] [--network-config <value>] [-e <value>...] [--ignore-cache]

FLAGS
  -a, --acc=<value>             Target accelerator
  -e, --extension=<value>...    Backend specific fields provided as key=value pairs
  -m, --model=<value>           (required) Path or URL to the model file
  -w, --workspace=<value>       Path to workspace
      --config=<value>          Path to .cfsconfig file
      --core=<value>            (required) Target core
      --dataset=<value>         Path or URL to the sample dataset for the model
      --format=<option>         [default: text] Output in desired format
                                <options: json|text>
      --ignore-cache            Bypass cache and fetch latest remote files
      --network-config=<value>  Path or URL to the Izer network configuration YAML (required for 'izer' backend)

DESCRIPTION
  Add model to a workspace.

EXAMPLES
  $ cfsutil ai model add --config PATH_TO_CONFIG --core CM4 --model PATH_TO_MODEL
```

_See code: [src/commands/ai/model/add.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/ai/model/add.ts)_

## `cfsutil ai model list`

List workspace models.

```
USAGE
  $ cfsutil ai model list [--format json|text] [-w <value>] [--config <value>] [-c <value>] [--verbose]

FLAGS
  -c, --core=<value>       Target Core
  -w, --workspace=<value>  Path to workspace
      --config=<value>     Path to .cfsconfig file
      --format=<option>    [default: text] Output in desired format
                           <options: json|text>
      --verbose            List filename, backend, extensions for given models

DESCRIPTION
  List workspace models.

EXAMPLES
  $ cfsutil ai model list --config PATH_TO_CONFIG

  $ cfsutil ai model list --config PATH_TO_CONFIG --core CM4 --verbose
```

_See code: [src/commands/ai/model/list.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/ai/model/list.ts)_

## `cfsutil ai model remove`

Remove model from a workspace.

```
USAGE
  $ cfsutil ai model remove --name <value> [--format json|text] [-w <value>] [--config <value>]

FLAGS
  -w, --workspace=<value>  Path to workspace
      --config=<value>     Path to .cfsconfig file
      --format=<option>    [default: text] Output in desired format
                           <options: json|text>
      --name=<value>       (required) Name of model

DESCRIPTION
  Remove model from a workspace.

EXAMPLES
  $ cfsutil ai model remove --name NAME_OF_MODEL --config PATH_TO_CONFIG
```

_See code: [src/commands/ai/model/remove.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/ai/model/remove.ts)_

## `cfsutil ai model update`

Update a model in your workspace.

```
USAGE
  $ cfsutil ai model update --name <value> --set <value>... [--format json|text] [-w <value>] [--config <value>] [-c
    <value>] [--ignore-cache]

FLAGS
  -c, --core=<value>       Target Core
  -w, --workspace=<value>  Path to workspace
      --config=<value>     Path to .cfsconfig file
      --format=<option>    [default: text] Output in desired format
                           <options: json|text>
      --ignore-cache       Bypass cache and fetch latest remote files
      --name=<value>       (required) Name of model
      --set=<value>...     (required) Values to update

DESCRIPTION
  Update a model in your workspace.

EXAMPLES
  $ cfsutil ai model update --config PATH_TO_CONFIG --name MODEL_NAME --set key=value
```

_See code: [src/commands/ai/model/update.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/ai/model/update.ts)_

## `cfsutil ai profile`

Profile model resources with target SoC and core.

```
USAGE
  $ cfsutil ai profile [--format json|text] [-s <value>] [-p <value>] [-c <value>] [-a <value>] [-m <value>]
    [--report-file <value>] [--report-format text|json] [-x <value>...] [--ignore-cache]

FLAGS
  -a, --acc=<value>             Target accelerator
  -c, --core=<value>            Target core
  -m, --model=<value>           Path or URL to the model file
  -p, --package=<value>         SoC package
  -s, --soc=<value>             Target SoC
  -x, --search-path=<value>...  Additional search path for templates and data models. Can be used multiple times
      --format=<option>         [default: text] Output in desired format
                                <options: json|text>
      --ignore-cache            Bypass cache and fetch latest remote files
      --report-file=<value>     Path to output report file
      --report-format=<option>  [default: json] Report output format: text or json
                                <options: text|json>

DESCRIPTION
  Profile model resources with target SoC and core.

EXAMPLES
  $ cfsutil ai profile --soc MAX32690 --core CM4 --model PATH_TO_MODEL
```

_See code: [src/commands/ai/profile.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/ai/profile.ts)_

## `cfsutil ai workspace create`

Generates a workspace based on a model file.

```
USAGE
  $ cfsutil ai workspace create -o <value> --name <value> --soc <value> --board <value> --core <value> -m <value> [-s
    <value>...] [--dataset <value>] [-f]

FLAGS
  -f, --skip-compat             Skip the model compatibility check
  -m, --model=<value>           (required) Path or URL to the model file
  -o, --output=<value>          (required) Output path for new workspace (excluding workspace name)
  -s, --search-path=<value>...  Additional search path for templates and data models. Can be used multiple times
      --board=<value>           (required) Board name
      --core=<value>            (required) Target core
      --dataset=<value>         Path or URL to the sample dataset for the model
      --name=<value>            (required) Name for new workspace
      --soc=<value>             (required) SoC name

DESCRIPTION
  Generates a workspace based on a model file.

EXAMPLES
  $ cfsutil ai workspace create -o c:/tmp --name myNewWorkspace --soc MAX32690 --board EvKit_V1 --core CM4 --model c:/models/model.tflite
```

_See code: [src/commands/ai/workspace/create.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/ai/workspace/create.ts)_

## `cfsutil auth login`

Log in with a myAnalog account.

```
USAGE
  $ cfsutil auth login [-v]

FLAGS
  -v, --verbose  Show additional details about the login session.

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
  $ cfsutil auth logout

DESCRIPTION
  Log out of the current myAnalog session.

ALIASES
  $ cfsutil auth logout
```

## `cfsutil auth status`

Show myAnalog session status.

```
USAGE
  $ cfsutil auth status [-v]

FLAGS
  -v, --verbose  Show additional details about the login session.

DESCRIPTION
  Show myAnalog session status.

ALIASES
  $ cfsutil auth status
```

## `cfsutil catalog restore`

Restore the catalog to its original version using the backup stored in `<install_dir>/Data/SoC/catalog.zip`. This will delete the existing catalog.

```
USAGE
  $ cfsutil catalog restore

DESCRIPTION
  Restore the catalog to its original version using the backup stored in `<install_dir>/Data/SoC/catalog.zip`. This will
  delete the existing catalog.
```

_See code: [src/commands/catalog/restore.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/catalog/restore.ts)_

## `cfsutil catalog update`

Updates the catalog to the latest version available online. Requires an active session with a myAnalog account.

```
USAGE
  $ cfsutil catalog update

DESCRIPTION
  Updates the catalog to the latest version available online. Requires an active session with a myAnalog account.
```

_See code: [src/commands/catalog/update.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/catalog/update.ts)_

## `cfsutil cfsplugins list`

Lists available plugins

```
USAGE
  $ cfsutil cfsplugins list [-s <value>...] [--soc <soc>] [--board <board>] [--service service] [--config-options]

FLAGS
  -s, --search-path=<value>...  Specify additional plugin search path. Can be used multiple times.
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

_See code: [src/commands/cfsplugins/list.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/cfsplugins/list.ts)_

## `cfsutil docker pull IMAGE`

Pull a Docker image

```
USAGE
  $ cfsutil docker pull IMAGE [-u] [-n] [-q]

ARGUMENTS
  IMAGE  Docker image to pull

FLAGS
  -n, --nocredential  Do not use credentials when pulling the image
  -q, --quiet         Suppress output from the pull command
  -u, --update        Pull the docker image even if it already exists locally

DESCRIPTION
  Pull a Docker image
```

_See code: [src/commands/docker/pull.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/docker/pull.ts)_

## `cfsutil dt parse [FILEPATH]`

Devicetree (text) file parser

```
USAGE
  $ cfsutil dt parse [FILEPATH] [-I <value>...] [-o <value>] [-v]

ARGUMENTS
  [FILEPATH]  Devicetree (text) file path

FLAGS
  -I, --includeDirs=<value>...  Include file paths. -Idir1 -Idir2 -Idir3 ...
  -o, --output=<value>          Output json file
  -v, --verbose                 Enable verbose mode

DESCRIPTION
  Devicetree (text) file parser
```

_See code: [src/commands/dt/parse.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/dt/parse.ts)_

## `cfsutil elf analyze [FILEPATH]`

Heuristics from an ELF file

```
USAGE
  $ cfsutil elf analyze [FILEPATH] [--format json|text]

ARGUMENTS
  [FILEPATH]  ELF file path

FLAGS
  --format=<option>  [default: text] Output in desired format
                     <options: json|text>

DESCRIPTION
  Heuristics from an ELF file
```

_See code: [src/commands/elf/analyze.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/elf/analyze.ts)_

## `cfsutil elf info [FILEPATH]`

ELF parser CLI

```
USAGE
  $ cfsutil elf info [FILEPATH] [--format json|text] [-h] [-a] [-c] [-s] [-v]

ARGUMENTS
  [FILEPATH]  file path to read

FLAGS
  -a, --attributes       print ELF's attributes info
  -c, --core             print ELF's file basic info
  -h, --header           print ELF's header info
  -s, --fsize            print ELF's sizes info
  -v, --verbose          enable verbose mode
      --format=<option>  [default: text] Output in desired format
                         <options: json|text>

DESCRIPTION
  ELF parser CLI
```

_See code: [src/commands/elf/info.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/elf/info.ts)_

## `cfsutil elf memory [FILEPATH]`

View relationships between segments, sections and symbols

```
USAGE
  $ cfsutil elf memory [FILEPATH] [--format json|text] [-s] [-t] [-y] [-i <value>] [-n <value>] [-d]

ARGUMENTS
  [FILEPATH]  file path  to read

FLAGS
  -d, --detail           Print detailed information. Use alongside -s, -t, -y
  -i, --id=<value>       Displays the sections/symbols contained in the specified segment/sections by id. Use only with
                         -y or -t
  -n, --name=<value>     Displays the sections/symbols contained in the specified segment/sections by name. Use only
                         with -y
  -s, --segment          Lists of segments
  -t, --section          List of sections contained in each segment
  -y, --symbol           List the symbols contained in each section
      --format=<option>  [default: text] Output in desired format
                         <options: json|text>

DESCRIPTION
  View relationships between segments, sections and symbols
  Note that this command can generate large amounts of output which might not be viewable in a terminal window. Consider
  piping the output to a file
```

_See code: [src/commands/elf/memory.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/elf/memory.ts)_

## `cfsutil elf symbols [FILEPATH] [SQLQUERY]`

Query symbols contained within the ELF file

```
USAGE
  $ cfsutil elf symbols [FILEPATH] [SQLQUERY] [--format json|text] [-f]

ARGUMENTS
  [FILEPATH]  file path  to read
  [SQLQUERY]  Sql query to execute

FLAGS
  -f, --full             Print full path
      --format=<option>  [default: text] Output in desired format
                         <options: json|text>

DESCRIPTION
  Query symbols contained within the ELF file
```

_See code: [src/commands/elf/symbols.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/elf/symbols.ts)_

## `cfsutil generate`

Generate source code from the provided .cfsconfig file.

```
USAGE
  $ cfsutil generate -i <value> [-o <value>] [-v] [-s <value>...]

FLAGS
  -i, --input=<value>           (required) Set the .cfsconfig file.
  -o, --output=<value>          [default: .] Set the output directory for generated code.
  -s, --search-path=<value>...  Specify additional search path. Can be used multiple times.
  -v, --verbose                 Display full paths for generated code.

DESCRIPTION
  Generate source code from the provided .cfsconfig file.
```

_See code: [src/commands/generate.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/generate.ts)_

## `cfsutil help [COMMANDS]`

Display help for cfsutil.

```
USAGE
  $ cfsutil help [COMMANDS...] [-n]

ARGUMENTS
  [COMMANDS...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for cfsutil.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.20/src/commands/help.ts)_

## `cfsutil myanalog login`

Log in with a myAnalog account.

```
USAGE
  $ cfsutil myanalog login [-v]

FLAGS
  -v, --verbose  Show additional details about the login session.

DESCRIPTION
  Log in with a myAnalog account.

  This will attempt to open your default web browser to log in to your myAnalog account.  It will also display a URL you
  can open manually if the browser does not open automatically.  The URL must be opened within 5 minutes and on the same
  machine this command is ran on.

ALIASES
  $ cfsutil auth login
```

_See code: [src/commands/myanalog/login.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/myanalog/login.ts)_

## `cfsutil myanalog logout`

Log out of the current myAnalog session.

```
USAGE
  $ cfsutil myanalog logout

DESCRIPTION
  Log out of the current myAnalog session.

ALIASES
  $ cfsutil auth logout
```

_See code: [src/commands/myanalog/logout.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/myanalog/logout.ts)_

## `cfsutil myanalog status`

Show myAnalog session status.

```
USAGE
  $ cfsutil myanalog status [-v]

FLAGS
  -v, --verbose  Show additional details about the login session.

DESCRIPTION
  Show myAnalog session status.

ALIASES
  $ cfsutil auth status
```

_See code: [src/commands/myanalog/status.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/myanalog/status.ts)_

## `cfsutil pkg add-remote REMOTENAME URL`

Registers a new package server to retrieve packages.

```
USAGE
  $ cfsutil pkg add-remote REMOTENAME URL

ARGUMENTS
  REMOTENAME  Name of the remote package server.
  URL         URL of the remote package server.

DESCRIPTION
  Registers a new package server to retrieve packages.
```

_See code: [src/commands/pkg/add-remote.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/add-remote.ts)_

## `cfsutil pkg:auth-remote REMOTENAME {--user USERNAME [--password PASSWORD] | --myanalog | --none}`

Set the method used to authenticate to a remote package server.

```
USAGE
  $ cfsutil pkg auth-remote REMOTENAME {--user USERNAME [--password PASSWORD] | --myanalog | --none}

ARGUMENTS
  REMOTENAME  Name of the remote package server.

FLAGS
  -m, --myanalog           Authenticate automatically using myAnalog session.
  -n, --none               Do not use any authentication.
  -p, --password=PASSWORD  User password, API key or token to authenticate with.
  -u, --user=USERNAME      Authenticate with a username and password. If no password is provided, you will be prompted
                           for one.

DESCRIPTION
  Set the method used to authenticate to a remote package server.

  To view the currently configured authentication methods, use 'cfsutil pkg list-remotes'.

  To use myAnalog authentication, you must have an active session. See 'cfsutil myanalog' to manage your myAnalog
  session.

EXAMPLES
  Specify a username and password

    $ cfsutil pkg auth-remote REMOTENAME --user USERNAME --password PASSWORD

  Specify a username and be prompted for password

    $ cfsutil pkg auth-remote REMOTENAME --user USERNAME

  Obtain credentials automatically using your myAnalog session

    $ cfsutil pkg auth-remote REMOTENAME --myanalog

  Do not use any authentication

    $ cfsutil pkg auth-remote REMOTENAME --none
```

_See code: [src/commands/pkg/auth-remote.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/auth-remote.ts)_

## `cfsutil pkg delete PATTERN`

Delete packages from the local cache. To use a deleted package again, reinstall it using the `cfsutil pkg install` command.

```
USAGE
  $ cfsutil pkg delete PATTERN

ARGUMENTS
  PATTERN  A pattern in the form pkg_name/version that may contain '*' as a wildcard character.

DESCRIPTION
  Delete packages from the local cache. To use a deleted package again, reinstall it using the `cfsutil pkg install`
  command.
```

_See code: [src/commands/pkg/delete.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/delete.ts)_

## `cfsutil pkg delete-remote REMOTENAME`

Unregister a package server so it is no longer considered for package retrieval.

```
USAGE
  $ cfsutil pkg delete-remote REMOTENAME

ARGUMENTS
  REMOTENAME  Name of the remote package server.

DESCRIPTION
  Unregister a package server so it is no longer considered for package retrieval.
```

_See code: [src/commands/pkg/delete-remote.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/delete-remote.ts)_

## `cfsutil pkg dependencies PACKAGEREFERENCE`

Retrieves a list of all the dependencies of a given package, including transitive dependencies.

```
USAGE
  $ cfsutil pkg dependencies PACKAGEREFERENCE

ARGUMENTS
  PACKAGEREFERENCE  Package reference that includes package name and package version. eg. somePkg/2.0.0

DESCRIPTION
  Retrieves a list of all the dependencies of a given package, including transitive dependencies.
```

_See code: [src/commands/pkg/dependencies.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/dependencies.ts)_

## `cfsutil pkg info PACKAGEREFERENCE`

Retrieve a given package metadata. The package does not need to be installed for this information to be retrieved.

```
USAGE
  $ cfsutil pkg info PACKAGEREFERENCE [-f json]

ARGUMENTS
  PACKAGEREFERENCE  Package reference that includes package name and package version. eg. somePkg/2.0.0

FLAGS
  -f, --format=<option>  Output format
                         <options: json>

DESCRIPTION
  Retrieve a given package metadata. The package does not need to be installed for this information to be retrieved.
```

_See code: [src/commands/pkg/info.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/info.ts)_

## `cfsutil pkg install REFERENCE`

Install a cfs package, including all its dependencies or a list of packages as specified in a manifest file.

```
USAGE
  $ cfsutil pkg install REFERENCE [-l] [--acceptLicense]

ARGUMENTS
  REFERENCE  Package reference (name/version) or path to a manifest file containing packages to install. eg.
             somePkg/2.0.0 or /absolute/path/to/.cfsdependencies

FLAGS
  -l, --local          Install packages from local cache only (without download from remotes)
      --acceptLicense  Accept package license(s). Required for packages that require license acceptance. If not
                       provided, you will be prompted interactively.

DESCRIPTION
  Install a cfs package, including all its dependencies or a list of packages as specified in a manifest file.
```

_See code: [src/commands/pkg/install.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/install.ts)_

## `cfsutil pkg list [PATTERN]`

List installed packages.

```
USAGE
  $ cfsutil pkg list [PATTERN] [-f <value>...]

ARGUMENTS
  [PATTERN]  Optional pattern to be matched with package names. eg. "pkgName/1.*", "pkgNa*".

FLAGS
  -f, --filter=<value>...  Optional argument in the form KEY=VALUE used to filter returned packages only to the ones
                           with matching metadata. If this argument is used multiple times, all conditions must be
                           satisfied

DESCRIPTION
  List installed packages.
```

_See code: [src/commands/pkg/list.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/list.ts)_

## `cfsutil pkg list-cache [PATTERN]`

List cached packages.

```
USAGE
  $ cfsutil pkg list-cache [PATTERN] [--format json|text]

ARGUMENTS
  [PATTERN]  Optional pattern to be matched with package names. e.g. "pkgName/1.*", "pkgNa*".

FLAGS
  --format=<option>  [default: text] Output in desired format
                     <options: json|text>

DESCRIPTION
  List cached packages.
```

_See code: [src/commands/pkg/list-cache.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/list-cache.ts)_

## `cfsutil pkg list-remotes`

Lists all remote servers that have been registered for package retrieval.

```
USAGE
  $ cfsutil pkg list-remotes

DESCRIPTION
  Lists all remote servers that have been registered for package retrieval.
```

_See code: [src/commands/pkg/list-remotes.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/list-remotes.ts)_

## `cfsutil pkg local-consumers NAME`

Retrieves a list of all installed packages that depend on a given package, including transitive consumers.

```
USAGE
  $ cfsutil pkg local-consumers NAME

ARGUMENTS
  NAME  Name of the package to retrieve information about. Note that since only one version of a package can be
        installed at a given time, it is not required to provide the version.

DESCRIPTION
  Retrieves a list of all installed packages that depend on a given package, including transitive consumers.
```

_See code: [src/commands/pkg/local-consumers.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/local-consumers.ts)_

## `cfsutil pkg search PATTERN`

Retrieve packages available for install.

```
USAGE
  $ cfsutil pkg search PATTERN

ARGUMENTS
  PATTERN  A pattern in the form pkg_name/version that may contain '*' as a wildcard character.

DESCRIPTION
  Retrieve packages available for install.
```

_See code: [src/commands/pkg/search.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/search.ts)_

## `cfsutil pkg uninstall NAME`

Uninstall a package. Package will remain stored on local cache so it can be used again without triggering another download.

```
USAGE
  $ cfsutil pkg uninstall NAME

ARGUMENTS
  NAME  Name of the package to uninstall. Note that since only one version of a package can be installed at a given
        time, it is not required to provide the version.

DESCRIPTION
  Uninstall a package. Package will remain stored on local cache so it can be used again without triggering another
  download.
```

_See code: [src/commands/pkg/uninstall.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/pkg/uninstall.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.10/src/commands/plugins/index.ts)_

## `cfsutil plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ cfsutil plugins add plugins:install PLUGIN...

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ cfsutil plugins add

EXAMPLES
  $ cfsutil plugins add myplugin 

  $ cfsutil plugins add https://github.com/someuser/someplugin

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.10/src/commands/plugins/inspect.ts)_

## `cfsutil plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ cfsutil plugins install PLUGIN...

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ cfsutil plugins add

EXAMPLES
  $ cfsutil plugins install myplugin 

  $ cfsutil plugins install https://github.com/someuser/someplugin

  $ cfsutil plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.10/src/commands/plugins/install.ts)_

## `cfsutil plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ cfsutil plugins link PLUGIN

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.10/src/commands/plugins/link.ts)_

## `cfsutil plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cfsutil plugins remove plugins:uninstall PLUGIN...

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.10/src/commands/plugins/reset.ts)_

## `cfsutil plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cfsutil plugins uninstall PLUGIN...

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.10/src/commands/plugins/uninstall.ts)_

## `cfsutil plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cfsutil plugins unlink plugins:uninstall PLUGIN...

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.10/src/commands/plugins/update.ts)_

## `cfsutil port list`

List available serial ports.

```
USAGE
  $ cfsutil port list [-v]

FLAGS
  -v, --verbose  Display detailed information about each serial port.

DESCRIPTION
  List available serial ports.
```

_See code: [src/commands/port/list.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/port/list.ts)_

## `cfsutil project create`

Generates the project

```
USAGE
  $ cfsutil project create -w <value> -p <value> [-s <value>...]

FLAGS
  -p, --project-name=<value>         (required) Name of the project to be generated as found in the workspace file.
  -s, --search-path=<value>...       Specify additional directory paths to search for plugins and data models. Can be
                                     used multiple times.
  -w, --workspace-file-path=<value>  (required) .cfsworkspace file path

DESCRIPTION
  Generates the project
```

_See code: [src/commands/project/create.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/project/create.ts)_

## `cfsutil soc export [SOCNAME]`

Output the SoC data model for the specified SoC.

```
USAGE
  $ cfsutil soc export [SOCNAME] [-p <value>] [-f json] [--gzip] [-i <value>] [-m] [-n <value>] [-v <value>] [-o
    <value>] [-s <value>...]

ARGUMENTS
  [SOCNAME]  SoC to export, not including package

FLAGS
  -f, --format=<option>         [default: json] Output format
                                <options: json>
  -i, --indent=<value>          [default: 2] Set JSON indentation (number of spaces or 
\t' for tab).
  -m, --minify                  Minify the JSON output
  -n, --name=<value>            SoC name. [DEPRECATED] Use SOCNAME positional argument and --package flag instead.
  -o, --output=<value>          [default: stdio] Output destination (stdio or file path)
  -p, --package=<value>         Package name of the SoC to be exported
  -s, --search-path=<value>...  Additional custom search path for SoC data models. Can be used multiple times
  -v, --version=<value>         Optional Data model version (defaults to latest if not specified)
      --gzip                    Gzip the output

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
  $ cfsutil soc info SOC [--format json|text] [-b] [-c] [-d] [-p]

ARGUMENTS
  SOC  SoC name (case-insensitive)

FLAGS
  -b, --boards           Display supported boards for the SoC.
  -c, --cores            Display supported cores for the SoC.
  -d, --docs             Display documentation links for the SoC.
  -p, --packages         Display supported packages for the SoC.
      --format=<option>  [default: text] Output in desired format
                         <options: json|text>

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
  $ cfsutil soc list [-f text|json] [-v] [-s <value>...] [-l]

FLAGS
  -f, --format=<option>         [default: text] Set the data encoding format
                                <options: text|json>
  -l, --legacy                  Use legacy format for output.
  -s, --search-path=<value>...  Additional custom search path for SoC data models. Can be used multiple times
  -v, --verbose                 Include additional SoC details.

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
  $ cfsutil socs export [SOCNAME] [-p <value>] [-f json] [--gzip] [-i <value>] [-m] [-n <value>] [-v <value>] [-o
    <value>] [-s <value>...]

ARGUMENTS
  [SOCNAME]  SoC to export, not including package

FLAGS
  -f, --format=<option>         [default: json] Output format
                                <options: json>
  -i, --indent=<value>          [default: 2] Set JSON indentation (number of spaces or 
\t' for tab).
  -m, --minify                  Minify the JSON output
  -n, --name=<value>            SoC name. [DEPRECATED] Use SOCNAME positional argument and --package flag instead.
  -o, --output=<value>          [default: stdio] Output destination (stdio or file path)
  -p, --package=<value>         Package name of the SoC to be exported
  -s, --search-path=<value>...  Additional custom search path for SoC data models. Can be used multiple times
  -v, --version=<value>         Optional Data model version (defaults to latest if not specified)
      --gzip                    Gzip the output

DESCRIPTION
  Output the SoC data model for the specified SoC.

ALIASES
  $ cfsutil soc export

EXAMPLES
  $ cfsutil socs export max32690 --package tqfn
```

_See code: [src/commands/socs/export.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/socs/export.ts)_

## `cfsutil socs info SOC`

Display detailed information about a specific SoC from the catalog.

```
USAGE
  $ cfsutil socs info SOC [--format json|text] [-b] [-c] [-d] [-p]

ARGUMENTS
  SOC  SoC name (case-insensitive)

FLAGS
  -b, --boards           Display supported boards for the SoC.
  -c, --cores            Display supported cores for the SoC.
  -d, --docs             Display documentation links for the SoC.
  -p, --packages         Display supported packages for the SoC.
      --format=<option>  [default: text] Output in desired format
                         <options: json|text>

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

_See code: [src/commands/socs/info.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/socs/info.ts)_

## `cfsutil socs list`

Lists all SoCs that have been installed through the package manager, as well as the ones present in custom search paths.

```
USAGE
  $ cfsutil socs list [-f text|json] [-v] [-s <value>...] [-l]

FLAGS
  -f, --format=<option>         [default: text] Set the data encoding format
                                <options: text|json>
  -l, --legacy                  Use legacy format for output.
  -s, --search-path=<value>...  Additional custom search path for SoC data models. Can be used multiple times
  -v, --verbose                 Include additional SoC details.

DESCRIPTION
  Lists all SoCs that have been installed through the package manager, as well as the ones present in custom search
  paths.

ALIASES
  $ cfsutil soc list

EXAMPLES
  $ cfsutil socs list

  $ cfsutil socs list --verbose
```

_See code: [src/commands/socs/list.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/socs/list.ts)_

## `cfsutil task run TASK`

Run a task by label from a workspace/project context. By default, uses the current directory.

```
USAGE
  $ cfsutil task run TASK [-w <value>] [-v] [-c --port <value> -p <value>] [-z <value>]

ARGUMENTS
  TASK  The task to run.

FLAGS
  -c, --capture                  Capture serial port output after task execution. Capturing will continue until the
                                 process is terminated
  -p, --project=<value>          The project id to run the task from (resolved relative to the workspace path)
  -v, --verbose                  Enable verbose output
  -w, --workspace=<value>        [default: C:\cygwin64\home\kmcartn\CFS\2.2.0\codefusion-studio\packages\cli] The
                                 workspace path used for task discovery. Defaults to the current directory
  -z, --zephyrTraceFile=<value>  [default: zephyr_trace-2026513-144133.tef] Trace Extended File for Zephyr-specific
                                 output (used with --capture)
      --port=<value>             Specify the serial port name (e.g., COM3, /dev/ttyUSB0). Used with --capture

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
  $ cfsutil tasks list [-w <value>] [-p <value>] [-v]

FLAGS
  -p, --project=<value>    The project for which tasks should be listed
  -v, --verbose            Also display the command associated with each task
  -w, --workspace=<value>  [default: C:\cygwin64\home\kmcartn\CFS\2.2.0\codefusion-studio\packages\cli] The workspace
                           for which tasks should be listed

DESCRIPTION
  List tasks for a named workspace
```

_See code: [src/commands/tasks/list.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/tasks/list.ts)_

## `cfsutil tasks run TASK`

Run a task by label from a workspace/project context. By default, uses the current directory.

```
USAGE
  $ cfsutil tasks run TASK [-w <value>] [-v] [-c --port <value> -p <value>] [-z <value>]

ARGUMENTS
  TASK  The task to run.

FLAGS
  -c, --capture                  Capture serial port output after task execution. Capturing will continue until the
                                 process is terminated
  -p, --project=<value>          The project id to run the task from (resolved relative to the workspace path)
  -v, --verbose                  Enable verbose output
  -w, --workspace=<value>        [default: C:\cygwin64\home\kmcartn\CFS\2.2.0\codefusion-studio\packages\cli] The
                                 workspace path used for task discovery. Defaults to the current directory
  -z, --zephyrTraceFile=<value>  [default: zephyr_trace-2026513-144133.tef] Trace Extended File for Zephyr-specific
                                 output (used with --capture)
      --port=<value>             Specify the serial port name (e.g., COM3, /dev/ttyUSB0). Used with --capture

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

_See code: [src/commands/tasks/run.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/tasks/run.ts)_

## `cfsutil workspace configure`

Generate a CFS configuration file from the command line options. The file can be edited then used as an input to the workspace create command.

```
USAGE
  $ cfsutil workspace configure --soc <value> --board <value> --core <value>... --template-id <value>... [-w <value>]
    [--name <value>] [-o <value>] [--package <value>] [--template-version <value>...] [-s <value>...] [-v]

FLAGS
  -o, --output=<value>               Output directory for the workspace.
  -s, --search-path=<value>...       Additional search path for templates and data models. Can be used multiple times
  -v, --verbose                      Verbose output.
  -w, --workspace-file=<value>       [default: cfsworkspace.json] Name of the generated CFS workspace configuration
                                     file.
      --board=<value>                (required) Board name
      --core=<value>...              (required) Core name. Can be specified more than once, each followed by
                                     --template-id
      --name=<value>                 Name for new workspace
      --package=<value>              Package name
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

_See code: [src/commands/workspace/configure.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/workspace/configure.ts)_

## `cfsutil workspace create`

Generates a workspace based on a configuration file or command line arguments.

```
USAGE
  $ cfsutil workspace create [-s <value>...] [-i <value>] [-o <value>] [--name <value>] [--soc <value>] [--board
    <value>] [--package <value>] [--template-id <value>] [--template-version <value>]

FLAGS
  -i, --input=<value>             File path for existing .cfsworkspace file
  -o, --output=<value>            Output path for new workspace (excluding workspace name)
  -s, --search-path=<value>...    Additional search path for templates and data models. Can be used multiple times
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

_See code: [src/commands/workspace/create.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V2.2.0/packages/cli/src/commands/workspace/create.ts)_
<!-- commandsstop -->
