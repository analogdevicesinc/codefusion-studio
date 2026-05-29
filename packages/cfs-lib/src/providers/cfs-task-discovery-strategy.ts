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

import * as path from "node:path";
import type { Task } from "cfs-types";
import { CfsVariableResolver } from "../utils/cfs-variable-resolver.js";
import { globFiles } from "../utils/file-glob.js";
import type { CfsToolManager } from "../managers/cfs-tool-manager.js";
import type { TaskDiscoveryStrategy } from "../types/task-discovery-strategy.js";
import { readJsonFile } from "../utils/file-utils.js";

/**
 * Strategy for discovering CFS-specific task files (.vscode/cfs.tasks.json).
 *
 * This strategy:
 * 1. Globs for .vscode/cfs.tasks.json files in each workspace folder
 * 2. Parses them as Task.File format
 * 3. Resolves ${cfs:...} template variables
 * 4. Sets options.cwd on each task to the project folder where it was discovered
 * 5. Sets projectId to the project name (last directory component of the project path)
 */
export class CfsTaskDiscoveryStrategy
	implements TaskDiscoveryStrategy
{
	readonly id = "cfs";

	private readonly resolver: CfsVariableResolver;

	constructor(toolManager: CfsToolManager) {
		this.resolver = new CfsVariableResolver(toolManager);
	}

	async discoverTasks(
		workspaceFolders: string[]
	): Promise<Task.Definition[]> {
		const result: Task.Definition[] = [];

		for (const workspaceFolder of workspaceFolders) {
			const taskFiles = await globFiles([".vscode/cfs.tasks.json"], {
				cwd: workspaceFolder,
				deep: 2,
				onlyFiles: true,
				dot: true,
				absolute: true
			});

			for (const taskFile of taskFiles) {
				try {
					const tasksJson = readJsonFile<Task.File>(taskFile);

					if (
						!Array.isArray(tasksJson.tasks) ||
						tasksJson.tasks.length === 0
					) {
						continue;
					}

					// Derive the project folder from the task file path.
					// taskFile: /path/to/project/.vscode/cfs.tasks.json
					// projectFolder: /path/to/project
					// Normalize to native path separators for cross-platform consistency
					const projectFolder = path.normalize(
						path.dirname(path.dirname(taskFile))
					);

					// Extract project identifier (e.g., "CM4" from "/workspace/multi-platform/CM4")
					const projectId = path.basename(projectFolder);

					// Resolve ${cfs:...} variables in each task definition
					for (const taskDefinition of tasksJson.tasks) {
						await this.resolver.resolveObjectVariables(
							taskDefinition
						);

						// Set cwd so consumers know which project owns this task
						taskDefinition.options = {
							...taskDefinition.options,
							cwd: projectFolder
						};

						// Add project identifier for multi-platform workspace support
						taskDefinition.projectId = projectId;

						result.push(taskDefinition);
					}
				} catch (error) {
					console.error(
						`Error processing cfs.tasks.json at ${taskFile}:`,
						error
					);
				}
			}
		}

		return result;
	}
}
