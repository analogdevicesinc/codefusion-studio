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

import { CfsTaskProvider } from "../../src/providers/cfs-task-provider.js";
import { CfsTaskDiscoveryStrategy } from "../../src/providers/cfs-task-discovery-strategy.js";
import { MsdkTaskStrategy } from "../../src/providers/msdk-task-strategy.js";
import { PLATFORM_IDS } from "../../src/providers/platform-constants.js";
import { ZephyrTaskStrategy } from "../../src/providers/zephyr-task-strategy.js";
import type { CfsToolManager } from "../../src/managers/cfs-tool-manager.js";
import type {
	DefaultTaskDiscoveryStrategy,
	TaskDiscoveryStrategy
} from "../../src/types/task-discovery-strategy.js";
import type { Task } from "cfs-types";
import { expect } from "chai";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock tool manager for CfsTaskDiscoveryStrategy
class MockToolManager {
	resolveTemplatePaths(input: string): Promise<string> {
		const toolPaths: Record<string, string> = {
			"mock-tool-1": "/path/to/mock-tool-1"
		};

		return Promise.resolve(toolPaths[input] || input);
	}
}

// Mock strategy implementations for testing
class MockStrategyA implements TaskDiscoveryStrategy {
	readonly id = "mock-a";
	public discoverTasksCalls: string[][] = [];

	discoverTasks(
		workspaceFolders: string[]
	): Promise<Task.Definition[]> {
		this.discoverTasksCalls.push(workspaceFolders);

		return Promise.resolve([
			{
				label: "task-a-1",
				type: "shell",
				command: "echo 'Task A1'",
				options: { cwd: "/workspace" }
			},
			{
				label: "task-a-2",
				type: "shell",
				command: "echo 'Task A2'",
				options: { cwd: "/workspace" }
			},
			{
				label: "shared-task",
				type: "shell",
				command: "echo 'From Strategy A'",
				options: { cwd: "/workspace" }
			}
		]);
	}
}

class MockStrategyB implements TaskDiscoveryStrategy {
	readonly id = "mock-b";
	public discoverTasksCalls: string[][] = [];

	discoverTasks(
		workspaceFolders: string[]
	): Promise<Task.Definition[]> {
		this.discoverTasksCalls.push(workspaceFolders);

		return Promise.resolve([
			{
				label: "task-b-1",
				type: "shell",
				command: "echo 'Task B1'",
				options: { cwd: "/workspace" }
			},
			{
				label: "shared-task",
				type: "shell",
				command: "echo 'From Strategy B (should win)'",
				options: { cwd: "/workspace" }
			}
		]);
	}
}

class MockThrowingStrategy implements TaskDiscoveryStrategy {
	readonly id = "mock-throwing";

	discoverTasks(): Promise<Task.Definition[]> {
		return Promise.reject(new Error("Intentional test error"));
	}
}

describe("CfsTaskProvider", function () {
	describe("discoverTasks", function () {
		it("should aggregate tasks from multiple strategies", async function () {
			const strategyA = new MockStrategyA();
			const strategyB = new MockStrategyB();
			const provider = new CfsTaskProvider(
				[strategyA, strategyB],
				[]
			);

			const tasks = await provider.discoverTasks(["/workspace"]);

			// Should have 4 unique tasks (3 from A + 1 unique from B, shared-task deduped)
			expect(tasks).to.have.lengthOf(4);
			expect(tasks.map((t) => t.label)).to.include.members([
				"task-a-1",
				"task-a-2",
				"task-b-1",
				"shared-task"
			]);
		});

		it("should use last-in-wins deduplication for conflicting labels", async function () {
			const strategyA = new MockStrategyA();
			const strategyB = new MockStrategyB();
			const provider = new CfsTaskProvider(
				[strategyA, strategyB],
				[]
			);

			const tasks = await provider.discoverTasks(["/workspace"]);

			// Find the shared-task and verify it came from Strategy B (last-in-wins)
			const sharedTask = tasks.find((t) => t.label === "shared-task");
			expect(sharedTask).to.exist;
			expect(sharedTask?.command).to.equal(
				"echo 'From Strategy B (should win)'"
			);
		});

		it("should isolate errors from individual strategies", async function () {
			const strategyA = new MockStrategyA();
			const throwingStrategy = new MockThrowingStrategy();
			const strategyB = new MockStrategyB();
			const provider = new CfsTaskProvider(
				[strategyA, throwingStrategy, strategyB],
				[]
			);

			// Should not throw even though one strategy fails
			const tasks = await provider.discoverTasks(["/workspace"]);

			// Should have tasks from strategies A and B (throwing strategy skipped)
			expect(tasks).to.have.lengthOf(4);
			expect(tasks.map((t) => t.label)).to.include.members([
				"task-a-1",
				"task-a-2",
				"task-b-1",
				"shared-task"
			]);
		});

		it("should return empty array when constructed with no strategies", async function () {
			const provider = new CfsTaskProvider([], []);
			const tasks = await provider.discoverTasks(["/workspace"]);

			expect(tasks).to.be.an("array").that.is.empty;
		});

		it("should pass workspace folders to all strategies", async function () {
			const strategyA = new MockStrategyA();
			const strategyB = new MockStrategyB();
			const provider = new CfsTaskProvider(
				[strategyA, strategyB],
				[]
			);

			const workspaceFolders = ["/workspace1", "/workspace2"];
			await provider.discoverTasks(workspaceFolders);

			// Both strategies should have received the same workspace folders
			expect(strategyA.discoverTasksCalls).to.have.lengthOf(1);
			expect(strategyA.discoverTasksCalls[0]).to.deep.equal(
				workspaceFolders
			);

			expect(strategyB.discoverTasksCalls).to.have.lengthOf(1);
			expect(strategyB.discoverTasksCalls[0]).to.deep.equal(
				workspaceFolders
			);
		});

		it("should invoke strategies in constructor order", async function () {
			const invocationOrder: string[] = [];

			class OrderTrackingStrategyA implements TaskDiscoveryStrategy {
				readonly id = "order-a";
				discoverTasks(): Promise<Task.Definition[]> {
					invocationOrder.push("a");
					return Promise.resolve([]);
				}
			}

			class OrderTrackingStrategyB implements TaskDiscoveryStrategy {
				readonly id = "order-b";
				discoverTasks(): Promise<Task.Definition[]> {
					invocationOrder.push("b");
					return Promise.resolve([]);
				}
			}

			class OrderTrackingStrategyC implements TaskDiscoveryStrategy {
				readonly id = "order-c";
				discoverTasks(): Promise<Task.Definition[]> {
					invocationOrder.push("c");
					return Promise.resolve([]);
				}
			}

			const provider = new CfsTaskProvider(
				[
					new OrderTrackingStrategyA(),
					new OrderTrackingStrategyB(),
					new OrderTrackingStrategyC()
				],
				[]
			);

			await provider.discoverTasks(["/workspace"]);

			expect(invocationOrder).to.deep.equal(["a", "b", "c"]);
		});

		it("should handle empty workspace folders array", async function () {
			const strategyA = new MockStrategyA();
			const provider = new CfsTaskProvider([strategyA], []);

			await provider.discoverTasks([]);

			// Strategy should still be called (with empty array)
			expect(strategyA.discoverTasksCalls).to.have.lengthOf(1);
			expect(strategyA.discoverTasksCalls[0]).to.be.an("array").that
				.is.empty;
		});

		it("should skip whole Zephyr default task set for folders that have custom tasks", async function () {
			class MockCustomStrategy implements TaskDiscoveryStrategy {
				readonly id = "mock-custom";

				discoverTasks(): Promise<Task.Definition[]> {
					return Promise.resolve([
						{
							label: "custom-task",
							type: "shell",
							command: "echo custom",
							options: { cwd: "/workspace/zephyr-custom" }
						}
					]);
				}
			}

			class MockZephyrDefaultStrategy
				implements DefaultTaskDiscoveryStrategy
			{
				readonly id = PLATFORM_IDS.ZEPHYR;
				public discoverTasksCalls: string[][] = [];

				detectsWorkspace(workspacePath: string): boolean {
					return workspacePath.includes("zephyr");
				}

				discoverTasks(
					workspaceFolders: string[]
				): Promise<Task.Definition[]> {
					this.discoverTasksCalls.push(workspaceFolders);

					return Promise.resolve(
						workspaceFolders.map((cwd) => ({
							label: "default-build",
							type: "shell",
							command: "echo default",
							options: { cwd }
						}))
					);
				}
			}

			const customStrategy = new MockCustomStrategy();
			const zephyrDefaultStrategy = new MockZephyrDefaultStrategy();

			const provider = new CfsTaskProvider(
				[customStrategy],
				[zephyrDefaultStrategy]
			);

			const workspaceFolders = [
				"/workspace/zephyr-custom",
				"/workspace/zephyr-default",
				"/workspace/other"
			];

			const tasks = await provider.discoverTasks(workspaceFolders);

			expect(
				zephyrDefaultStrategy.discoverTasksCalls
			).to.have.lengthOf(1);
			expect(
				zephyrDefaultStrategy.discoverTasksCalls[0]
			).to.deep.equal([
				"/workspace/zephyr-default",
				"/workspace/other"
			]);

			const suppressedDefaultTask = tasks.find(
				(t) => t.options?.cwd === "/workspace/zephyr-custom"
			);
			expect(suppressedDefaultTask?.label).to.equal("custom-task");
		});
	});

	describe("integration – multi-platform workspace fixtures", function () {
		const fixturesPath = path.resolve(
			__dirname,
			"../fixtures/workspaces"
		);
		let toolManager: MockToolManager;

		beforeEach(function () {
			toolManager = new MockToolManager();
		});

		it("should discover tasks from projects in multi-platform workspace", async function () {
			const workspaceRoot = path.join(fixturesPath, "multi-platform");
			const platformAlphaPath = path.join(
				workspaceRoot,
				"platform-alpha"
			);
			const platformBetaPath = path.join(
				workspaceRoot,
				"platform-beta"
			);

			const provider = new CfsTaskProvider(
				[
					new CfsTaskDiscoveryStrategy(
						toolManager as unknown as CfsToolManager
					)
				],
				[new MsdkTaskStrategy(), new ZephyrTaskStrategy()]
			);

			const tasks = await provider.discoverTasks([
				platformAlphaPath,
				platformBetaPath
			]);

			// Expected tasks:
			// - platform-alpha: 9 MSDK defaults, 2 custom tasks override 2 defaults → 9 tasks total
			// - platform-beta: 12 Zephyr defaults (no cfs.tasks.json) → 12 tasks
			// Total: 21 tasks (9 from platform-alpha + 12 from platform-beta)
			expect(tasks).to.have.lengthOf(21);

			// Verify platform-alpha tasks (MSDK with custom overrides)
			const platformAlphaTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(platformAlphaPath)
			);
			expect(platformAlphaTasks).to.have.lengthOf(9);

			// platform-alpha "build" should be custom (overriding MSDK default)
			const platformAlphaBuild = platformAlphaTasks.find(
				(t) => t.label === "build"
			);
			expect(platformAlphaBuild).to.exist;
			expect(platformAlphaBuild?.command).to.include("make -r -j 8");

			// platform-alpha "flash (JLink)" should be custom (overriding MSDK default)
			const platformAlphaFlash = platformAlphaTasks.find(
				(t) => t.label === "flash (JLink)"
			);
			expect(platformAlphaFlash).to.exist;
			expect(platformAlphaFlash?.command).to.include(
				"/path/to/mock-tool-1/JLinkExe"
			);

			// platform-alpha should still have MSDK-only tasks
			const platformAlphaClean = platformAlphaTasks.find(
				(t) => t.label === "clean"
			);
			expect(platformAlphaClean).to.exist;

			// Verify platform-beta tasks (Zephyr defaults only, no custom tasks)
			const platformBetaTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(platformBetaPath)
			);
			expect(platformBetaTasks).to.have.lengthOf(12);

			// platform-beta should have standard Zephyr tasks
			const platformBetaBuild = platformBetaTasks.find(
				(t) => t.label === "build"
			);
			expect(platformBetaBuild).to.exist;
			expect(platformBetaBuild?.options?.cwd).to.equal(
				path.normalize(platformBetaPath)
			);

			const platformBetaPristine = platformBetaTasks.find(
				(t) => t.label === "pristine build"
			);
			expect(platformBetaPristine).to.exist;
		});

		it("should return default firmware tasks for a single-platform workspace without cfs.tasks.json", async function () {
			const msdkPath = path.join(fixturesPath, "msdk-project");

			const provider = new CfsTaskProvider(
				[
					new CfsTaskDiscoveryStrategy(
						toolManager as unknown as CfsToolManager
					)
				],
				[new MsdkTaskStrategy()]
			);

			const tasks = await provider.discoverTasks([msdkPath]);

			// msdk-project has Makefile but no .vscode/cfs.tasks.json
			// → CfsTaskDiscoveryStrategy returns empty
			// → MsdkTaskStrategy provides the 9 default tasks
			expect(tasks).to.have.lengthOf(9);
			for (const task of tasks) {
				expect(task.options?.cwd).to.equal(path.normalize(msdkPath));
			}
		});

		it("should discover custom tasks from one project and default tasks from another in multi-platform workspace", async function () {
			const workspaceRoot = path.join(
				fixturesPath,
				"multi-platform-custom"
			);
			const projectAlphaPath = path.join(
				workspaceRoot,
				"project-alpha"
			);
			const projectBetaPath = path.join(
				workspaceRoot,
				"project-beta"
			);

			// - project-alpha: MSDK project with cfs.tasks.json (7 custom tasks override 7 MSDK defaults)
			// - project-beta: Zephyr project without cfs.tasks.json (12 default Zephyr tasks)
			const provider = new CfsTaskProvider(
				[
					new CfsTaskDiscoveryStrategy(
						toolManager as unknown as CfsToolManager
					)
				],
				[new MsdkTaskStrategy(), new ZephyrTaskStrategy()]
			);

			const tasks = await provider.discoverTasks([
				projectAlphaPath,
				projectBetaPath
			]);

			// Expected tasks:
			// - project-alpha: 7 custom tasks from cfs.tasks.json + 2 MSDK subset tasks (clean, clean-periph) = 9 tasks
			// - project-beta: 12 Zephyr default tasks (no cfs.tasks.json)
			// Total: 21 tasks
			expect(tasks).to.have.lengthOf(21);

			// Verify project-alpha tasks have correct cwd and projectId
			const projectAlphaTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(projectAlphaPath)
			);
			expect(projectAlphaTasks).to.have.lengthOf(9);

			// project-alpha should have clean and clean-periph from MSDK subset (no projectId)
			const projectAlphaClean = projectAlphaTasks.find(
				(t) => t.label === "clean"
			);
			expect(projectAlphaClean).to.exist;
			const projectAlphaCleanPeriph = projectAlphaTasks.find(
				(t) => t.label === "clean-periph"
			);
			expect(projectAlphaCleanPeriph).to.exist;

			// project-alpha build should be custom (from cfs.tasks.json) with projectId
			const projectAlphaBuild = projectAlphaTasks.find(
				(t) => t.label === "build"
			);
			expect(projectAlphaBuild).to.exist;
			expect(projectAlphaBuild?.command).to.include("make -r -j 8");
			expect(projectAlphaBuild?.projectId).to.equal("project-alpha");

			// project-alpha flash tasks should be custom (from cfs.tasks.json) with projectId
			const projectAlphaFlashJlink = projectAlphaTasks.find(
				(t) => t.label === "flash (JLink)"
			);
			expect(projectAlphaFlashJlink).to.exist;
			expect(projectAlphaFlashJlink?.projectId).to.equal(
				"project-alpha"
			);

			// Verify project-beta tasks have correct cwd (Zephyr defaults have no projectId)
			const projectBetaTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(projectBetaPath)
			);
			expect(projectBetaTasks).to.have.lengthOf(12);

			// project-beta should have standard Zephyr tasks (no custom tasks, so no projectId)
			const projectBetaBuild = projectBetaTasks.find(
				(t) => t.label === "build"
			);
			expect(projectBetaBuild).to.exist;
			const projectBetaPristine = projectBetaTasks.find(
				(t) => t.label === "pristine build"
			);
			expect(projectBetaPristine).to.exist;
		});
	});
});
