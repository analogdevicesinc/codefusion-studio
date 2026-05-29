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

import type { Task } from "cfs-types";
import * as path from "node:path";
import type {
	DefaultTaskDiscoveryStrategy,
	TaskDiscoveryStrategy
} from "../types/task-discovery-strategy.js";
import { PLATFORM_IDS } from "./platform-constants.js";

/**
 * Orchestrator that aggregates tasks from multiple discovery strategies.
 *
 * Consumers inject strategies via constructor based on their needs:
 * - IDE: [CfsTaskDiscoveryStrategy] only (VS Code handles tasks.json natively)
 * - CLI: [CfsTaskDiscoveryStrategy, GenericTaskDiscoveryStrategy] for both formats
 *
 * @remarks
 * Task label conflicts are resolved by last-in-wins (later strategy overrides earlier).
 */
export class CfsTaskProvider {
	/**
	 * Creates a new CfsTaskProvider instance.
	 *
	 * @param customStrategies - Custom task strategies (discovered first)
	 * @param defaultStrategies - Default platform task strategies (discovered second)
	 */
	constructor(
		private readonly customStrategies: TaskDiscoveryStrategy[],
		private readonly defaultStrategies: DefaultTaskDiscoveryStrategy[]
	) {}

	/**
	 * Discovers tasks from all registered strategies.
	 *
	 * Tasks are aggregated using a composite key of (cwd, label) with last-in-wins
	 * conflict resolution. This ensures tasks from different projects don't override
	 * each other, while still allowing custom tasks to override defaults within the
	 * same project.
	 *
	 * Individual strategy errors are logged but do not fail the entire operation.
	 *
	 * @param workspaceFolders - Array of workspace folder paths to search
	 * @returns Promise resolving to aggregated task definitions
	 *
	 * @remarks
	 * This method does NOT execute tasks. Execution is consumer-specific:
	 * - IDE uses vscode.ShellExecution
	 * - CLI uses child_process.spawn()
	 */
	public async discoverTasks(
		workspaceFolders: string[]
	): Promise<Task.Definition[]> {
		// Phase 1: discover custom tasks and collect CFS custom project folders.
		const customTasks = await this.discoverStrategyTasks(
			this.customStrategies,
			workspaceFolders
		);

		const cfsCustomProjectFolders = new Set<string>();
		for (const strategyResult of customTasks) {
			for (const task of strategyResult.tasks) {
				if (task.options?.cwd) {
					cfsCustomProjectFolders.add(
						path.normalize(task.options.cwd)
					);
				}
			}
		}

		// Phase 2: discover default platform tasks, applying Zephyr suppression.
		const defaultTasks = await this.discoverDefaultTasks(
			workspaceFolders,
			cfsCustomProjectFolders
		);

		// Merge defaults first, then custom tasks (custom always wins).
		const tasksByKey = new Map<string, Task.Definition>();

		this.mergeTasks(
			tasksByKey,
			defaultTasks.flatMap((s) => s.tasks)
		);
		this.mergeTasks(
			tasksByKey,
			customTasks.flatMap((s) => s.tasks)
		);

		return Array.from(tasksByKey.values());
	}

	/**
	 * Discovers tasks from default platform strategies.
	 *
	 * Applies the Zephyr suppression rule before discovery:
	 * if a folder has custom tasks and is detected as a Zephyr workspace,
	 * Zephyr default tasks are skipped for that folder.
	 *
	 * @param workspaceFolders - Candidate workspace folders to evaluate.
	 * @param cfsCustomProjectFolders - Normalized folders that contain custom task definitions.
	 * @returns Strategy-tagged task groups discovered from default strategies.
	 */
	private async discoverDefaultTasks(
		workspaceFolders: string[],
		cfsCustomProjectFolders: Set<string>
	): Promise<{ strategyId: string; tasks: Task.Definition[] }[]> {
		const results: {
			strategyId: string;
			tasks: Task.Definition[];
		}[] = [];

		for (const strategy of this.defaultStrategies) {
			let strategyWorkspaceFolders = workspaceFolders;

			if (strategy.id === PLATFORM_IDS.ZEPHYR) {
				// CFSIO-16741 requires an explicit Zephyr-only exception:
				// when custom tasks exist in a Zephyr project folder, suppress the
				// default Zephyr task set for that folder. Do not apply this rule
				// to other default strategies.
				strategyWorkspaceFolders = workspaceFolders.filter(
					(folder) => {
						const normalizedFolder = path.normalize(folder);

						if (!cfsCustomProjectFolders.has(normalizedFolder)) {
							return true;
						}

						return !strategy.detectsWorkspace(normalizedFolder);
					}
				);
			}

			try {
				results.push({
					strategyId: strategy.id,
					tasks: await strategy.discoverTasks(
						strategyWorkspaceFolders
					)
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : String(error);
				console.error(
					`Error discovering tasks with strategy "${strategy.id}": ${message}`
				);
			}
		}

		return results;
	}

	/**
	 * Discovers tasks from an arbitrary set of strategies.
	 *
	 * Strategy failures are isolated: errors are logged and discovery continues
	 * with remaining strategies.
	 *
	 * @param strategies - Strategies to execute.
	 * @param workspaceFolders - Workspace folders passed through to each strategy.
	 * @returns Strategy-tagged task groups discovered from the provided strategies.
	 */
	private async discoverStrategyTasks(
		strategies: TaskDiscoveryStrategy[],
		workspaceFolders: string[]
	): Promise<{ strategyId: string; tasks: Task.Definition[] }[]> {
		const results: {
			strategyId: string;
			tasks: Task.Definition[];
		}[] = [];

		for (const strategy of strategies) {
			try {
				results.push({
					strategyId: strategy.id,
					tasks: await strategy.discoverTasks(workspaceFolders)
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : String(error);
				console.error(
					`Error discovering tasks with strategy "${strategy.id}": ${message}`
				);
			}
		}

		return results;
	}

	/**
	 * Merges tasks into the aggregate map using a composite key of cwd + label.
	 *
	 * This preserves per-project isolation while keeping last-in-wins semantics
	 * for tasks that share both cwd and label.
	 *
	 * @param tasksByKey - Target aggregation map.
	 * @param tasks - Tasks to merge.
	 */
	private mergeTasks(
		tasksByKey: Map<string, Task.Definition>,
		tasks: Task.Definition[]
	): void {
		for (const task of tasks) {
			const cwd = task.options?.cwd ?? "";
			// Use composite key (cwd + label) to prevent tasks from different projects
			// with the same label from overriding each other
			const key = `${cwd}:${task.label}`;
			tasksByKey.set(key, task);
		}
	}
}
