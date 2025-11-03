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

import { CfsToolManager } from "../managers/cfs-tool-manager.js";

/**
 * Utility class to resolve custom template variables in configuration objects.
 *
 * This class handles the resolution of custom template variables in configuration
 * objects that follow the pattern `${cfs:managerId.methodId.idToProcess}`.
 *
 */
export class CfsVariableResolver {
	/**
	 * Dictionary of managers that provide resolution methods.
	 *
	 * Structure:
	 * {
	 *   "managerName": {
	 *     "methodName": Function
	 *   }
	 * }
	 *
	 * Example:
	 * {
	 *   "tool": {
	 *     "path": resolveTemplatePathsFunction
	 *   }
	 * }
	 */
	private managerDict: Record<
		string,
		Record<string, (i: string) => Promise<string>> | undefined
	> = {};

	constructor(toolManager: CfsToolManager) {
		this.managerDict.tool = {
			path: toolManager.resolveTemplatePaths.bind(toolManager)
		};
	}

	/**
	 * Recursively resolves template variables in object properties
	 *
	 * This method handles the recursion through objects and arrays,
	 * processing all string values found within.
	 *
	 * @param obj - The object whose properties need to be processed
	 */
	public async resolveObjectVariables(
		obj: Record<string, unknown>
	): Promise<void> {
		for (const [key, value] of Object.entries(obj)) {
			const resolvedValue = await this.resolveValue(value);
			if (resolvedValue !== value) {
				obj[key] = resolvedValue;
			}
		}
	}

	/**
	 * Resolves template variables in a value of any type
	 *
	 * This helper method handles different value types:
	 * - Arrays: Process each element
	 * - Objects: Process recursively
	 * - Strings: Process template variables
	 * - Other types: Return unchanged
	 *
	 * @param value - The value to process
	 * @returns The resolved value
	 */
	private async resolveValue(value: unknown): Promise<unknown> {
		// Handle arrays
		if (Array.isArray(value)) {
			const result = [...(value as unknown[])];
			for (let i = 0; i < result.length; i++) {
				result[i] = await this.resolveValue(result[i]);
			}

			return result;
		}

		// Handle objects
		if (typeof value === "object" && value !== null) {
			const objValue = value as Record<string, unknown>;
			await this.resolveObjectVariables(objValue);
			return objValue;
		}

		// Handle strings with template variables
		if (typeof value === "string") {
			return await this.resolveStringVariables(value);
		}

		// Return other types unchanged
		return value;
	}

	/**
	 * Processes a single string containing template variables and resolves them
	 *
	 * This method handles the specific template syntax for variables and
	 * invokes the appropriate resolver functions based on the template format.
	 *
	 * Currently supported formats:
	 * - `${cfs:managerId.methodId.idToProcess}` - Calls the specified manager method
	 *
	 * @param value - The string that may contain template variables
	 * @returns A Promise resolving to the processed string with templates resolved
	 * @private
	 */
	public async resolveStringVariables(
		value: string
	): Promise<string> {
		let result = value;

		// First two groups allow only letters
		// Third group allows letters, numbers, underscore, period, and hyphen
		const pattern =
			/\$\{cfs:([a-zA-Z]+)\.([a-zA-Z]+)\.([a-zA-Z0-9_.-]+)\}/g;
		const matches = [...result.matchAll(pattern)];

		// Process each match
		for (const match of matches) {
			const [fullMatch, managerId, methodId, idToProcess] = match;

			// Get the appropriate manager from the dictionary
			const manager = this.managerDict[managerId];

			if (manager && manager[methodId] instanceof Function) {
				try {
					// Process the value with the manager method
					const method = manager[methodId];
					const resolvedValue = await method(idToProcess);

					// Replace just this match in the result string
					result = result.replace(fullMatch, resolvedValue);
				} catch (error) {
					console.error(
						`Error resolving template variable ${fullMatch}:`,
						error
					);
				}
			}
		}

		return result;
	}
}
