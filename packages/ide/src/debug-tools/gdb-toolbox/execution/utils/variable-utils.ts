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
 * Utility functions for variable substitution in GDB Toolbox scripts.
 * These functions replace placeholders in strings with values from a context object.
 */

/**
 * Replaces placeholders like {varName} in the input string with values from the context.
 */
export function substituteVars(
  input: string,
  context: Record<string, string>,
): string {
  return input.replace(/\{(\w+)\}/g, (_, key) => context[key] || `{${key}}`);
}

/**
 * Like substituteVars, but also merges in an optional groups object for additional replacements.
 */
export function substituteVarsWithGroups(
  input: string,
  context: Record<string, string>,
  groups: Record<string, string> | null,
): string {
  const mergedContext = { ...context, ...(groups || {}) };
  return substituteVars(input, mergedContext);
}

/**
 * Converts a record with string or number values into a record with only string values.
 * This is useful for variable substitution functions that require all values to be strings.
 *
 * @param obj - The input record with string or number values.
 * @returns A new record with all values converted to strings.
 */
export function convertRecordValuesToString(
  obj: Record<string, string | number>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    result[key] = String(obj[key]);
  }
  return result;
}
