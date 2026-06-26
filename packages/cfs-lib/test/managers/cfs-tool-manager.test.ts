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

import { describe, it } from "mocha";
import { expect } from "chai";

import { CfsToolManager } from "../../src/managers/cfs-tool-manager.js";
import {
	CfsInstalledPackage,
	CfsPackageManagerProvider
} from "cfs-package-manager";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("CfsToolManager", () => {
	const testFixturesPath = path.resolve(
		__dirname,
		"../fixtures/tool-mgr"
	);

	const fakePkgMgr = {
		getInstalledPackageInfo: () =>
			Promise.resolve([
				{
					name: "CFS Tool X",
					path: path.normalize(
						`${testFixturesPath}/pkg-man-tools/toolx`
					),
					version: "1.0.0",
					type: "tool"
				} as CfsInstalledPackage,
				{
					name: "CFS Tool Y",
					path: path.normalize(
						`${testFixturesPath}/pkg-man-tools/tooly`
					),
					version: "1.0.0",
					type: "tool"
				} as CfsInstalledPackage,
				{
					name: "Zephyr",
					path: path.normalize(
						`${testFixturesPath}/pkg-man-tools/zephyr`
					),
					version: "1.2.0",
					type: "tool"
				} as CfsInstalledPackage,
				{
					name: "CFS Tool without path",
					version: "1.0.0",
					type: "tool",
					path: undefined
				}
			])
	} as unknown as CfsPackageManagerProvider;
	describe("without arguments", () => {
		const toolMgr = new CfsToolManager();

		it("should return empty string when getting a toolpath", async () => {
			const toolPath = await toolMgr.getToolPath("zephyr");
			expect(toolPath).to.be.empty;
		});

		it("should return empty tool list when getting installed tools", async () => {
			const tools = await toolMgr.getInstalledTools();
			expect(tools).to.be.empty;
		});
	});

	describe("with custom path", () => {
		const toolMgr = new CfsToolManager(undefined, [
			path.normalize(testFixturesPath + "/tools/tooly"),
			path.normalize(testFixturesPath + "/tools/toolz")
		]);

		it("should get installed tools", async () => {
			const tools = await toolMgr.getInstalledTools();
			expect(tools.length).to.eq(1);
		});
	});

	describe("with pkg mgr", () => {
		const toolMgr = new CfsToolManager(fakePkgMgr);

		before(async () => {
			await toolMgr.discoverToolPackages();
		});

		it("should get correct tool x path", async () => {
			const cfsToolXPath = await toolMgr.getToolPath("tool.x");

			expect(cfsToolXPath).to.equal(
				path.normalize(`${testFixturesPath}/pkg-man-tools/toolx`)
			);
		});

		it("should resolve template path for dotted tool ID", async () => {
			const resolved = await toolMgr.resolveTemplatePaths("tool.x");
			const expected = path
				.normalize(`${testFixturesPath}/pkg-man-tools/toolx`)
				.split("\\")
				.join("/");

			expect(resolved).to.equal(expected);
		});

		it("should resolve template path for dotted tool ID with subPath", async () => {

			const resolved =
				await toolMgr.resolveTemplatePaths("tool.x.debuggerPath");
			const expected = path
				.normalize(
					`${testFixturesPath}/pkg-man-tools/toolx/gnu/bin/tool-x-gdb`
				)
				.split("\\")
				.join("/");

			expect(resolved).to.equal(expected);
		});

		it("should resolve template path for dotted tool ID with array subPath (paths)", async () => {
			const resolved =
				await toolMgr.resolveTemplatePaths("tool.x.paths");
			const expected = path
				.normalize(
					`${testFixturesPath}/pkg-man-tools/toolx/bin1`
				)
				.split("\\")
				.join("/");

			expect(resolved).to.equal(expected);
		});

		it("should resolve template path for non-dotted tool ID", async () => {
			const resolved = await toolMgr.resolveTemplatePaths("zephyr");
			const expected = path
				.normalize(`${testFixturesPath}/pkg-man-tools/zephyr`)
				.split("\\")
				.join("/");

			expect(resolved).to.equal(expected);
		});

		it("should return original string when tool ID is not found", async () => {
			const resolved =
				await toolMgr.resolveTemplatePaths("nonexistent.tool");

			expect(resolved).to.equal("nonexistent.tool");
		});

		it("should get tools from package manager", async () => {
			const tools = await toolMgr.getInstalledTools();
			const toolX = tools.find((tool) => tool.id === "tool.x");
			if (!toolX) {
				expect(toolX).not.to.be.undefined;
				return;
			}

			expect(toolX.resolvedPaths[0]).to.be.equal(
				path.normalize(`${testFixturesPath}/pkg-man-tools/toolx/bin1`)
			);
		});

		it("should get empty string when using non-existent version", async () => {
			const tool = await toolMgr.getToolPath("tool.x", "1.0.1");
			expect(tool).to.be.empty;
		});

		it("should get tool.x version 1.0.0", async () => {
			// When having multiple versions of a tool, the first one is saved, the others are omitted
			const toolx = await toolMgr.getInstalledToolById("tool.x");
			if (!toolx) {
				expect(toolx).not.to.be.undefined;
				return;
			}
			expect(toolx.version).to.be.eq("1.0.0");
			const toolPath = await toolMgr.getToolPath("tool.y");
			expect(toolPath).to.be.equal(
				path.normalize(`${testFixturesPath}/pkg-man-tools/tooly`)
			);
		});
	});

	describe("with duplicate tool IDs across packages", () => {
		it("should resolve to the package with the greater name", async () => {
			// "zephyr-max32657" > "zephyr" lexicographically, so zephyr-max32657 should win
			const fakePkgMgrDuplicates = {
				getInstalledPackageInfo: () =>
					Promise.resolve([
						{
							name: "zephyr",
							path: path.normalize(
								`${testFixturesPath}/pkg-man-tools/zephyr`
							),
							version: "1.2.0",
							type: "sdk"
						} as CfsInstalledPackage,
						{
							name: "zephyr-max32657",
							path: path.normalize(
								`${testFixturesPath}/pkg-man-tools/zephyr-max32657`
							),
							version: "4.4.0",
							type: "sdk",
							cfsSoc: ["MAX32657"]
						} as CfsInstalledPackage
					])
			} as unknown as CfsPackageManagerProvider;

			const toolMgr = new CfsToolManager(
				fakePkgMgrDuplicates,
				undefined,
				"MAX32657"
			);
			const zephyrTool = await toolMgr.getInstalledToolById("zephyr");

			if (!zephyrTool) {
				expect(zephyrTool).not.to.be.null;
				return;
			}

			expect(zephyrTool.version).to.equal("4.4.0");
		});

		it("should resolve regardless of package enumeration order", async () => {
			// Even if the more-specific package appears first, the result should be the same
			const fakePkgMgrReversed = {
				getInstalledPackageInfo: () =>
					Promise.resolve([
						{
							name: "zephyr-max32657",
							path: path.normalize(
								`${testFixturesPath}/pkg-man-tools/zephyr-max32657`
							),
							version: "4.4.0",
							type: "sdk",
							cfsSoc: ["MAX32657"]
						} as CfsInstalledPackage,
						{
							name: "zephyr",
							path: path.normalize(
								`${testFixturesPath}/pkg-man-tools/zephyr`
							),
							version: "1.2.0",
							type: "sdk"
						} as CfsInstalledPackage
					])
			} as unknown as CfsPackageManagerProvider;

			const toolMgr = new CfsToolManager(
				fakePkgMgrReversed,
				undefined,
				"MAX32657"
			);
			const zephyrTool = await toolMgr.getInstalledToolById("zephyr");

			if (!zephyrTool) {
				expect(zephyrTool).not.to.be.null;
				return;
			}

			expect(zephyrTool.version).to.equal("4.4.0");
		});

		it("should pick the SoC-filtered package when only one remains", async () => {
			// For a non-MAX32657 SoC, zephyr-max32657 is filtered out by cfsSoc
			const fakePkgMgrFiltered = {
				getInstalledPackageInfo: () =>
					Promise.resolve([
						{
							name: "zephyr",
							path: path.normalize(
								`${testFixturesPath}/pkg-man-tools/zephyr`
							),
							version: "1.2.0",
							type: "sdk"
						} as CfsInstalledPackage,
						{
							name: "zephyr-max32657",
							path: path.normalize(
								`${testFixturesPath}/pkg-man-tools/zephyr-max32657`
							),
							version: "4.4.0",
							type: "sdk",
							cfsSoc: ["MAX32657"]
						} as CfsInstalledPackage
					])
			} as unknown as CfsPackageManagerProvider;

			const toolMgr = new CfsToolManager(
				fakePkgMgrFiltered,
				undefined,
				"MAX78000"
			);
			const zephyrTool = await toolMgr.getInstalledToolById("zephyr");

			if (!zephyrTool) {
				expect(zephyrTool).not.to.be.null;
				return;
			}

			expect(zephyrTool.version).to.equal("1.2.0");
		});

		it("should not exclude SoC-scoped packages when targetSoc is undefined", async () => {
			// When no targetSoc is set, "zephyr-max32657" (SoC-scoped) must win since
			// "zephyr-max32657" > "zephyr" lexicographically.
			const fakePkgMgrNoSoc = {
				getInstalledPackageInfo: () =>
					Promise.resolve([
						{
							name: "zephyr",
							path: path.normalize(
								`${testFixturesPath}/pkg-man-tools/zephyr`
							),
							version: "1.2.0",
							type: "sdk"
						} as CfsInstalledPackage,
						{
							name: "zephyr-max32657",
							path: path.normalize(
								`${testFixturesPath}/pkg-man-tools/zephyr-max32657`
							),
							version: "4.4.0",
							type: "sdk",
							cfsSoc: ["MAX32657"]
						} as CfsInstalledPackage
					])
			} as unknown as CfsPackageManagerProvider;

			// No targetSoc provided
			const toolMgr = new CfsToolManager(fakePkgMgrNoSoc);
			const zephyrTool = await toolMgr.getInstalledToolById("zephyr");

			if (!zephyrTool) {
				expect(zephyrTool).not.to.be.null;
				return;
			}

			// The SoC-scoped package should win
			expect(zephyrTool.version).to.equal("4.4.0");
		});

		it("should resolve duplicates to the package with the greater name", async () => {
			// "foobar" > "foo" lexicographically
			const fakePkgMgrFoo = {
				getInstalledPackageInfo: () =>
					Promise.resolve([
						{
							name: "foo",
							path: path.normalize(
								`${testFixturesPath}/pkg-man-tools/tooly`
							),
							version: "1.0.0",
							type: "tool"
						} as CfsInstalledPackage,
						{
							name: "foobar",
							path: path.normalize(
								`${testFixturesPath}/pkg-man-tools/tooly-new`
							),
							version: "1.2.0",
							type: "tool"
						} as CfsInstalledPackage
					])
			} as unknown as CfsPackageManagerProvider;

			const toolMgr = new CfsToolManager(fakePkgMgrFoo);
			const tool = await toolMgr.getInstalledToolById("tool.y");

			if (!tool) {
				expect(tool).not.to.be.null;
				return;
			}

			expect(tool.version).to.equal("1.2.0");
		});
	});

	describe("with pkg manager and custom path", () => {
		const toolMgr = new CfsToolManager(fakePkgMgr, [
			path.normalize(testFixturesPath + "/tools/toolx")
		]);

		it("should get toolx with version from package manager", async () => {
			const toolx = await toolMgr.getInstalledToolById("tool.x");

			if (!toolx) {
				expect(toolx).not.to.be.null;
				return;
			}

			expect(toolx.version).to.be.eq("1.0.0");
		});

		it("should find zephyr tool", async () => {
			const zephyrTool = await toolMgr.getInstalledToolById("zephyr");

			if (!zephyrTool) {
				expect(zephyrTool).not.to.be.null;
				return;
			}

			expect(zephyrTool.version).to.be.eq("1.2.0");
		});
	});
});
