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
 * Strategy interface for discovering task files and parsing them into Task.Definition[].
 *
 * Implementations handle different task file formats:
 * - CfsTaskDiscoveryStrategy: .vscode/cfs.tasks.json files
 * - GenericTaskDiscoveryStrategy (CLI): .vscode/tasks.json files
 */

import type { Task } from "cfs-types";

export interface TaskDiscoveryStrategy {
	/**
	 * Unique identifier for this strategy (e.g., 'cfs', 'generic')
	 */
	readonly id: string;

	/**
	 * Discovers and parses task files in the given workspace folders.
	 *
	 * @param workspaceFolders - Array of workspace folder paths to search
	 * @returns Promise resolving to discovered task definitions
	 */
	discoverTasks(
		workspaceFolders: string[]
	): Promise<Task.Definition[]>;
}

/**
 * Specialized strategy type for default platform task providers.
 *
 * These strategies can determine if a workspace folder belongs to their
 * platform, which allows CfsTaskProvider to apply platform-specific suppression
 * rules (for example, suppress Zephyr defaults when custom CFS tasks exist in
 * the same Zephyr project folder).
 */
export interface DefaultTaskDiscoveryStrategy
	extends TaskDiscoveryStrategy {
	/**
	 * Detects whether the given folder belongs to this strategy's platform.
	 *
	 * @param workspacePath - Absolute path to a workspace folder.
	 * @returns true when the folder matches this platform.
	 */
	detectsWorkspace(workspacePath: string): boolean;
}
