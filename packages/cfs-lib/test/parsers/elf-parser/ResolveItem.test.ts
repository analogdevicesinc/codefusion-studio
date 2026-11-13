/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import { ResolveItem } from "../../../src/parsers/elf-parser/ResolveItem.js";
import { ElfFileData } from "../../../src/parsers/elf-parser/ElfFileData.js";

describe("ResolveItem", () => {
	const originalGet64 = ResolveItem.Get64BitValue;
	const originalGet32 = ResolveItem.Get32BitValue;

	beforeEach(() => {
		ResolveItem.Get64BitValue = originalGet64;
		ResolveItem.Get32BitValue = originalGet32;
	});

	describe("Get64BitValue", () => {
		it("should combine both 32-bit halves for a little-endian 64-bit value", () => {
			// 0x00000002_00000001 in little-endian byte order:
			// bytes 0-3: low word  0x00000001 → [0x01, 0x00, 0x00, 0x00]
			// bytes 4-7: high word 0x00000002 → [0x02, 0x00, 0x00, 0x00]
			const buf = new ArrayBuffer(8);
			const view = new DataView(buf);
			view.setUint32(0, 0x00000001, true);
			view.setUint32(4, 0x00000002, true);

			const fd = new ElfFileData(buf);
			fd.setLittleEndian(true);

			const result = ResolveItem.Get64BitValue(fd, 0, 8);
			expect(result).to.equal(BigInt("0x0000000200000001"));
		});

		it("should combine both 32-bit halves for a big-endian 64-bit value", () => {
			// 0x00000002_00000001 in big-endian byte order:
			// bytes 0-3: high word 0x00000002 → [0x00, 0x00, 0x00, 0x02]
			// bytes 4-7: low word  0x00000001 → [0x00, 0x00, 0x00, 0x01]
			const buf = new ArrayBuffer(8);
			const view = new DataView(buf);
			view.setUint32(0, 0x00000002, false);
			view.setUint32(4, 0x00000001, false);

			const fd = new ElfFileData(buf);
			fd.setLittleEndian(false);

			const result = ResolveItem.Get64BitValue(fd, 0, 8);
			expect(result).to.equal(BigInt("0x0000000200000001"));
		});

		it("should handle a value with non-zero bits in both halves", () => {
			// 0xDEADBEEF_CAFEBABE little-endian
			const buf = new ArrayBuffer(8);
			const view = new DataView(buf);
			view.setUint32(0, 0xcafebabe, true);
			view.setUint32(4, 0xdeadbeef, true);

			const fd = new ElfFileData(buf);
			fd.setLittleEndian(true);

			const result = ResolveItem.Get64BitValue(fd, 0, 8);
			expect(result).to.equal(BigInt("0xDEADBEEFCAFEBABE"));
		});

		it("should return correct value when high half is zero", () => {
			const buf = new ArrayBuffer(8);
			const view = new DataView(buf);
			view.setUint32(0, 0x00000042, true);
			view.setUint32(4, 0x00000000, true);

			const fd = new ElfFileData(buf);
			fd.setLittleEndian(true);

			const result = ResolveItem.Get64BitValue(fd, 0, 8);
			expect(result).to.equal(BigInt(0x42));
		});

		it("should fall back to 32-bit read for sizeInBytes < 8", () => {
			const buf = new ArrayBuffer(8);
			const view = new DataView(buf);
			view.setUint32(0, 0x12345678, true);

			const fd = new ElfFileData(buf);
			fd.setLittleEndian(true);

			const result = ResolveItem.Get64BitValue(fd, 0, 4);
			expect(result).to.equal(BigInt(0x12345678));
		});

		it("should read from the given offset", () => {
			const buf = new ArrayBuffer(16);
			const view = new DataView(buf);
			view.setUint32(8, 0x000000aa, true);
			view.setUint32(12, 0x000000bb, true);

			const fd = new ElfFileData(buf);
			fd.setLittleEndian(true);

			const result = ResolveItem.Get64BitValue(fd, 8, 8);
			expect(result).to.equal(BigInt("0x000000BB000000AA"));
		});
	});

	describe("Get32BitValue", () => {
		it("should read an 8-bit value", () => {
			const buf = new ArrayBuffer(4);
			const view = new DataView(buf);
			view.setUint8(0, 0xff);

			const fd = new ElfFileData(buf);

			expect(ResolveItem.Get32BitValue(fd, 0, 1)).to.equal(0xff);
		});

		it("should read a 16-bit little-endian value", () => {
			const buf = new ArrayBuffer(4);
			const view = new DataView(buf);
			view.setUint16(0, 0x1234, true);

			const fd = new ElfFileData(buf);
			fd.setLittleEndian(true);

			expect(ResolveItem.Get32BitValue(fd, 0, 2)).to.equal(0x1234);
		});

		it("should read a 32-bit little-endian value", () => {
			const buf = new ArrayBuffer(4);
			const view = new DataView(buf);
			view.setUint32(0, 0xdeadbeef, true);

			const fd = new ElfFileData(buf);
			fd.setLittleEndian(true);

			expect(ResolveItem.Get32BitValue(fd, 0, 4)).to.equal(
				0xdeadbeef
			);
		});

		it("should throw for unsupported sizeInBytes", () => {
			const buf = new ArrayBuffer(8);
			const fd = new ElfFileData(buf);

			expect(() => ResolveItem.Get32BitValue(fd, 0, 3)).to.throw(
				"Unsupported sizeInBytes: 3"
			);
		});
	});
});
