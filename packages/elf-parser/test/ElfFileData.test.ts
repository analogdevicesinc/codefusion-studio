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
import { ElfFileData } from "../src/ElfFileData.js";

describe("ElfFileData", () => {
	let elfFileData: ElfFileData;
	const sampleBytes = new ArrayBuffer(100);
	const sampleView = new DataView(sampleBytes);

	beforeEach(() => {
		elfFileData = new ElfFileData(sampleBytes);
	});

	describe("constructor", () => {
		it("should initialize with a DataView and default to big-endian", () => {
			expect(elfFileData.getDataView()).to.be.instanceOf(DataView);
			expect(elfFileData.isLittleEndian()).to.be.false;
		});
	});

	describe("setLittleEndian", () => {
		it("should set the endianness to little-endian", () => {
			elfFileData.setLittleEndian(true);
			expect(elfFileData.isLittleEndian()).to.be.true;
		});

		it("should set the endianness to big-endian", () => {
			elfFileData.setLittleEndian(false);
			expect(elfFileData.isLittleEndian()).to.be.false;
		});
	});

	describe("isLittleEndian", () => {
		it("should return the correct endianness", () => {
			elfFileData.setLittleEndian(true);
			expect(elfFileData.isLittleEndian()).to.be.true;

			elfFileData.setLittleEndian(false);
			expect(elfFileData.isLittleEndian()).to.be.false;
		});
	});

	describe("getDataView", () => {
		it("should return the DataView object", () => {
			expect(elfFileData.getDataView()).to.deep.equal(sampleView);
		});
	});

	describe("readNullTerminatedString", () => {
		it("should read a null-terminated string correctly", () => {
			const str = "test";
			for (let i = 0; i < str.length; i++) {
				sampleView.setUint8(i, str.charCodeAt(i));
			}
			sampleView.setUint8(str.length, 0); // Null terminator

			const result = elfFileData.readNullTerminatedString(0, 10);
			expect(result).to.equal(str);
		});

		it("should read up to the maximum length if no null terminator is found", () => {
			const str = "test";
			for (let i = 0; i < str.length; i++) {
				sampleView.setUint8(i, str.charCodeAt(i));
			}

			const result = elfFileData.readNullTerminatedString(0, 4);
			expect(result).to.equal(str);
		});

		it("should handle an empty string correctly", () => {
			sampleView.setUint8(0, 0); // Null terminator

			const result = elfFileData.readNullTerminatedString(0, 10);
			expect(result).to.equal("");
		});
	});
});
