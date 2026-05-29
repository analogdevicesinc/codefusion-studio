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

import * as fs from "node:fs";
import * as path from "node:path";
import type { Task } from "cfs-types";
import type { TaskDiscoveryStrategy } from "../types/task-discovery-strategy.js";
import { PLATFORM_IDS } from "./platform-constants.js";
import zephyrTasks from "../resources/zephyr-tasks.js";

/**
 * Strategy for providing Zephyr default tasks.
 *
 * Auto-detects Zephyr workspaces and provides bundled Zephyr task definitions.
 */
export class ZephyrTaskStrategy implements TaskDiscoveryStrategy {
	readonly id = PLATFORM_IDS.ZEPHYR;

	/**
	 * Detects if a workspace folder is a Zephyr project.
	 *
	 * Detection strategy checks for Zephyr-specific project markers:
	 * - prj.conf (Zephyr project configuration file)
	 * - CMakeLists.txt with Zephyr markers (detected by presence of prj.conf)
	 *
	 * @param workspacePath - Absolute path to the workspace folder
	 * @returns true if Zephyr markers are detected
	 */
	detectsWorkspace(workspacePath: string): boolean {
		// Check for prj.conf (primary Zephyr project marker)
		const prjConfPath = path.join(workspacePath, "prj.conf");
		if (fs.existsSync(prjConfPath)) {
			return true;
		}

		return false;
	}

	/**
	 * Discovers Zephyr default tasks for all Zephyr projects in the given folders.
	 *
	 * Auto-detects Zephyr projects and generates task definitions using
	 * default platformConfig (can be extended in future to read config from project).
	 *
	 * @param workspaceFolders - Array of project folder paths within the workspace
	 * @returns Promise resolving to Zephyr task definitions (empty if no Zephyr project detected)
	 */
	discoverTasks(
		workspaceFolders: string[]
	): Promise<Task.Definition[]> {
		const zephyrProjects = workspaceFolders.filter((folder) =>
			this.detectsWorkspace(folder)
		);

		if (zephyrProjects.length === 0) {
			return Promise.resolve([]);
		}

		const allTasks: Task.Definition[] = [];

		for (const zephyrProject of zephyrProjects) {
			// Generate Zephyr tasks with default platform config
			// Future enhancement: load platformConfig from .cfsworkspace or settings.json
			const tasksWrapper = zephyrTasks(undefined);

			if (Array.isArray(tasksWrapper.tasks)) {
				// Set cwd for each task so IDE knows which project owns them
				// Normalize to native path separators for cross-platform consistency
				const normalizedCwd = path.normalize(zephyrProject);

				// Extract project identifier (e.g., "CM4" from "/workspace/multi-platform/CM4")
				const projectId = path.basename(normalizedCwd);

				const tasks = tasksWrapper.tasks.map((task) => ({
					...task,
					options: {
						...task.options,
						cwd: normalizedCwd
					},
					projectId: projectId
				}));
				allTasks.push(...tasks);
			}
		}

		return Promise.resolve(allTasks);
	}
}
