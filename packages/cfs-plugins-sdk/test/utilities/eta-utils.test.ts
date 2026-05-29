import { expect } from "chai";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CfsFileMap } from "cfs-types";
import { renderTemplates } from "../../src/generic/utilities/eta-utils.js";
import {
	cleanupTempRoot,
	ensureCleanTempPath,
	pathExists,
	resolveFixturePath,
	resolveTempPath
} from "./test-helpers.js";

describe("renderTemplates utility", () => {
	afterEach(async () => {
		await cleanupTempRoot();
	});

	it("renders template files from cfs plugin mappings", async () => {
		await ensureCleanTempPath("render-templates");

		const m4OutputDirectory = resolveTempPath(
			"render-templates",
			"MAX32xxx",
			"m4"
		);
		const riscvOutputDirectory = resolveTempPath(
			"render-templates",
			"MAX32xxx",
			"riscv"
		);

		const templates: CfsFileMap[] = [
			{
				src: "templates/m4/**/*.eta",
				dst: `${m4OutputDirectory}/`
			},
			{
				src: "templates/riscv/main.c.eta",
				dst: `${riscvOutputDirectory}/`
			}
		];

		await renderTemplates(
			templates,
			{ soc: "MAX32690" },
			resolveFixturePath()
		);

		const m4GeneratedFile = path.join(m4OutputDirectory, "main.c");
		const riscvGeneratedFile = path.join(
			riscvOutputDirectory,
			"main.c"
		);

		expect(await pathExists(m4GeneratedFile)).to.equal(true);
		expect(await pathExists(riscvGeneratedFile)).to.equal(true);

		const expectedM4Contents = await fs.readFile(
			resolveFixturePath("templates", "m4", "main.c.eta"),
			"utf8"
		);
		const expectedRiscvContents = await fs.readFile(
			resolveFixturePath("templates", "riscv", "main.c.eta"),
			"utf8"
		);

		const generatedM4Contents = await fs.readFile(
			m4GeneratedFile,
			"utf8"
		);
		const generatedRiscvContents = await fs.readFile(
			riscvGeneratedFile,
			"utf8"
		);

		const normalizeLF = (s: string) => s.replace(/\r\n/g, "\n");

		expect(normalizeLF(generatedM4Contents)).to.equal(
			normalizeLF(expectedM4Contents)
		);
		expect(normalizeLF(generatedRiscvContents)).to.equal(
			normalizeLF(expectedRiscvContents)
		);
	});

	it("skips templates whose condition resolves to false", async () => {
		await ensureCleanTempPath("render-templates", "conditional");

		const outputDirectory = resolveTempPath(
			"render-templates",
			"conditional"
		);
		const templates: CfsFileMap[] = [
			{
				src: "templates/m4/main.c.eta",
				dst: path.join(outputDirectory, "skipped.c"),
				condition: "${context.includeTemplate === false}"
			},
			{
				src: "templates/m4/main.c.eta",
				dst: path.join(outputDirectory, "included.c"),
				condition: "${context.includeTemplate === true}"
			}
		];

		await renderTemplates(
			templates,
			{ includeTemplate: true },
			resolveFixturePath()
		);

		expect(
			await pathExists(path.join(outputDirectory, "included.c"))
		).to.equal(true);
		expect(
			await pathExists(path.join(outputDirectory, "skipped.c"))
		).to.equal(false);
	});
});
