cfsutil add-codegen example plugin
=================================================

oclif plugin to demonstrate adding of additional code generation engines to the main `cfsutil` CLI command.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![GitHub license](https://img.shields.io/github/license/oclif/hello-world)](https://github.com/oclif/hello-world/blob/main/LICENSE)

* [Description](#description)
* [Usage](#usage)
* [Commands](#commands)
* [Hooks](#hooks)
* [Files](#files)

# Description
The [cfsutil CLI](https://github.com/adi-ctx/cfs-cfsutil/tree/main/packages/cli)
provides a mechanism to add additional code generation engines to the list of
default ones, via oclif plugins. A plugin (like this one) can implement listeners
for the [get-engines](#hooks) and [generate-code](#hooks) hooks (triggered by the main app),
returning engine information and generated code.

# Usage
From the root folder of the cfs-cfsutil repo, run:
```sh-session
# build the main CLI
$ yarn ws:cli build

# build this plugin
$ yarn ws:add-engine build

# get the list of installed code generation engines
$ yarn cfsutil engines list
> msdk

# add this plugin to the main CLI
$ yarn cfsutil plugins link ../cli-plugins/add-codegen

# get the list of installed code generation engines again
$ yarn cfsutil engines list
> msdk
> example-code-generation-engine
```

# Commands
This oclif plugin does not define any additional commands.

# Hooks
This plugin implements 2 oclif custom hooks: `get-engines` and `generate-code`.

The `get-engines` hook is responsible for collecting registered code generation
engines from all installed plugins. A hook listener should return an array of objects describing the code generation engines implemented by the plugin:

```json
[
  {
    name: 'example-code-generation-engine',
    label: 'Example Code Generation',
    description: 'This is an example of a code generation engine implementation.',
    version: '1.0.0',
    socs: [],
    features: ['Pin Config'],
  }
]
```

The `generate-code` hook is used for the actual generation of code. There are 3
parameters provided in the triggered event:
- `engine` - the engine name selected by the user
- `soc` - the SoC data model (an object describing the SoC pins, features, registers)
- `configdata` - an object containing the pin mux and pin configuration choices

A listener should ignore events with an engine name different from the one
implemented by the plugin, by simply returning `undefined`.

However, if the engine name matches, the listener should return an object
(not a JSON string!) with the following structure:

```js
{
  'filename1.c': [
    'generated code line 1',
    'generated code line 2',
    'generated code line 3'
  ],
  'filename2.c': [
    ...
  ],
  'filename3.h': [
    ...
  ]
}
```

There can be any number of file names in the response, each with an array of
generated lines. Line terminators (eg: `\n`) should not be added to the lines.


# Files
- [src/hooks/get-engines/provide-engines.ts](src/hooks/get-engines/provide-engines.ts) - Hook listener implementation
- [src/hooks/generate-code/generate-code.ts](src/hooks/generate-code/generate-code.ts) - Hook listener implementation
