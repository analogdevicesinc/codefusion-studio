'use strict';

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
 * Evaluates a template string with nested template literals
 * @param template - The template string to evaluate
 * @param context - The context to evaluate the template literal from
 * @returns a function to evaluate the template string
 */
function evalNestedTemplateLiterals(template, context) {
    return new Function("context", `return \`${template}\`;`)(context);
}
/**
 * Converts a string to title case
 * @param str - The string to convert to title case
 * @returns The string in title case
 */
function titleCase(str) {
    return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

exports.evalNestedTemplateLiterals = evalNestedTemplateLiterals;
exports.titleCase = titleCase;
//# sourceMappingURL=cfs-utilities.cjs.map
