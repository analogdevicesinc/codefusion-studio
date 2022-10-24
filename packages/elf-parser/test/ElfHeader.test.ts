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
import { ElfHeader } from "../src/ElfHeader.js";
import * as Enums from "../src/enums.js";
import { ElfFileData } from "../src/ElfFileData.js";
import { ResolveItem } from "../src/ResolveItem.js";

describe("ElfHeader", () => {
	let mockFileAccess: ElfFileData;
	let elfHeader: ElfHeader;

	beforeEach(() => {});

	describe("isELF64Bit", () => {
		beforeEach(() => {
			mockFileAccess = {
				getDataView: () => new DataView(new ArrayBuffer(64)),
				readNullTerminatedString: (offset: number, size: number) => "ELF",
				setLittleEndian: (isLittleEndian: boolean) => {},
			} as ElfFileData;

			elfHeader = new ElfHeader(mockFileAccess);
		});

		it("should return true if classType is ELFCLASS64", () => {
			elfHeader.classType = Enums.EI_CLASS.ELFCLASS64;
			expect(elfHeader.isELF64Bit()).to.be.true;
		});

		it("should return false if classType is not ELFCLASS64", () => {
			elfHeader.classType = Enums.EI_CLASS.ELFCLASS32;
			expect(elfHeader.isELF64Bit()).to.be.false;
		});
	});

	describe("load", () => {
		it("should return INVALID if file size is less than ELF_HEADER_SIZE", () => {
			mockFileAccess.getDataView = () => new DataView(new ArrayBuffer(10));
			elfHeader = new ElfHeader(mockFileAccess);
			expect(elfHeader.load()).to.equal(Enums.DataResult.INVALID);
		});

		it("should return OK if file is loaded correctly", () => {
			mockFileAccess = {
				getDataView: () => new DataView(new ArrayBuffer(64)),
				readNullTerminatedString: (offset: number, size: number) => "\x7FELF",
				setLittleEndian: (isLittleEndian: boolean) => {},
			} as ElfFileData;
			elfHeader = new ElfHeader(mockFileAccess);

			ResolveItem.Get32BitValue = (
				fileAccess: ElfFileData,
				offset: number,
				size: number,
			) => 1;
			ResolveItem.Get64BitValue = (
				fileAccess: ElfFileData,
				offset: number,
				size: number,
			) => BigInt(1);
			expect(elfHeader.load()).to.equal(Enums.DataResult.OK);
		});
	});
});
