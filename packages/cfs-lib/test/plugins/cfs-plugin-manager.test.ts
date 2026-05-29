import { MissingDependencyError } from "../../src/utils/missing-dependency-error.js";
/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import sinon from "sinon";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { CfsPluginManager } from "../../src/plugins/cfs-plugin-manager.js";
import type {
	CfsPluginInfo,
	CfsFeatureScope,
	CfsConfig
} from "cfs-types";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import fs, { promises as fsp } from "node:fs";
import { CfsDataModelManager } from "../../src/index.js";

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
		workspacePluginId: "com.analog.test.dummy.plugin",
		workspacePluginVersion: "1.0.0",
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
			pluginId: "com.analog.test.dummy.plugin",
			pluginVersion: "1.0.0",
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

	const dataModelManagerMock = {
		getDataModel: sinon.stub().resolves(undefined)
	} as unknown as CfsDataModelManager;

	it("constructor", () => {
		new CfsPluginManager(dataModelManagerMock, undefined, {
			pluginsCustomSearchPaths: [...pluginDirs, ...dataModelDirs]
		});
	});

	it("loadPlugin", async () => {
		const manager = new CfsPluginManager(
			dataModelManagerMock,
			undefined,
			{ pluginsCustomSearchPaths: [...pluginDirs, ...dataModelDirs] }
		);
		const plugins = await manager.getPluginsInfoList(
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			(cfsPluginInfo: CfsPluginInfo) => {
				return true;
			}
		);
		await CfsPluginManager.loadPlugin(plugins[0]);
	});

	it("generateWorkspace", async () => {
		const manager = new CfsPluginManager(
			dataModelManagerMock,
			undefined,
			{ pluginsCustomSearchPaths: [...pluginDirs, ...dataModelDirs] }
		);
		await manager.generateWorkspace(dummyWorkspace);
	});

	it("generateWorkspace - projects", async () => {
		const manager = new CfsPluginManager(
			dataModelManagerMock,
			undefined,
			{ pluginsCustomSearchPaths: [...pluginDirs, ...dataModelDirs] }
		);

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
		const manager = new CfsPluginManager(
			dataModelManagerMock,
			undefined,
			{ pluginsCustomSearchPaths: pluginDirs }
		);
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
		const manager = new CfsPluginManager(
			dataModelManagerMock,
			undefined,
			{
				pluginsCustomSearchPaths: pluginDirs
			}
		);
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

	describe("validateConfigPlugins()", () => {
		it("should validate successfully when all plugins exist", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: pluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "TEST_SOC",
				Package: "TEST_PKG",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.dummy.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// Should not throw
			await manager.validateConfigPlugins(config);
		});

		it("should skip externally managed projects", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: pluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "TEST_SOC",
				Package: "TEST_PKG",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.dummy.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					},
					{
						ProjectId: "proj2",
						CoreId: "core2",
						PluginId: "com.nonexistent.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: true // Should be skipped
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// Should not throw because externally managed project is skipped
			await manager.validateConfigPlugins(config);
		});

		it("should throw MissingDependencyError for single missing plugin", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: pluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "TEST_SOC",
				Package: "TEST_PKG",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.nonexistent.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			try {
				await manager.validateConfigPlugins(config);
				expect.fail("Expected MissingDependencyError to be thrown");
			} catch (error) {
				expect(error).to.be.instanceOf(MissingDependencyError);
				const pluginError = error as MissingDependencyError;
				const details = pluginError.details as { plugins: unknown[] };
				expect(details.plugins).to.have.lengthOf(1);
				const plugin0 = details.plugins[0] as Record<string, unknown>;
				expect(plugin0.id).to.equal("com.nonexistent.plugin");
				expect(plugin0.version).to.equal("1.0.0");
				expect(plugin0.availableVersions).to.be.undefined;
			}
		});

		it("should throw MissingDependencyError for multiple missing plugins", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: pluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "TEST_SOC",
				Package: "TEST_PKG",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.nonexistent.plugin.one",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					},
					{
						ProjectId: "proj2",
						CoreId: "core2",
						PluginId: "com.nonexistent.plugin.two",
						PluginVersion: "2.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			try {
				await manager.validateConfigPlugins(config);
				expect.fail("Expected MissingDependencyError to be thrown");
			} catch (error) {
				const pluginError = error as MissingDependencyError;
				expect(pluginError).to.be.instanceOf(MissingDependencyError);
				const details = pluginError.details as { plugins: unknown[] };
				expect(details.plugins).to.have.lengthOf(2);
			}
		});

		it("should deduplicate missing plugins", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: pluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "TEST_SOC",
				Package: "TEST_PKG",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.nonexistent.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					},
					{
						ProjectId: "proj2",
						CoreId: "core2",
						PluginId: "com.nonexistent.plugin", // Same plugin
						PluginVersion: "1.0.0", // Same version
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			try {
				await manager.validateConfigPlugins(config);
				expect.fail("Expected MissingDependencyError to be thrown");
			} catch (error) {
				expect(error).to.be.instanceOf(MissingDependencyError);
				const pluginError = error as MissingDependencyError;
				// Should only report the plugin once
				const details = pluginError.details as { plugins: unknown[] };
				expect(details.plugins).to.have.lengthOf(1);
				const plugin0 = details.plugins[0] as Record<string, unknown>;
				expect(plugin0.id).to.equal("com.nonexistent.plugin");
			}
		});

		it("should include available versions for wrong version", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: pluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "TEST_SOC",
				Package: "TEST_PKG",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.dummy.plugin",
						PluginVersion: "9.9.9", // Wrong version
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			try {
				await manager.validateConfigPlugins(config);
				expect.fail("Expected MissingDependencyError to be thrown");
			} catch (error) {
				const pluginError = error as MissingDependencyError;
				expect(pluginError).to.be.instanceOf(MissingDependencyError);
				const details = pluginError.details as { plugins: unknown[] };
				expect(details.plugins).to.have.lengthOf(1);
				const plugin0 = details.plugins[0] as Record<string, unknown>;
				const availVersions = plugin0.availableVersions as string[];
				expect(availVersions).to.include("1.0.0");
			}
		});

		it("should validate empty projects array successfully", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: pluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "TEST_SOC",
				Package: "TEST_PKG",
				Projects: [],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// Should not throw for empty projects
			await manager.validateConfigPlugins(config);
		});
	});

	describe("plugin not found errors", () => {
		it("should include available versions when specific version not found", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: pluginDirs }
			);
			// Trigger plugin discovery
			await manager.getPluginsInfoList();

			try {
				await manager.getProperties(
					"com.analog.test.dummy.plugin",
					"9.9.9", // non-existent version
					"workspace" as CfsFeatureScope
				);
				expect.fail("Should have thrown an error");
			} catch (error) {
				const pluginError = error as MissingDependencyError;
				expect(pluginError).to.be.instanceOf(MissingDependencyError);
				const details = pluginError.details as {
					plugins?: unknown[];
				};
				if (details.plugins && details.plugins.length > 0) {
					const plugin0 = details.plugins[0] as Record<
						string,
						unknown
					>;
					expect(plugin0.id).to.equal("com.analog.test.dummy.plugin");
					expect(plugin0.version).to.equal("9.9.9");
					const availVersions = plugin0.availableVersions as string[];
					expect(availVersions).to.include("1.0.0");
				}
			}
		});

		it("should indicate no versions when plugin ID not found", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: pluginDirs }
			);
			// Trigger plugin discovery
			await manager.getPluginsInfoList();

			try {
				await manager.getProperties(
					"com.nonexistent.plugin",
					"1.0.0",
					"workspace" as CfsFeatureScope
				);
				expect.fail("Should have thrown an error");
			} catch (error) {
				const pluginError = error as MissingDependencyError;
				expect(pluginError).to.be.instanceOf(MissingDependencyError);
				const details = pluginError.details as {
					plugins?: unknown[];
				};
				expect(details.plugins).to.have.lengthOf(1);
				const plugin0 = (
					details.plugins as Record<string, unknown>[]
				)[0];
				expect(plugin0.id).to.equal("com.nonexistent.plugin");
				// No versions available for a completely unknown plugin — normalized to undefined
				expect(plugin0.availableVersions).to.be.undefined;
			}
		});
	});
});
