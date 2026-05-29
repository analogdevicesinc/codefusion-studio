import { expect } from "chai";
import path from "node:path";
import type { CfsFeature, CfsProject } from "cfs-types";
import { CfsEtaProjectGenerator } from "../../../src/generic/components/eta/cfs-eta-project-generator.js";
import {
	cleanupTempRoot,
	ensureCleanTempPath,
	pathExists,
	resolveFixturePath
} from "../../utilities/test-helpers.js";

function createProjectFeature(): CfsFeature {
	return {
		files: [
			{
				src: "files/src/main.c",
				dst: "${context.name}/src/"
			}
		],
		templates: [
			{
				src: "templates/m4/main.c.eta",
				dst: "${context.name}/generated/main.c"
			}
		]
	};
}

function createProjectContext(): CfsProject {
	return {
		name: "demo-project",
		path: "demo-project",
		soc: "MAX32690",
		package: "WLP",
		id: "core-0",
		pluginId: "adi.mock.plugin",
		pluginVersion: "1.0.0",
		platformConfig: {}
	};
}

describe("CfsEtaProjectGenerator", () => {
	afterEach(async () => {
		await cleanupTempRoot();
	});

	it("generates project files and templates from feature mappings", async () => {
		const baseDir = await ensureCleanTempPath("eta-project");
		const generator = new CfsEtaProjectGenerator(
			resolveFixturePath(),
			createProjectFeature()
		);

		await generator.generateProject(baseDir, createProjectContext());

		const copiedFile = path.join(
			baseDir,
			"demo-project",
			"src",
			"main.c"
		);
		const renderedFile = path.join(
			baseDir,
			"demo-project",
			"generated",
			"main.c"
		);

		expect(await pathExists(copiedFile)).to.equal(true);
		expect(await pathExists(renderedFile)).to.equal(true);
	});
});
