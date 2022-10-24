cfsutil add-soc example plugin 
==============================

oclif plugin to demonstrate adding of additional SoC data models to the main `cfsutil` CLI command.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![GitHub license](https://img.shields.io/github/license/oclif/hello-world)](https://github.com/oclif/hello-world/blob/main/LICENSE)

* [Description](#description)
* [Usage](#usage)
* [Commands](#commands)
* [Hooks](#hooks)
* [Files](#files)

# Description
The [cfsutil CLI](https://github.com/adi-ctx/cfs-cfsutil/tree/main/packages/cli)
provides a mechanism to add additional SoC data models to the list of
default ones, via oclif plugins. A plugin (like this one) can implement a
listener for the [get-data-models](#hooks) hook (triggered by the main app),
returning a simple JavaScript object containing the data models to be added.
The keys of this object represent SoC names and values represent the actual
data model JSON files.

# Usage
From the root folder of the cfs-cfsutil repo, run:
```sh-session
# build the main CLI
$ yarn ws:cli build

# build this plugin
$ yarn ws:add-soc build

# get the list of installed SoC data models
$ yarn cfsutil socs list
> max32690-tqfn
> max32690-wlp

# add this plugin to the main CLI
$ yarn cfsutil plugins link ../cli-plugins/add-soc

# get the list of installed SoC data models again
$ yarn cfsutil socs list
> max32690-tqfn
> max32690-wlp
> soc1234
> soc5678
```
# Commands
This oclif plugin does not define any additional commands.

# Hooks
This plugin implements the `get-data-models` hook, which returns a simple object with the additional SoC data models
to be added to the main CLI:

```json
{
  "soc1234": "/path/to/soc/data/model/file/soc1234.json",
  "soc5678": "/path/to/soc/data/model/file/soc5678.json"
}

```

# Files
- [src/hooks/get-data-models/provide-data-models.ts](src/hooks/get-data-models/provide-data-models.ts) - Hook implementation
- [src/socs](src/socs) - Folder containing the additional SoC data models, copied verbatim to `/dist` during build
