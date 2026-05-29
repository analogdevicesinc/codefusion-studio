import { expect } from "chai";
import {
	convertToPascalCase,
	evalNestedTemplateLiterals,
	isDir,
	titleCase
} from "../../src/generic/utilities/cfs-utilities.js";

describe("cfs utility helpers", () => {
	describe("evalNestedTemplateLiterals", () => {
		it("evaluates templates using the provided context", () => {
			expect(
				evalNestedTemplateLiterals(
					"${context.soc}-${context.package}",
					{
						soc: "max32690",
						package: "wlp"
					}
				)
			).to.equal("max32690-wlp");

			expect(
				evalNestedTemplateLiterals("${context.project.name}", {
					project: { name: "demo" }
				})
			).to.equal("demo");
		});

		it("returns the literal string undefined for missing values", () => {
			expect(
				evalNestedTemplateLiterals("${context.missingValue}", {})
			).to.equal("undefined");
		});
	});

	describe("titleCase", () => {
		it("capitalizes each word in a string", () => {
			expect(titleCase("hello world")).to.equal("Hello World");
			expect(titleCase("single")).to.equal("Single");
			expect(titleCase("")).to.equal("");
		});
	});

	describe("convertToPascalCase", () => {
		it("converts keys recursively for nested objects and arrays", () => {
			const converted = convertToPascalCase({
				"project name": "demo",
				nested: {
					"clock node": "sysclk"
				},
				list: [{ "core id": "cm4" }, "raw", 1],
				nullable: null
			});

			expect(converted).to.deep.equal({
				"Project Name": "demo",
				Nested: {
					"Clock Node": "sysclk"
				},
				List: [{ "Core Id": "cm4" }, "raw", 1],
				Nullable: null
			});
		});
	});

	describe("isDir", () => {
		it("returns true only for directory-like paths", () => {
			expect(isDir("path/to/folder/")).to.equal(true);
			expect(isDir("path\\to\\folder\\")).to.equal(true);
			expect(isDir("path/to/file.txt")).to.equal(false);
			expect(isDir("path/to/folder")).to.equal(false);
		});
	});
});
