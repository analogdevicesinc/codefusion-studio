import { expect } from "chai";
import type { CfsFileMap } from "cfs-types";
import { copyFiles } from "../../src/generic/utilities/fs-utils.js";
import {
	cleanupTempRoot,
	ensureCleanTempPath,
	pathExists,
	resolveFixturePath,
	resolveTempPath
} from "./test-helpers.js";

describe("copyFiles utility", () => {
	afterEach(async () => {
		await cleanupTempRoot();
	});

	it("copies files from source patterns to destination paths", async () => {
		await ensureCleanTempPath("copy-files");

		const files: CfsFileMap[] = [
			{
				src: resolveFixturePath("files", "src", "**", "*.c"),
				dst: resolveTempPath("copy-files", "src")
			},
			{
				src: resolveFixturePath("files", "**", "*.md"),
				dst: resolveTempPath("copy-files")
			},
			{
				src: resolveFixturePath("files", "prj.conf"),
				dst: resolveTempPath("copy-files")
			}
		];

		await copyFiles(files, {});

		const outputFiles = [
			resolveTempPath("copy-files", "src", "main.c"),
			resolveTempPath("copy-files", "src", "hello_world.c"),
			resolveTempPath("copy-files", "src", "blinky.c"),
			resolveTempPath("copy-files", "README.md"),
			resolveTempPath("copy-files", "prj.conf")
		];

		for (const outputFile of outputFiles) {
			expect(
				await pathExists(outputFile),
				`${outputFile} was not copied`
			).to.equal(true);
		}
	});

	it("skips files when the condition resolves to false", async () => {
		await ensureCleanTempPath("copy-files", "conditional");

		const files: CfsFileMap[] = [
			{
				src: resolveFixturePath("files", "README.md"),
				dst: resolveTempPath(
					"copy-files",
					"conditional",
					"README.md"
				),
				condition: "${context.copyEnabled === true}"
			}
		];

		await copyFiles(files, { copyEnabled: false });

		expect(
			await pathExists(
				resolveTempPath("copy-files", "conditional", "README.md")
			)
		).to.equal(false);
	});
});
