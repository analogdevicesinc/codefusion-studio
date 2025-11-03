---
description: Examples of scripts used in the GDB Toolbox 
author: Analog Devices
date: 2025-07-31
---

# GDB Toolbox examples

This article provides examples of the types of scripts you can create with the GDB Toolbox.

## Log contents to the Debug Console

The following example shows a simple GDB Toolbox script. It runs a single command `(x/32x $sp)` to dump the top of the stack, and performs a single action of logging a message to the **Debug Console**.

```json
{
  "name": "Dump Stack",
  "description": "Dump top of stack and log it.",
  "commands": [
    {
      "command": "x/32x $sp",
      "actions": [
        {
          "type": "log",
          "message": "Stack contents dumped."
        }
      ]
    }
  ]
}
```

## Save and view output

Each command can have more than one action. In this example, in addition to writing to the **Debug Console**, you also save the output to a file and open that file in the UI.

```json
{
  "name": "Dump Stack to File",
  "description": "Dump the top of the stack, write to the log file and open it.",
  "commands": [
    {
      "command": "x/32x $sp",
      "actions": [
        { "type": "log", "message": "Stack contents dumped." },
        {
          "type": "writeFile",
          "filePath": "gdb_toolbox/reports/stack_output.log",
          "content": "${gdbOutput}"
        },
        {
          "type": "openFile",
          "filePath": "gdb_toolbox/reports/stack_output.log",
          "lineNumber": 5
        }
      ]
    }
  ]
}

```

!!!Note
    All file paths in `writeFile`, `appendFile`, and `openFile` actions resolve relative to the project root directory.
     The `${gdbOutput}` variable captures the output of the GDB command. See [Variables](gdb-toolbox-reference.md#variables)

## Chain together multiple commands

You can chain together multiple GDB commands in one script. For example, you might first dump the stack, then dump the register values using different actions.

This example uses `appendFile` to append the output to a file  and `showMessage` to display a message to the UI for the second command:

```json
{
  "name": "Dump Stack and Registers",
  "description": "Dump the top of the stack, write to the log file and open it. Append the registers to a log file and display a message in the UI",
  "commands": [
    {
      "command": "x/32x $sp",
      "actions": [
        // Reuse actions from the previous example
      ]
    },
    {
      "command": "info registers",
      "actions": [
        {
          "type": "appendFile",
          "filePath": "gdb_toolbox/reports/debug.log",
          "content": "${gdbOutput}"
        },
        {
          "type": "showMessage",
          "level": "info",
          "message": "Register state saved to debug.log"
        }
      ]
    }
  ]
}
```

## Reference a script

You can point to a script from within your custom script by using the `source` GDB command. For example:

```json
{
  "command": "source {defaultScriptsDirectory}/dump_stack.gdb",
  "actions": [
    { "type": "log", "message": "Stack contents dumped." }
  ]
}

```

!!!Tip
    Use the `{defaultScriptsDirectory}` variable instead of relative paths to ensure the script path resolves correctly across environments. This avoids errors where GDB cannot locate the file due to its working directory context.

## Capture and reuse values

You can use the `setVariable` action to capture a value from the output of a GDB command using a regular expression. The following example runs `info registers pc`, uses a regex to extract the program counter (PC) value, and stores it in the `pc_value` variable. Only the first capturing group in the regex is assigned to the variable, which can then be reused in later actions.

```json
{
  "name": "Capture Register Value",
  "description": "Extracts the PC register value from GDB output.",
  "commands": [
    {
      "command": "info registers pc",
      "actions": [
        {
          "type": "setVariable",
          "name": "pc_value",
          "regex": "pc\\s+0x([0-9a-fA-F]+)"
        },
        {
          "type": "log",
          "message": "PC value is: ${pc_value}"
        }
      ]
    }
  ]
}
```

!!! Note
    In addition to variables set using `setVariable`, you can also use built-in variables such as `${gdbOutput}`, `${timestamp}`, `${input}`, and `${input:<id>}` to make your scripts more dynamic. See [Variables](gdb-toolbox-reference.md#variables).

## Run conditional actions

For more complex cases, you can use conditional logic to control which actions run based on values extracted from GDB output.

This example demonstrates how to use the previously shown `setVariable` action to extract a value from the GDB output and conditionally run different actions depending on its value.

```json
{
  "name": "Test Conditional Action",
  "description": "Demonstrates the use of the conditional action with Jexl expressions.",
  "commands": [
    {
      "command": "echo 42",
      "actions": [
        { "type": "setVariable", "name": "testValue", "regex": "(\\d+)" },
        {
          "type": "conditional",
          "condition": "testValue == 42",
          "then": [
            {
              "type": "showMessage",
              "message": "The testValue is 42! Condition passed.",
              "level": "info"
            }
          ],
          "else": [
            {
              "type": "showMessage",
              "message": "The testValue is not 42. Condition failed.",
              "level": "warning"
            }
          ]
        }
      ]
    }
  ]
}

```

## Open the disassembly view

This script opens the disassembly view at the current program counter using the `openDisassembly` action. It uses info registers pc to get the current address and then triggers the disassembly view.

```json
{
  "name": "Open Disassembly at PC",
  "description": "Opens the disassembly view at the current program counter.",
  "commands": [
    {
      "command": "info registers pc",
      "actions": [
        { "type": "openDisassembly" }
      ]
    }
  ]
}

```

## Format the output

This example shows how the `appendFile` action is used to store a formatted Markdown report using the `${markdownReport}` variable.

```json
{
  "name": "Analyze Faults",
  "description": "Analyzes faults and exceptions in the target application.",
  "core": "arm",
  "commands": [
    {
      "command": "source {defaultScriptsDirectory}/fault-analyzer-arm.gdb",
      "actions": [
        {
          "type": "appendFile",
          "filePath": "gdb_toolbox/reports/fault_analyzer.md",
          "content": "${markdownReport}"
        }
      ]
    }
  ]
}
```

!!!Tip
    You can modify how the Markdown report is generated by editing the `markdown-report.ts` file. Refer to the [:octicons-link-external-24: CFS GitHub](https://github.com/analogdevicesinc/codefusion-studio){:target="_blank"} repository for build instructions and source code.
