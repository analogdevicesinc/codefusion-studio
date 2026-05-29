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

import { detectToolchain } from "../../src/utils/detect-toolchain.js";
import { MsdkTaskStrategy } from "../../src/providers/msdk-task-strategy.js";
import { ZephyrTaskStrategy } from "../../src/providers/zephyr-task-strategy.js";
import { PLATFORM_IDS } from "../../src/providers/platform-constants.js";
import type { TaskDiscoveryStrategy } from "../../src/types/task-discovery-strategy.js";
import type { Task } from "cfs-types";
import { expect } from "chai";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("detectToolchain", function () {
	const fixturesPath = path.resolve(
		__dirname,
		"../fixtures/workspaces"
	);

	describe("strategy-based detection", function () {
		it("should detect MSDK via MsdkTaskStrategy", function () {
			const workspacePath = path.join(fixturesPath, "msdk-project");
			const strategies = [new MsdkTaskStrategy()];

			const result = detectToolchain(workspacePath, strategies);

			expect(result).to.equal(PLATFORM_IDS.MSDK);
		});

		it("should detect Zephyr via ZephyrTaskStrategy", function () {
			const workspacePath = path.join(fixturesPath, "zephyr-project");
			const strategies = [new ZephyrTaskStrategy()];

			const result = detectToolchain(workspacePath, strategies);

			expect(result).to.equal(PLATFORM_IDS.ZEPHYR);
		});

		it("should return the first matching strategy (order matters)", function () {
			const workspacePath = path.join(
				fixturesPath,
				"multi-platform/platform-beta"
			);
			// platform-beta has prj.conf, so Zephyr should match
			const strategies = [
				new ZephyrTaskStrategy(),
				new MsdkTaskStrategy()
			];

			const result = detectToolchain(workspacePath, strategies);

			expect(result).to.equal(PLATFORM_IDS.ZEPHYR);
		});

		it("should try the next strategy if the first does not match", function () {
			const workspacePath = path.join(fixturesPath, "msdk-project");
			// Zephyr won't match msdk-project, MSDK will
			const strategies = [
				new ZephyrTaskStrategy(),
				new MsdkTaskStrategy()
			];

			const result = detectToolchain(workspacePath, strategies);

			expect(result).to.equal(PLATFORM_IDS.MSDK);
		});
	});

	describe("fallback to .vscode/settings.json", function () {
		it("should detect Zephyr from settings.json when no strategy matches", function () {
			const workspacePath = path.join(
				fixturesPath,
				"multi-platform/platform-beta"
			);
			// Pass empty strategies so it falls through to settings.json
			const result = detectToolchain(workspacePath, []);

			expect(result).to.equal(PLATFORM_IDS.ZEPHYR);
		});

		it("should handle case-insensitive firmwarePlatform values", function () {
			const workspacePath = path.join(fixturesPath, "settings-msdk");
			// settings-msdk has "MSDK" (uppercase) in settings.json
			const result = detectToolchain(workspacePath, []);

			expect(result).to.equal(PLATFORM_IDS.MSDK);
		});
	});

	describe("strategies without detectsWorkspace", function () {
		it("should skip strategies that do not implement detectsWorkspace", function () {
			const workspacePath = path.join(fixturesPath, "msdk-project");

			// Minimal strategy with only the interface methods (no detectsWorkspace)
			const minimalStrategy: TaskDiscoveryStrategy = {
				id: "minimal",
				discoverTasks(): Promise<Task.Definition[]> {
					return Promise.resolve([]);
				}
			};

			const strategies = [minimalStrategy, new MsdkTaskStrategy()];
			const result = detectToolchain(workspacePath, strategies);

			expect(result).to.equal(PLATFORM_IDS.MSDK);
		});

		it("should return 'none' when all strategies lack detectsWorkspace and no settings.json exists", function () {
			const workspacePath = path.join(fixturesPath, "empty-project");

			const minimalStrategy: TaskDiscoveryStrategy = {
				id: "minimal",
				discoverTasks(): Promise<Task.Definition[]> {
					return Promise.resolve([]);
				}
			};

			const result = detectToolchain(workspacePath, [
				minimalStrategy
			]);

			expect(result).to.equal(PLATFORM_IDS.NONE);
		});
	});

	describe("return 'none' fallback", function () {
		it("should return 'none' for empty workspace with no strategies", function () {
			const workspacePath = path.join(fixturesPath, "empty-project");

			const result = detectToolchain(workspacePath, []);

			expect(result).to.equal(PLATFORM_IDS.NONE);
		});

		it("should return 'none' for non-existent workspace path", function () {
			const workspacePath = path.join(fixturesPath, "does-not-exist");

			const result = detectToolchain(workspacePath, []);

			expect(result).to.equal(PLATFORM_IDS.NONE);
		});
	});

	describe("malformed settings.json", function () {
		it("should return 'none' when settings.json contains invalid JSON", function () {
			const workspacePath = path.join(
				fixturesPath,
				"bad-json-settings"
			);

			const result = detectToolchain(workspacePath, []);

			expect(result).to.equal(PLATFORM_IDS.NONE);
		});
	});

	describe("empty strategies array", function () {
		it("should fall through to settings.json with empty strategies array", function () {
			const workspacePath = path.join(
				fixturesPath,
				"multi-platform/platform-beta"
			);

			const result = detectToolchain(workspacePath, []);

			expect(result).to.equal(PLATFORM_IDS.ZEPHYR);
		});

		it("should return 'none' with empty strategies and no settings.json", function () {
			const workspacePath = path.join(fixturesPath, "empty-project");

			const result = detectToolchain(workspacePath, []);

			expect(result).to.equal(PLATFORM_IDS.NONE);
		});
	});
});
