---
description: Available action types for the GDB Toolbox
author: Analog Devices
date: 2026-08-05
---

# GDB Toolbox reference

Each GDB Toolbox script is defined in a JSON file. The following GDB Toolbox script includes numbered fields that are described in the table below:

```json
{
  "name": "Analyze Faults",                                  // ①
  "description": "Analyzes faults and exceptions...",        // ②
  "version": "1.0.0",                                         // ③
  "arch": "arm",                                              // ④
  "firmwarePlatform": "zephyr",                               // ⑤
  "soc": "MAX32690",                                          // ⑥
  "commands": [                                               // ⑦
    {
      "command": "source {defaultScriptsDirectory}/fault-analyzer-arm.gdb", // ⑬
      "actions": [                                            // ⑭
        {
          "type": "appendFile",                               // ⑮
          "filePath": "gdb_toolbox/reports/${input:filename}.md", // ⑯
          "content": "${markdownReport}"
        }
      ]
    }
  ],
  "inputs": [                                                 // ⑧
    {
      "id": "filename",                                       // ⑨
      "type": "inputBox",                                     // ⑩
      "title": "Log Filename",                                // ⑪
      "prompt": "Enter a name for the log file"               // ⑫
    }
  ]
}


```

| # | Field              | Type   | Description                                                                                               | Required |
|---|--------------------|--------|-----------------------------------------------------------------------------------------------------------|----------|
| 1 | `name`             | string | The display name of the script as shown in the GDB Toolbox UI.                                            | ✅ Yes    |
| 2 | `description`      | string | A short description of the script. Appears in the Toolbox UI tooltip.                                     | ✅ Yes    |
| 3 | `version`          | string | The version of the script. For example: `1.0.0`.                                                          | ✅ Yes    |
| 4 | `arch`             | string or array | Specifies the supported architecture, for example: `arm`, `riscv`. Accepts a single value or an array of values. Filters visibility during debug sessions. | ❌ No     |
| 5 | `firmwarePlatform` | string or array | Filters script visibility by platform. Accepts a single value or an array of values. For example: `zephyr`, `msdk`. | ❌ No     |
| 6 | `soc`              | string or array | Filters script visibility by SoC name. Accepts a single value or an array of values. For example: `MAX32690`. | ❌ No     |
| 7 | `commands`         | array  | A list of GDB commands to run when the script runs.                                                       | ✅ Yes    |
| 8 | `inputs`           | array  | A list of user input prompts.                                                                             | ❌ No     |

## Fields inside each `inputs` object

| #  | Field     | Type   | Description                                                                                                                                 |Required |
|----|-----------|--------|---------------------------------------------------------------------------------------------------------------------------------------------|----------|
| 9  | `id`      | string | Unique identifier for the prompt, referenced as `${input:<id>}` in the `commands[]` and `actions[]` sections.                               |✅ Yes    |
| 10 | `type`    | string | The type of input prompt: `inputBox` for text entry or `quickPick` for predefined choices.                                                  |✅ Yes    |
| 11 | `title`   | string | The title of the input prompt displayed in the UI.                                                                                          |❌ No     |
| 12 | `prompt`  | string | The message displayed to the user, asking for input.                                                                                        |❌ No     |
| -  | `choices` | array  | A list of predefined choices for `quickPick` inputs, such as `["A", "B", "C"]`.                                                             |✅ Yes    |

## Fields inside each `commands` object

| #  | Field     | Type   | Description                                                                                                                | Required |
|----|-----------|--------|----------------------------------------------------------------------------------------------------------------------------|----------|
| 13 | `command` | string | The GDB command to run. Supports variables like `${input}` or `${gdbOutput}`. See [Variables](#variables) for details. | ✅ Yes    |
| 14 | `actions` | array  | A list of actions to run after the command.                                                                                | ❌ No     |

## Fields inside each `actions` object

| #  | Field    | Type   | Description                                                                                                                             | Required |
|----|----------|--------|-----------------------------------------------------------------------------------------------------------------------------------------|----------|
| 15  | `type`   | string | The type of action to perform, such as: `log`, `writeFile`, `appendFile`, `showMessage`. See [Action types](#action-types) for details. | ✅ Yes    |
| 16 | (varies) | varies | Additional fields required depend on the `type`.                                                                                        | ✅ Yes    |

### Action types

Each action must include a `type`, followed by additional fields that depend on the action type.

```json
{
  "type": "appendFile",
  "filePath": "gdb_toolbox/reports/fault_analyzer.md",
  "content": "${markdownReport}"
}


```

The table below lists supported action types and their associated fields:

| Type                  | Example fields              | Description                                                                                                                                                                                                                                                                                   | Example                                                                             |
|-----------------------|-----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| `appendFile`          | `filePath`, `content`       | Appends output to an existing file in the project directory.                                                                                                                                                                                                                                  | [View](gdb-toolbox-examples.md#chain-together-multiple-commands){:target="_blank"}  |
| `conditional`         | `condition`, `then`, `else` | Runs actions conditionally using a [Jexl](https://github.com/TomFrost/Jexl) expression. The expression can refer to variables defined earlier in the script using `setVariable`. If the condition evaluates to true, the `then` actions run; otherwise, the `else` actions run (if provided). | [View](gdb-toolbox-examples.md#run-conditional-actions){:target="_blank"}           |
| `log`                 | `message`                   | Writes a message to the **Debug Console**.                                                                                                                                                                                                                                                    | [View](gdb-toolbox-examples.md#log-contents-to-the-debug-console){:target="_blank"} |
| `openDisassembly`[^1] |                             | Opens the disassembly view at the current program counter (PC) address for the selected core. Useful for low-level inspection during a paused debug session.[^1]                                                                                                                              | [View](gdb-toolbox-examples.md#open-the-disassembly-view){:target="_blank"}         |
| `openFile`            | `filePath`, `lineNumber`    | Opens a file in the editor. If `lineNumber` is provided, the editor scrolls to that line. `lineNumber` must be a number.                                                                                                                                                                      | [View](gdb-toolbox-examples.md#save-and-view-output){:target="_blank"}              |
| `setVariable`         | `name`, `regex`             | Extracts a value from the GDB response using a `regex` with a capturing group. Only the first capturing group is stored.                                                                                                                                                                      | [View](gdb-toolbox-examples.md#capture-and-reuse-values){:target="_blank"}          |
| `showMessage`         | `message`, `level`          | Displays a pop-up message in the UI. `level` must be one of `info`, `warning`, or `error`. Defaults to `info` if not provided.                                                                                                                                                                | [View](gdb-toolbox-examples.md#chain-together-multiple-commands){:target="_blank"}  |
| `writeFile`           | `filePath`, `content`       | Writes output to a file in the project directory.                                                                                                                                                                                                                                             | [View](gdb-toolbox-examples.md#save-and-view-output){:target="_blank"}              |

[^1]: Due to a limitation in the Cortex-Debug extension, the `openDisassembly` action cannot currently navigate to a user-defined address.
<!---To DO: This may be resolved at a later point --->

## Variables

GDB Toolbox scripts support variables to make commands and actions dynamic. You can prompt users for input, reuse extracted values, or insert built-in values like timestamps.

For example, this script prompts the user for a command, then writes the GDB output to a timestamped log file:

```json
{
  "name": "Run GDB Command and Save Output",
  "description": "Lets you choose a GDB command and saves the output to a log file.",
  "version": "1.0.0",
  "commands": [
    {
      "command": "${input:command}",
      "actions": [
        {
          "type": "writeFile",
          "filePath": "logs/output_${timestamp}.log",
          "content": "${gdbOutput}"
        }
      ]
    }
  ],
  "inputs": [
    {
      "id": "command",
      "type": "quickPick",
      "title": "Select a Command",
      "prompt": "Choose a command to run:",
      "choices": ["info registers", "info threads", "bt"]
    }
  ]
}

```

The table below lists supported variables and how they can be used:

| Variable            | Description                                                                                                     | Supported fields                              |
|---------------------|-----------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| `${gdbOutput}`      | Captures the output of the GDB command in the current `commands` section.                                       | `content`, `message`                          |
| `${input}`          | Prompts the user to enter a value.                                                                              | `command`, `filePath`, `content`              |
| `${input:<id>}`       | Prompts the user for input by referencing the `id` defined in the `inputs[]` section.                           | `command`, `filePath`, `content`              |
| `${markdownReport}` | Inserts a preformatted Markdown version of GDB output. See [Example](gdb-toolbox-examples.md#format-the-output) | `content`                                     |
| `${<name>}`[^2]     | Variable set by `setVariable`. See [Example](gdb-toolbox-examples.md#capture-and-reuse-values)                  | `filePath`, `content`, `message`, `condition` |
| `${timestamp}`      | Inserts current ISO 8601 timestamp.                                                                             | `filePath`, `content`                         |

[^2]: Use `${<name>}` after defining it with a `setVariable action`. For example, if you use `"name": "pc_value"`, reference it later as `${pc_value}`. Only the first capturing group from the regex is stored.
