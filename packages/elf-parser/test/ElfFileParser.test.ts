/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import { expect } from "chai";
import sinon from "sinon";
import { ElfFileParser } from "../src/ElfFileParser.js";
import * as Enums from "../src/enums.js";
import path from "path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fsPromises } from "fs";

describe("ElfFileParser", () => {
	let elfFileParser: ElfFileParser;
	// Calculate the directory name for the current module
	const __dirname = dirname(fileURLToPath(import.meta.url));
	// Construct the full path to the input file
	const inputFilePath = path.join(__dirname, "data", "input.elf");

	before(() => {});

	beforeEach(() => {
		// Initialize your parser or other test subject here, potentially using the file
		elfFileParser = new ElfFileParser(inputFilePath);
	});

	afterEach(() => {});

	describe("constructor", () => {
		it("should throw error if path is not provided", async () => {
			let dummy;
			expect(() => new ElfFileParser(dummy)).to.throw(Error);
		});

		// Add more tests for other scenarios
	});

	describe("initialize", function () {
		let readFileStub: sinon.SinonStub;

		beforeEach(function () {});

		afterEach(function () {
			// Restore the stub
			readFileStub.restore();
		});

		it("should return INVALID if ELF file is too small", async function () {
			// Stub fs.promises.readFile to resolve with a Buffer instead of an ArrayBuffer
			readFileStub = sinon
				.stub(fsPromises, "readFile")
				.resolves(Buffer.from(new ArrayBuffer(10)));
			const result = await elfFileParser.initialize();
			expect(result).to.equal(Enums.DataResult.INVALID);
		});

		it("should initialize the data model successfully", async function () {
			const result = await elfFileParser.initialize();
			expect(result).not.to.equal(Enums.DataResult.INVALID);
		});

		it("should throw an error if reading the ELF file fails", async function () {
			readFileStub.rejects(new Error("Failed to read file"));
			try {
				await elfFileParser.initialize();
			} catch (error) {
				expect(error.message).to.equal("Failed to read file");
			}
		});
	});

	describe("getDataModel", () => {
		it("should throw an error if the data model is not loaded", function () {
			// Not call initialize method
			expect(() => elfFileParser.getDataModel()).to.throw(
				"ELF Data Model is not loaded. Please ensure 'initialize' method is successfully called before accessing the model.",
			);
		});

		it("should return the data model if it is loaded", async function () {
			// Assuming initialize method successfully loads the data model
			await elfFileParser.initialize(); // This might need to be mocked if initialize has external dependencies
			expect(elfFileParser.getDataModel()).to.not.be.undefined;
		});
	});

	describe("query", () => {
		it("should throw an error for invalid SQL query", async function () {
			await elfFileParser.initialize();
			expect(() => elfFileParser.query("INVALID SQL")).to.throw(Error);
		});

		it("should return empty array if the query does not match any data", async function () {
			await elfFileParser.initialize();
			const result = elfFileParser.query(
				"SELECT * FROM symbols WHERE not_a_column = 'invalid'",
			);
			expect(result).to.be.an("array").that.is.empty;
		});

		it("should return the correct data for a valid query", async function () {
			// Assuming the parser has been initialized and loaded with data
			// And assuming there's a known query that should return a specific result
			await elfFileParser.initialize();
			const expectedResult = { section: "rom_start" }; // Expected result for the query
			const result = elfFileParser.query(
				"SELECT section FROM symbols WHERE section = 'rom_start'",
			);
			result.forEach((item) => {
				expect(item).to.deep.equal(expectedResult);
			});
		});
	});

	describe("dropSymbolsTable()", function () {
		let symbolsTableIdStub: sinon.SinonStub;
		let symbolsModule: any;

		before(async function () {
			// Initialize your new parser or other test subject here, potentially using the file
			elfFileParser = new ElfFileParser(inputFilePath);
		});

		before(async function () {
			elfFileParser = new ElfFileParser(inputFilePath);
			// Dynamically import the module that contains SYMBOLS_TABLE_ID
			symbolsModule = await import("../src/constants/symbols.js");
		});

		it("should not throw an error if the symbols table is already empty", function () {
			expect(() => elfFileParser.dropSymbolsTable()).to.not.throw();
		});
	});

	// Add tests for ElfReader methods
});
