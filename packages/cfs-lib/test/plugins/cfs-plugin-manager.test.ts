/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { CfsPluginManager } from "../../src/plugins/cfs-plugin-manager.js";
import type { CfsPluginInfo } from "cfs-plugins-api";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import fs, { promises as fsp } from "node:fs";

chai.use(chaiAsPromised);

const pluginDirs = [
	path.join(dirname(fileURLToPath(import.meta.url)), "dummyPlugin")
];

const dataModelDirs = [
	path.resolve(
		fileURLToPath(import.meta.url),
		"../../../../cfs-data-models/socs"
	)
];

describe("CfsPluginManager", () => {
	after(async () => {
		const workspacePath = path.resolve("test/test-workspace");
		try {
			if (fs.existsSync(workspacePath)) {
				await fsp.rm(workspacePath, {
					recursive: true,
					force: true
				});
			}
		} catch (error) {
			console.error("Error during afterEach cleanup:", error);
		}
	});

	const dummyWorkspace = {
		workspacePluginId: "1",
		workspacePluginVersion: "1",
		workspaceName: "test-workspace",
		location: "./test",
		board: "test-board",
		soc: "test-soc",
		package: "test-package"
	};

	const projects = [
		{
			package: "test-package",
			board: "test-board",
			soc: "test-soc",
			name: "test-project",
			path: "project-test-path/project",
			pluginId: "1",
			pluginVersion: "1",
			pluginConfig: {},
			projects: [
				{
					name: "riscv",
					path: "./riscv"
				}
			],
			platformConfig: {
				ProjectName: "riscv",
				Cflags:
					"-fdump-rtl-expand\n-fdump-rtl-dfinish\n-fdump-ipa-cgraph\n-fstack-usage\n-gdwarf-4"
			}
		}
	];

	it("constructor", () => {
		new CfsPluginManager([...pluginDirs, ...dataModelDirs]);
	});

	it("loadPlugin", async () => {
		const manager = new CfsPluginManager([
			...pluginDirs,
			...dataModelDirs
		]);
		const plugins = await manager.getPluginsInfoList(
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			(cfsPluginInfo: CfsPluginInfo) => {
				return true;
			}
		);
		await CfsPluginManager.loadPlugin(plugins[0]);
	});

	it("generateWorkspace", async () => {
		const manager = new CfsPluginManager([
			...pluginDirs,
			...dataModelDirs
		]);
		await manager.generateWorkspace(dummyWorkspace);
	});

	it("generateWorkspace - projects", async () => {
		const manager = new CfsPluginManager([
			...pluginDirs,
			...dataModelDirs
		]);

		await expect(
			manager.generateWorkspace({
				workspacePluginId: "",
				workspacePluginVersion: "",
				workspaceName: "test-workspace",
				location: "./test",
				board: "test-board",
				soc: "test-soc",
				package: "test-package",
				projects: undefined
			})
		).to.be.rejected;
	});

	it("generateProject", async () => {
		const manager = new CfsPluginManager(pluginDirs);
		await expect(
			manager.generateProject(
				{
					...dummyWorkspace,
					projects
				},
				projects[0].name
			)
		).not.to.be.rejected;
	});

	it("should reject if project name is not found", async () => {
		const manager = new CfsPluginManager(pluginDirs);
		await expect(
			manager.generateProject(
				{
					...dummyWorkspace,
					projects
				},
				"invalid-project-name"
			)
		).to.be.rejected;
	});
});
