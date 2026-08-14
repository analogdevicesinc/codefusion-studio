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

import {
	detectToolchain,
	resolveZephyrHostToolsId,
	getZephyrSdkPath,
	resolveZephyrSdkRoot
} from "../../src/utils/detect-toolchain.js";
import type { CfsToolManager } from "../../src/managers/cfs-tool-manager.js";
import { MsdkTaskStrategy } from "../../src/providers/msdk-task-strategy.js";
import { ZephyrTaskStrategy } from "../../src/providers/zephyr-task-strategy.js";
import { PLATFORM_IDS } from "../../src/providers/platform-constants.js";
import type { TaskDiscoveryStrategy } from "../../src/types/task-discovery-strategy.js";
import type { Task } from "cfs-types";
import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";
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

describe("resolveZephyrSdkRoot", function () {
	let tmpDir: string;

	beforeEach(function () {
		tmpDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "zephyr-sdk-test-")
		);
	});

	afterEach(function () {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("should return toolPath when cmake/ exists at toolPath (package layout)", function () {
		// Simulate: <sdk-root>/cmake/Zephyr-sdkConfig.cmake
		const sdkRoot = path.join(tmpDir, "zephyr-sdk-1.0.0");
		fs.mkdirSync(path.join(sdkRoot, "cmake"), { recursive: true });

		const result = resolveZephyrSdkRoot(sdkRoot);

		expect(result).to.equal(sdkRoot);
	});

	it("should return parent when toolPath lacks cmake/ but parent has it (installer layout)", function () {
		// Simulate: <sdk-root>/arm-zephyr-eabi (tool.json here, no cmake/)
		// Parent <sdk-root> has cmake/
		const sdkRoot = path.join(tmpDir, "zephyr-sdk-1.0.0");
		const toolchainSubdir = path.join(sdkRoot, "arm-zephyr-eabi");
		fs.mkdirSync(path.join(sdkRoot, "cmake"), { recursive: true });
		fs.mkdirSync(toolchainSubdir, { recursive: true });

		const result = resolveZephyrSdkRoot(toolchainSubdir);

		expect(result).to.equal(sdkRoot);
	});

	it("should return toolPath as fallback when neither toolPath nor parent has cmake/", function () {
		const toolchainPath = path.join(tmpDir, "unknown-toolchain");
		fs.mkdirSync(toolchainPath, { recursive: true });

		const result = resolveZephyrSdkRoot(toolchainPath);

		expect(result).to.equal(toolchainPath);
	});
});

describe("resolveZephyrHostToolsId", function () {
	it("returns the arm.zephyr.eabi.toolchain host-tools id for Xtensa toolchains", function () {
		expect(resolveZephyrHostToolsId("xtensa-adau2142")).to.equal(
			"arm.zephyr.eabi.toolchain"
		);
	});

	it("matches the Xtensa toolchain id case-insensitively", function () {
		expect(resolveZephyrHostToolsId("XTENSA-ADAU2142")).to.equal(
			"arm.zephyr.eabi.toolchain"
		);
	});

	it("returns the host-tools id for ARM Zephyr toolchains (id contains 'zephyr')", function () {
		expect(
			resolveZephyrHostToolsId("arm.zephyr.eabi.toolchain")
		).to.equal("arm.zephyr.eabi.toolchain");
	});

	it("matches a Zephyr toolchain id case-insensitively and trims whitespace", function () {
		expect(
			resolveZephyrHostToolsId("  ARM.ZEPHYR.EABI.toolchain  ")
		).to.equal("arm.zephyr.eabi.toolchain");
	});

	it("returns an empty string for non-Zephyr toolchains", function () {
		expect(resolveZephyrHostToolsId("some.other.toolchain")).to.equal(
			""
		);
	});

	it("returns an empty string for an empty toolchain id", function () {
		expect(resolveZephyrHostToolsId("")).to.equal("");
	});
});

describe("getZephyrSdkPath", function () {
	let tmpDir: string;

	/**
	 * Builds a minimal CfsToolManager stub whose getToolPath returns the
	 * provided path (and optionally records the requested tool id).
	 */
	function mockToolManager(
		getToolPath: (toolId: string) => Promise<string>
	): CfsToolManager {
		return { getToolPath } as unknown as CfsToolManager;
	}

	beforeEach(function () {
		tmpDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "zephyr-sdk-path-")
		);
	});

	afterEach(function () {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("returns the per-project override when its path contains 'zephyr'", async function () {
		const result = await getZephyrSdkPath(
			"/opt/cfs",
			"/opt/zephyr-sdk-0.16.5",
			"arm.zephyr.eabi.toolchain",
			mockToolManager(() => Promise.resolve("/should/not/be/used"))
		);

		expect(result).to.equal("/opt/zephyr-sdk-0.16.5");
	});

	it("matches 'zephyr' in the override path case-insensitively", async function () {
		const result = await getZephyrSdkPath(
			"/opt/cfs",
			"/opt/ZEPHYR-SDK",
			"arm.zephyr.eabi.toolchain",
			mockToolManager(() => Promise.resolve("/should/not/be/used"))
		);

		expect(result).to.equal("/opt/ZEPHYR-SDK");
	});

	it("ignores the override when its path does not contain 'zephyr' and falls through to the host-tools package", async function () {
		// The override points at a compiler package whose path does not contain
		// "zephyr", e.g. the xt-clang root on an Xtensa project.
		const packageRoot = path.join(tmpDir, "zephyr-sdk-1.0.0");
		fs.mkdirSync(path.join(packageRoot, "cmake"), {
			recursive: true
		});

		const result = await getZephyrSdkPath(
			path.join(tmpDir, "install"),
			"/opt/xtensa/xt-clang",
			"xtensa-adau2142",
			mockToolManager(() => Promise.resolve(packageRoot))
		);

		expect(result).to.equal(packageRoot);
	});

	it("resolves the SDK root from the host-tools package when found", async function () {
		// Package layout: cmake/ exists at the tool path.
		const packageRoot = path.join(tmpDir, "zephyr-sdk-1.0.0");
		fs.mkdirSync(path.join(packageRoot, "cmake"), {
			recursive: true
		});

		const result = await getZephyrSdkPath(
			path.join(tmpDir, "install"),
			undefined,
			"arm.zephyr.eabi.toolchain",
			mockToolManager(() => Promise.resolve(packageRoot))
		);

		expect(result).to.equal(packageRoot);
	});

	it("maps an Xtensa toolchain id to the host-tools package id", async function () {
		let requestedToolId: string | undefined;
		const packageRoot = path.join(tmpDir, "zephyr-sdk-1.0.0");
		fs.mkdirSync(path.join(packageRoot, "cmake"), {
			recursive: true
		});

		await getZephyrSdkPath(
			undefined,
			undefined,
			"xtensa-adau2142",
			mockToolManager((toolId) => {
				requestedToolId = toolId;
				return Promise.resolve(packageRoot);
			})
		);

		expect(requestedToolId).to.equal("arm.zephyr.eabi.toolchain");
	});

	it("skips the host-tools lookup when no toolchain id is provided", async function () {
		let requestedToolId: string | undefined;

		await getZephyrSdkPath(
			undefined,
			undefined,
			undefined,
			mockToolManager((toolId) => {
				requestedToolId = toolId;
				return Promise.resolve("");
			})
		);

		expect(requestedToolId).to.equal(undefined);
	});

	it("skips the host-tools lookup for a non-Zephyr toolchain id", async function () {
		let requestedToolId: string | undefined;

		await getZephyrSdkPath(
			undefined,
			undefined,
			"some.other.toolchain",
			mockToolManager((toolId) => {
				requestedToolId = toolId;
				return Promise.resolve("");
			})
		);

		expect(requestedToolId).to.equal(undefined);
	});

	it("falls back to the installer SDK when the package is not found", async function () {
		const installerSdk = path.join(
			tmpDir,
			"install",
			"Tools",
			"zephyr-sdk"
		);
		fs.mkdirSync(installerSdk, { recursive: true });

		const result = await getZephyrSdkPath(
			path.join(tmpDir, "install"),
			undefined,
			"arm.zephyr.eabi.toolchain",
			mockToolManager(() => Promise.resolve(""))
		);

		expect(result).to.equal(installerSdk);
	});

	it("returns undefined when the installer SDK directory does not exist and no package is found", async function () {
		const result = await getZephyrSdkPath(
			path.join(tmpDir, "install"),
			undefined,
			"arm.zephyr.eabi.toolchain",
			mockToolManager(() => Promise.resolve(""))
		);

		expect(result).to.equal(undefined);
	});

	it("returns undefined when no package is found and no SDK path is set", async function () {
		const result = await getZephyrSdkPath(
			undefined,
			undefined,
			"arm.zephyr.eabi.toolchain",
			mockToolManager(() => Promise.resolve(""))
		);

		expect(result).to.equal(undefined);
	});
});
