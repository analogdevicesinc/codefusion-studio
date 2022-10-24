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
import { ElfDataModel } from "./ElfDataModel.js";
import { ResolveItem } from "./ResolveItem.js";
import { ElfHeader } from "./ElfHeader.js";

/**
 * Represents an ELF program header.
 * The ELF program header describes the segments of an ELF file that are loaded into memory during execution.
 */
export class ElfProgramHeader {
	private fileData: ElfFileData;
	public index: number;
	private elfDataModel: ElfDataModel;

	public type: Enums.ph_type;
	public flags: Enums.ph_flags;
	public offset: bigint;
	public virtualAddress: bigint;
	public physicalAddress: bigint;
	public fileSize: bigint;
	public memorySize: bigint;
	public alignment: bigint;
	public sectionIndexList: Array<number>;

	constructor(
		elfDataModel: ElfDataModel,
		headerIndex: number,
		fileData: ElfFileData,
	) {
		this.fileData = fileData;
		this.index = headerIndex;
		this.elfDataModel = elfDataModel;
		this.sectionIndexList = new Array<number>();
	}

	public load(startAddress: number, elfHeader: ElfHeader): void {
		let currentOffset: number = startAddress;

		const ELF32_SIZE = 4;
		const ELF64_SIZE = 8;
		const TYPE_SIZE = 4;
		const FLAGS_SIZE = 4;

		// Description:
		// - ELF32_SIZE: The size in bytes of a 32-bit ELF element.
		// - ELF64_SIZE: The size in bytes of a 64-bit ELF element.
		// - TYPE_SIZE: The size in bytes of the Type field in the ELF program header.
		// - FLAGS_SIZE: The size in bytes of the Flags field in the ELF program header.

		let elementSize: number = elfHeader.isELF64Bit() ? ELF64_SIZE : ELF32_SIZE;

		this.type = ResolveItem.Get32BitValue(
			this.fileData,
			currentOffset,
			TYPE_SIZE,
		);
		currentOffset += TYPE_SIZE;

		if (elfHeader.isELF64Bit()) {
			this.flags = ResolveItem.Get32BitValue(
				this.fileData,
				currentOffset,
				FLAGS_SIZE,
			);
			currentOffset += FLAGS_SIZE;
		}

		this.offset = ResolveItem.Get64BitValue(
			this.fileData,
			currentOffset,
			elementSize,
		);
		currentOffset += elementSize;

		this.virtualAddress = ResolveItem.Get64BitValue(
			this.fileData,
			currentOffset,
			elementSize,
		);
		currentOffset += elementSize;

		this.physicalAddress = ResolveItem.Get64BitValue(
			this.fileData,
			currentOffset,
			elementSize,
		);
		currentOffset += elementSize;

		this.fileSize = ResolveItem.Get64BitValue(
			this.fileData,
			currentOffset,
			elementSize,
		);
		currentOffset += elementSize;

		this.memorySize = ResolveItem.Get64BitValue(
			this.fileData,
			currentOffset,
			elementSize,
		);
		currentOffset += elementSize;

		if (!elfHeader.isELF64Bit()) {
			this.flags = ResolveItem.Get32BitValue(
				this.fileData,
				currentOffset,
				FLAGS_SIZE,
			);
			currentOffset += FLAGS_SIZE;
		}

		this.alignment = ResolveItem.Get64BitValue(
			this.fileData,
			currentOffset,
			elementSize,
		);
		currentOffset += elementSize;
	}
}
