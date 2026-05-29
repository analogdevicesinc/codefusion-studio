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
import msdkTasks from "../resources/msdk-tasks.js";
import msdkTasksSubset from "../resources/msdk-tasks-subset.js";

/**
 * Strategy for providing MSDK default tasks.
 *
 * Auto-detects MSDK workspaces and provides bundled MSDK task definitions.
 */
export class MsdkTaskStrategy implements TaskDiscoveryStrategy {
	readonly id = PLATFORM_IDS.MSDK;

	/**
	 * Detects if a workspace folder is an MSDK project.
	 *
	 * Checks for MSDK-specific Makefile markers (MSDK_PATH or MAXIM_PATH).
	 * RISC-V core folders are excluded separately in discoverTasks() using
	 * cross-folder RISCV_LOAD detection.
	 *
	 * @param workspacePath - Absolute path to the workspace folder
	 * @returns true if MSDK Makefile markers are detected
	 */
	detectsWorkspace(workspacePath: string): boolean {
		const makefilePath = path.join(workspacePath, "Makefile");
		if (fs.existsSync(makefilePath)) {
			try {
				const makefile = fs.readFileSync(makefilePath, "utf8");
				if (
					makefile.includes("MSDK_PATH") ||
					makefile.includes("MAXIM_PATH")
				) {
					return true;
				}
			} catch (error) {
				// Continue checking other markers
			}
		}
		return false;
	}

	/**
	 * Returns true if the folder's project.mk contains an uncommented
	 * RISCV_LOAD=1 line, indicating this is the CM4 side of a dual-core
	 * MSDK project that loads and runs the RISC-V firmware.
	 *
	 * @param folderPath - Absolute path to the workspace folder
	 */
	private hasRiscvLoad(folderPath: string): boolean {
		const projectMkPath = path.join(folderPath, "project.mk");
		if (fs.existsSync(projectMkPath)) {
			try {
				const content = fs.readFileSync(projectMkPath, "utf8");
				// Match an uncommented RISCV_LOAD=1 line (not preceded by #)
				return /^\s*RISCV_LOAD\s*=\s*1/m.test(content);
			} catch (error) {
				// ignore read errors
			}
		}
		return false;
	}

	/**
	 * Discovers MSDK default tasks for MSDK projects in the given workspace.
	 *
	 * Auto-detects MSDK projects and returns bundled task definitions.
	 * Combines tasks from:
	 * 1. msdkTasksSubset - Always-included tasks (clean, clean-periph)
	 * 2. msdkTasks - Full task set (build, flash, erase variants)
	 *
	 * @param workspaceFolders - Array of project folder paths within the workspace
	 * @returns Promise resolving to MSDK task definitions (empty if no MSDK project detected)
	 */
	discoverTasks(
		workspaceFolders: string[]
	): Promise<Task.Definition[]> {
		const msdkFolders = workspaceFolders.filter((folder) =>
			this.detectsWorkspace(folder)
		);

		if (msdkFolders.length === 0) {
			return Promise.resolve([]);
		}

		// In a dual-core MSDK workspace the CM4 project has an uncommented
		// RISCV_LOAD=1 line in project.mk. If any MSDK folder has this marker,
		// exclude all MSDK folders that don't — those are the RISC-V companion
		// projects, which should not receive default tasks.
		const dualCoreFolders = msdkFolders.filter((f) => this.hasRiscvLoad(f));
		const msdkProjects =
			dualCoreFolders.length > 0 ? dualCoreFolders : msdkFolders;

		const allTasks: Task.Definition[] = [];

		for (const msdkProject of msdkProjects) {
			const projectTasks: Task.Definition[] = [];

			// Add subset tasks first (always included)
			if (Array.isArray(msdkTasksSubset.tasks)) {
				projectTasks.push(...msdkTasksSubset.tasks);
			}

			// Add full MSDK tasks
			if (Array.isArray(msdkTasks.tasks)) {
				projectTasks.push(...msdkTasks.tasks);
			}

			// Set cwd for each task so IDE knows which project owns them
			// Normalize to native path separators for cross-platform consistency
			const normalizedCwd = path.normalize(msdkProject);

			// Extract project identifier (e.g., "CM4" from "/workspace/multi-platform/CM4")
			const projectId = path.basename(normalizedCwd);

			const tasks = projectTasks.map((task) => ({
				...task,
				options: {
					...task.options,
					cwd: normalizedCwd
				},
				projectId: projectId
			}));

			allTasks.push(...tasks);
		}

		return Promise.resolve(allTasks);
	}
}
