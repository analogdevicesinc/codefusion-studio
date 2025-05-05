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
cfsutil/1.1.0-25 linux-x64 node-v20.19.0
$ cfsutil --help [COMMAND]
USAGE
  $ cfsutil COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`cfsutil cfsplugins list`](#cfsutil-cfsplugins-list)
* [`cfsutil dt parse [FILEPATH]`](#cfsutil-dt-parse-filepath)
* [`cfsutil elf analyze [FILEPATH]`](#cfsutil-elf-analyze-filepath)
* [`cfsutil elf info [FILEPATH]`](#cfsutil-elf-info-filepath)
* [`cfsutil elf memory [FILEPATH]`](#cfsutil-elf-memory-filepath)
* [`cfsutil elf symbols [FILEPATH] [SQLQUERY]`](#cfsutil-elf-symbols-filepath-sqlquery)
* [`cfsutil generate`](#cfsutil-generate)
* [`cfsutil help [COMMANDS]`](#cfsutil-help-commands)
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
* [`cfsutil project create`](#cfsutil-project-create)
* [`cfsutil socs export`](#cfsutil-socs-export)
* [`cfsutil socs list`](#cfsutil-socs-list)
* [`cfsutil workspace create`](#cfsutil-workspace-create)

## `cfsutil cfsplugins list`

```
USAGE
  $ cfsutil cfsplugins list [-s <value>...]

FLAGS
  -s, --search-path=<value>...  Specify additional plugin search path. Can be used multiple times.
```

_See code: [src/commands/cfsplugins/list.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/cfsplugins/list.ts)_

## `cfsutil dt parse [FILEPATH]`

Devicetree (text) file parser

```
USAGE
  $ cfsutil dt parse [FILEPATH] [-I <value>...] [-o <value>] [-v]

ARGUMENTS
  FILEPATH  Devicetree (text) file path

FLAGS
  -I, --includeDirs=<value>...  Include file paths. -Idir1 -Idir2 -Idir3 ...
  -o, --output=<value>          Output json file
  -v, --verbose                 Enable verbose mode

DESCRIPTION
  Devicetree (text) file parser
```

_See code: [src/commands/dt/parse.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/dt/parse.ts)_

## `cfsutil elf analyze [FILEPATH]`

Heuristics from an ELF file

```
USAGE
  $ cfsutil elf analyze [FILEPATH] [-j]

ARGUMENTS
  FILEPATH  ELF file path

FLAGS
  -j, --json  Export in JSON format

DESCRIPTION
  Heuristics from an ELF file
```

_See code: [src/commands/elf/analyze.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/elf/analyze.ts)_

## `cfsutil elf info [FILEPATH]`

ELF parser CLI

```
USAGE
  $ cfsutil elf info [FILEPATH] [-j] [-h] [-a] [-c] [-s] [-v]

ARGUMENTS
  FILEPATH  file path to read

FLAGS
  -a, --attributes  print ELF's attributes info
  -c, --core        print ELF's file basic info
  -h, --header      print ELF's header info
  -j, --json        export to JSON format
  -s, --fsize       print ELF's sizes info
  -v, --verbose     enable verbose mode

DESCRIPTION
  ELF parser CLI
```

_See code: [src/commands/elf/info.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/elf/info.ts)_

## `cfsutil elf memory [FILEPATH]`

View relationships between segments, sections and symbols

```
USAGE
  $ cfsutil elf memory [FILEPATH] [-s] [-t] [-y] [-i <value>] [-n <value>] [-j] [-d]

ARGUMENTS
  FILEPATH  file path  to read

FLAGS
  -d, --detail        Print detailed information. Use alongside -s, -t, -y
  -i, --id=<value>    Displays the sections/symbols contained in the specified segment/sections by id. Use only with -y
                      or -t
  -j, --json          Export in JSON format. Use alongside -s, -t, -y
  -n, --name=<value>  Displays the sections/symbols contained in the specified segment/sections by name. Use only with
                      -y
  -s, --segment       Lists of segments
  -t, --section       List of sections contained in each segment
  -y, --symbol        List the symbols contained in each section

DESCRIPTION
  View relationships between segments, sections and symbols
```

_See code: [src/commands/elf/memory.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/elf/memory.ts)_

## `cfsutil elf symbols [FILEPATH] [SQLQUERY]`

Query symbols contained within the ELF file

```
USAGE
  $ cfsutil elf symbols [FILEPATH] [SQLQUERY] [-j] [-f]

ARGUMENTS
  FILEPATH  file path  to read
  SQLQUERY  Sql query to execute

FLAGS
  -f, --full  Print full path
  -j, --json  Export in JSON format

DESCRIPTION
  Query symbols contained within the ELF file
```

_See code: [src/commands/elf/symbols.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/elf/symbols.ts)_

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

_See code: [src/commands/generate.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/generate.ts)_

## `cfsutil help [COMMANDS]`

Display help for cfsutil.

```
USAGE
  $ cfsutil help [COMMANDS...] [-n]

ARGUMENTS
  COMMANDS...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for cfsutil.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.20/src/commands/help.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.10/src/commands/plugins/reset.ts)_

## `cfsutil plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cfsutil plugins uninstall PLUGIN...

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.10/src/commands/plugins/uninstall.ts)_

## `cfsutil plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cfsutil plugins unlink plugins:uninstall PLUGIN...

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.10/src/commands/plugins/update.ts)_

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

_See code: [src/commands/project/create.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/project/create.ts)_

## `cfsutil socs export`

Output the SoC data model for the specified SoC.

```
USAGE
  $ cfsutil socs export -n <value> [-f json] [--gzip] [-i <value>] [-m] [-o stdio]

FLAGS
  -f, --format=<option>  [default: json] Output format
                         <options: json>
  -i, --indent=<value>   [default: 2] Set JSON indentation (number of spaces or 
\t' for tab).
  -m, --minify           Minify the JSON output
  -n, --name=<value>     (required) SoC name
  -o, --output=<option>  [default: stdio] Output destination
                         <options: stdio>
      --gzip             Gzip the output

DESCRIPTION
  Output the SoC data model for the specified SoC.
```

_See code: [src/commands/socs/export.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/socs/export.ts)_

## `cfsutil socs list`

List available SoCs.

```
USAGE
  $ cfsutil socs list [-f text|json] [-v]

FLAGS
  -f, --format=<option>  [default: text] Set the data encoding format.
                         <options: text|json>
  -v, --verbose          Include additional SoC details.

DESCRIPTION
  List available SoCs.
```

_See code: [src/commands/socs/list.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/socs/list.ts)_

## `cfsutil workspace create`

Generates a workspace based on a configuration file.

```
USAGE
  $ cfsutil workspace create -w <value> [-s <value>...]

FLAGS
  -s, --search-path=<value>...       Specify additional directory paths to search for plugins and data models. Can be
                                     used multiple times.
  -w, --workspace-file-path=<value>  (required) .cfsworkspace file path

DESCRIPTION
  Generates a workspace based on a configuration file.
```

_See code: [src/commands/workspace/create.ts](https://github.com/analogdevicesinc/codefusion-studio/blob/V1.1.0/packages/cli/src/commands/workspace/create.ts)_
<!-- commandsstop -->
