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
﻿/* eslint-disable @typescript-eslint/no-namespace */
import * as Enums from "./enums.js";
import { Helper } from "./Helper.js";
import { ElfSectionHeader } from "./ElfSectionHeader.js";
import { DwarfData } from "./DwarfData.js";
import { DwarfDie } from "./DwarfDie.js";
import { DwarfLine } from "./DwarfLine.js";
import { ElfDataModel } from "./ElfDataModel.js";

export namespace Dwarf {
	export enum Format {
		unknown,
		dwarf32,
		dwarf64,
	}

	export enum ByteOrder {
		lsb,
		msb,
	}

	/**
	 * DWARF section types.  These correspond to the names of ELF
	 * sections, though DWARF can be embedded in other formats.
	 */
	export enum SectionType {
		abbrev,
		aranges,
		frame,
		info,
		line,
		loc,
		macinfo,
		pubnames,
		pubtypes,
		ranges,
		str,
		types,
	}

	/**
	 * An attribute specification in an abbrev.
	 */
	export class AttributeSpec {
		public name: DwarfData.DW_AT;
		public form: DwarfData.DW_FORM;

		// Computed information
		public type: DwarfData.ValueType;

		constructor(name: DwarfData.DW_AT, form: DwarfData.DW_FORM) {
			this.name = name;
			this.form = form;
			this.type = DwarfData.TypeResolver.resolveType(name, form);
		}
	}

	/**
	 * An entry in .debug_abbrev.
	 */
	export class AbbrevEntry {
		public code: number = 0; // x64
		public tag: DwarfData.DW_TAG;
		public children: boolean = false;
		public attributes: Array<AttributeSpec> = [];

		public static read(cur: Cursor): AbbrevEntry {
			let ret = new AbbrevEntry();

			// Section 7.5.3
			ret.code = cur.uleb128();
			if (!ret.code) return null;

			ret.tag = cur.uleb128() as DwarfData.DW_TAG;

			ret.children = cur.fixedUInt8() != 0;
			while (true) {
				const name = cur.uleb128();
				const form = cur.uleb128();

				if (name == 0 && form == 0) {
					break;
				}

				/*
				console.log(
					"ABBREV: name:0x",
					name.toString(16),
					" / ",
					//name as DwarfData.DW_AT,
					DwarfData.DW_AT[name],

					" form:0x",
					form.toString(16),
					" / ",
					//form as DwarfData.DW_FORM,
					DwarfData.DW_FORM[form],
				);
				*/

				ret.attributes.push(
					new AttributeSpec(name as DwarfData.DW_AT, form as DwarfData.DW_FORM),
				);
			}
			return ret;
		}
	}

	/**
	 * A single DWARF section or a slice of a section.  This also tracks
	 * dynamic information necessary to decode values in this section.
	 */
	export class Section {
		public type = SectionType.info;
		public begin: number = 0;
		public end: number = 0;
		public fmt: Format = Format.unknown;
		public ord: ByteOrder = ByteOrder.lsb;
		public addrSize: number = 0; // unsigned  x64

		constructor(
			type: SectionType,
			begin: number,
			length: number,
			ord: ByteOrder,
			fmt: Format,
			addrSize: number = 0,
		) {
			this.type = type;
			this.begin = begin;
			this.end = begin + length;
			this.fmt = fmt;
			this.ord = ord;
			this.addrSize = addrSize;
		}

		public size(): number {
			return this.end - this.begin;
		}
	}

	/**
	 * A cursor pointing into a DWARF section.  Provides deserialization
	 * operations and bounds checking.
	 */
	export class Cursor {
		dv: DataView = null;

		public sec: Section = null;
		public pos: number = 0;

		constructor(dv: DataView, sec: Section, offset: number = 0) {
			this.dv = dv;
			this.sec = sec;
			this.pos = sec.begin + offset;
		}

		public end(): boolean {
			return this.pos >= this.sec.end;
		}

		public valid(): boolean {
			return !!this.pos;
		}

		public getSectionOffset(): number {
			return this.pos - this.sec.begin;
		}

		public ensure(bytes: number) {
			if (this.sec.end - this.pos < bytes || this.pos >= this.sec.end)
				throw new Error("cannot read past end of DWARF section");
		}

		public offset(): number {
			switch (this.sec.fmt) {
				case Format.dwarf32:
					return this.fixedUInt32();
				case Format.dwarf64:
					return this.fixedUInt64();
				default:
					throw new Error("cannot read offset with unknown format");
			}
		}

		public skipInitialLength() {
			switch (this.sec.fmt) {
				case Format.dwarf32:
					this.pos += 4;
					break;
				case Format.dwarf64:
					this.pos += 4 + 8;
					break;
				default:
					throw new Error("cannot skip initial length with unknown format");
			}
		}

		public skipUnitType() {
			this.pos += 1;
		}

		public skipForm(form: DwarfData.DW_FORM) {
			let tmp = 0;

			// Section 7.5.4
			switch (form) {
				case DwarfData.DW_FORM.addr:
					this.pos += this.sec.addrSize;
					break;
				case DwarfData.DW_FORM.sec_offset:
				case DwarfData.DW_FORM.ref_addr:
				case DwarfData.DW_FORM.strp:
					switch (this.sec.fmt) {
						case Format.dwarf32:
							this.pos += 4;
							break;
						case Format.dwarf64:
							this.pos += 8;
							break;
						case Format.unknown:
							throw new Error("cannot read form with unknown format ");
					}
					break;

				// size+data forms
				case DwarfData.DW_FORM.block1:
					tmp = this.fixedUInt8();
					this.pos += tmp;
					break;
				case DwarfData.DW_FORM.block2:
					tmp = this.fixedUInt16();
					this.pos += tmp;
					break;
				case DwarfData.DW_FORM.block4:
					tmp = this.fixedUInt32();
					this.pos += tmp;
					break;
				case DwarfData.DW_FORM.block:
				case DwarfData.DW_FORM.exprloc:
					tmp = this.uleb128();
					this.pos += tmp;
					break;

				// fixed-length forms
				case DwarfData.DW_FORM.flag_present:
					break;
				case DwarfData.DW_FORM.flag:
				case DwarfData.DW_FORM.data1:
				case DwarfData.DW_FORM.ref1:
					this.pos += 1;
					break;
				case DwarfData.DW_FORM.data2:
				case DwarfData.DW_FORM.ref2:
					this.pos += 2;
					break;
				case DwarfData.DW_FORM.data4:
				case DwarfData.DW_FORM.ref4:
					this.pos += 4;
					break;
				case DwarfData.DW_FORM.data8:
				case DwarfData.DW_FORM.ref_sig8:
					this.pos += 8;
					break;

				// variable-length forms
				case DwarfData.DW_FORM.sdata:
				case DwarfData.DW_FORM.udata:
				case DwarfData.DW_FORM.ref_udata:
					while (this.pos < this.sec.end && this.fixedUInt8() & 0x80) {}
					break;
				case DwarfData.DW_FORM.string:
					while (this.pos < this.sec.end && this.fixedUInt8() != 0) {}
					break;

				case DwarfData.DW_FORM.indirect:
					this.skipForm(this.uleb128() as DwarfData.DW_FORM);
					break;

				default:
					throw new Error("unknown form 0x" + form.toString(16));
			}
		}

		public fixedBigInt(sizeInBytes: number, signed: boolean): bigint {
			let value: bigint = 0n;

			const isLittleEndian = this.sec.ord == ByteOrder.lsb;

			this.ensure(sizeInBytes);

			if (sizeInBytes == 8) {
				const bigNumber = BigInt(0);

				const left = BigInt(
					this.dv.getUint32(this.pos | 0, isLittleEndian) >>> 0,
				);
				const right = BigInt(
					this.dv.getUint32(((this.pos | 0) + 4) | 0, isLittleEndian) >>> 0,
				);
				value = isLittleEndian
					? (right << bigNumber) | left
					: (left << bigNumber) | right;
			} else if (sizeInBytes == 4) {
				value = BigInt(
					signed
						? this.dv.getInt32(this.pos, isLittleEndian)
						: this.dv.getUint32(this.pos, isLittleEndian),
				);
			} else if (sizeInBytes == 2) {
				value = BigInt(
					signed
						? this.dv.getInt16(this.pos, isLittleEndian)
						: this.dv.getUint16(this.pos, isLittleEndian),
				);
			} else if (sizeInBytes == 1) {
				value = BigInt(
					signed ? this.dv.getInt8(this.pos) : this.dv.getUint8(this.pos),
				);
			}

			this.pos += sizeInBytes;

			return value;
		}

		public fixedInt8(): number {
			return this.fixedSNum(1);
		}

		public fixedUInt8(): number {
			return this.fixedUNum(1);
		}

		public fixedInt16(): number {
			return this.fixedSNum(2);
		}

		public fixedUInt16(): number {
			return this.fixedUNum(2);
		}

		public fixedInt32(): number {
			return this.fixedSNum(4);
		}

		public fixedUInt32(): number {
			return this.fixedUNum(4);
		}

		public fixedInt64(): number {
			return this.fixedSNum(8);
		}

		public fixedUInt64(): number {
			return this.fixedUNum(8);
		}

		private fixedUNum(sizeInBytes: number): number {
			return Number(this.fixedBigInt(sizeInBytes, false));
		}

		private fixedSNum(sizeInBytes: number): number {
			return Number(this.fixedBigInt(sizeInBytes, true));
		}

		public fixedBlock(sizeInBytes: number): ArrayBuffer {
			this.ensure(sizeInBytes);
			const ret = this.dv.buffer.slice(this.pos, sizeInBytes);
			this.pos += sizeInBytes;
			return ret;
		}

		/**
		 * Read a subsection.  The cursor must be at an initial
		 * length.  After, the cursor will point just past the end of
		 * the subsection.  The returned section has the appropriate
		 * DWARF format and begins at the current location of the
		 * cursor (so this is usually followed by a
		 * skip_initial_length).
		 */
		public subSection(): Section {
			// Section 7.4
			const begin = this.pos;
			let length = this.fixedUInt32();
			let fmt = Format.unknown;
			if (length < 0xfffffff0) {
				fmt = Format.dwarf32;
				length += 4;
			} else if (length == 0xffffffff) {
				length = this.fixedUInt64();
				fmt = Format.dwarf64;
				length += 4 + 8;
			} else {
				throw new Error("initial length has reserved value");
			}
			this.pos = begin + length;
			return new Section(this.sec.type, begin, length, this.sec.ord, fmt);
		}

		// x64
		public uleb128(): number {
			const [ret, byteOffset] = Helper.parseULEB128(
				this.dv,
				this.pos,
				this.sec.end,
			);
			this.pos = byteOffset;
			return ret;
		}

		// x64
		public sleb128(): number {
			const [ret, byteOffset] = Helper.parseSLEB128(
				this.dv,
				this.pos,
				this.sec.end,
			);
			this.pos = byteOffset;
			return ret;
		}

		public str(): string {
			let ret: string = "";
			while (this.pos < this.sec.end) {
				const b = this.dv.getUint8(this.pos);
				if (b == 0) break;

				ret += String.fromCharCode(b);

				this.pos++;
			}

			if (this.pos == this.sec.end) throw new Error("unterminated string");

			this.pos++;

			return ret;
		}

		public address(): number {
			switch (this.sec.addrSize) {
				case 1:
					return this.fixedUInt8();
				case 2:
					return this.fixedUInt16();
				case 4:
					return this.fixedUInt32();
				case 8:
					return this.fixedUInt64();
				default:
					throw new Error(
						"address size " + this.sec.addrSize + " not supported",
					);
			}
		}
	} // Cursor

	export class CompilationUnit {
		dv: DataView = null;
		dw: Dwarf = null;

		public secAbbrev: Section = null;
		public secLoc: Section = null;
		public secLine: Section = null;
		public secStr: Section = null;
		public secRanges: Section = null;

		public size: number = 0;
		public version: number = 0;
		public abbrevOffset: number = 0;
		public addressSize: number = 0;

		public offset: number = 0;
		public subsec: Section = null;
		public rootOffset: number = 0;

		// Lazily constructed root and type DIEs
		private root: DwarfDie.Die = null;
		private type: DwarfDie.Die = null;

		// Lazily constructed line table
		private lt: DwarfLine.LineTable = null;

		// Map from abbrev code to abbrev.  If the map is dense, it
		// will be stored in the vector; otherwise it will be stored
		// in the map.
		public haveAbbrevs: boolean = false;
		public abbrevsMap: Map<number, AbbrevEntry> = new Map<
			number,
			AbbrevEntry
		>(); // abbrev_code, AbbrevEntry

		// PCs
		public lowPc = 0;
		public highPc = 0;

		// DIE cache
		public dies = new Array<DwarfDie.Die>();

		constructor(
			dw: Dwarf,
			secInfo: Section,
			secAbbrev: Section,
			secLoc: Section,
			secLine: Section,
			secStr: Section,
			secRanges: Section,
			offset: number,
		) {
			this.dw = dw;
			this.dv = dw.dv;
			this.secAbbrev = secAbbrev;
			this.secLoc = secLoc;
			this.secLine = secLine;
			this.secStr = secStr;
			this.secRanges = secRanges;

			// Read the CU header (DWARF4 section 7.5.1.1)
			const cur = new Cursor(this.dv, secInfo, offset);

			const subsec = cur.subSection();
			const subCursor = new Cursor(this.dv, subsec);

			subCursor.skipInitialLength();
			this.version = subCursor.fixedUInt16();
			if (this.version > 4)
				throw new Error(
					"Unsupported compilation unit version " +
						this.version +
						". Supports up to 4",
				);
			// .debug_abbrev-relative offset of this unit's abbrevs
			let debugAbbrevOffset: number;
			if (this.version >= 5) {
				subCursor.skipUnitType();
				const address_size = subCursor.fixedUInt8();
				subsec.addrSize = address_size;
				debugAbbrevOffset = subCursor.offset();
			} else {
				debugAbbrevOffset = subCursor.offset();
				const address_size = subCursor.fixedUInt8();
				subsec.addrSize = address_size;
			}

			this.addressSize = subsec.addrSize;
			this.size = subsec.size();

			this.offset = offset;
			this.subsec = subsec;
			this.abbrevOffset = debugAbbrevOffset;
			this.rootOffset = subCursor.getSectionOffset();
		}

		public getSectionOffset(): number {
			return this.offset;
		}

		/**
		 * \internal Return the data for this unit.
		 */
		public data(): Section {
			return this.subsec;
		}

		/**
		 * \internal Return the abbrev for the specified abbrev
		 * code.
		 */
		public getAbbrev(acode: number): AbbrevEntry {
			if (!this.haveAbbrevs) this.forceAbbrevs();

			const ret = this.abbrevsMap.get(acode);
			if (ret) return ret;

			throw new Error("unknown abbrev code 0x" + acode.toString(16));
		}

		public forceAbbrevs() {
			if (!this.secAbbrev) return;

			// XXX Compilation units can share abbrevs.  Parse each table
			// at most once.
			if (this.haveAbbrevs) return;

			// Section 7.5.3
			const c = new Cursor(this.dv, this.secAbbrev, this.abbrevOffset);

			let entry: AbbrevEntry = null;
			while ((entry = AbbrevEntry.read(c))) {
				this.abbrevsMap.set(entry.code, entry);
			}

			this.haveAbbrevs = true;
		}

		public getRoot(): DwarfDie.Die {
			if (!this.root) {
				this.forceAbbrevs();
				this.root = DwarfDie.Die.read(this, this.rootOffset);
			}
			return this.root;
		}

		/**
		 * Return the line number table of this compilation unit.
		 * Returns an invalid line table if this unit has no line
		 * table.
		 */
		public getLineTable(): DwarfLine.LineTable {
			if (!this.secLine) return null;

			// Already cached
			if (this.lt) return this.lt;

			const d = this.getRoot();

			if (!d.has(DwarfData.DW_AT.stmt_list) || !d.has(DwarfData.DW_AT.name)) {
				console.log("no DW_AT_stmt_list or DW_AT_name in this CU!");
				return null;
			}

			const compDir = d.has(DwarfData.DW_AT.comp_dir)
				? d.getValue(DwarfData.DW_AT.comp_dir).asString()
				: "";

			//console.log(
			//	"comp_dir:",
			//	comp_dir,
			//	" has comp_dir:",
			//	d.has(DwarfData.DW_AT.comp_dir),
			//);

			this.lt = new DwarfLine.LineTable(
				this.dv,
				this.secLine,
				d.getValue(DwarfData.DW_AT.stmt_list).asSecOffset(),
				this.subsec.addrSize,
				compDir,
				d.getValue(DwarfData.DW_AT.name).asString(),
			);

			return this.lt;
		}

		private traverseDie(
			cu: Dwarf.CompilationUnit,
			die: DwarfDie.Die,
			depth: number,
			fn: (die: DwarfDie.Die, depth: number) => void,
		) {
			if (!die || !die.abbrev) return;

			if (this.dw.maxDepth < depth) this.dw.maxDepth = depth;

			//console.log("0x" + die.getSectionOffset().toString(16) + " code:" + die.acode + " depth:" + depth + " children:" + die.abbrev.children);

			fn(die, depth);

			if (die.abbrev.children) {
				let children = DwarfDie.Die.read(cu, die.nextSectionOffset);
				this.traverseDie(cu, children, depth + 1, fn);
				while ((children = DwarfDie.Die.next(this.dw, children))) {
					this.traverseDie(cu, children, depth + 1, fn);
				}
			}
		}

		public traverseDies(
			dwarf: Dwarf.Dwarf,
			fn: (die: DwarfDie.Die, depth: number) => void,
		) {
			const root = this.getRoot();
			if (root) {
				this.traverseDie(this, root, 0, fn);
				/*
				// Not recursive
				let next = root
				while ((next = DwarfDie.Die.next(dwarf, next))) {
					this.dumpDie(dwarf, cu, next, 0)
				}
				*/
			}
		}

		public contains(addr: number): boolean {
			return addr >= this.lowPc && addr < this.highPc;
		}
	} // CompilationUnit

	export class Dwarf {
		dv: DataView = null;

		public secInfo: Section = null;
		public secAbbrev: Section = null;
		public secLoc: Section = null;
		public secLine: Section = null;
		public secStr: Section = null;
		public secRanges: Section = null;

		public compilationUnits = new Array<CompilationUnit>();
		// TODO if needed
		//public ranges = new Array<DwarfDie.RangeListEntry>();

		// Max DIE depth
		public maxDepth = 0;

		private debug = false;

		constructor(
			dv: DataView,
			debugInfo: ElfSectionHeader,
			debugAbbrev: ElfSectionHeader,
			debugLoc: ElfSectionHeader,
			debugLine: ElfSectionHeader,
			debugStr: ElfSectionHeader,
			debugRanges: ElfSectionHeader,
			debug: boolean,
		) {
			this.dv = dv;
			this.debug = debug;

			const offset = Number(debugInfo.offset);
			const size = Number(debugInfo.size);

			let fileOffset: number = offset;

			let fmt = Format.unknown;

			// DWARF4, 7.5.1.1

			// Sniff the endianness from the version field of the first
			// CU. This is always a small but non-zero integer.
			let header_length = dv.getUint32(fileOffset, true);
			fileOffset += 4;
			if (this.debug)
				console.log(
					"DWARF: CU: header_length:",
					header_length,
					"/",
					header_length.toString(16),
				);
			if (header_length == 0xffffffff) {
				// Skip int64
				fileOffset += 8;
				fmt = Format.dwarf64;
			} else {
				fmt = Format.dwarf32;
			}

			// Get version in both little and big endian.
			let littleEndian = true;
			const version = dv.getUint16(fileOffset, true);
			fileOffset += 2;
			const versionbe = (version >> 8) | ((version & 0xff) << 8);
			if (versionbe < version) {
				littleEndian = false;
			}
			if (this.debug)
				console.log("DWARF: CU: version:", version, "LE:", littleEndian);

			// Initialize sections
			this.secInfo = new Section(
				SectionType.info,
				offset,
				size,
				littleEndian ? ByteOrder.lsb : ByteOrder.msb,
				fmt,
			);
			if (debugAbbrev) {
				this.secAbbrev = new Section(
					SectionType.abbrev,
					Number(debugAbbrev.offset),
					Number(debugAbbrev.size),
					this.secInfo.ord,
					this.secInfo.fmt,
				);
			}
			if (debugLoc) {
				this.secLoc = new Section(
					SectionType.loc,
					Number(debugLoc.offset),
					Number(debugLoc.size),
					this.secInfo.ord,
					this.secInfo.fmt,
				);
			}
			if (debugLine) {
				this.secLine = new Section(
					SectionType.line,
					Number(debugLine.offset),
					Number(debugLine.size),
					this.secInfo.ord,
					this.secInfo.fmt,
				);
			}
			if (debugStr) {
				this.secStr = new Section(
					SectionType.str,
					Number(debugStr.offset),
					Number(debugStr.size),
					this.secInfo.ord,
					this.secInfo.fmt,
				);
			}
			if (debugRanges) {
				this.secRanges = new Section(
					SectionType.ranges,
					Number(debugRanges.offset),
					Number(debugRanges.size),
					this.secInfo.ord,
					this.secInfo.fmt,
				);
			}

			// Parse compilation units
			const infocur = new Cursor(dv, this.secInfo);
			while (!infocur.end()) {
				try {
					let cu = new CompilationUnit(
						this,
						this.secInfo,
						this.secAbbrev,
						this.secLoc,
						this.secLine,
						this.secStr,
						this.secRanges,
						infocur.getSectionOffset(),
					);
					this.compilationUnits.push(cu);
				} catch (error) {
					// Only in debug mode
					if (this.debug) {
						console.error(`DWARF Error: ${error}`);
					}
				}
				infocur.subSection();
			}

			// Parse all DIEs. Could be linked between different CUs
			this.maxDepth = 0;
			for (const cu of this.compilationUnits) {
				cu.lowPc = null;
				cu.highPc = 0;

				cu.traverseDies(this, (die: DwarfDie.Die, depth: number) => {
					if (!cu.lowPc || cu.lowPc > die.lowPc) cu.lowPc = die.lowPc;
					if (cu.highPc < die.highPc) cu.highPc = die.highPc;
					die.depth = depth;
					cu.dies.push(die);
				});
			}
			if (this.debug) {
				console.log(`DWARF: DIE max depth:${this.maxDepth}`);
			}
		}

		// Binary search
		private binaryClosestDIE(arr: Array<DwarfDie.Die>, target: number): number {
			let start = 0;
			let end = arr.length - 1;

			while (start < end) {
				const mid = Math.floor((start + end) / 2);
				if (arr[mid].contains(target)) {
					return mid;
				} else if (end === start + 1) {
					if (arr[start].contains(target)) return start;
					if (arr[end].contains(target)) return end;
					return -1;
				} else if (arr[mid].lowPc > target) {
					end = mid;
				} else {
					start = mid;
				}
			}

			return -1;
		}

		public exactLineTableKey(
			arr: Array<number>,
			target: number,
		): number {
			for (let i = 0; i < arr.length; ++i) {
				const key = arr[i];
				if (key === target) {
					return i;
				}
			}
			return -1;
		}


		// Binary search
		public binaryClosestLineTableKey(
			arr: Array<number>,
			target: number,
		): number {
			let start = 0;
			let end = arr.length - 1;

			while (start < end) {
				const mid = Math.floor((start + end) / 2);
				if (arr[mid] === target) {
					return mid;
				} else if (end === start + 1) {
					return start;
				} else if (arr[mid] > target) {
					end = mid;
				} else {
					start = mid;
				}
			}

			return -1;
		}

		public matchDebugInfo(dt: ElfDataModel) {
			let nFromDies = 0;
			let nFromLineTables = 0;

			if (this.debug)
				console.log(
					`DWARF: Matching symbols against debug addresses from DIES and line tables`,
				);
			const start = new Date().getTime();

			// DIEs
			let dies = new Array<DwarfDie.Die>();

			// LTs
			const ltMap = new Map<number, DwarfLine.LineTableEntry>();
			const keys = new Array<number>();

			// Fill all dies and all line table entries from all CUs
			for (const cu of this.compilationUnits) {
				for (const die of cu.dies) {
					if (die.path) {
						dies.push(die);
					}
				}

				const lt = cu.getLineTable();
				if (lt) {
					for (const [key, entry] of lt.addressToEntryMap) {
						keys.push(key);
						ltMap.set(key, entry);
					}
				}
			}
			dies.sort((a, b) => a.lowPc - b.lowPc);
			keys.sort((a, b) => a - b);
			if (this.debug)
				console.log(
					`DWARF: ${dies.length} sorted dies. ${keys.length} sorted line table keys`,
				);

			// Max address distance from the starting line table entry
			const LineTableMaxDistance = 5;
			for (const sym of dt.elfSymbols) {
				for (const symData of sym.symbolData) {
					const section = dt.elfSectionHeaders.filter(
						(sec) => sec.index === symData.sectionHeaderIndex,
					)[0];

					if (
						symData.value > 0 &&
						section &&
						symData.infoType != Enums.sym_type.SECTION
					) {
						const addr = Number(symData.value);

						// Populate from Dies with file line info
						let idx = -1;
						idx = this.binaryClosestDIE(dies, addr);
						if (idx != -1) {
							const die = dies[idx];
							//if (!die.contains(addr)) { console.log("DWARF: binaryClosestIdx ERROR!"); }
							symData.path = die.path;
							symData.line = die.line;
							if (die.column > 0) symData.column = die.column;
							symData.fromDies = true;
							symData.debugAddress = die.lowPc;

							nFromDies++;
						} else {
							// Populate from line_tables
							// Functions will be searched using binary search, while other exact
							if (symData.infoType == Enums.sym_type.FUNC) {
								idx = this.binaryClosestLineTableKey(keys, addr);
							} else {
								idx = this.exactLineTableKey(keys, addr);
							}

							if (idx !== -1) {
								const entry = ltMap.get(keys[idx]);
								// Not too far
								if (addr >= entry.address && addr <= entry.address + LineTableMaxDistance) {
									symData.path = entry.file.path;
									symData.line = entry.line;
									symData.column = entry.column;
									symData.fromDies = false;
									symData.debugAddress = entry.address;

									nFromLineTables++;
								}
							}
						}
					} // sym check
				}
			} // for

			const diff = new Date().getTime() - start;
			if (this.debug)
				console.log(
					`DWARF: Matching took ${diff} millis. nFromDies:${nFromDies} nFromLineTables:${nFromLineTables}`,
				);
		}
	} // Dwarf
} // namespace Dwarf
