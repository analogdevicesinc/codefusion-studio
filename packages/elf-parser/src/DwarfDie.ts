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
import { Dwarf } from "./Dwarf.js";
import { DwarfData } from "./DwarfData.js";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DwarfDie {
	/**
	 * A Debugging Information Entry, or DIE.  The basic unit of
	 * information in a DWARF file.
	 */
	export class Die {
		// The unit containing this die
		private cu: Dwarf.CompilationUnit = null;
		public acode: number = 0;
		// The abbrev of this DIE.  By convention, if this DIE
		// represents a sibling list terminator, this is null.  This
		// object is kept live by the CU.
		public abbrev: Dwarf.AbbrevEntry = null;
		// The beginning of this DIE, relative to the CU.
		public cuOffset: number = 0;
		// Offsets of attributes, relative to cu's subsection.  The
		// vast majority of DIEs tend to have six or fewer attributes,
		// so we reserve space in the DIE itself for six attributes.
		public attrs: Array<number> = []; // x64
		// The offset of the next DIE, relative to cu'd subsection.
		// This is set even for sibling list terminators.
		public nextSectionOffset: number = 0;

		// XXX Make this class better for use in maps.  Currently dies
		// are fairly big and expensive to copy, but most of that
		// information can be constructed lazily.  This is also bad
		// for use in caches since it will keep the DWARF file alive.
		// OTOH, maybe caches need eviction anyway.
		public tag: DwarfData.DW_TAG;

		// source
		public path: string = null;
		public line: number = 0;
		public column: number = 0;

		// PCs
		public lowPc = 0;
		public highPc = 0;
		public ranges: Array<RangeListEntry> = null;

		// tree depth
		public depth: number = 0;

		// DW_AT.name if exists
		public dieName: string;

		constructor(cu: Dwarf.CompilationUnit) {
			this.cu = cu;
		}

		/**
		 * Return true if this object represents a DIE in a DWARF
		 * file.  Default constructed objects are not valid and some
		 * methods return invalid DIEs to indicate failures.
		 */
		public valid(): boolean {
			return !!this.abbrev;
		}

		/**
		 * Return the unit containing this DIE.
		 */
		public getUnit(): Dwarf.CompilationUnit {
			return this.cu;
		}

		/**
		 * Return this DIE's byte offset within its compilation unit.
		 */
		public getUnitOffset(): number {
			// x64
			return this.cuOffset;
		}

		/**
		 * Return this DIE's byte offset within its section.
		 */
		public getSectionOffset(): number {
			// x64
			return this.cu.getSectionOffset() + this.cuOffset;
		}

		/**
		 * Return true if this DIE has the requested attribute.
		 */
		public has(attr: DwarfData.DW_AT): boolean {
			if (!this.abbrev) return false;
			for (const a of this.abbrev.attributes) {
				if (a.name == attr) return true;
			}
			return false;
		}

		/**
		 * Return the value of attr after resolving specification and
		 * abstract origin references.  If the attribute cannot be
		 * resolved, returns an invalid value.  Declaration DIEs can
		 * "complete" a previous non-defining declaration DIE and
		 * similarly inherit the non-defining declaration's attributes
		 * (DWARF4 section 2.13) Likewise, any DIE that is a child of
		 * a concrete inlined instance can specify another DIE as its
		 * "abstract origin" and the original DIE will inherit the
		 * attributes of its abstract origin (DWARF4 section 3.3.8.2).
		 */
		//TODO value resolve(DW_AT attr) const;

		/**
		 * Read this DIE from the given offset in cu.
		 */
		public static read(
			cu: Dwarf.CompilationUnit,
			off: number,
			fast = false,
		): Die {
			let ret = new Die(cu);

			const cur = new Dwarf.Cursor(cu.dv, cu.data(), off);

			ret.cuOffset = off;
			ret.acode = cur.uleb128(); // type: abbrev_code / x64
			if (ret.acode == 0) {
				ret.abbrev = null;
				ret.nextSectionOffset = cur.getSectionOffset();
				return ret;
			}

			ret.abbrev = cu.getAbbrev(ret.acode);

			ret.tag = ret.abbrev.tag;

			for (const attr of ret.abbrev.attributes) {
				ret.attrs.push(cur.getSectionOffset());
				cur.skipForm(attr.form);
			}
			ret.nextSectionOffset = cur.getSectionOffset();

			// Exit early by not resolving PCs and file declaration
			if (fast) {
				return ret;
			}

			if (ret.has(DwarfData.DW_AT.name)) {
				ret.dieName = ret.getValue(DwarfData.DW_AT.name).asString();
			}

			if (
				ret.has(DwarfData.DW_AT.decl_file) &&
				ret.has(DwarfData.DW_AT.decl_line)
			) {
				const lt = ret.cu.getLineTable();

				const fileIdx = ret.getValue(DwarfData.DW_AT.decl_file).asUConstant();
				//console.log(`DIE: fileIdx:${fileIdx} nFiles:${lt.fileNames.length}`);
				ret.path = lt.fileNames[fileIdx].path;

				ret.line = ret.getValue(DwarfData.DW_AT.decl_line).asUConstant();
				if (ret.has(DwarfData.DW_AT.decl_column)) {
					ret.column = ret.getValue(DwarfData.DW_AT.decl_column).asUConstant();
				}

				if (ret.has(DwarfData.DW_AT.ranges)) {
					// Ranges
					//if (cu.secRanges) {
					//		ret.ranges = ret.getValue(DwarfData.DW_AT.ranges).asRangeList();
					//	else if ret.has(dw)
					//}
					// TODO
				} else if (ret.has(DwarfData.DW_AT.low_pc)) {
					ret.lowPc = ret.getValue(DwarfData.DW_AT.low_pc).asAddress();

					ret.ranges = new Array<RangeListEntry>();

					if (ret.has(DwarfData.DW_AT.high_pc)) {
						const val = ret.getValue(DwarfData.DW_AT.high_pc);
						if (val.form == DwarfData.DW_FORM.addr)
							ret.highPc = val.asAddress();
						else ret.highPc = ret.lowPc + val.asUConstant();
						ret.ranges.push(new RangeListEntry(ret.lowPc, ret.highPc));
					} else {
						ret.highPc = ret.lowPc + 1;
						ret.ranges.push(new RangeListEntry(ret.lowPc, ret.highPc));
					}
				} else if (ret.has(DwarfData.DW_AT.location)) {
					try {
						const val = ret.getValue(DwarfData.DW_AT.location);
						let addr = 0;
						if (val.form == DwarfData.DW_FORM.addr) {
							addr = val.asAddress();
						} else if (val.form == DwarfData.DW_FORM.exprloc)
							addr = val.asExprLock().evaluate([]).value;
						//else if (val.form == DwarfData.DW_FORM.sec_offset)
						//	addr = val.asSecOffset();
						/*else {
						throw new Error(
							"Unsupported location type " +
								DwarfData.DW_FORM[val.form] +
								" / " +
								val.form,
						);
					}*/
						if (addr != 0) {
							ret.lowPc = addr;
							ret.highPc = addr + 1;
							ret.ranges = new Array<RangeListEntry>();
							ret.ranges.push(new RangeListEntry(ret.lowPc, ret.highPc));
						}
					} catch (err) {
						//console.log("DIE.location parsing error:" + err);
					}
				}
			}

			return ret;
		}

		public contains(addr: number): boolean {
			if (!this.ranges) return false;
			//for (const r of this.ranges) if (r.contains(addr)) return true;
			//return false;
			return addr >= this.lowPc && addr < this.highPc;
		}

		private getAbbrevAttr(
			attr: DwarfData.DW_AT,
		): [Dwarf.AttributeSpec, number] {
			if (!this.abbrev) return [null, 0];
			let i = 0;
			for (const abbrev_attr of this.abbrev.attributes) {
				if (abbrev_attr.name == attr) {
					return [abbrev_attr, this.attrs[i]];
				}
				i++;
			}
		}
		public getValue(attr: DwarfData.DW_AT): Value {
			const [abbrevAttr, at] = this.getAbbrevAttr(attr);
			if (!abbrevAttr) return null;
			return new Value(
				this.cu,
				abbrevAttr.name,
				abbrevAttr.form,
				abbrevAttr.type,
				abbrevAttr.implicitConst,
				at,
			);
		}

		public static next(dw: Dwarf.Dwarf, die: Die): Die {
			if (!die.abbrev) return null;

			if (!die.abbrev.children) {
				//console.log("----- DIE.next: no children");
				// The DIE has no children, so its successor follows
				// immediately
				return Die.read(die.cu, die.nextSectionOffset);
			} else if (die.has(DwarfData.DW_AT.sibling)) {
				//console.log("----- DIE.next: sibling");
				// They made it easy on us.  Follow the sibling
				// pointer.  XXX Probably worth optimizing
				return die.getValue(DwarfData.DW_AT.sibling).asReference(dw);
			} else {
				// It's a hard-knock life.  We have to iterate through
				// the children to find the next DIE.
				// XXX Particularly unfortunate if the user is doing a
				// DFS, since this will result in N^2 behavior.  Maybe
				// a small cache of terminator locations in the CU?
				let next = null;
				let nextSectionOffset = die.nextSectionOffset;
				do {
					// Fast parsing
					next = Die.read(die.cu, nextSectionOffset, true);
					if (!next || !next.abbrev) break;
					nextSectionOffset = next.nextSectionOffset;
				} while (true);

				if (next) {
					return Die.read(die.cu, next.nextSectionOffset);
				}
			}

			return null;
		}
	} // Die

	export class Value {
		cu: Dwarf.CompilationUnit = null;
		type: DwarfData.ValueType = DwarfData.ValueType.invalid;
		form: DwarfData.DW_FORM;

		// offset in CU
		cuOffset: number = 0;

		implicitConst = 0;

		constructor(
			cu: Dwarf.CompilationUnit,
			name: DwarfData.DW_AT,
			form: DwarfData.DW_FORM,
			type: DwarfData.ValueType,
			implicitConst: number,
			cuOffset: number,
		) {
			this.cu = cu;
			this.form = form;
			this.type = type;
			this.implicitConst = implicitConst;
			this.cuOffset = cuOffset;

			if (form == DwarfData.DW_FORM.indirect) this.resolveIndirect(name);
		}

		/**
		 * Return true if this object represents a valid value.
		 * Default constructed line tables are not valid.
		 */
		public valid(): boolean {
			return this.type != DwarfData.ValueType.invalid;
		}

		/**
		 * Return this value's byte offset within its compilation
		 * unit.
		 */
		public getUnitOffset(): number {
			return this.cuOffset;
		}

		/**
		 * Return this DIE's byte offset within its section.
		 */
		public getSectionOffset(): number {
			// x64
			return this.cu.getSectionOffset() + this.cuOffset;
		}

		public getType(): DwarfData.ValueType {
			return this.type;
		}

		/**
		 * Return this value's attribute encoding.  This automatically
		 * resolves indirect encodings, so this will never return
		 * DW_FORM::indirect.  Note that the mapping from forms to
		 * types is non-trivial and often depends on the attribute
		 * (especially prior to DWARF 4).
		 */
		public getForm(): DwarfData.DW_FORM {
			return this.form;
		}

		/**
		 * Return this value as a target machine address.
		 * x64
		 */
		public asAddress(): number {
			if (this.form != DwarfData.DW_FORM.addr) {
				throw new Error("cannot read " + this.type + " as address");
			}
			const cur = new Dwarf.Cursor(this.cu.dv, this.cu.data(), this.cuOffset);
			return cur.address();
		}

		/**
		 * Return this value as a block.  The returned pointer points
		 * directly into the section data, so the caller must ensure
		 * that remains valid as long as the data is in use.
		 * *size_out is set to the length of the returned block, in
		 * bytes.
		 *
		 * This automatically coerces "exprloc" type values by
		 * returning the raw bytes of the encoded expression.
		 */
		public asBlock(): ArrayBuffer {
			// XXX Blocks can contain all sorts of things, including
			// references, which couldn't be resolved by callers in the
			// current minimal API.
			const cur = new Dwarf.Cursor(this.cu.dv, this.cu.data(), this.cuOffset);
			let blockSize: number = 0;
			switch (this.form) {
				case DwarfData.DW_FORM.block1:
					blockSize = cur.fixedUInt8();
					break;
				case DwarfData.DW_FORM.block2:
					blockSize = cur.fixedUInt16();
					break;
				case DwarfData.DW_FORM.block4:
					blockSize = cur.fixedUInt32();
					break;
				case DwarfData.DW_FORM.block:
				case DwarfData.DW_FORM.exprloc:
					blockSize = cur.uleb128();
					break;
				default:
					throw new Error("cannot read " + this.type + " as block");
			}
			cur.ensure(blockSize);
			return cur.fixedBlock(blockSize);
		}

		/**
		 * Return this value as an unsigned constant.  This
		 * automatically coerces "constant" type values by
		 * interpreting their bytes as unsigned.
		 * x64
		 */
		public asUConstant(): number {
			const cur = new Dwarf.Cursor(this.cu.dv, this.cu.data(), this.cuOffset);
			switch (this.form) {
				case DwarfData.DW_FORM.data1:
					return cur.fixedUInt8();
				case DwarfData.DW_FORM.data2:
					return cur.fixedUInt16();
				case DwarfData.DW_FORM.data4:
					return cur.fixedUInt32();
				case DwarfData.DW_FORM.data8:
					return cur.fixedUInt64();
				case DwarfData.DW_FORM.udata:
					return cur.uleb128();
				case DwarfData.DW_FORM.implicit_const:
					return this.implicitConst;
				default:
					throw new Error(
						`cannot read ${this.type} as uconstant. form:${DwarfData.DW_FORM[this.form]}`,
					);
			}
		}

		/**
		 * Return this value as a signed constant.  This automatically
		 * coerces "constant" type values by interpreting their bytes
		 * as twos-complement signed values.
		 */
		// TODO int64_t as_sconstant() const;

		/**
		 * Return this value as an expression.  This automatically
		 * coerces "block" type values by interpreting the bytes in
		 * the block as an expression (prior to DWARF 4, exprlocs were
		 * always encoded as blocks, though the library automatically
		 * distinguishes these types based on context).
		 */
		public asExprLock(): DwarfDie.Expression {
			const cur = new Dwarf.Cursor(this.cu.dv, this.cu.data(), this.cuOffset);
			let size: number = 0;
			// Prior to DWARF 4, exprlocs were encoded as blocks.
			switch (this.form) {
				case DwarfData.DW_FORM.block1:
					size = cur.fixedUInt8();
					break;
				case DwarfData.DW_FORM.block2:
					size = cur.fixedUInt16();
					break;
				case DwarfData.DW_FORM.block4:
					size = cur.fixedUInt32();
					break;
				case DwarfData.DW_FORM.block:
				case DwarfData.DW_FORM.exprloc:
					size = cur.uleb128();
					break;
				default:
					throw new Error("cannot read " + this.type + " as exprloc");
			}
			cur.ensure(size);
			return new DwarfDie.Expression(this.cu, cur.getSectionOffset(), size);
		}

		/**
		 * Return this value as a boolean flag.
		 */
		//TODO bool as_flag() const;

		// XXX loclistptr, macptr

		/**
		 * Return this value as a rangelist.
		 */
		//TODO rangelist as_rangelist() const;

		/**
		 * For a reference type value, return the referenced DIE.
		 * This DIE may be in a different compilation unit or could
		 * be a DIE in a type unit.
		 */
		public asReference(dw: Dwarf.Dwarf): Die {
			let off = 0;
			// XXX Would be nice if we could avoid this.  The cursor is
			// all overhead here.
			const cur = new Dwarf.Cursor(this.cu.dv, this.cu.data(), this.cuOffset);
			switch (this.form) {
				case DwarfData.DW_FORM.ref1:
					off = cur.fixedUInt8();
					break;
				case DwarfData.DW_FORM.ref2:
					off = cur.fixedUInt16();
					break;
				case DwarfData.DW_FORM.ref4:
					off = cur.fixedUInt32();
					break;
				case DwarfData.DW_FORM.ref8:
					off = cur.fixedUInt64();
					break;
				case DwarfData.DW_FORM.ref_udata:
					off = cur.uleb128();
					break;

				case DwarfData.DW_FORM.ref_addr: {
					off = cur.offset();
					// These seem to be extremely rare in practice (I
					// haven't been able to get gcc to produce a
					// ref_addr), so it's not worth caching this lookup.
					let baseCu: Dwarf.CompilationUnit = null;
					for (const cu of dw.compilationUnits) {
						if (cu.getSectionOffset() > off) break;
						baseCu = cu;
					}

					baseCu.forceAbbrevs();
					return DwarfDie.Die.read(baseCu, off - baseCu.getSectionOffset());
				}

				case DwarfData.DW_FORM.ref_sig8: {
					// TODO
					//const sig = cur.fixedUInt64();
					//try {
					//		return dw.getTypeUnit(sig).type();
					//} catch (std::out_of_range &e) {
					//		throw format_error("unknown type signature 0x" + to_hex(sig));
					//}
					throw new Error("DW_FORM.ref_sig8 is unsupported!");
				}

				default:
					throw new Error("cannot read " + this.type + " as reference!");
			}

			return DwarfDie.Die.read(this.cu, off);
		}

		/**
		 * Return this value as a string.
		 */
		public asString(): string {
			const cur = new Dwarf.Cursor(this.cu.dv, this.cu.data(), this.cuOffset);
			switch (this.form) {
				case DwarfData.DW_FORM.string:
					return cur.str();
				case DwarfData.DW_FORM.strp: {
					// TODO
					if (!this.cu.secStr)
						throw new Error("strp: CU has no .debug_str section!");
					const off = cur.offset();
					const scur = new Dwarf.Cursor(this.cu.dv, this.cu.secStr, off);
					return scur.str();
				}
				case DwarfData.DW_FORM.line_strp: {
					if (!this.cu.secLineStr)
						throw new Error("line_strp: CU has no .debug_line_str section!");
					const off = cur.offset();
					const scur = new Dwarf.Cursor(this.cu.dv, this.cu.secLineStr, off);
					return scur.str();
				}
				default:
					throw new Error("cannot read " + this.type + " as string");
			}
		}

		/**
		 * Return this value as a section offset.  This is applicable
		 * to lineptr, loclistptr, macptr, and rangelistptr.
		 */
		public asSecOffset(): number {
			const cur = new Dwarf.Cursor(this.cu.dv, this.cu.data(), this.cuOffset);
			switch (this.form) {
				case DwarfData.DW_FORM.data4:
					return cur.fixedUInt32();
				case DwarfData.DW_FORM.data8:
					return cur.fixedUInt64();
				case DwarfData.DW_FORM.sec_offset:
					return cur.offset();
				default:
					throw new Error("cannot read " + this.type + " as sec_offset");
			}
		}

		/*
		public asRangeList() : RangeList {
			if (!this.cu.dw.secRanges) return null;

			const off = this.asSecOffset();
			// The compilation unit may not have a base address.  In this
        // case, the first entry in the range list must be a base
        // address entry, but we'll just assume 0 for the initial base
        // address.
        const cudie = this.cu.getRoot();
        const cuLowPc = cudie.has(DwarfData.DW_AT.low_pc) ? cudie.getValue(DwarfData.DW_AT.low_pc).asAddress : 0;
        const sec = this.cu.dw.secRanges;
        const = this.cu.data();
        //return rangelist(sec, off, cusec.addrSize, cu_low_pc);
				// TODO
				return null;
		}
		*/

		private resolveIndirect(name: DwarfData.DW_AT) {
			if (this.form != DwarfData.DW_FORM.indirect) return;

			const cur = new Dwarf.Cursor(this.cu.dv, this.cu.data(), this.cuOffset);

			let newForm = DwarfData.DW_FORM.addr;
			do {
				newForm = cur.uleb128() as DwarfData.DW_FORM;
			} while (newForm == DwarfData.DW_FORM.indirect);
			const attr = new Dwarf.AttributeSpec(name, newForm, 0);
			this.type = attr.type;
			this.cuOffset = cur.getSectionOffset();
		}
	}

	class Stack<T> {
		private items: T[];
		// Private array to store stack elements

		constructor() {
			this.items = [];
			// Initialize the array as empty
			//when a new stack is created
		}

		// Method to push an
		// element onto the stack
		push(element: T): void {
			this.items.push(element);
		}

		// Method to pop an
		// element from the stack
		pop(): T | undefined {
			return this.items.pop();
		}

		// Method to peek the top element
		// of the stack without removing it
		peek(): T | undefined {
			return this.items[this.items.length - 1];
		}

		set(val: T, revAtPos = 0) {
			this.items[this.items.length - 1 - revAtPos] = val;
		}

		/**
		 * "Reverse at".  revat(0) is equivalent to back().  revat(1)
		 * is the element before back.  Etc.
		 */
		revat(n: number): T | undefined {
			return this.items[this.items.length - 1 - n];
		}

		// Method to check
		// if the stack is empty
		isEmpty(): boolean {
			return this.items.length === 0;
		}

		// Method to get
		// the size of the stack
		size(): number {
			return this.items.length;
		}

		// Method to
		// clear the stack
		clear(): void {
			this.items = [];
		}

		// Method to print
		// the elements of the stack
		print(): void {
			console.log(this.items);
		}
	}

	export enum ExprResultType {
		/**
		 * value specifies the address in memory of an object.
		 * This is also the result type used for general
		 * expressions that do not refer to object locations.
		 */
		address,
		/**
		 * value specifies a register storing an object.
		 */
		reg,
		/**
		 * The object does not have a location.  value is the
		 * value of the object.
		 */
		literal,
		/**
		 * The object does not have a location.  Its value is
		 * pointed to by the 'implicit' field.
		 */
		implicit,
		/**
		 * The object is present in the source, but not in the
		 * object code, and hence does not have a location or
		 * a value.
		 */
		empty,
	}
	// XXX Provide methods to check type and fetch value?
	/**
	 * The result of evaluating a DWARF expression or location
	 * description.
	 */
	export class ExprResult {
		/**
		 * For location descriptions, the type of location this result
		 * describes.
		 */
		public locationType = ExprResultType.empty;

		/**
		 * For general-purpose expressions, the result of expression.
		 * For address location descriptions, the address in memory of
		 * the object.  For register location descriptions, the
		 * register storing the object.  For literal location
		 * descriptions, the value of the object.
		 */
		public value: number = 0;

		/**
		 * For implicit location descriptions, a pointer to a block
		 * representing the value in the memory representation of the
		 * target machine.
		 */
		public implicit: number = 0;
		implicitLen: number = 0;

		// XXX Composite locations
	}

	enum BinOp {
		minus, // -
		plus, // +
		mul, // *
		div, // /
		mod, // %
		xor, // ^
		lessEqual, // <=
		gtEqual, // >=
		different, // !=
		less, // <
		greater, // >
		equal, // ==
		binAnd, // &
		binOr, // |
	}

	export class Expression {
		cu: Dwarf.CompilationUnit = null;
		offset = 0;
		size = 0;

		private stack: Stack<number> = null;

		constructor(cu: Dwarf.CompilationUnit, offset: number, size: number) {
			this.cu = cu;
			this.offset = offset;
			this.size = size;
		}

		private check() {
			do {
				if (this.stack.isEmpty())
					throw new Error(
						"stack underflow evaluating DWARF expression (check)",
					);
			} while (false);
		}

		private checkN(n: number) {
			do {
				if (this.stack.size() < n)
					throw new Error(
						"stack underflow evaluating DWARF expression (checkN(" + n + "))",
					);
			} while (false);
		}

		private evalBinOp(a: number, b: number, op: BinOp, signed = false): number {
			// TODO: signed
			switch (op) {
				case BinOp.minus:
					return a - b;
				case BinOp.plus:
					return a + b;
				case BinOp.mul:
					return a * b;
				case BinOp.div:
					return a / b;
				case BinOp.mod:
					return a % b;
				case BinOp.xor:
					return a ^ b;
				case BinOp.lessEqual:
					return a <= b ? 1 : 0;
				case BinOp.gtEqual:
					return a >= b ? 1 : 0;
				case BinOp.less:
					return a < b ? 1 : 0;
				case BinOp.greater:
					return a > b ? 1 : 0;
				case BinOp.different:
					return a != b ? 1 : 0;
				case BinOp.equal:
					return a === b ? 1 : 0;
				case BinOp.binAnd:
					return a & b;
				case BinOp.binOr:
					return a | b;
			}
			return 0;
		}

		private uBinOp(binop: BinOp) {
			do {
				this.checkN(2);
				const tmp1 = this.stack.peek();
				this.stack.pop();
				const tmp2 = this.stack.peek();
				this.stack.set(this.evalBinOp(tmp2, tmp1, binop));
			} while (false);
		}

		// TODO: exaluate
		/**
		 * Return the result of evaluating this expression using the
		 * specified expression context.  The expression stack will be
		 * initialized with the given arguments such that the first
		 * arguments is at the top of the stack and the last argument
		 * at the bottom of the stack.
		 *
		 * Throws expr_error if there is an error evaluating the
		 * expression (such as an unknown operation, stack underflow,
		 * bounds error, etc.)
		 */
		public evaluate(args: Array<number>): ExprResult {
			// The stack machine's stack.  The top of the stack is
			// stack.peek().
			// XXX This stack must be in target machine representation,
			// since I see both (DW_OP_breg0 (eax): -28; DW_OP_stack_value)
			// and (DW_OP_lit1; DW_OP_stack_value).
			this.stack = new Stack<number>();
			for (let i = 0; i < 8; ++i) this.stack.push(0);

			// Create the initial stack.  arguments are in reverse order
			// (that is, element 0 is TOS), so reverse it.
			if (args && args.length > 0) {
				for (let i = args.length - 1; i >= 0; --i) {
					this.stack.push(args[i]);
				}
			}

			// Create a subsection for just this expression so we can
			// easily detect the end (including premature end).
			const cusec = this.cu.data();
			const subsec = new Dwarf.Section(
				cusec.type,
				cusec.begin + this.offset,
				this.size,
				cusec.ord,
				cusec.fmt,
				cusec.addrSize,
			);
			let cur = new Dwarf.Cursor(this.cu.dv, subsec);

			// Prepare the expression result.  Some location descriptions
			// create the result directly, rather than using the top of
			// stack.
			let result = new ExprResult();

			// 2.6.1.1.4 Empty location descriptions
			if (cur.end()) {
				result.locationType = ExprResultType.empty;
				result.value = 0;
				return result;
			}

			// Assume the result is an address for now and should be
			// grabbed from the top of stack at the end.
			result.locationType = ExprResultType.address;

			const st = this.stack;

			// Execute!
			while (!cur.end()) {
				let tmp1 = 0; // x86
				let tmp2 = 0; // x86
				let tmp3 = 0; // x86

				const op = cur.fixedUInt8();
				const opEnum = op as DwarfData.DW_OP;
				switch (opEnum) {
					// 2.5.1.1 Literal encodings
					case DwarfData.DW_OP.addr:
						st.push(cur.address());
						break;
					case DwarfData.DW_OP.const1u:
						st.push(cur.fixedUInt8());
						break;
					case DwarfData.DW_OP.const2u:
						st.push(cur.fixedUInt16());
						break;
					case DwarfData.DW_OP.const4u:
						st.push(cur.fixedUInt32());
						break;
					case DwarfData.DW_OP.const8u:
						st.push(cur.fixedUInt64());
						break;
					case DwarfData.DW_OP.const1s:
						st.push(cur.fixedInt8());
						break;
					case DwarfData.DW_OP.const2s:
						st.push(cur.fixedInt16());
						break;
					case DwarfData.DW_OP.const4s:
						st.push(cur.fixedInt32());
						break;
					case DwarfData.DW_OP.const8s:
						st.push(cur.fixedInt64());
						break;
					case DwarfData.DW_OP.constu:
						st.push(cur.uleb128());
						break;
					case DwarfData.DW_OP.consts:
						st.push(cur.sleb128());
						break;

					// 2.5.1.2 Register based addressing
					case DwarfData.DW_OP.fbreg:
						// XXX
						throw new Error("DW_OP_fbreg not implemented");

					case DwarfData.DW_OP.bregx:
						//tmp1.u = cur.uleb128();
						//tmp2.s = cur.sleb128();
						//st.push((int64_t)ctx->reg(tmp1.u) + tmp2.s);
						//break;
						throw new Error("DW_OP_breg* operations not supported");

					// 2.5.1.3 Stack operations
					case DwarfData.DW_OP.dup:
						this.check();
						st.push(st.peek());
						break;
					case DwarfData.DW_OP.drop:
						this.check();
						st.pop();
						break;
					case DwarfData.DW_OP.pick:
						tmp1 = cur.fixedUInt8();
						this.checkN(tmp1);
						st.push(st.revat(tmp1));
						break;
					case DwarfData.DW_OP.over:
						this.checkN(2);
						st.push(st.revat(1));
						break;
					case DwarfData.DW_OP.swap:
						this.checkN(2);
						tmp1 = st.peek();
						st.set(st.revat(1));
						st.set(tmp1, 1);
						break;
					case DwarfData.DW_OP.rot:
						this.checkN(3);
						tmp1 = st.peek();
						st.set(st.revat(1));
						st.set(st.revat(2), 1);
						st.set(tmp1, 2);
						break;
					case DwarfData.DW_OP.deref:
						//tmp1.u = subsec->addr_size;
						//goto deref_common;
						throw new Error("DW_OP_deref operations not supported");
					case DwarfData.DW_OP.deref_size:
						//tmp1.u = cur.fixedUInt8();
						//if (tmp1.u > subsec->addr_size)
						//        throw new Error("DW_OP_deref_size operand exceeds address size");
						//deref_common:
						//this.check();
						//st.back() = ctx->deref_size(st.back(), tmp1.u);
						//break;
						throw new Error("DW_OP_deref_size operations not supported");
					case DwarfData.DW_OP.xderef:
						//tmp1.u = subsec->addr_size;
						//goto xderef_common;
						throw new Error("DW_OP_xderef operations not supported");
					case DwarfData.DW_OP.xderef_size:
						//tmp1.u = cur.fixedUInt8();
						//if (tmp1.u > subsec->addr_size)
						//        throw new Error("DW_OP_xderef_size operand exceeds address size");
						//xderef_common:
						//this.checkN(2);
						//tmp2.u = st.back();
						//st.pop_back();
						//st.back() = ctx->xderef_size(tmp2.u, st.back(), tmp1.u);
						//break;
						throw new Error("DW_OP_xderef_size operations not supported");
					case DwarfData.DW_OP.push_object_address:
						// XXX
						throw new Error("DW_OP_push_object_address not implemented");
					case DwarfData.DW_OP.form_tls_address:
						//this.check();
						//st.back() = ctx->form_tls_address(st.back());
						//break;
						throw new Error("DW_OP_form_tls_address operations not supported");
					case DwarfData.DW_OP.call_frame_cfa:
						// XXX
						throw new Error("DW_OP_call_frame_cfa not implemented");

					// 2.5.1.4 Arithmetic and logical operations
					case DwarfData.DW_OP.abs:
						this.check();
						tmp1 = st.peek();
						if (tmp1 < 0) tmp1 = -tmp1;
						st.set(tmp1);
						break;
					case DwarfData.DW_OP.and_:
						this.uBinOp(BinOp.binAnd);
						break;
					case DwarfData.DW_OP.div:
						this.checkN(2);
						tmp1 = st.peek();
						st.pop();
						tmp2 = st.peek();
						tmp3 = tmp1 / tmp2;
						st.set(tmp3);
						break;
					case DwarfData.DW_OP.minus:
						this.uBinOp(BinOp.minus);
						break;
					case DwarfData.DW_OP.mod:
						this.uBinOp(BinOp.mod);
						break;
					case DwarfData.DW_OP.mul:
						this.uBinOp(BinOp.mul);
						break;
					case DwarfData.DW_OP.neg:
						this.check();
						tmp1 = st.peek();
						tmp1 = -tmp1;
						st.set(tmp1);
						break;
					case DwarfData.DW_OP.not_:
						this.check();
						st.set(~st.peek());
						break;
					case DwarfData.DW_OP.or_:
						this.uBinOp(BinOp.binOr);
						break;
					case DwarfData.DW_OP.plus:
						this.uBinOp(BinOp.plus);
						break;
					case DwarfData.DW_OP.plus_uconst:
						tmp1 = cur.uleb128();
						this.check();
						st.set(st.peek() + tmp1);
						break;
					case DwarfData.DW_OP.shl:
						this.checkN(2);
						tmp1 = st.peek();
						st.pop();
						tmp2 = st.peek();
						// C++ does not define what happens if you
						// shift by more bits than the width of the
						// type, so we handle this case specially
						//if (tmp1.u < sizeof(tmp2.u)*8)
						if (tmp1 < 8 * 8) st.set(tmp2 << tmp1);
						else st.set(0);
						break;
					case DwarfData.DW_OP.shr:
						this.checkN(2);
						tmp1 = st.peek();
						st.pop();
						tmp2 = st.peek();
						// Same as above
						//if (tmp1.u < sizeof(tmp2.u)*8)
						if (tmp1 < 8 * 8) st.set(tmp2 >> tmp1);
						else st.set(0);
						break;
					case DwarfData.DW_OP.shra:
						this.checkN(2);
						tmp1 = st.peek();
						st.pop();
						tmp2 = st.peek();
						// Shifting a negative number is
						// implementation-defined in C++.
						tmp3 = tmp2 < 0 ? 1 : 0;
						if (tmp3) tmp2 = -tmp2;
						//if (tmp1 < sizeof(tmp2.u)*8)
						if (tmp1 < 8 * 8) tmp2 >>= tmp1;
						else tmp2 = 0;
						// DWARF implies that over-shifting a negative
						// number should result in 0, not ~0.
						if (tmp3) tmp2 = -tmp2;
						st.set(tmp2);
						break;
					case DwarfData.DW_OP.xor_:
						this.uBinOp(BinOp.xor);
						break;

					// 2.5.1.5 Control flow operations
					case DwarfData.DW_OP.le:
						this.uBinOp(BinOp.lessEqual);
						break;
					case DwarfData.DW_OP.ge:
						this.uBinOp(BinOp.gtEqual);
						break;
					case DwarfData.DW_OP.eq:
						this.uBinOp(BinOp.equal);
						break;
					case DwarfData.DW_OP.lt:
						this.uBinOp(BinOp.less);
						break;
					case DwarfData.DW_OP.gt:
						this.uBinOp(BinOp.greater);
						break;
					case DwarfData.DW_OP.ne:
						this.uBinOp(BinOp.different);
						break;
					case DwarfData.DW_OP.skip:
						tmp1 = cur.fixedInt16();
						cur = new Dwarf.Cursor(
							this.cu.dv,
							subsec,
							cur.getSectionOffset() + tmp1,
						);
						break;
					case DwarfData.DW_OP.bra:
						tmp1 = cur.fixedInt16();
						this.check();
						tmp2 = st.peek();
						st.pop();
						if (tmp2 == 0) break;
						cur = new Dwarf.Cursor(
							this.cu.dv,
							subsec,
							cur.getSectionOffset() + tmp1,
						);
						break;
					case DwarfData.DW_OP.call2:
					case DwarfData.DW_OP.call4:
					case DwarfData.DW_OP.call_ref:
						// XXX
						throw new Error("RelOp " + op + " not implemented!");

					// 2.5.1.6 Special operations
					case DwarfData.DW_OP.nop:
						break;

					// 2.6.1.1.2 Register location descriptions
					case DwarfData.DW_OP.regx:
						result.locationType = ExprResultType.reg;
						result.value = cur.uleb128();
						break;

					// 2.6.1.1.3 Implicit location descriptions
					case DwarfData.DW_OP.implicit_value:
						result.locationType = ExprResultType.implicit;
						result.implicitLen = cur.uleb128();
						cur.ensure(result.implicitLen);
						result.implicit = cur.pos;
						break;
					case DwarfData.DW_OP.stack_value:
						this.check();
						result.locationType = ExprResultType.literal;
						result.value = st.peek();
						break;

					// 2.6.1.2 Composite location descriptions
					case DwarfData.DW_OP.piece:
					case DwarfData.DW_OP.bit_piece:
						// XXX
						throw new Error(op + " is not implemented");

					default:
						if (op >= DwarfData.DW_OP.reg0 && op <= DwarfData.DW_OP.reg31) {
							result.locationType = ExprResultType.reg;
							result.value = op - DwarfData.DW_OP.reg0;
							break;
						}

						if (op >= DwarfData.DW_OP.breg0 && op <= DwarfData.DW_OP.breg31) {
							//tmp1 = op - DwarfData.DW_OP.breg0;
							//tmp2 = cur.sleb128();
							//st.push((int64_t)ctx->reg(tmp1.u) + tmp2.s);
							//break;
							throw new Error("DW_OP_breg* operations not supported");
						}

						if (
							op >= DwarfData.DW_OP.lo_user &&
							op <= DwarfData.DW_OP.hi_user
						) {
							// XXX We could let the context evaluate this,
							// but it would need access to the cursor.
							throw new Error("unknown user op " + op);
						}

						if (op >= DwarfData.DW_OP.lit0 && op <= DwarfData.DW_OP.lit31) {
							st.push(op - DwarfData.DW_OP.lit0);
							break;
						}
						throw new Error("bad operation " + op);
				}
			} // while

			if (result.locationType == ExprResultType.address) {
				// The result type is still and address, so we should
				// fetch it from the top of stack.
				if (st.isEmpty())
					throw new Error("final stack is empty; no result given");
				result.value = st.peek();
			}

			return result;
		}
	} // Expression

	/**
	 * An entry in a range list.  The range spans addresses [low, high).
	 */
	export class RangeListEntry {
		low: number;
		high: number;

		constructor(low: number, high: number) {
			this.low = low;
			this.high = high;
		}

		/**
		 * Return true if addr is within this entry's bounds.
		 */
		public contains(addr: number): boolean {
			return this.low <= addr && addr < this.high;
		}
	}
} // namespace DwarfDie
