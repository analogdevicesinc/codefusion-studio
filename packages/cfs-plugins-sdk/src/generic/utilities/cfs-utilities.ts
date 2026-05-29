/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
 * @returns the evaluated template string
 */
export function evalNestedTemplateLiterals(
	template: string,
	context: Record<string, unknown>
): string {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
	return new Function("context", `return \`${template}\`;`)(context);
}

/**
 * Converts a string to title case
 * @param str - The string to convert to title case
 * @returns The string in title case
 */
export function titleCase(str: string) {
	return str
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * @description This function takes an object and converts all of its keys to PascalCase. It also recursively converts any nested objects and arrays to PascalCase.
 * @param obj - The object to convert
 * @returns - The object with all keys converted to PascalCase
 */
export const convertToPascalCase = (
	obj: Record<string, unknown>
): Record<string, unknown> => {
	return Object.entries(obj).reduce<Record<string, unknown>>(
		(acc, [key, value]) => {
			const pascalKey = titleCase(key);
			if (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value)
			) {
				acc[pascalKey] = convertToPascalCase(
					value as Record<string, unknown>
				);
			} else if (Array.isArray(value)) {
				acc[pascalKey] = value.map((item: unknown) =>
					typeof item === "object" &&
					item !== null &&
					!Array.isArray(item)
						? convertToPascalCase(item as Record<string, unknown>)
						: item
				);
			} else {
				acc[pascalKey] = value;
			}
			return acc;
		},
		{}
	);
};

/**
 * Determine if a path string ends with a path separator
 * @param path - the path to check
 * @returns true if the path ends with a slash or backslash, otherwise false
 */
export function isDir(path: string): boolean {
	return path.endsWith("/") || path.endsWith("\\");
}
