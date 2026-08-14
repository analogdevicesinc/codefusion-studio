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

	it("getPluginsInfoList returns plugins sorted alphabetically by name", async () => {
		const manager = new CfsPluginManager(
			dataModelManagerMock,
			undefined,
			{ pluginsCustomSearchPaths: [...pluginDirs, ...dataModelDirs] }
		);

		const result = await manager.getPluginsInfoList();

		// If we have multiple plugins, verify they are sorted
		if (result.length > 1) {
			for (let i = 0; i < result.length - 1; i++) {
				const currentName = result[i].pluginName;
				const nextName = result[i + 1].pluginName;
				const comparisonResult = currentName.localeCompare(nextName);

				expect(comparisonResult).to.be.lessThanOrEqual(
					0,
					`Plugin "${currentName}" should come before or equal to "${nextName}"`
				);
			}
		}
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

	it("generateProject resolves project by ProjectName and generates into ProjectName folder", async () => {
		const manager = new CfsPluginManager(
			dataModelManagerMock,
			undefined,
			{ pluginsCustomSearchPaths: pluginDirs }
		);

		const generateProjectSpy = sinon.spy();
		const loadPluginStub = sinon
			.stub(CfsPluginManager, "loadPlugin")
			.resolves({
				generateProject: generateProjectSpy
			});

		try {
			// Use ProjectName ("riscv") to look up the project whose
			// display name is "test-project"
			await manager.generateProject(
				{
					...dummyWorkspace,
					projects
				},
				projects[0].platformConfig.ProjectName
			);

			expect(generateProjectSpy.calledOnce).to.be.true;

			const baseDirArg = generateProjectSpy.firstCall
				.args[0] as string;
			const projectArg = generateProjectSpy.firstCall
				.args[1] as (typeof projects)[0];

			// baseDir must end with the ProjectName folder, not the display name
			expect(baseDirArg).to.include(
				projects[0].platformConfig.ProjectName
			);
			expect(baseDirArg).to.not.include(projects[0].name);

			// The correct project should have been selected
			expect(projectArg.name).to.equal(projects[0].name);
		} finally {
			loadPluginStub.restore();
		}
	});

	it("generateProject falls back to project.name when ProjectName is missing", async () => {
		const manager = new CfsPluginManager(
			dataModelManagerMock,
			undefined,
			{ pluginsCustomSearchPaths: pluginDirs }
		);

		const generateProjectSpy = sinon.spy();
		const loadPluginStub = sinon
			.stub(CfsPluginManager, "loadPlugin")
			.resolves({
				generateProject: generateProjectSpy
			});

		const projectsWithoutProjectName = [
			{
				...projects[0],
				platformConfig: {
					Cflags: projects[0].platformConfig.Cflags
					// ProjectName intentionally omitted
				}
			}
		];

		try {
			await manager.generateProject(
				{
					...dummyWorkspace,
					projects: projectsWithoutProjectName
				},
				projectsWithoutProjectName[0].name
			);

			expect(generateProjectSpy.calledOnce).to.be.true;

			const baseDirArg = generateProjectSpy.firstCall
				.args[0] as string;

			// baseDir must use the display name as fallback
			expect(baseDirArg).to.include(
				projectsWithoutProjectName[0].name
			);
		} finally {
			loadPluginStub.restore();
		}
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

	describe("SoC-aware plugin resolution", () => {
		// Single fixture with multiple supportedSocs entries:
		//   {name: "max32690", board: "EvKit_V1", package: "WLP"}
		//   {name: "max32655", board: "EvKit_V1", package: "WLP"}
		//   {name: "max32690", package: "BGA"}               (no board)
		//   {name: "max32690", board: "EvKit_V1", package: "TQFN"}
		const socPluginDirs = [
			path.join(
				dirname(fileURLToPath(import.meta.url)),
				"dummyPluginSocAware"
			)
		];

		it("should resolve correct plugin when SoC context matches", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);

			const allPlugins = await manager.getPluginsInfoList();
			const socPlugins = allPlugins.filter(
				(p) => p.pluginId === "com.analog.test.soc.plugin"
			);
			expect(socPlugins).to.have.lengthOf(1);

			const config = {
				Soc: "max32690",
				Package: "WLP",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.soc.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// Should succeed: plugin has a supportedSocs entry for max32690
			await manager.validateConfigPlugins(config, {
				name: "max32690",
				package: "WLP"
			});
		});

		it("should reject when SoC context does not match any plugin", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "max32670",
				Package: "TQFN",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.soc.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// Should throw: no supportedSocs entry for max32670
			try {
				await manager.validateConfigPlugins(config, {
					name: "max32670",
					package: "TQFN"
				});
				expect.fail(
					"Expected MissingDependencyError to be thrown"
				);
			} catch (error) {
				expect(error).to.be.instanceOf(MissingDependencyError);
			}
		});

		it("should not fall back to unfiltered results when SoC is provided", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "max32670",
				Package: "TQFN",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.soc.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			try {
				await manager.validateConfigPlugins(config, {
					name: "max32670"
				});
				expect.fail(
					"Expected MissingDependencyError — should not fall back"
				);
			} catch (error) {
				expect(error).to.be.instanceOf(MissingDependencyError);
				const pluginError = error as MissingDependencyError;
				const details = pluginError.details as {
					plugins: unknown[];
				};
				expect(details.plugins).to.have.lengthOf(1);
			}
		});

		it("should match SoC name case-insensitively", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "MAX32690",
				Package: "WLP",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.soc.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// Should succeed with uppercase SoC name
			await manager.validateConfigPlugins(config, {
				name: "MAX32690",
				package: "wlp"
			});
		});

		it("should resolve without SoC context for backward compatibility", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "max32690",
				Package: "WLP",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.soc.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// Without SoC context, should resolve (backward compat)
			await manager.validateConfigPlugins(config);
		});

		it("should match a no-board entry when only package is specified", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "max32690",
				Package: "BGA",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.soc.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// The BGA entry has no board — should match with package only
			await manager.validateConfigPlugins(config, {
				name: "max32690",
				package: "BGA"
			});
		});

		it("should match a no-board entry when a board is specified", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "max32690",
				Package: "BGA",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.soc.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// The BGA entry has no board, but it should still match when
			// the context specifies a board
			await manager.validateConfigPlugins(config, {
				name: "max32690",
				package: "BGA",
				board: "EvKit_V1"
			});
		});

		it("should match a board-specified entry when that board is queried", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "max32690",
				Package: "TQFN",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.soc.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// The TQFN entry has board "EvKit_V1" — should match exact board
			await manager.validateConfigPlugins(config, {
				name: "max32690",
				package: "TQFN",
				board: "EvKit_V1"
			});
		});

		it("should match a board-specified entry when board is undefined", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "max32690",
				Package: "TQFN",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.soc.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// The TQFN entry has board "EvKit_V1" — should also match when
			// only the package is specified (board undefined)
			await manager.validateConfigPlugins(config, {
				name: "max32690",
				package: "TQFN"
			});
		});

		it("should match MAX32675C plugin declaring TQFN when LGA is requested", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "MAX32675C",
				Package: "LGA",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId: "com.analog.test.soc.plugin",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// Backward compatibility: LGA request should resolve against TQFN declaration
			await manager.validateConfigPlugins(config, {
				name: "MAX32675C",
				package: "LGA"
			});
		});
	});

	describe("Multi-version SoC-aware plugin resolution", () => {
		// Three versions of the same plugin:
		//   v1.0.0 supports max32690/EvKit_V1/WLP
		//   v1.1.0 supports max32690/EvKit_V1/WLP
		//   v2.0.0 supports max32655/EvKit_V1/WLP
		const multiVersionDirs = [
			path.join(
				dirname(fileURLToPath(import.meta.url)),
				"dummyPluginSocMultiVersion"
			)
		];

		it("should resolve highest compatible version when newest version targets a different SoC", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: multiVersionDirs }
			);

			// v2.0.0 is the globally newest but only supports max32655.
			// For max32690, the resolver should skip v2.0.0 and pick
			// v1.1.0 (highest among the two compatible versions).
			const resolved = await manager.resolvePlugin(
				"com.analog.test.soc.multiversion",
				undefined,
				{ name: "max32690", package: "WLP", board: "EvKit_V1" }
			);

			expect(resolved).to.exist;
			expect(resolved?.pluginVersion).to.equal("1.1.0");
		});

		it("should resolve newer version when its SoC context matches", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: multiVersionDirs }
			);

			const resolved = await manager.resolvePlugin(
				"com.analog.test.soc.multiversion",
				undefined,
				{ name: "max32655", package: "WLP", board: "EvKit_V1" }
			);

			expect(resolved).to.exist;
			expect(resolved?.pluginVersion).to.equal("2.0.0");
		});

		it("should resolve newest version when no SoC context is provided", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: multiVersionDirs }
			);

			const resolved = await manager.resolvePlugin(
				"com.analog.test.soc.multiversion"
			);

			expect(resolved).to.exist;
			expect(resolved?.pluginVersion).to.equal("2.0.0");
		});

		it("should return undefined when no version matches the SoC context", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: multiVersionDirs }
			);

			const resolved = await manager.resolvePlugin(
				"com.analog.test.soc.multiversion",
				undefined,
				{ name: "max32670", package: "TQFN" }
			);

			expect(resolved).to.be.undefined;
		});

		it("should resolve via semver range independently of SoC filter", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: multiVersionDirs }
			);

			// Both v1.0.0 and v1.1.0 match the max32690 SoC context.
			// The range ^1.0.0 matches 1.x but not 2.x, so it must
			// pick v1.1.0 — proving the range selects the highest
			// match within the SoC-filtered candidates.
			const resolved = await manager.resolvePlugin(
				"com.analog.test.soc.multiversion",
				"^1.0.0",
				{ name: "max32690", package: "WLP", board: "EvKit_V1" }
			);

			expect(resolved).to.exist;
			expect(resolved?.pluginVersion).to.equal("1.1.0");
		});

		it("should validate config with older compatible version", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: multiVersionDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "max32690",
				Package: "WLP",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId:
							"com.analog.test.soc.multiversion",
						PluginVersion: "1.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// v1.0.0 supports max32690 — should succeed
			await manager.validateConfigPlugins(config, {
				name: "max32690",
				package: "WLP",
				board: "EvKit_V1"
			});
		});

		it("should reject newer version when it does not match SoC context", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: multiVersionDirs }
			);
			await manager.getPluginsInfoList();

			const config = {
				Soc: "max32690",
				Package: "WLP",
				Projects: [
					{
						ProjectId: "proj1",
						CoreId: "core1",
						PluginId:
							"com.analog.test.soc.multiversion",
						PluginVersion: "2.0.0",
						ExternallyManaged: false
					}
				],
				Pins: [],
				ClockNodes: []
			} as unknown as CfsConfig;

			// v2.0.0 only supports max32655 — should fail for max32690
			try {
				await manager.validateConfigPlugins(config, {
					name: "max32690",
					package: "WLP",
					board: "EvKit_V1"
				});
				expect.fail(
					"Expected MissingDependencyError to be thrown"
				);
			} catch (error) {
				expect(error).to.be.instanceOf(
					MissingDependencyError
				);
			}
		});
	});

	describe("Project vs workspace plugin board resolution", () => {
		const socPluginDirs = [
			path.join(
				dirname(fileURLToPath(import.meta.url)),
				"dummyPluginSocAware"
			)
		];

		it("should resolve project plugin regardless of board (board not in context)", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);

			// Project plugin resolution: SoC + package only, no board
			const resolved = await manager.resolvePlugin(
				"com.analog.test.soc.plugin",
				undefined,
				{ name: "max32690", package: "WLP" }
			);

			expect(resolved).to.exist;
			expect(resolved?.pluginVersion).to.equal("1.0.0");
		});

		it("should resolve workspace plugin when board matches", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);

			// Workspace plugin resolution: SoC + package + board
			const resolved = await manager.resolvePlugin(
				"com.analog.test.soc.plugin",
				undefined,
				{ name: "max32690", package: "WLP", board: "EvKit_V1" }
			);

			expect(resolved).to.exist;
			expect(resolved?.pluginVersion).to.equal("1.0.0");
		});

		it("should NOT resolve workspace plugin when board does not match", async () => {
			const manager = new CfsPluginManager(
				dataModelManagerMock,
				undefined,
				{ pluginsCustomSearchPaths: socPluginDirs }
			);

			// Workspace plugin resolution with wrong board
			const resolved = await manager.resolvePlugin(
				"com.analog.test.soc.plugin",
				undefined,
				{ name: "max32690", package: "WLP", board: "NonExistentBoard" }
			);

			expect(resolved).to.be.undefined;
		});
	});
});
