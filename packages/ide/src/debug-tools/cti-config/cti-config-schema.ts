/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

export namespace v0_1 {
  export const ctiConfigSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "CFS CTI Configuration Schema",
    description:
      "Schema for CodeFusion Studio Cross Trigger Interface connection configuration files",
    type: "object",
    properties: {
      schemaVersion: {
        description:
          "Version of the JSON schema. This schema is only compatible with version 0.1",
        type: "string",
        pattern: "^0\\.1$",
      },
      connections: {
        description: "List of CTI trigger connection configurations",
        type: "array",
        items: { $ref: "#/$defs/connection" },
      },
    },
    required: ["schemaVersion", "connections"],
    $defs: {
      connection: {
        description:
          "A CTI connection that maps one or more input triggers to one or more output triggers",
        type: "object",
        properties: {
          customName: {
            description:
              "User-assigned display name. When absent, the name is auto-generated from the input trigger names.",
            type: "string",
            pattern: "\\S",
          },
          inputTriggers: {
            description: "Names of the CTI input trigger signals",
            type: "array",
            minItems: 1,
            items: { type: "string", pattern: "\\S" },
          },
          outputTriggers: {
            description: "Names of the CTI output trigger signals",
            type: "array",
            minItems: 1,
            items: { type: "string", pattern: "\\S" },
          },
        },
        required: ["inputTriggers", "outputTriggers"],
      },
    },
  } as const;

  export interface CtiConfigConnection {
    customName?: string;
    inputTriggers: string[];
    outputTriggers: string[];
  }

  export interface CtiConfigFile {
    schemaVersion: "0.1";
    connections: CtiConfigConnection[];
  }
}

export const ctiConfigSchemas = {
  "0.1": v0_1.ctiConfigSchema,
};

export type CtiConfigFile = v0_1.CtiConfigFile;
