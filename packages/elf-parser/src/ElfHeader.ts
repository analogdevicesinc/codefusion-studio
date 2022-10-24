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

/**
 * Represents the ELF file header.
 * This class contains information about the ELF file format, such as the magic number, class type, data encoding, version, OS ABI, and more.
 */
export class ElfHeader {
	private fileAccess: ElfFileData;

	public magicNumber: string;
	public classType: Enums.EI_CLASS;
	public dataEncoding: Enums.EI_DATA;
	public version: Enums.e_version;
	public osAbi: Enums.EI_OSABI;
	public osAbiVersion: number;

	public fileType: Enums.e_type;
	public machine: Enums.e_machine;
	public elfVersion: Enums.e_version;
	public entryPoint: bigint;
	public programHeaderOffset: bigint;
	public sectionHeaderOffset: bigint;
	public flags: Enums.e_flags;
	public headerSize: number;
	public programHeaderEntrySize: number;
	public programHeaderEntryCount: number;
	public sectionHeaderEntrySize: number;
	public sectionHeaderEntryCount: number;
	public sectionHeaderStringTableIndex: number;

	constructor(fileAccess: ElfFileData) {
		this.fileAccess = fileAccess;
	}

	public load(): Enums.DataResult {
		const ELF_HEADER_SIZE = 52;

		if (this.fileAccess.getDataView().byteLength < ELF_HEADER_SIZE)
			return Enums.DataResult.INVALID;

		let currentOffset = 0;

		const ELF32_SIZE = 4;
		const ELF64_SIZE = 8;
		const MAGIC_SIZE = 4;
		const TYPE_SIZE = 1;
		const ENCODING_SIZE = 1;
		const VERSION_SIZE = 1;
		const OSABI_SIZE = 1;
		const OSABIVERSION_SIZE = 1;
		const MACHINE_SIZE = 2;
		const FILETYPE_SIZE = 2;
		const ELFVERSION_SIZE = 4;
		const FLAGS_SIZE = 4;
		const HEADER_SIZE = 2;

		// Description:
		// - ELF32_SIZE: The size in bytes of a 32-bit ELF element.
		// - ELF64_SIZE: The size in bytes of a 64-bit ELF element.
		// - MAGIC_SIZE: The size in bytes of the magic number in the ELF header.
		// - TYPE_SIZE: The size in bytes of the Type field in the ELF header.
		// - ENCODING_SIZE: The size in bytes of the Data Encoding field in the ELF header.
		// - VERSION_SIZE: The size in bytes of the Version field in the ELF header.
		// - OSABI_SIZE: The size in bytes of the OS ABI field in the ELF header.
		// - OSABIVERSION_SIZE: The size in bytes of the OS ABI Version field in the ELF header.
		// - MACHINE_SIZE: The size in bytes of the Machine field in the ELF header.
		// - FILETYPE_SIZE: The size in bytes of the File Type field in the ELF header.
		// - ELFVERSION_SIZE: The size in bytes of the ELF Version field in the ELF header.
		// - FLAGS_SIZE: The size in bytes of the Flags field in the ELF header.
		// - HEADER_SIZE: The size in bytes of the Header Size field in the ELF header.

		this.magicNumber = this.fileAccess.readNullTerminatedString(
			currentOffset,
			MAGIC_SIZE,
		);
		if (
			this.magicNumber.length != 4 ||
			this.magicNumber.charCodeAt(0) != 0x7f ||
			this.magicNumber.charCodeAt(1) != 0x45 || // E
			this.magicNumber.charCodeAt(2) != 0x4c || // L
			this.magicNumber.charCodeAt(3) != 0x46 // F
		) {
			console.error(
				`Wrong ELF magicNumber. Expecting 0x7f ELF. len:${this.magicNumber.length}. chars:`,
			);
			for (let i = 0; i < this.magicNumber.length; ++i)
				console.error(
					`  [${i}]: "${this.magicNumber.charCodeAt(i).toString(16)}"`,
				);
			return Enums.DataResult.INVALID;
		}
		currentOffset += MAGIC_SIZE;

		this.classType = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			TYPE_SIZE,
		);
		currentOffset += TYPE_SIZE;

		const elementSize = this.isELF64Bit() ? ELF64_SIZE : ELF32_SIZE;

		this.dataEncoding = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			ENCODING_SIZE,
		);

		this.fileAccess.setLittleEndian(
			this.dataEncoding == Enums.EI_DATA.ELFDATA2LSB,
		);
		currentOffset += ENCODING_SIZE;

		this.version = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			VERSION_SIZE,
		);
		currentOffset += VERSION_SIZE;

		this.osAbi = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			OSABI_SIZE,
		);
		currentOffset += OSABI_SIZE;

		this.osAbiVersion = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			OSABIVERSION_SIZE,
		);
		currentOffset += OSABIVERSION_SIZE;

		// Reserved bytes

		currentOffset = 16;
		this.fileType = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			FILETYPE_SIZE,
		);
		currentOffset += FILETYPE_SIZE;

		this.machine = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			MACHINE_SIZE,
		);
		currentOffset += MACHINE_SIZE;

		this.elfVersion = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			ELFVERSION_SIZE,
		);
		currentOffset += ELFVERSION_SIZE;

		this.entryPoint = ResolveItem.Get64BitValue(
			this.fileAccess,
			currentOffset,
			elementSize,
		);
		currentOffset += elementSize;
		this.programHeaderOffset = ResolveItem.Get64BitValue(
			this.fileAccess,
			currentOffset,
			elementSize,
		);
		currentOffset += elementSize;
		this.sectionHeaderOffset = ResolveItem.Get64BitValue(
			this.fileAccess,
			currentOffset,
			elementSize,
		);
		currentOffset += elementSize;

		this.flags = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			FLAGS_SIZE,
		);
		currentOffset += FLAGS_SIZE;

		this.headerSize = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			HEADER_SIZE,
		);
		currentOffset += HEADER_SIZE;

		this.programHeaderEntrySize = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			HEADER_SIZE,
		);
		currentOffset += HEADER_SIZE;

		this.programHeaderEntryCount = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			HEADER_SIZE,
		);
		currentOffset += HEADER_SIZE;

		this.sectionHeaderEntrySize = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			HEADER_SIZE,
		);
		currentOffset += HEADER_SIZE;

		this.sectionHeaderEntryCount = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			HEADER_SIZE,
		);
		//console.log(
		//	`sectionHeaderEntryCount: ${this.sectionHeaderEntryCount}` +
		//		` LE:${this.fileAccess.isLittleEndian()}` +
		//		` EntryPoint:${this.entryPoint}` +
		//		` elemSize:${elementSize}` +
		//		"",
		//);
		currentOffset += HEADER_SIZE;

		this.sectionHeaderStringTableIndex = ResolveItem.Get32BitValue(
			this.fileAccess,
			currentOffset,
			HEADER_SIZE,
		);
		currentOffset += HEADER_SIZE;

		return Enums.DataResult.OK;
	}

	public isELF64Bit(): boolean {
		return this.classType == Enums.EI_CLASS.ELFCLASS64;
	}
}
