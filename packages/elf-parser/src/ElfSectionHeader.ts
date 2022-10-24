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
import { ElfFileData } from "./ElfFileData.js";
import { ResolveItem } from "./ResolveItem.js";
import { ElfDataModel } from "./ElfDataModel.js";

/**
 * Represents an ELF section header.
 */
export class ElfSectionHeader {
	private elfFileAccess: ElfFileData;
	public index: number;
	private elfDataModel: ElfDataModel;

	public name: number;
	public type: Enums.sh_type;
	public flags: Enums.sh_flags;
	public address: bigint;
	public offset: bigint;
	public size: bigint;
	public link: number;
	public info: number;
	public addressAlignment: bigint;
	public entitySize: bigint;

	// Cached name obtained with getShNameString
	public shName: string;

	/**
	 * Creates an instance of ElfSectionHeader.
	 * @param headerIndex - The index of the section header.
	 * @param fileAccess - The ElfFileData object for accessing the ELF file.
	 * @param elfModel - The ElfDataModel object representing the ELF file.
	 */
	constructor(
		headerIndex: number,
		fileAccess: ElfFileData,
		elfModel: ElfDataModel,
	) {
		this.index = headerIndex;
		this.elfFileAccess = fileAccess;
		this.elfDataModel = elfModel;
	}

	/**
	 * Loads the section header from the specified start address.
	 * @param startAddress - The start address to load the section header from.
	 */
	public load(startAddress: number): void {
		let curOff: number = startAddress;

		const ELF32_SIZE = 4;
		const ELF64_SIZE = 8;
		const NAME_SIZE = 4;
		const TYPE_SIZE = 4;
		const LINK_SIZE = 4;
		const INFO_SIZE = 4;

		const elemSize: number = this.elfDataModel.elfHeader.isELF64Bit()
			? ELF64_SIZE
			: ELF32_SIZE;

		this.name = ResolveItem.Get32BitValue(
			this.elfFileAccess,
			curOff,
			NAME_SIZE,
		);
		curOff += NAME_SIZE;

		this.type = ResolveItem.Get32BitValue(
			this.elfFileAccess,
			curOff,
			TYPE_SIZE,
		);
		curOff += TYPE_SIZE;

		this.flags = Number(
			ResolveItem.Get64BitValue(this.elfFileAccess, curOff, elemSize),
		);
		curOff += elemSize;

		this.address = ResolveItem.Get64BitValue(
			this.elfFileAccess,
			curOff,
			elemSize,
		);

		curOff += elemSize;
		this.offset = ResolveItem.Get64BitValue(
			this.elfFileAccess,
			curOff,
			elemSize,
		);

		curOff += elemSize;
		this.size = ResolveItem.Get64BitValue(this.elfFileAccess, curOff, elemSize);
		curOff += elemSize;

		this.link = ResolveItem.Get32BitValue(
			this.elfFileAccess,
			curOff,
			LINK_SIZE,
		);
		curOff += LINK_SIZE;

		this.info = ResolveItem.Get32BitValue(
			this.elfFileAccess,
			curOff,
			INFO_SIZE,
		);
		curOff += INFO_SIZE;

		this.addressAlignment = ResolveItem.Get64BitValue(
			this.elfFileAccess,
			curOff,
			elemSize,
		);
		curOff += elemSize;
		this.entitySize = ResolveItem.Get64BitValue(
			this.elfFileAccess,
			curOff,
			elemSize,
		);
		curOff += elemSize;
	}

	/**
	 * Gets the string representation of the section name.
	 * @returns The string representation of the section name.
	 */
	public getShNameString(): string {
		const secNameSectionIdx =
			this.elfDataModel.elfHeader.sectionHeaderStringTableIndex;
		const SECTION_NOT_FOUND = 0;

		let str = ""; // Initialize str as an empty string

		if (secNameSectionIdx === SECTION_NOT_FOUND) {
			return str;
		}

		const strSec = this.elfDataModel.elfSectionHeaders[secNameSectionIdx];
		const strStartOffset =
			Number(BigInt.asUintN(32, strSec.offset)) + this.name;
		const strMaxLength =
			Number(BigInt.asUintN(32, strSec.offset)) +
			Number(BigInt.asUintN(32, strSec.size)) -
			strStartOffset;

		try {
			// Read the string
			str = this.elfFileAccess.readNullTerminatedString(
				strStartOffset,
				strMaxLength,
			);
		} catch (error) {
			console.error("Error reading section name:", error);
		}

		return str; // Return the section name string
	}

	public getTypeString(): string {
		if (this.type in Enums.sh_type) {
			return Enums.sh_type[this.type].substring(4); // remove 'SHT_' prefix
		}
		console.warn(`Unknown section type ${this.type}`);
		return "UNKNOWN";
	}

	public cacheShNameString() {
		this.shName = this.getShNameString();
	}

	public getFlagsString(): string {
		let ret = "";
		for (const [ko, vo] of Object.entries(Enums.sh_flags)) {
			const flg = vo as Enums.sh_flags;
			if ((this.flags & flg) === flg) {
				const key = ko.toString();
				if (key.startsWith("SHF_")) {
					if (ret.length > 0) ret += "|";
					ret += key.substring(4); // trim "SHF_"
				}
			}
		}
		return ret;
	}
}
