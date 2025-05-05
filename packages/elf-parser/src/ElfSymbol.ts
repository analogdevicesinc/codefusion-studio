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
import * as Enums from "./enums.js";
import { ElfDataModel } from "./ElfDataModel.js";
import { ElfSectionHeader } from "./ElfSectionHeader.js";
import { ElfFileData } from "./ElfFileData.js";
import { ResolveItem } from "./ResolveItem.js";

/**
 * Represents the ELF symbol table.
 */
export class ElfSymbol {
	/**
	 * The section table associated with the symbol table.
	 */
	public sectionTable: ElfSectionHeader;

	/**
	 * An array of symbol data entries.
	 */
	public symbolData: Array<ElfSymbolData> = [];

	private elfDataModel: ElfDataModel;

	/**
	 * Constructs a new instance of the ElfSymbol class.
	 * @param sectionTable The section table associated with the symbol table.
	 * @param elfModel The ElfDataModel instance.
	 */
	constructor(sectionTable: ElfSectionHeader, elfModel: ElfDataModel) {
		this.sectionTable = sectionTable;
		this.elfDataModel = elfModel;
	}

	/**
	 * Loads the symbol table data.
	 */
	public load(ebug = false): void {
		// Calculate the number of entries in the symbol table
		let numOfEntries: number =
			Number(BigInt.asUintN(32, this.sectionTable.size)) /
			Number(BigInt.asUintN(32, this.sectionTable.entitySize));

		// Iterate over each entry in the symbol table
		for (let i: number = 0; i < numOfEntries; i++) {
			// Create a new instance of ElfSymbolData for the current entry
			let symEntry: ElfSymbolData = new ElfSymbolData(
				i,
				this,
				this.elfDataModel,
			);

			// Load the symbol data for the current entry
			symEntry.load(
				Number(BigInt.asUintN(32, this.sectionTable.offset)) +
					i * Number(BigInt.asUintN(32, this.sectionTable.entitySize)),
			);

			// Add the symbol entry to the symbolData array
			this.symbolData.push(symEntry);
		}
	}
}

/**
 * Represents the data of an ELF symbol.
 */
export class ElfSymbolData {
	private symTable: ElfSymbol;
	private elfDataModel: ElfDataModel;
	private fileAccess: ElfFileData;

	public index: number;
	public name: number;
	public info: number;
	public infoType: Enums.sym_type;
	public infoBinding: Enums.sym_binding;
	public other: number;
	public otherVisibility: Enums.sym_visibility;
	public sectionHeaderIndex: number;
	public value: bigint;
	public size: bigint;
	public stack: number;

	// Grap stack information
	public hasGraphStack = false;
	public graphStack = 0;
	public recursiveType = Enums.FunctionRecursiveType.NoRecursion;
	public callees = new Set<ElfSymbolData>();
	public maxDepth: number;

	public nameStr: string;
	public demangledName: string;
	public demangledNameSource = "";
	public sectionNameStr: string; // can be null!

	// Debug info
	public path: string = null;
	public line = 0;
	public column = 0;
	public fromDies = false;
	public debugAddress = 0;

	// DB related info
	public dbId: number;

	/**
	 * Constructs a new instance of the `ElfSymbolData` class.
	 * @param index - The index of the symbol.
	 * @param symTable - The symbol table.
	 * @param elfModel - The ELF data model.
	 */
	constructor(index: number, symTable: ElfSymbol, elfModel: ElfDataModel) {
		this.index = index;
		this.symTable = symTable;
		this.elfDataModel = elfModel;
		this.fileAccess = elfModel.elfFileAccess;
	}

	/**
	 * Loads the symbol data from the specified start address.
	 * @param startAddress - The start address to load the symbol data from.
	 */
	public load(startAddress: number): void {
		let curOff: number = startAddress;

		const ELF32_SIZE = 4;
		const ELF64_SIZE = 8;
		const NAME_SIZE = 4;
		const INFO_SIZE = 1;
		const OTHER_SIZE = 1;
		const SECTIONINDEX_SIZE = 2;

		let elemSize: number = this.elfDataModel.elfHeader.isELF64Bit()
			? ELF64_SIZE
			: ELF32_SIZE;

		this.name = ResolveItem.Get32BitValue(this.fileAccess, curOff, NAME_SIZE);
		curOff += NAME_SIZE;

		if (this.elfDataModel.elfHeader.isELF64Bit()) {
			this.info = ResolveItem.Get32BitValue(this.fileAccess, curOff, INFO_SIZE);
			curOff += INFO_SIZE;
			this.other = ResolveItem.Get32BitValue(
				this.fileAccess,
				curOff,
				OTHER_SIZE,
			);
			curOff += OTHER_SIZE;
			this.sectionHeaderIndex = ResolveItem.Get32BitValue(
				this.fileAccess,
				curOff,
				SECTIONINDEX_SIZE,
			);
			curOff += SECTIONINDEX_SIZE;
		}

		this.value = ResolveItem.Get64BitValue(this.fileAccess, curOff, elemSize);
		curOff += elemSize;
		this.size = ResolveItem.Get64BitValue(this.fileAccess, curOff, elemSize);
		curOff += elemSize;

		if (!this.elfDataModel.elfHeader.isELF64Bit()) {
			this.info = ResolveItem.Get32BitValue(this.fileAccess, curOff, INFO_SIZE);
			curOff += INFO_SIZE;
			this.other = ResolveItem.Get32BitValue(
				this.fileAccess,
				curOff,
				OTHER_SIZE,
			);
			curOff += OTHER_SIZE;
			this.sectionHeaderIndex = ResolveItem.Get32BitValue(
				this.fileAccess,
				curOff,
				SECTIONINDEX_SIZE,
			);
			curOff += SECTIONINDEX_SIZE;
		}

		const INFO_TYPE_MASK = 0x0f;
		const INFO_BINDING_SHIFT = 4;
		const OTHER_VISIBILITY_MASK = 0x03;

		this.infoType = this.info & INFO_TYPE_MASK;
		this.infoBinding = this.info >> INFO_BINDING_SHIFT;
		this.otherVisibility = this.other & OTHER_VISIBILITY_MASK;
	}

	/**
	 * Gets the symbol name as a string.
	 * @returns The symbol name.
	 */
	public getSymNameString(): string {
		let str: string = "";
		const NAME_NOT_FOUND = 0;
		if (this.name !== NAME_NOT_FOUND) {
			let symStrTableIdx: number = this.symTable.sectionTable.link;
			if (symStrTableIdx < this.elfDataModel.getNumOfSectionHeaderTables()) {
				let symStringTableFileOffset: number = Number(
					BigInt.asUintN(
						32,
						this.elfDataModel.elfSectionHeaders[symStrTableIdx].offset,
					),
				);
				let secNameStringFileOffset: number =
					symStringTableFileOffset + this.name;
				let strMaxLength: number =
					symStringTableFileOffset +
					Number(
						BigInt.asUintN(
							32,
							this.elfDataModel.elfSectionHeaders[symStrTableIdx].size,
						),
					) -
					secNameStringFileOffset;

				try {
					/* read actual string */
					str = this.fileAccess.readNullTerminatedString(
						secNameStringFileOffset,
						strMaxLength,
					);
				} catch (error) {
					console.error("Error reading symbol name string:", error);
				}
			} else {
				console.error("Invalid symbol string table index:", symStrTableIdx);
			}
		}
		return str;
	}

	public cacheName() {
		this.nameStr = this.getSymNameString();
		// In case section symbols don't have a name, use section name
		if (this.nameStr.length == 0 && this.infoType === Enums.sym_type.SECTION) {
			this.nameStr = this.sectionNameStr;
		}
	}

	public cacheSectionName(md: ElfDataModel) {
		this.sectionNameStr = md.getSectionName(this.sectionHeaderIndex);
	}
}
