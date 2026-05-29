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

import { CfsTaskDiscoveryStrategy } from "../../src/providers/cfs-task-discovery-strategy.js";
import { CfsToolManager } from "../../src/managers/cfs-tool-manager.js";
import { expect } from "chai";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual mock implementation for CfsToolManager
class MockToolManager {
	public resolveTemplatePathsCalls: string[] = [];

	resolveTemplatePaths(input: string): Promise<string> {
		this.resolveTemplatePathsCalls.push(input);

		const toolPaths: Record<string, string> = {
			"mock-tool-1": "/path/to/mock-tool-1",
			"mock-tool-2": "/path/to/mock-tool-2"
		};

		return Promise.resolve(toolPaths[input] || input);
	}
}

describe("CfsTaskDiscoveryStrategy", function () {
	let strategy: CfsTaskDiscoveryStrategy;
	let toolManager: MockToolManager;
	const fixturesPath = path.resolve(
		__dirname,
		"../fixtures/workspaces"
	);

	beforeEach(function () {
		toolManager = new MockToolManager();
		strategy = new CfsTaskDiscoveryStrategy(
			toolManager as unknown as CfsToolManager
		);
	});

	describe("discoverTasks", function () {
		it("should discover and parse cfs.tasks.json from workspace", async function () {
			const workspacePath = path.join(
				fixturesPath,
				"cfs-tasks-project"
			);
			const tasks = await strategy.discoverTasks([workspacePath]);

			expect(tasks).to.have.lengthOf(3);
			expect(tasks.map((t) => t.label)).to.include.members([
				"test-build",
				"test-flash",
				"test-clean"
			]);
		});

		it("should set options.cwd to the project folder for each discovered task", async function () {
			const workspacePath = path.join(
				fixturesPath,
				"cfs-tasks-project"
			);
			const tasks = await strategy.discoverTasks([workspacePath]);

			expect(tasks).to.have.length.greaterThan(0);
			for (const task of tasks) {
				expect(task.options?.cwd).to.equal(
					path.normalize(workspacePath)
				);
			}
		});

		it("should set projectId to the project name for each discovered task", async function () {
			const workspacePath = path.join(
				fixturesPath,
				"cfs-tasks-project"
			);
			const tasks = await strategy.discoverTasks([workspacePath]);

			expect(tasks).to.have.length.greaterThan(0);
			for (const task of tasks) {
				expect(task.projectId).to.equal("cfs-tasks-project");
			}
		});

		it("should set correct projectId for multi-platform project", async function () {
			const platformAlphaPath = path.join(
				fixturesPath,
				"multi-platform/platform-alpha"
			);
			const tasks = await strategy.discoverTasks([platformAlphaPath]);

			expect(tasks).to.have.lengthOf(2);
			for (const task of tasks) {
				expect(task.projectId).to.equal("platform-alpha");
				expect(task.options?.cwd).to.equal(
					path.normalize(platformAlphaPath)
				);
			}
		});

		it("should resolve ${cfs:tool.path.*} variables", async function () {
			const workspacePath = path.join(
				fixturesPath,
				"cfs-tasks-project"
			);
			const tasks = await strategy.discoverTasks([workspacePath]);

			const buildTask = tasks.find((t) => t.label === "test-build");
			expect(buildTask).to.exist;
			expect(buildTask?.command).to.equal(
				"/path/to/mock-tool-1/bin/gcc -o output main.c"
			);

			const flashTask = tasks.find((t) => t.label === "test-flash");
			expect(flashTask).to.exist;
			expect(flashTask?.command).to.include(
				"/path/to/mock-tool-2/flasher"
			);
		});

		it("should leave non-cfs variables untouched", async function () {
			const workspacePath = path.join(
				fixturesPath,
				"cfs-tasks-project"
			);
			const tasks = await strategy.discoverTasks([workspacePath]);

			const flashTask = tasks.find((t) => t.label === "test-flash");
			expect(flashTask).to.exist;
			expect(flashTask?.command).to.include("${config:cfs.target}");

			const cleanTask = tasks.find((t) => t.label === "test-clean");
			expect(cleanTask).to.exist;
			expect(cleanTask?.command).to.include(
				"${workspaceFolder}/build"
			);
		});

		it("should return empty array for folders without cfs.tasks.json", async function () {
			const workspacePath = path.join(fixturesPath, "msdk-project");
			const tasks = await strategy.discoverTasks([workspacePath]);

			expect(tasks).to.be.an("array").that.is.empty;
		});

		it("should return empty array for project with .vscode but no cfs.tasks.json", async function () {
			const workspacePath = path.join(
				fixturesPath,
				"multi-platform/platform-beta"
			);
			const tasks = await strategy.discoverTasks([workspacePath]);

			// platform-beta has .vscode/settings.json but no cfs.tasks.json
			expect(tasks).to.be.an("array").that.is.empty;
		});

		it("should handle malformed JSON gracefully", async function () {
			const workspacePath = path.join(fixturesPath, "bad-json");
			const tasks = await strategy.discoverTasks([workspacePath]);

			// Should return empty array and not throw
			expect(tasks).to.be.an("array").that.is.empty;
		});

		it("should discover tasks from multiple workspace folders", async function () {
			const cfsTasksPath = path.join(
				fixturesPath,
				"cfs-tasks-project"
			);
			const emptyPath = path.join(fixturesPath, "empty-project");

			const tasks = await strategy.discoverTasks([
				emptyPath,
				cfsTasksPath
			]);

			// Should only find tasks from cfs-tasks-project
			expect(tasks).to.have.lengthOf(3);
		});

		it("should discover tasks from multi-platform project", async function () {
			const platformAlphaPath = path.join(
				fixturesPath,
				"multi-platform/platform-alpha"
			);
			const tasks = await strategy.discoverTasks([platformAlphaPath]);

			expect(tasks).to.have.lengthOf(2);
			expect(tasks.map((t) => t.label)).to.include.members([
				"build",
				"flash (JLink)"
			]);

			// All tasks should have cwd set to the platform-alpha project folder
			for (const task of tasks) {
				expect(task.options?.cwd).to.equal(platformAlphaPath);
			}
		});

		it("should call tool manager for each ${cfs:tool.path.*} variable", async function () {
			const workspacePath = path.join(
				fixturesPath,
				"cfs-tasks-project"
			);
			await strategy.discoverTasks([workspacePath]);

			// Should have called resolveTemplatePaths for mock-tool-1 and mock-tool-2
			expect(toolManager.resolveTemplatePathsCalls).to.have.lengthOf(
				2
			);
			expect(
				toolManager.resolveTemplatePathsCalls
			).to.include.members(["mock-tool-1", "mock-tool-2"]);
		});

		it("should preserve task properties after variable resolution", async function () {
			const workspacePath = path.join(
				fixturesPath,
				"cfs-tasks-project"
			);
			const tasks = await strategy.discoverTasks([workspacePath]);

			const buildTask = tasks.find((t) => t.label === "test-build");
			expect(buildTask).to.exist;
			expect(buildTask?.type).to.equal("shell");
			expect(buildTask?.group).to.equal("build");
			expect(buildTask?.problemMatcher).to.be.an("array").that.is
				.empty;

			const flashTask = tasks.find((t) => t.label === "test-flash");
			expect(flashTask).to.exist;
			expect(flashTask?.dependsOn).to.deep.equal(["test-build"]);
		});
	});
});
