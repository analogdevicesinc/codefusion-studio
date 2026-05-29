import { expect } from "chai";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CfsFeature, CfsWorkspace } from "cfs-types";
import { CfsEtaWorkspaceGenerator } from "../../../src/generic/components/eta/cfs-eta-workspace-generator.js";
import {
	cleanupTempRoot,
	ensureCleanTempPath,
	pathExists,
	resolveFixturePath,
	resolveTempPath
} from "../../utilities/test-helpers.js";

function createWorkspaceFeature(): CfsFeature {
	return {
		files: [
			{
				src: "files/README.md",
				dst: "README.md"
			}
		],
		templates: [
			{
				src: "templates/m4/main.c.eta",
				dst: "src/main.c"
			}
		]
	};
}

function createWorkspace(): CfsWorkspace {
	return {
		workspaceName: "demo-workspace",
		location: resolveTempPath("workspace-root"),
		board: "max32690evkit",
		soc: "max32690",
		package: "WLP"
	};
}

describe("CfsEtaWorkspaceGenerator", () => {
	afterEach(async () => {
		await cleanupTempRoot();
	});

	it("creates workspace structure, metadata file, and generated files", async () => {
		await ensureCleanTempPath("workspace-root");
		const workspace = createWorkspace();
		const generator = new CfsEtaWorkspaceGenerator(
			resolveFixturePath(),
			createWorkspaceFeature()
		);

		await generator.generateWorkspace(workspace);

		const workspaceRoot = path.join(
			workspace.location,
			workspace.workspaceName
		);
		const cfsWorkspaceFile = path.join(
			workspaceRoot,
			".cfs",
			".cfsworkspace"
		);
		const copiedFile = path.join(workspaceRoot, "README.md");
		const renderedFile = path.join(workspaceRoot, "src", "main.c");

		expect(await pathExists(cfsWorkspaceFile)).to.equal(true);
		expect(await pathExists(copiedFile)).to.equal(true);
		expect(await pathExists(renderedFile)).to.equal(true);

		const workspaceMetadata = JSON.parse(
			await fs.readFile(cfsWorkspaceFile, "utf8")
		) as Record<string, unknown>;
		expect(workspaceMetadata.WorkspaceName).to.equal(
			"demo-workspace"
		);
	});

	it("throws when workspace location is undefined", async () => {
		const generator = new CfsEtaWorkspaceGenerator(
			resolveFixturePath(),
			createWorkspaceFeature()
		);
		const invalidWorkspace = {
			...createWorkspace(),
			location: undefined
		} as unknown as CfsWorkspace;

		try {
			await generator.generateWorkspace(invalidWorkspace);
			expect.fail(
				"Expected generateWorkspace to throw for undefined location"
			);
		} catch (error) {
			expect((error as Error).message).to.equal(
				"Workspace location is undefined"
			);
		}
	});
});
