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

import fg from "fast-glob";

/**
 * Wrapper around fast-glob for discovering files matching patterns in workspace folders.
 *
 * This utility provides a portable interface for file globbing used by task discovery
 * and other cfs-lib components. By centralizing glob logic here, consumers (CLI, IDE, tests)
 * don't need to import fast-glob directly.
 */

export interface GlobOptions {
	/** Working directory for the glob pattern (defaults to cwd) */
	cwd?: string;
	/** Maximum depth to traverse (defaults to 2) */
	deep?: number;
	/** Only return files (not directories) */
	onlyFiles?: boolean;
	/** Include dot files and directories (defaults to true) */
	dot?: boolean;
	/** Return absolute paths instead of relative (defaults to true) */
	absolute?: boolean;
}

/**
 * Discovers files matching the given glob patterns in a workspace folder.
 *
 * Common patterns:
 * - `.vscode/cfs.tasks.json` — CFS custom task files
 * - `.vscode/tasks.json` — Standard VS Code task files
 * - `*.cfsconfig` — CFS configuration files
 *
 * @param patterns - Array of glob patterns to match
 * @param options - Glob options (cwd, deep, onlyFiles, dot, absolute)
 * @returns Promise resolving to array of matched file paths
 *
 * @example
 * ```ts
 * const taskFiles = await globFiles([".vscode/cfs.tasks.json"], {
 *   cwd: workspacePath,
 *   deep: 2,
 *   absolute: true
 * });
 * ```
 */
export async function globFiles(
	patterns: string[],
	options: GlobOptions = {}
): Promise<string[]> {
	const {
		cwd = process.cwd(),
		deep = 2,
		onlyFiles = true,
		dot = true,
		absolute = true
	} = options;

	return fg.glob(patterns, {
		cwd,
		deep,
		onlyFiles,
		dot,
		absolute
	});
}
