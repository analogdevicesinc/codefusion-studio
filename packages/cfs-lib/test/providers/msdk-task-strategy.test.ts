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

import { MsdkTaskStrategy } from "../../src/providers/msdk-task-strategy.js";
import { expect } from "chai";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("MsdkTaskStrategy", function () {
	let strategy: MsdkTaskStrategy;
	const fixturesPath = path.resolve(
		__dirname,
		"../fixtures/workspaces"
	);

	beforeEach(function () {
		strategy = new MsdkTaskStrategy();
	});

	describe("detectsWorkspace", function () {
		it("should detect MSDK workspace with MSDK_PATH marker", function () {
			const workspacePath = path.join(fixturesPath, "msdk-project");
			const result = strategy.detectsWorkspace(workspacePath);

			expect(result).to.be.true;
		});

		it("should detect MSDK workspace with MAXIM_PATH marker", function () {
			const workspacePath = path.join(
				fixturesPath,
				"multi-platform/platform-alpha"
			);
			const result = strategy.detectsWorkspace(workspacePath);

			expect(result).to.be.true;
		});

		it("should not detect Zephyr workspace", function () {
			const workspacePath = path.join(fixturesPath, "zephyr-project");
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
		it("should return 9 MSDK tasks for detected workspace with one msdk project", async function () {
			const projectPath = path.join(fixturesPath, "msdk-project");
			const tasks = await strategy.discoverTasks([projectPath]);

			expect(tasks).to.have.lengthOf(9);
			// 2 subset tasks (clean, clean-periph) + 7 full tasks
			expect(tasks.map((t) => t.label)).to.include("build");
			expect(tasks.map((t) => t.label)).to.include("clean");
			expect(tasks.map((t) => t.label)).to.include("clean-periph");
			expect(tasks.map((t) => t.label)).to.include("flash (OpenOCD)");
			expect(tasks.map((t) => t.label)).to.include("flash (JLink)");
		});

		it("should set cwd option to detected workspace folder", async function () {
			const projectPath = path.join(fixturesPath, "msdk-project");
			const tasks = await strategy.discoverTasks([projectPath]);

			expect(tasks.length).to.be.greaterThan(0);
			tasks.forEach((task) => {
				expect(task.options?.cwd).to.equal(
					path.normalize(projectPath)
				);
			});
		});

		it("should return empty array when no MSDK projects found", async function () {
			const projectPath = path.join(fixturesPath, "zephyr-project");
			const tasks = await strategy.discoverTasks([projectPath]);

			expect(tasks).to.be.an("array").that.is.empty;
		});

		it("should return tasks from all MSDK projects among mixed project folders", async function () {
			const msdkPath1 = path.join(fixturesPath, "msdk-project");
			const msdkPath2 = path.join(
				fixturesPath,
				"multi-platform/platform-alpha"
			);
			const zephyrPath = path.join(fixturesPath, "zephyr-project");

			const tasks = await strategy.discoverTasks([
				zephyrPath,
				msdkPath1,
				msdkPath2
			]);

			// Should return 9 tasks per MSDK project (2 MSDK projects found)
			expect(tasks).to.have.lengthOf(18);

			const tasksFromPath1 = tasks.filter(
				(t) => t.options?.cwd === msdkPath1
			);
			expect(tasksFromPath1).to.have.lengthOf(9);

			const tasksFromPath2 = tasks.filter(
				(t) => t.options?.cwd === msdkPath2
			);
			expect(tasksFromPath2).to.have.lengthOf(9);

			// Zephyr project should be ignored
			const zephyrTasks = tasks.filter(
				(t) => t.options?.cwd === zephyrPath
			);
			expect(zephyrTasks).to.have.lengthOf(0);
		});

		it("should include all expected MSDK task labels", async function () {
			const workspacePath = path.join(fixturesPath, "msdk-project");
			const tasks = await strategy.discoverTasks([workspacePath]);

			const labels = tasks.map((t) => t.label);
			const expectedLabels = [
				"clean",
				"clean-periph",
				"build",
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

		it("should return tasks from all MSDK projects when multiple exist", async function () {
			const dualMsdkRoot = path.join(fixturesPath, "dual-msdk");
			const msdkAlphaPath = path.join(dualMsdkRoot, "msdk-alpha");
			const msdkBetaPath = path.join(dualMsdkRoot, "msdk-beta");

			const tasks = await strategy.discoverTasks([
				msdkAlphaPath,
				msdkBetaPath
			]);

			// Should return 9 tasks per MSDK project
			expect(tasks).to.have.lengthOf(18);

			const alphaTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(msdkAlphaPath)
			);
			expect(alphaTasks).to.have.lengthOf(9);

			const betaTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(msdkBetaPath)
			);
			expect(betaTasks).to.have.lengthOf(9);
		});

		it("should only generate tasks for the CM4 folder in a dual-core MSDK workspace", async function () {
			const dualCoreRoot = path.join(fixturesPath, "dual-core-msdk");
			const cm4Path = path.join(dualCoreRoot, "CM4");
			const rvPath = path.join(dualCoreRoot, "RV");

			const tasks = await strategy.discoverTasks([cm4Path, rvPath]);

			// Only the CM4 folder (RISCV_LOAD=1) should receive tasks
			expect(tasks).to.have.lengthOf(9);

			const cm4Tasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(cm4Path)
			);
			expect(cm4Tasks).to.have.lengthOf(9);

			const rvTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(rvPath)
			);
			expect(rvTasks).to.have.lengthOf(0);
		});

		it("should include all expected task labels for the CM4 folder in a dual-core workspace", async function () {
			const dualCoreRoot = path.join(fixturesPath, "dual-core-msdk");
			const cm4Path = path.join(dualCoreRoot, "CM4");
			const rvPath = path.join(dualCoreRoot, "RV");

			const tasks = await strategy.discoverTasks([cm4Path, rvPath]);

			const labels = tasks.map((t) => t.label);
			const expectedLabels = [
				"clean",
				"clean-periph",
				"build",
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

		it("should generate tasks for all folders when no folder has RISCV_LOAD=1 (single-core)", async function () {
			// dual-msdk fixtures have no project.mk with RISCV_LOAD=1, so all
			// MSDK folders should receive tasks (standard single-core behaviour)
			const dualMsdkRoot = path.join(fixturesPath, "dual-msdk");
			const alphaPath = path.join(dualMsdkRoot, "msdk-alpha");
			const betaPath = path.join(dualMsdkRoot, "msdk-beta");

			const tasks = await strategy.discoverTasks([alphaPath, betaPath]);

			// Both folders get tasks because neither has RISCV_LOAD=1
			expect(tasks).to.have.lengthOf(18);

			const alphaTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(alphaPath)
			);
			expect(alphaTasks).to.have.lengthOf(9);

			const betaTasks = tasks.filter(
				(t) => t.options?.cwd === path.normalize(betaPath)
			);
			expect(betaTasks).to.have.lengthOf(9);
		});
	});
});
