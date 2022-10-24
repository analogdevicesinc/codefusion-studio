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
import { ElfSectionHeader } from "../src/ElfSectionHeader.js";
import { ElfFileData } from "../src/ElfFileData.js";
import { ElfDataModel } from "../src/ElfDataModel.js";
import { ElfHeader } from "../src/ElfHeader.js";

describe("ElfSectionHeader", () => {
	let elfSectionHeader: ElfSectionHeader;
	let elfDataModel: ElfDataModel;
	let fileData: ElfFileData;
	let database: any = {};
	let debug: any = false;

	beforeEach(() => {
		// Ensure these classes are instantiated correctly
		elfDataModel = new ElfDataModel(new ArrayBuffer(50), debug, database);
		fileData = new ElfFileData(new ArrayBuffer(50));
		elfSectionHeader = new ElfSectionHeader(0, fileData, elfDataModel);
	});

	describe("constructor", () => {
		it("should initialize with given parameters", () => {
			expect(elfSectionHeader.index).to.equal(0);
		});
	});

	// Valid data verified on a real ELF file
});
