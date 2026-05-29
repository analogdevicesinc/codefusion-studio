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

import { ZephyrTaskStrategy } from "../../src/providers/zephyr-task-strategy.js";
import { expect } from "chai";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("ZephyrTaskStrategy", function () {
	let strategy: ZephyrTaskStrategy;
	const fixturesPath = path.resolve(
		__dirname,
		"../fixtures/workspaces"
	);

	beforeEach(function () {
		strategy = new ZephyrTaskStrategy();
	});

	describe("detectsWorkspace", function () {
		it("should detect Zephyr workspace with prj.conf", function () {
			const workspacePath = path.join(fixturesPath, "zephyr-project");
			const result = strategy.detectsWorkspace(workspacePath);

			expect(result).to.be.true;
		});

		it("should detect Zephyr workspace in multi-platform folder", function () {
			const workspacePath = path.join(
				fixturesPath,
				"multi-platform/platform-beta"
			);
			const result = strategy.detectsWorkspace(workspacePath);

			expect(result).to.be.true;
		});

		it("should not detect MSDK workspace", function () {
			const workspacePath = path.join(fixturesPath, "msdk-project");
			const result = strategy.detectsWorkspace(workspacePath);

			expect(result).to.be.false;
		});

		it("should not detect empty workspace", function () {
			const workspacePath = path.join(fixturesPath, "empty-project");
			const result = strategy.detectsWorkspace(workspacePath);

			expect(result).to.be.false;
		});

		it("should not detect non-existent workspace", function () {
			const workspacePath = path.join(fixturesPath, "does-not-exist");
			const result = strategy.detectsWorkspace(workspacePath);

			expect(result).to.be.false;
		});
	});

	describe("discoverTasks", function () {
		it("should return 12 Zephyr tasks for detected workspace with a single zephyr project", async function () {
			const projectPath = path.join(fixturesPath, "zephyr-project");
			const tasks = await strategy.discoverTasks([projectPath]);

			expect(tasks).to.have.lengthOf(12);
			expect(tasks.map((t) => t.label)).to.include("build");
			expect(tasks.map((t) => t.label)).to.include("pristine build");
			expect(tasks.map((t) => t.label)).to.include("clean");
			expect(tasks.map((t) => t.label)).to.include("flash (OpenOCD)");
			expect(tasks.map((t) => t.label)).to.include("flash (JLink)");
		});

		it("should set cwd option to detected workspace folder", async function () {
			const workspacePath = path.join(fixturesPath, "zephyr-project");
			const tasks = await strategy.discoverTasks([workspacePath]);

			expect(tasks.length).to.be.greaterThan(0);
			tasks.forEach((task) => {
				expect(task.options?.cwd).to.equal(
					path.normalize(workspacePath)
				);
			});
		});

		it("should return empty array when no Zephyr workspace found", async function () {
			const workspacePath = path.join(fixturesPath, "msdk-project");
			const tasks = await strategy.discoverTasks([workspacePath]);

			expect(tasks).to.be.an("array").that.is.empty;
		});

		it("should return tasks from all Zephyr projects among mixed project folders", async function () {
			const zephyrPath1 = path.join(fixturesPath, "zephyr-project");
			const zephyrPath2 = path.join(
				fixturesPath,
				"multi-platform/platform-beta"
			);
			const msdkPath = path.join(fixturesPath, "msdk-project");

			const tasks = await strategy.discoverTasks([
				msdkPath,
				zephyrPath1,
				zephyrPath2
			]);

			// Should return 12 tasks per Zephyr project (2 Zephyr projects found)
			expect(tasks).to.have.lengthOf(24);

			const tasksFromPath1 = tasks.filter(
				(t) => t.options?.cwd === zephyrPath1
			);
			expect(tasksFromPath1).to.have.lengthOf(12);

			const tasksFromPath2 = tasks.filter(
				(t) => t.options?.cwd === zephyrPath2
			);
			expect(tasksFromPath2).to.have.lengthOf(12);

			// MSDK project should be ignored
			const msdkTasks = tasks.filter(
				(t) => t.options?.cwd === msdkPath
			);
			expect(msdkTasks).to.have.lengthOf(0);
		});

		it("should include all expected Zephyr task labels", async function () {
			const workspacePath = path.join(fixturesPath, "zephyr-project");
			const tasks = await strategy.discoverTasks([workspacePath]);

			const labels = tasks.map((t) => t.label);
			const expectedLabels = [
				"build",
				"pristine build",
				"clean",
				"flash (OpenOCD)",
				"flash (JLink)",
				"flash & run (OpenOCD)",
				"flash & run (JLink)",
				"erase (OpenOCD)",
				"erase (JLink)"
			];

			expectedLabels.forEach((expectedLabel) => {
				expect(labels).to.include(
					expectedLabel,
					`Expected task "${expectedLabel}" not found`
				);
			});
		});

		it("should use default platformConfig for task generation", async function () {
			const workspacePath = path.join(fixturesPath, "zephyr-project");
			const tasks = await strategy.discoverTasks([workspacePath]);

			// Find the build task and verify it uses ninja (default build system)
			const buildTask = tasks.find((t) => t.label === "build");
			expect(buildTask).to.exist;
			expect(buildTask?.command).to.include("west build");
			expect(buildTask?.command).to.not.include("Unix Makefiles");
		});

		it("should return tasks from all Zephyr projects when multiple exist", async function () {
			const dualZephyrRoot = path.join(fixturesPath, "dual-zephyr");
			const zephyrAlphaPath = path.join(
				dualZephyrRoot,
				"zephyr-alpha"
			);
			const zephyrBetaPath = path.join(dualZephyrRoot, "zephyr-beta");

			const tasks = await strategy.discoverTasks([
				zephyrAlphaPath,
				zephyrBetaPath
			]);

			// Should return 12 tasks per Zephyr project
			expect(tasks).to.have.lengthOf(24);

			const alphaTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(zephyrAlphaPath)
			);
			expect(alphaTasks).to.have.lengthOf(12);

			const betaTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(zephyrBetaPath)
			);
			expect(betaTasks).to.have.lengthOf(12);
		});
	});
});
