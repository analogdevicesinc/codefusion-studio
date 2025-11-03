import { GdbToolboxConfigSchema } from "../types/types";

export const gdbToolboxConfigSchema: GdbToolboxConfigSchema = {
  name: "GDB Toolbox Config Schema",
  rules: [
    {
      key: "name",
      required: true,
      type: "string",
    },
    {
      key: "description",
      required: true,
      type: "string",
    },
    {
      key: "version",
      required: true,
      type: "string",
    },
    {
      key: "core",
      type: "string",
      allowedValues: ["arm", "riscv", "xtensa"],
    },
    {
      key: "soc",
      type: "string",
    },
    {
      key: "firmwarePlatform",
      type: "string",
      allowedValues: ["zephyr", "msdk"],
    },
    {
      key: "commands",
      type: "object",
      required: true,
      arrayItemSchema: [
        {
          key: "command",
          type: "string",
          required: true,
        },
        {
          key: "actions",
          type: "object",
          arrayItemSchema: [
            {
              key: "type",
              type: "string",
              allowedValues: [
                "appendFile",
                "conditional",
                "log",
                "openDisassembly",
                "openFile",
                "setVariable",
                "showMessage",
                "writeFile",
              ],
            },
            {
              key: "filePath",
              type: "string",
            },
            {
              key: "content",
              type: "string",
            },
            {
              key: "condition",
              type: "string",
            },
            {
              key: "then",
              type: "string",
            },
            {
              key: "else",
              type: "string",
            },
            {
              key: "message",
              type: "string",
            },
            {
              key: "lineNumber",
              type: "string",
            },
            {
              key: "name",
              type: "string",
            },
            {
              key: "regex",
              type: "string",
            },
            {
              key: "level",
              type: "string",
            },
          ],
        },
      ],
    },
  ],
};
