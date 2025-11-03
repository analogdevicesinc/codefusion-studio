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

import * as vscode from "vscode";
import * as jsonc from "jsonc-parser";
import * as path from "path";
import { GdbToolboxConfigRule, GdbToolboxConfigSchema } from "../types/types";
import { gdbToolboxConfigSchema } from "./config-schema";

const diagnosticCollection = vscode.languages.createDiagnosticCollection(
  "gdb-tb-config-validator",
);

/**
 * SchemaValidator handles the validation of GDB Toolbox script config files
 */
class SchemaValidator {
  private schema: GdbToolboxConfigSchema;
  private document: vscode.TextDocument;

  constructor(schema: GdbToolboxConfigSchema, document: vscode.TextDocument) {
    this.schema = schema;
    this.document = document;
  }

  /**
   * Parses the json document and returns an array of ranges that represent the
   * location of the key, and the value in the document
   */
  private getKeyValueRanges(
    key: string,
    path: (string | number)[],
  ): vscode.Range[] | undefined {
    const text = this.document.getText();
    const root = jsonc.parseTree(text);
    if (!root) return;

    path.push(key);
    const valueNode = jsonc.findNodeAtLocation(root, path);

    if (!valueNode) return;

    const keyText = `"${key}"`;

    const keyOffset =
      (valueNode.parent?.offset ?? 0) +
      text
        .substring(valueNode.parent?.offset ?? 0, valueNode.offset)
        .indexOf(key);

    if (keyOffset === -1) return;

    const keyStartPos = this.document.positionAt(keyOffset);
    const keyEndPos = this.document.positionAt(keyOffset + keyText.length);
    const valueStartPos = this.document.positionAt(valueNode.offset);
    const valueEndPos = this.document.positionAt(
      valueNode.offset + valueNode.length,
    );

    const keyRange = new vscode.Range(keyStartPos, keyEndPos);
    const valueRange = new vscode.Range(valueStartPos, valueEndPos);

    // Return the array of ranges.
    return [keyRange, valueRange];
  }

  /**
   * Appends a new diagnostic to `diagnostics` if the array contains a value
   * that is not in the list of allowed values. If the array element is an
   * object push the key and the index of the element to the path and
   * recursively call validateObject
   */
  private validateArray(
    key: string,
    value: any[],
    rule: GdbToolboxConfigRule,
    diagnostics: vscode.Diagnostic[],
    path: (string | number)[],
  ) {
    value.forEach((item: any, index: number) => {
      if (typeof item === "object" && rule.arrayItemSchema) {
        path.push(key);
        path.push(index);
        this.validateObject(item, rule.arrayItemSchema, diagnostics, path);
        path.pop();
        path.pop();
      } else {
        if (rule.allowedValues && !rule.allowedValues.includes(item)) {
          const range = this.getKeyValueRanges(key, path);

          diagnostics.push({
            message: `Invalid "${key}" value "${item}". Allowed values: ${rule.allowedValues?.join(", ")}`,
            severity: vscode.DiagnosticSeverity.Warning,
            range: range ? range[1] : new vscode.Range(0, 0, 0, 0),
          });
        }
      }
    });
  }

  /**
   * Validate the value of strings, booleans, and numbers against the list of
   * allowed values. Add a diagnostic if there is a value present that is not in
   * the list of allowed values
   */
  private validatePrimitive(
    key: string,
    value: any,
    allowedValues: any[],
    diagnostics: vscode.Diagnostic[],
    path: (string | number)[],
  ) {
    const normalisedValue = value.toString();
    const normalisedAllowedValues = allowedValues.map(String);
    if (!normalisedAllowedValues.includes(normalisedValue)) {
      const range = this.getKeyValueRanges(key, path);

      diagnostics.push({
        message: `Invalid "${key}" value "${value}". Allowed values: ${allowedValues.join(", ")}`,
        severity: vscode.DiagnosticSeverity.Warning,
        range: range ? range[1] : new vscode.Range(0, 0, 0, 0),
      });
    }
  }

  private validateValue(
    rule: GdbToolboxConfigRule,
    key: string,
    value: any,
    diagnostics: vscode.Diagnostic[],
    path: (string | number)[],
  ) {
    if (Array.isArray(value)) {
      this.validateArray(key, value, rule, diagnostics, path);
    } else if (typeof value === "object") {
    } else {
      if (rule.allowedValues) {
        this.validatePrimitive(
          key,
          value,
          rule.allowedValues,
          diagnostics,
          path,
        );
      }
    }
  }

  /**
   * Return the type of the variable. If the variable is an array return the
   * type of the elements. This imposes a strict rule for array elements to be
   * of one type only
   */
  private getType(value: any): string {
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === "string")) {
        return "string";
      } else if (value.every((item) => typeof item === "number")) {
        return "number";
      } else if (value.every((item) => typeof item === "object")) {
        return "object";
      }
    }

    return typeof value;
  }

  /**
   * Validate the type and value of a field in the config file
   */
  private validateType(
    rule: GdbToolboxConfigRule,
    key: string,
    value: any,
    diagnostics: vscode.Diagnostic[],
    path: (string | number)[],
  ) {
    const type = this.getType(value);

    // add diagnostic if the value is of the wrong type
    if (type !== rule.type) {
      const range = this.getKeyValueRanges(rule.key, path);

      diagnostics.push({
        message: `Incorrect type for "${rule.key}", expected ${rule.type}`,
        severity: vscode.DiagnosticSeverity.Warning,
        range: range ? range[1] : new vscode.Range(0, 0, 0, 0),
      });

      return;
    }

    this.validateValue(rule, key, value, diagnostics, path);
  }

  /**
   * Perform checks on the key value pairs of the object. Check for missing
   * required fields, deprecated fields, the type, and the value of the fields
   */
  validateObject(
    obj: any,
    rules: GdbToolboxConfigRule[],
    diagnostics: vscode.Diagnostic[],
    path: (string | number)[],
  ) {
    for (const rule of rules) {
      // add diagnostic if there is a missing required field
      if (rule.required && !(rule.key in obj)) {
        diagnostics.push({
          message: `Missing required field "${rule.key}"`,
          severity: vscode.DiagnosticSeverity.Warning,
          range: new vscode.Range(0, 0, 0, 0),
        });
      }

      // add diagnostic if there is a deprecated field used
      if (rule.deprecated && rule.key in obj) {
        const range = this.getKeyValueRanges(rule.key, path);

        diagnostics.push({
          message: rule.deprecationMessage
            ? rule.deprecationMessage
            : `Field ${rule.key} is deprecated`,
          severity: vscode.DiagnosticSeverity.Warning,
          range: range ? range[0] : new vscode.Range(0, 0, 0, 0),
        });
      }
    }

    for (const [key, value] of Object.entries(obj)) {
      const rule = rules.find((r) => r.key === key);

      if (rule) {
        this.validateType(rule, key, value, diagnostics, path);
      }
    }
  }

  /**
   * Parse the json document and validate document's fields
   */
  validate(): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    try {
      const text = this.document.getText();
      const jsonData = jsonc.parse(text);
      const rules = this.schema.rules;

      this.validateObject(jsonData, rules, diagnostics, []);
    } catch (error) {
      console.log(error);
    }

    return diagnostics;
  }
}

// Run the validator on a document and set diagnostics should any be found
function validateGDBToolboxConfig(document: vscode.TextDocument) {
  const validator = new SchemaValidator(gdbToolboxConfigSchema, document);
  const validationErrors = validator.validate();

  diagnosticCollection.set(document.uri, validationErrors);
}

function isGdbToolboxScriptConfig(document: vscode.TextDocument) {
  const filePath = path.normalize(document.uri.path);
  const dirName = path.dirname(filePath);
  const parts = dirName.split(path.sep);

  return (
    document.languageId === "json" &&
    parts.length >= 2 &&
    parts[parts.length - 2] === "gdb_toolbox" &&
    parts[parts.length - 1] === "configs"
  );
}

// Register listeners to call the validator
export function registerGDBToolboxValidator(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isGdbToolboxScriptConfig(event.document)) {
        validateGDBToolboxConfig(event.document);
      }
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isGdbToolboxScriptConfig(document)) {
        validateGDBToolboxConfig(document);
      }
    }),
    diagnosticCollection,
  );

  vscode.workspace.textDocuments.forEach((document) => {
    if (isGdbToolboxScriptConfig(document)) {
      validateGDBToolboxConfig(document);
    }
  });
}
