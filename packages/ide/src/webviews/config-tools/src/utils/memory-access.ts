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

/**
 * Memory access override lookup.
 *
 * projectId -> memoryType -> string[] | undefined
 */
export type MemoryAccessOverrideTable = Record<
	string,
	Record<string, string[] | undefined>
>;

let overrideTable: MemoryAccessOverrideTable | undefined;

/**
 * Initializes the memory access overrides.
 * Should be called once at app startup.
 * @param projectId The ID of the project. It's arbitrary, and it could includes '-S' and '-NS' suffix.
 * @param overrides Memory to override.
 */
export function initializeMemoryAccessOverrides(
	projectId: string,
	overrides?: Record<string, string[] | undefined>
) {
	if (overrides === undefined) {
		return;
	}

	if (overrideTable === undefined) {
		overrideTable = {};
	}

	overrideTable[projectId] = overrides;
}

/**
 * Retrieves the memory access permissions that need to be overridden for a specific project and memory type combination.
 * @param projectId - The ID of the project. It's arbitrary, and it could includes '-S' and '-NS' suffix.
 * @param memoryType - The type of memory
 * @return An array of permissions to override for the project,
 * an empty array if we want disable the permissions (permissions handled elsewhere),
 * or undefined if no override is needed.
 */
export function getMemoryAccessOverrideForProject(
	projectId: string,
	memoryType: string
): string[] | undefined {
	if (!overrideTable) return undefined;

	return overrideTable[projectId]?.[memoryType];
}
