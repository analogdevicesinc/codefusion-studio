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

import { CfsToolManager } from "../managers/cfs-tool-manager.js";

/**
 * Upper bound on how many times we attempt to re-resolve variables.
 *
 * This protects against cyclic or self-referential substitutions across
 * resolvers (for example, when a `${cfs:...}` expansion introduces new
 * variables that ultimately resolve back to an earlier value). In typical
 * configurations we only need a small number of passes (usually < 5) even
 * with chained resolvers and nested `${cfs:manager.method.id}` references.
 *
 * 20 is chosen to comfortably exceed realistic nesting and indirection
 * depths while still failing fast on pathological or accidentally cyclic
 * templates. If callers observe values approaching this limit, it is a
 * strong signal that configuration structure should be simplified or that
 * a resolver is introducing unintended recursion.
 */
const MAX_VARIABLE_RESOLUTION_PASSES = 20;

/**
 * Function signature for host-specific variable resolvers.
 *
 * Resolvers receive the full string and can replace any tokens they own.
 * They should return the original string unchanged when no replacements are made.
 */
export type VariableResolver = (
	value: string
) => Promise<string> | string;

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
	private resolvers: VariableResolver[] = [];

	constructor(toolManager: CfsToolManager) {
		this.managerDict.tool = {
			path: toolManager.resolveTemplatePaths.bind(toolManager)
		};

		// Core resolver behavior in cfs-lib: only cfs-scoped variables.
		this.registerResolver(this.resolveCfsVariables.bind(this));
	}

	/**
	 * Registers a host-specific resolver.
	 *
	 * Resolvers run in registration order on each pass.
	 */
	public registerResolver(resolver: VariableResolver): void {
		this.resolvers.push(resolver);
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
		// Short-circuit if there are no template variable patterns to resolve
		if (!value.includes("${")) {
			return value;
		}

		return this.resolveStringVariablesRecursive(value, value, 0);
	}

	private async resolveStringVariablesRecursive(
		current: string,
		originalInput: string,
		depth: number
	): Promise<string> {
		if (depth >= MAX_VARIABLE_RESOLUTION_PASSES) {
			throw new Error(
				"Variable resolution exceeded " +
					String(MAX_VARIABLE_RESOLUTION_PASSES) +
					" passes. This usually indicates a recursive or misconfigured variable chain. Input: " +
					originalInput
			);
		}

		let result = current;
		for (const resolver of this.resolvers) {
			result = await resolver(result);
		}

		if (result === current) {
			return result;
		}

		return this.resolveStringVariablesRecursive(
			result,
			originalInput,
			depth + 1
		);
	}

	/**
	 * Resolves CFS-scoped template variables in a string.
	 *
	 * Supported token format:
	 * - `${cfs:managerId.methodId.idToProcess}`
	 *
	 * For each match, this method looks up `managerId` and `methodId` in
	 * `managerDict` and invokes the mapped async method with `idToProcess`.
	 * Unresolvable tokens are left unchanged. If a mapped method throws, the
	 * error is logged and resolution continues for remaining matches.
	 *
	 * @param value - Input string that may contain CFS-scoped tokens.
	 * @returns String with resolved CFS-scoped tokens.
	 */
	private async resolveCfsVariables(value: string): Promise<string> {
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
