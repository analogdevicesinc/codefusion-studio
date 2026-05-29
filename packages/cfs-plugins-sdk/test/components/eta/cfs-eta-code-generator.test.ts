import { expect } from "chai";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CfsConfig, CfsFeature } from "cfs-types";
import { CfsEtaCodeGenerator } from "../../../src/generic/components/eta/cfs-eta-code-generator.js";
import {
	cleanupTempRoot,
	ensureCleanTempPath,
	pathExists,
	resolveFixturePath,
	resolveTempPath
} from "../../utilities/test-helpers.js";

function createCodegenFeature(): CfsFeature {
	return {
		files: [
			{
				src: "files/prj.conf",
				dst: "${context.projectId}/config/"
			}
		],
		templates: [
			{
				src: "templates/m4/main.c.eta",
				dst: "${context.projectId}/src/main.c"
			}
		]
	};
}

function createCfsConfig(
	projectId: string,
	projectName: string
): CfsConfig {
	return {
		Copyright: "",
		DataModelVersion: "0.0.0",
		Soc: "MAX32690",
		Package: "WLP",
		Pins: [],
		ClockNodes: [],
		Timestamp: new Date().toISOString(),
		BoardName: "DemoBoard",
		Projects: [
			{
				CoreId: "CM4",
				ProjectId: projectId,
				FirmwarePlatform: "msdk",
				ExternallyManaged: false,
				Partitions: [],
				Peripherals: [],
				PluginId: "adi.mock.plugin",
				PluginVersion: "1.0.0",
				PlatformConfig: {
					ProjectName: projectName
				}
			}
		]
	};
}

describe("CfsEtaCodeGenerator", () => {
	afterEach(async () => {
		await cleanupTempRoot();
	});

	it("copies files and renders templates for the selected project", async () => {
		const baseDir = await ensureCleanTempPath("eta-codegen");
		const generator = new CfsEtaCodeGenerator(
			resolveFixturePath(),
			createCodegenFeature()
		);

		const generatedFiles = await generator.generateCode(
			{
				projectId: "project-1",
				cfsconfig: createCfsConfig("project-1", "demo-project"),
				soc: "MAX32690"
			},
			baseDir
		);

		const copiedFile = path.join(
			baseDir,
			"demo-project",
			"project-1",
			"config",
			"prj.conf"
		);
		const renderedFile = path.join(
			baseDir,
			"demo-project",
			"project-1",
			"src",
			"main.c"
		);

		const toForwardSlash = (p: string) => p.replace(/\\/g, "/");

		expect(await pathExists(copiedFile)).to.equal(true);
		expect(await pathExists(renderedFile)).to.equal(true);
		expect(generatedFiles.map(toForwardSlash)).to.deep.equal([
			toForwardSlash(renderedFile)
		]);
		expect(await fs.readFile(renderedFile, "utf8")).to.contain(
			"Hello, World!"
		);
	});

	it("throws when the project id does not exist in cfsconfig", async () => {
		const baseDir = await ensureCleanTempPath(
			"eta-codegen",
			"missing-project"
		);
		const generator = new CfsEtaCodeGenerator(
			resolveFixturePath(),
			createCodegenFeature()
		);

		try {
			await generator.generateCode(
				{
					projectId: "missing-project",
					cfsconfig: createCfsConfig("project-1", "demo-project")
				},
				baseDir
			);
			expect.fail(
				"Expected generateCode to throw when project id is missing"
			);
		} catch (error) {
			expect((error as Error).message).to.contain(
				"Project with ID missing-project not found in cfsconfig"
			);
		}
	});
});
