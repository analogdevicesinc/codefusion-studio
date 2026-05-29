import { expect } from "chai";
import type { CfsProject } from "cfs-types";
import { CfsSSPlusProjectGenerator } from "../../../src/generic/components/ssplus/cfs-ssplus-project-generator.js";
import {
	cleanupTempRoot,
	ensureCleanTempPath,
	resolveTempPath
} from "../../utilities/test-helpers.js";

function createProjectContext(
	platformConfig: Record<string, unknown>
): CfsProject {
	return {
		name: "demo-project",
		path: "demo-project",
		soc: "MAX32690",
		package: "WLP",
		id: "core-0",
		pluginId: "adi.mock.plugin",
		pluginVersion: "1.0.0",
		platformConfig
	};
}

describe("CfsSSPlusProjectGenerator", () => {
	afterEach(async () => {
		await cleanupTempRoot();
	});

	it("resolves immediately when SigmaStudio+ project generation is disabled", async () => {
		const generator = new CfsSSPlusProjectGenerator();
		const context = createProjectContext({
			CreateSigmaStudioPlusProject: false
		});

		await generator.generateProject(
			resolveTempPath("ssplus"),
			context
		);
	});

	it("rejects when project generation is enabled but project name is missing", async () => {
		const generator = new CfsSSPlusProjectGenerator();
		const context = createProjectContext({
			CreateSigmaStudioPlusProject: true,
			SigmaStudioPlusPath: "/opt/sigma-studio-plus"
		});

		try {
			await generator.generateProject(
				resolveTempPath("ssplus"),
				context
			);
			expect.fail("Expected missing project name to reject");
		} catch (error) {
			expect((error as Error).message).to.equal(
				"SigmaStudio+ Project Name not set in core configuration"
			);
		}
	});

	it("rejects when project generation is enabled but SigmaStudio+ path is missing", async () => {
		const generator = new CfsSSPlusProjectGenerator();
		const context = createProjectContext({
			CreateSigmaStudioPlusProject: true,
			SigmaStudioPlusProjectName: "demo.ssprj"
		});

		try {
			await generator.generateProject(
				resolveTempPath("ssplus"),
				context
			);
			expect.fail("Expected missing SigmaStudio+ path to reject");
		} catch (error) {
			expect((error as Error).message).to.equal(
				"SigmaStudio+ Installation Path not set in core configuration"
			);
		}
	});

	it("rejects when the SigmaStudio+ console command fails", async () => {
		await ensureCleanTempPath("ssplus", "failed-command");
		const generator = new CfsSSPlusProjectGenerator();
		const context = createProjectContext({
			CreateSigmaStudioPlusProject: true,
			SigmaStudioPlusProjectName: "demo.ssprj",
			SigmaStudioPlusPath: "/path/that/does/not/exist"
		});

		try {
			await generator.generateProject(
				resolveTempPath("ssplus", "failed-command"),
				context
			);
			expect.fail("Expected command execution failure to reject");
		} catch (error) {
			expect(error).to.be.instanceOf(Error);
		}
	});
});
