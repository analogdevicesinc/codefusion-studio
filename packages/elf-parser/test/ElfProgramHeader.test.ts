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
import { ElfProgramHeader } from "../src/ElfProgramHeader.js";
import { ElfFileData } from "../src/ElfFileData.js";
import { ElfDataModel } from "../src/ElfDataModel.js";
import { ElfHeader } from "../src/ElfHeader.js";
import * as Enums from "../src/enums.js";
import { ResolveItem } from "../src/ResolveItem.js";

describe("ElfProgramHeader", () => {
	let elfProgramHeader: ElfProgramHeader;
	let elfDataModel: ElfDataModel;
	let fileData: ElfFileData;
	let elfHeader: ElfHeader;
	let database: any = {};
	let debug: any = false;

	before(() => {
		// Initialize any necessary objects or variables here
	});

	beforeEach(async () => {
		elfDataModel = new ElfDataModel(new ArrayBuffer(50), debug, database);
		fileData = new ElfFileData(new ArrayBuffer(50));
		elfHeader = new ElfHeader(fileData);
		elfProgramHeader = new ElfProgramHeader(elfDataModel, 0, fileData);
	});

	describe("constructor", () => {
		it("should initialize with given parameters", () => {
			expect(elfProgramHeader.index).to.equal(0);
			expect(elfProgramHeader.sectionIndexList).to.be.an("array").that.is.empty;
		});
	});

	describe("load", () => {
		let resolveItemStub: sinon.SinonStub;

		afterEach(() => {
			sinon.restore();
		});

		it("should load 64-bit ELF header correctly", () => {
			sinon.stub(elfHeader, "isELF64Bit").returns(true);
			resolveItemStub = sinon.stub(ResolveItem, "Get32BitValue");
			resolveItemStub
				.withArgs(fileData, sinon.match.any, 4)
				.returns(Enums.ph_type.PT_LOAD);
			sinon
				.stub(ResolveItem, "Get64BitValue")
				.withArgs(fileData, sinon.match.any, 8)
				.returns(BigInt(0));

			elfProgramHeader.load(0, elfHeader);

			// Expect the righ order of the fields
			expect(elfProgramHeader.type).to.equal(Enums.ph_type.PT_LOAD);
			expect(elfProgramHeader.flags).to.equal(1);
			expect(elfProgramHeader.offset).to.equal(BigInt(0));
			expect(elfProgramHeader.virtualAddress).to.equal(BigInt(0));
			expect(elfProgramHeader.physicalAddress).to.equal(BigInt(0));
			expect(elfProgramHeader.fileSize).to.equal(BigInt(0));
			expect(elfProgramHeader.memorySize).to.equal(BigInt(0));
			expect(elfProgramHeader.alignment).to.equal(BigInt(0));
		});

		it("should load 32-bit ELF header correctly", () => {
			sinon.stub(elfHeader, "isELF64Bit").returns(false);
			resolveItemStub = sinon.stub(ResolveItem, "Get32BitValue");
			resolveItemStub
				.withArgs(fileData, sinon.match.any, 4)
				.returns(Enums.ph_type.PT_LOAD);
			sinon
				.stub(ResolveItem, "Get64BitValue")
				.withArgs(fileData, sinon.match.any, 4)
				.returns(BigInt(0));

			elfProgramHeader.load(0, elfHeader);

			// Expect the righ order of the fields
			expect(elfProgramHeader.type).to.equal(Enums.ph_type.PT_LOAD);
			expect(elfProgramHeader.offset).to.equal(BigInt(0));
			expect(elfProgramHeader.virtualAddress).to.equal(BigInt(0));
			expect(elfProgramHeader.physicalAddress).to.equal(BigInt(0));
			expect(elfProgramHeader.fileSize).to.equal(BigInt(0));
			expect(elfProgramHeader.memorySize).to.equal(BigInt(0));
			expect(elfProgramHeader.flags).to.equal(1);
			expect(elfProgramHeader.alignment).to.equal(BigInt(0));
		});
	});
});
