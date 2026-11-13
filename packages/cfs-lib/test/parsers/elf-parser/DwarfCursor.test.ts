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
import {
	ByteOrder,
	Cursor,
	Format,
	Section,
	SectionType
} from "../../../src/parsers/elf-parser/Dwarf.js";

/**
 * Helper: build a DataView + Section + Cursor for an 8-byte
 * buffer written with a specific byte order.
 */
function makeCursor(
	writeLowWord: number,
	writeHighWord: number,
	littleEndian: boolean
): Cursor {
	const buf = new ArrayBuffer(8);
	const dv = new DataView(buf);
	dv.setUint32(0, writeLowWord, littleEndian);
	dv.setUint32(4, writeHighWord, littleEndian);

	const ord = littleEndian ? ByteOrder.lsb : ByteOrder.msb;
	const sec = new Section(
		SectionType.info,
		0,
		8,
		ord,
		Format.dwarf64
	);

	return new Cursor(dv, sec);
}

describe("Dwarf.Cursor.fixedBigInt", () => {
	describe("unsigned 64-bit", () => {
		it("should combine both halves in little-endian order", () => {
			// 0x00000002_00000001 LE: low word at offset 0, high word at offset 4
			const cur = makeCursor(0x00000001, 0x00000002, true);
			const result = cur.fixedBigInt(8, false);
			expect(result).to.equal(BigInt("0x0000000200000001"));
		});

		it("should combine both halves in big-endian order", () => {
			// 0x00000002_00000001 BE: high word at offset 0, low word at offset 4
			const cur = makeCursor(0x00000002, 0x00000001, false);
			const result = cur.fixedBigInt(8, false);
			expect(result).to.equal(BigInt("0x0000000200000001"));
		});

		it("should handle non-zero bits in both halves", () => {
			// 0xDEADBEEF_CAFEBABE LE
			const cur = makeCursor(0xcafebabe, 0xdeadbeef, true);
			const result = cur.fixedBigInt(8, false);
			expect(result).to.equal(BigInt("0xDEADBEEFCAFEBABE"));
		});

		it("should return correct value when high half is zero", () => {
			const cur = makeCursor(0x00000042, 0x00000000, true);
			const result = cur.fixedBigInt(8, false);
			expect(result).to.equal(BigInt(0x42));
		});
	});

	describe("signed 64-bit", () => {
		it("should return -1 for 0xFFFFFFFFFFFFFFFF", () => {
			// All bits set = -1 in two's complement
			const cur = makeCursor(0xffffffff, 0xffffffff, true);
			const result = cur.fixedBigInt(8, true);
			expect(result).to.equal(-1n);
		});

		it("should return negative value for high-bit-set big-endian", () => {
			// 0xFFFFFFFFFFFFFFFF BE
			const cur = makeCursor(0xffffffff, 0xffffffff, false);
			const result = cur.fixedBigInt(8, true);
			expect(result).to.equal(-1n);
		});

		it("should return positive value when high bit is clear", () => {
			// 0x7FFFFFFFFFFFFFFF = largest positive signed 64-bit
			const cur = makeCursor(0xffffffff, 0x7fffffff, true);
			const result = cur.fixedBigInt(8, true);
			expect(result).to.equal(BigInt("0x7FFFFFFFFFFFFFFF"));
		});

		it("should return most negative 64-bit value", () => {
			// 0x8000000000000000 = -9223372036854775808
			const cur = makeCursor(0x00000000, 0x80000000, true);
			const result = cur.fixedBigInt(8, true);
			expect(result).to.equal(-9223372036854775808n);
		});

		it("should treat unsigned read of high-bit-set value as positive", () => {
			const cur = makeCursor(0xffffffff, 0xffffffff, true);
			const result = cur.fixedBigInt(8, false);
			expect(result).to.equal(BigInt("0xFFFFFFFFFFFFFFFF"));
		});
	});

	describe("cursor advancement", () => {
		it("should advance pos by sizeInBytes after read", () => {
			const cur = makeCursor(0x00000001, 0x00000002, true);
			expect(cur.pos).to.equal(0);
			cur.fixedBigInt(8, false);
			expect(cur.pos).to.equal(8);
		});
	});
});
