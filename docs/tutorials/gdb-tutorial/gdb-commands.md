---
description: List of common GDM commands.
author: Analog Devices
date: 2024-09-02
---

# GDB Commands

Use the following commands to interact with the GNU Debugger (GDB) and debug your program. Many of the commands have shortcuts that can be used to save time and keystrokes.

## Navigation

| Command        | Shortcut | Description                                   |
|----------------|----------|-----------------------------------------------|
| ctrl+c         | N/A      | Halt the current program execution            |
| continue       | c        | Resume execution                              |
| step           | s        | Step into the function                        |
| step [value]   | s 10     | Step the next 10 source lines                 |
| next           | n        | Run the next line in the function (step over) |
| next [value]   | n 10     | Run the next 10 lines in current function     |
| until [value]  | u 20     | Run until line 20 of the current file         |
| finish         | f        | Run to the end of the function or stack frame |

## Breakpoints

| Command            | Shortcut                | Description                                    |
|--------------------|-------------------------|------------------------------------------------|
| break main         | b main                  | Break on main () entry                         |
| break on function  | b main.c:func           | Break on function () in main.c                 |
| break on line      | b main.c:18             | Break on line 18 of main.c                     |
| break on condition | b main.c:18 if foo > 20 | Break if foo > 20 (boolean condition)          |
| break and delete   | tbreak main             | Fire once and deletes itself                   |
| info breakpoints   | N/A                     | Lists all breakpoints                          |
| ignore 2 20        | N/A                     | Ignore breakpoint 2[^1] for the first 20 times |
| disable 2          | N/A                     | Disable breakpoint 2[^1]                       |
| delete 2           | N/A                     | Delete breakpoint 2[^1]                        |

## Watchpoints

| Command                   | Description                    |
|---------------------------|--------------------------------|
| watch foo                 | Watch foo                      |
| watch myarray[10].val     | Watch .val in myarray[10]      |
| watch *0x1000FEFE         | Watch memory addr 0x1000FEFE   |
| watch foo if foo > 20     | Conditional watch (foo >20)    |
| watch foo if foo + x > 20 | Complex conditional expression |
| info watchpoints          | Lists all watchpoints          |
| delete 2                  | Delete watchpoint 2[^1]        |

## Stack Backtrace

| Command   | Shortcut | Description                                       |
|-----------|--------------|-----------------------------------------------|
| backtrace | bt       | Display a stack backtrace (function call history) |
| frame     |          | Display the current stack frame                   |
| up        |          | Move up the stack                                 |
| down      |          | Move down the stack                               |

## Info

| Command           | Description                 |
|-------------------|-----------------------------|
| info locals       | List all local variables    |
| info variables    | List all global variables   |
| info args         | List all function arguments |
| info registers    | List all registers          |
| info breakpoints  | List all breakpoints        |
| info watchpoints  | List all watchpoints        |

## Print

| Command        | Shortcut                  | Description                                  |
|----------------|---------------------------|----------------------------------------------|
| print          | p                         | Print the value of a variable or expression  |
| print variable | p foo                     | Print the value of foo                       |
| print multiple | p foo+bar                 | Print the complex expression of foo plus bar |
| print/hex ()   | p/x &main                 | Print the address of main()                  |
| print/hex ()   | p/x $r4                   | Print the value of register r4 in hex        |
| print array () | p/a *(uint32_t[8]*)0x1234 | Print the array of 8 u32s at address 0x1234  |

## Variables

| Variable | Description          |
|----------|----------------------|
| a        | Address              |
| b        | Byte, 1B             |
| c        | Character            |
| d        | Decimal point        |
| f        | Float                |
| g        | Giant, 8B            |
| h        | Halfworld, 2B        |
| i        | Instruction          |
| o        | Octal integer        |
| s        | String               |
| t        | Binary integer       |
| u        | Unsigned decimal int |
| w        | Word, 4B             |
| x        | Hex integer          |
| z        | Padded hex           |

## Examine

FMT is a repeat count, followed by a format and size letter.

| Command          | Shortcut    | Description                            |
|------------------|-------------|----------------------------------------|
| examine/[FMT]    | x           | Examine the count in format and size   |
| examine variable | x foo       | Show address of variabe foo            |
| examine ()       | x/4c 0x581F | Show four characters at address 0x581F |
| examine ()       | x/4xw &main | Show four words in hex at main()       |

### examine source code

| Command            | Description                        |
|--------------------|------------------------------------|
| list               | Show scr for the current location  |
| list *0x1234       | Show source for address 0x1234     |
| list main.C:func   | Show source for func() from main.C |
| disas func         | List ASM code for func() |
| find /b 0x0, 0x10000, 'H', 'e', 'l', 'l', 'o' 0x581f | search for a byte pattern between 0x0 to 0x10000 |
| x/s 0x581f         | Examine string at address 0x581f    |

## Find

| Command | Description                                                |
|---------|------------------------------------------------------------|
| find    | Scan a specific address range for a pattern or known value |

## Multiple image support

| Command           | Description                                |
|-------------------|--------------------------------------------|
| add-symbol-file   | Adds new ELF file into the same GDB session |

[^1]: Breakpoint and watchpoint numbers can be determined by viewing the `$bpnum` variable immediately after creation.
