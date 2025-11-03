/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

/**
 * Type definitions for GDB Toolbox scripts, commands, and actions.
 * These types describe the structure of user and default scripts,
 * including supported actions and their properties.
 */

export type GdbToolboxActionType =
  | "log"
  | "openFile"
  | "showMessage"
  | "writeFile"
  | "appendFile"
  | "setVariable"
  | "conditional"
  | "openDisassembly";

// Represents a single action that can be performed by a command
export interface GdbToolboxAction {
  type: GdbToolboxActionType;
  condition?: string;
  message?: string;
  level?: "info" | "warning" | "error";
  filePath?: string;
  address?: string;
  lineNumber?: number;
  content?: string;
  name?: string;
  regex?: string;
  source?: string;
  command?: string;
  sourceCommand?: string;
  scriptPath?: string;
  scriptArgs?: string;
  then?: GdbToolboxAction[];
  else?: GdbToolboxAction[];
  actions?: GdbToolboxAction[];
}

/**
 * Represents a user input requested by a command or action.
 * type - Possible values are inputBox, quickPick
 */
export interface GdbToolboxInput {
  id: string;
  title: string;
  type: string;
  prompt: string;
  choices?: string[];
}

// Represents a command in a script, which may have multiple actions
export interface GdbToolboxCommand {
  command: string;
  actions?: GdbToolboxAction[];
  inputs?: GdbToolboxInput[];
}

// Represents a complete GDB Toolbox script
export interface GdbToolboxScript {
  name: string;
  description: string;
  commands: GdbToolboxCommand[];
  core?: string | string[];
}

// Represents a rule used to validate GDB Toolbox script config files
export interface GdbToolboxConfigRule {
  key: string;
  type: "string" | "number" | "object" | "boolean";
  allowedValues?: (string | number)[];
  required?: boolean;
  deprecated?: boolean;
  deprecationMessage?: string;
  arrayItemSchema?: GdbToolboxConfigRule[];
}

// Represents a collection of GDB Toolbox script config file validation rules
export interface GdbToolboxConfigSchema {
  name: string;
  rules: GdbToolboxConfigRule[];
}
