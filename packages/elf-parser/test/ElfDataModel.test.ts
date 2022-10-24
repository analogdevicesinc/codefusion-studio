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
import { ElfDataModel } from "../src/ElfDataModel.js";
import { StackData } from "../src/ElfFileParser.js";
import * as Enums from "../src/enums.js";

describe("ElfDataModel", () => {
	let elfDataModel: ElfDataModel;

	beforeEach(() => {
		// Initialize ElfDataModel with necessary parameters
		const dataBuffer = new ArrayBuffer(1024); // Example buffer, adjust as necessary
		let database: any = {};
		let debug: any = false;
		elfDataModel = new ElfDataModel(dataBuffer, debug, database);
	});

	it("should initialize correctly", () => {
		expect(elfDataModel).to.be.an.instanceof(ElfDataModel);
	});

	it("should return invalid when loading stack data with invalid data", async () => {
		const stackData = new StackData();
		// Populate stackData with test data if necessary

		const result = await elfDataModel.load(stackData, false);
		expect(result).to.equal(Enums.DataResult.INVALID);
	});

	it("should throw an error if data buffer is too small", () => {
		const smallBuffer = new ArrayBuffer(0); // Example of a small buffer
		let database: any = {};
		let debug: any = false;
		expect(() => new ElfDataModel(smallBuffer, debug, database)).to.throw(
			Error,
		);
	});

	// Valid data validation done in ElfFileParser.test.ts

	describe("getNumOf", () => {
		beforeEach(() => {
			// Mock data for elfHeader and elfSymbols
			const mockElfHeader = {
				programHeaderEntryCount: 5,
				sectionHeaderEntryCount: 10,
				magicNumber: "\x7FELF",
			};

			const mockElfSymbols = [
				{ name: "symbol1" },
				{ name: "symbol2" },
				{ name: "symbol3" },
			];

			(elfDataModel as any).elfHeader = mockElfHeader;
			(elfDataModel as any).elfSymbols = mockElfSymbols;
		});

		it("should return the correct number of program header tables", () => {
			const result = elfDataModel.getNumOfProgramHeaderTables();
			expect(result).to.equal(5);
		});

		it("should return the correct number of section header tables", () => {
			const result = elfDataModel.getNumOfSectionHeaderTables();
			expect(result).to.equal(10);
		});

		it("should return the correct number of symbol tables", () => {
			const result = elfDataModel.getNumOfSymbolTables();
			expect(result).to.equal(3);
		});
	});
});
