import { expect } from "chai";
import path from "node:path";
import type {
	CfsConfig,
	CfsFeature,
	CfsProject,
	CfsWorkspace,
	ConfiguredProject,
	CfsPluginInfo
} from "cfs-types";
import { GenericPlugin } from "../src/generic/cfs-generic-plugin.js";
import { createMockPluginInfo } from "./fixtures/mock-plugin-info.js";
import {
	cleanupTempRoot,
	ensureCleanTempPath,
	pathExists,
	resolveTempPath
} from "./utilities/test-helpers.js";

function createFeature(): CfsFeature {
	return {
		files: [],
		templates: []
	};
}

function createWorkspace(): CfsWorkspace {
	return {
		workspaceName: "generic-plugin-workspace",
		location: resolveTempPath("generic-plugin", "workspace"),
		board: "max32690evkit",
		soc: "max32690",
		package: "WLP"
	};
}

function createProjectContext(): CfsProject {
	return {
		name: "generic-plugin-project",
		path: "generic-plugin-project",
		soc: "MAX32690",
		package: "WLP",
		id: "core-0",
		pluginId: "adi.mock.plugin",
		pluginVersion: "1.0.0",
		platformConfig: {}
	};
}

function createConfiguredProject(): ConfiguredProject {
	return {
		CoreId: "CM4",
		ProjectId: "project-1",
		FirmwarePlatform: "msdk",
		ExternallyManaged: false,
		Partitions: [],
		Peripherals: [],
		PluginId: "adi.mock.plugin",
		PluginVersion: "1.0.0",
		PlatformConfig: {
			ProjectName: "generic-project"
		}
	};
}

function createCfsConfig(): CfsConfig {
	return {
		Copyright: "",
		DataModelVersion: "0.0.0",
		Soc: "MAX78000",
		Package: "WLP",
		Pins: [],
		ClockNodes: [],
		Timestamp: new Date().toISOString(),
		BoardName: "GenericBoard",
		Projects: [createConfiguredProject()]
	};
}

describe("GenericPlugin", () => {
	afterEach(async () => {
		await cleanupTempRoot();
	});

	it("throws when calling an unsupported generation service", async () => {
		const plugin = new GenericPlugin(createMockPluginInfo());

		try {
			await plugin.generateWorkspace(createWorkspace());
			expect.fail("Expected workspace generation call to reject");
		} catch (error) {
			expect((error as Error).message).to.equal(
				"Plugin adi.mock.plugin does not support workspace generation"
			);
		}
	});

	it("delegates workspace generation when workspace feature exists", async () => {
		await ensureCleanTempPath("generic-plugin", "workspace");
		const plugin = new GenericPlugin(
			createMockPluginInfo({
				features: {
					workspace: createFeature()
				} as unknown as CfsPluginInfo["features"]
			})
		);
		const workspace = createWorkspace();

		await plugin.generateWorkspace(workspace);

		const cfsWorkspaceFile = path.join(
			workspace.location,
			workspace.workspaceName,
			".cfs",
			".cfsworkspace"
		);
		expect(await pathExists(cfsWorkspaceFile)).to.equal(true);
	});

	it("delegates project and config services when project feature exists", async () => {
		await ensureCleanTempPath("generic-plugin", "project");
		const plugin = new GenericPlugin(
			createMockPluginInfo({
				features: {
					project: createFeature()
				} as unknown as CfsPluginInfo["features"]
			})
		);

		const projectDir = resolveTempPath("generic-plugin", "project");
		const projectContext = createProjectContext();
		const configuredProject = createConfiguredProject();
		const cfsConfig = createCfsConfig();

		await plugin.generateProject(projectDir, projectContext);
		expect(
			await plugin.configureProject("MAX78000", configuredProject)
		).to.deep.equal(configuredProject);
		expect(await plugin.configureSystem(cfsConfig)).to.deep.equal(
			cfsConfig
		);
	});

	it("delegates code generation when codegen feature exists", async () => {
		await ensureCleanTempPath("generic-plugin", "codegen");
		const plugin = new GenericPlugin(
			createMockPluginInfo({
				features: {
					codegen: createFeature()
				} as unknown as CfsPluginInfo["features"]
			})
		);
		const generatedFiles = await plugin.generateCode(
			{
				projectId: "project-1",
				cfsconfig: createCfsConfig()
			},
			resolveTempPath("generic-plugin", "codegen")
		);
		expect(generatedFiles).to.deep.equal([]);
	});
});
