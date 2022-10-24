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
import { ElfArmAttributes } from "./ElfArmAttributes.js";
import * as Enums from "./enums.js";
import { ElfFileData } from "./ElfFileData.js";
import { ElfSectionHeader } from "./ElfSectionHeader.js";
import { ElfProgramHeader } from "./ElfProgramHeader.js";

export class Helper {
	/** The following block of code is based on the implementation found at
	 * [binutils](https://github.com/bminor/binutils-gdb/blob/master/include/elf/internal.h#L323) **/

	public isSectionInSegment(
		section: ElfSectionHeader,
		segment: ElfProgramHeader,
		checkVma = true,
		strict = true, // readelf uses ELF_SECTION_IN_SEGMENT_STRICT
	): boolean {
		let ret =
			//Only PT_LOAD, PT_GNU_RELRO and PT_TLS segments can contain SHF_TLS sections.
			((section.flags & Enums.sh_flags.SHF_TLS) !== 0 &&
				(segment.type === Enums.ph_type.PT_TLS ||
					segment.type === Enums.ph_type.PT_GNU_RELRO ||
					segment.type === Enums.ph_type.PT_LOAD)) ||
			//PT_TLS segment contains only SHF_TLS sections, PT_PHDR no	sections at all.
			((section.flags & Enums.sh_flags.SHF_TLS) == 0 &&
				segment.type !== Enums.ph_type.PT_TLS &&
				segment.type !== Enums.ph_type.PT_PHDR);

		if (!ret) return false;

		//PT_LOAD and similar segments only have SHF_ALLOC sections.
		if (
			(section.flags & Enums.sh_flags.SHF_ALLOC) == 0 &&
			(segment.type == Enums.ph_type.PT_LOAD ||
				segment.type == Enums.ph_type.PT_DYNAMIC ||
				segment.type == Enums.ph_type.PT_GNU_EH_FRAME ||
				segment.type == Enums.ph_type.PT_GNU_STACK ||
				segment.type == Enums.ph_type.PT_GNU_RELRO ||
				segment.type == Enums.ph_type.PT_GNU_SFRAME ||
				(segment.type >= Enums.ph_type.PT_GNU_MBIND_LO &&
					segment.type >= Enums.ph_type.PT_GNU_MBIND_HI))
		)
			return false;

		//Any section besides one of type SHT_NOBITS must have file offsets within the segment.
		ret =
			section.type === Enums.sh_type.SHT_NOBITS ||
			(section.offset >= segment.offset &&
				(!strict ||
					Number(section.offset - segment.offset) <=
						Number(segment.fileSize) - 1) &&
				Number(section.offset - segment.offset) +
					this.getElfSectionSize(section, segment) <=
					Number(segment.fileSize));
		if (!ret) return false;

		//SHF_ALLOC sections must have VMAs within the segment.
		ret =
			!checkVma ||
			(section.flags & Enums.sh_flags.SHF_ALLOC) == 0 ||
			(section.address >= segment.virtualAddress &&
				(!strict ||
					section.address - segment.virtualAddress <=
						Number(segment.memorySize) - 1) &&
				Number(section.address - segment.virtualAddress) +
					this.getElfSectionSize(section, segment) <=
					segment.memorySize);
		if (!ret) return false;

		//No zero size sections at start or end of PT_DYNAMIC nor PT_NOTE.
		ret =
			(segment.type !== Enums.ph_type.PT_DYNAMIC &&
				segment.type != Enums.ph_type.PT_NOTE) ||
			Number(section.size) != 0 ||
			Number(segment.memorySize) === 0 ||
			((section.type === Enums.sh_type.SHT_NOBITS ||
				(section.offset > segment.offset &&
					section.offset - segment.offset < segment.fileSize)) &&
				((section.flags & Enums.sh_flags.SHF_ALLOC) == 0 ||
					(section.address > segment.virtualAddress &&
						section.address - segment.virtualAddress < segment.memorySize)));
		return ret;
	}

	public parseEabiSection(
		fd: ElfFileData,
		offset: number,
		size: number,
	): ElfArmAttributes {
		let result: ElfArmAttributes = null;
		let fileOffset: number = offset;
		const max_size = offset + size;
		if (size < 1) {
			return result;
		}

		let version = "";
		const nb: number = fd.getDataView().getUint8(fileOffset);
		version = String.fromCharCode(nb);
		fileOffset += 1;

		if (version != "A") {
			return result;
		}

		while (fileOffset < max_size) {
			let subsect_size = 0;
			const savedFileOffset: number = fileOffset;
			subsect_size = fd
				.getDataView()
				.getUint32(fileOffset, fd.isLittleEndian());

			if (fileOffset + subsect_size > max_size) {
				return result;
			}
			fileOffset += 4;
			const vendor_name = this.parseNTBS(
				fd,
				fileOffset,
				savedFileOffset + subsect_size,
			);

			if (vendor_name.length > 0 && vendor_name === "aeabi") {
				fileOffset += vendor_name.length + 1;
				result = this.parserEabiSubsection(fd, fileOffset, subsect_size);
				break;
			}
			fileOffset = savedFileOffset + subsect_size;
		}
		return result;
	}

	private static parseLEB128(
		dv: DataView,
		offset: number,
		size: number,
		signed: boolean,
	): [number, number] {
		let shift = 0;
		let byte: number;
		let result = 0;
		let byte_offset: number = offset;
		while (byte_offset < size) {
			byte = dv.getUint8(byte_offset);
			result |= (byte & 0x7f) << shift;
			byte_offset++;

			shift += 7;
			if ((byte & 0x80) == 0) {
				if (signed && shift < 8 * 8 && byte & 0x40) {
					result |= Number(-BigInt.asUintN(64, 1n)) << shift;
				}
				break;
			}
		}
		return [result, byte_offset];
	}

	public static parseULEB128(
		dv: DataView,
		offset: number,
		size: number,
	): [number, number] {
		return Helper.parseLEB128(dv, offset, size, false);
	}

	public static parseSLEB128(
		dv: DataView,
		offset: number,
		size: number,
	): [number, number] {
		return Helper.parseLEB128(dv, offset, size, true);
	}

	private parseNTBS(fd: ElfFileData, offset: number, size: number): string {
		let byte: number;
		let result = "";

		while (offset < size) {
			byte = fd.getDataView().getUint8(offset);
			if (byte != 0) {
				result += String.fromCharCode(byte);
			}

			if (byte == 0) break;
			if (offset >= size) {
				return "";
			}
			++offset;
		}
		return result;
	}

	private parserEabiSubsection(
		fd: ElfFileData,
		offset: number,
		size: number,
	): ElfArmAttributes {
		let tag = 0;
		const result: ElfArmAttributes = new ElfArmAttributes();
		const max_size: number = offset + size;

		while (tag != 1 && offset < max_size) {
			tag = fd.getDataView().getUint8(offset);
			if (tag != 1) {
				offset += fd.getDataView().getUint32(offset + 1, fd.isLittleEndian());
			}
		}

		let max_size_local = 0,
			fileTagSize = 0;
		if (offset < max_size) {
			fileTagSize = fd.getDataView().getUint32(offset + 1, fd.isLittleEndian());
			max_size_local = offset + fileTagSize;
			offset += 5;
		}

		if (tag == 1 && fileTagSize > 0) {
			while (offset < max_size_local) {
				let [attrTag, ret_offset] = Helper.parseULEB128(
					fd.getDataView(),
					offset,
					max_size_local,
				);
				offset = ret_offset;
				let str = "";
				let num = 0;
				switch (attrTag) {
					case 4: // Tag_CPU_raw_name
					case 5: // Tag_CPU_name
					case 65: //Tag_also_compatible_with
					case 67: // Tag_conformance
					case 32: // Tag_compatibility
						str = this.parseNTBS(fd, offset, max_size_local);
						offset += str.length + 1;
						break;
					default:
						[num, ret_offset] = Helper.parseULEB128(
							fd.getDataView(),
							offset,
							max_size_local,
						);
						offset = ret_offset;
						break;
				}

				switch (attrTag) {
					case 4:
						result.Tag_CPU_raw_name = str;
						break;
					case 5:
						result.Tag_CPU_name = str;
						break;
					case 6:
						result.Tag_CPU_arch = num;
						break;
					case 7:
						result.Tag_CPU_arch_profile = num;
						break;
					case 8:
						result.Tag_ARM_ISA_use = num;
						break;
					case 9:
						result.Tag_THUMB_ISA_use = num;
						break;
					case 10:
						result.Tag_FP_arch = num;
						break;
					case 11:
						result.Tag_WMMX_arch = num;
						break;
					case 12:
						result.Tag_Advanced_SIMD_arch = num;
						break;
					case 13:
						result.Tag_PCS_config = num;
						break;
					case 14:
						result.Tag_ABI_PCS_R9_use = num;
						break;
					case 15:
						result.Tag_ABI_PCS_RW_data = num;
						break;
					case 16:
						result.Tag_ABI_PCS_RO_data = num;
						break;
					case 17:
						result.Tag_ABI_PCS_GOT_use = num;
						break;
					case 18:
						result.Tag_ABI_PCS_wchar_t = num;
						break;
					case 19:
						result.Tag_ABI_FP_rounding = num;
						break;
					case 20:
						result.Tag_ABI_FP_denormal = num;
						break;
					case 21:
						result.Tag_ABI_FP_exceptions = num;
						break;
					case 22:
						result.Tag_ABI_FP_user_exceptions = num;
						break;
					case 23:
						result.Tag_ABI_FP_number_model = num;
						break;
					case 24:
						result.Tag_ABI_align_needed = num;
						break;
					case 25:
						result.Tag_ABI_align_preserved = num;
						break;
					case 26:
						result.Tag_ABI_enum_size = num;
						break;
					case 27:
						result.Tag_ABI_HardFP_use = num;
						break;
					case 28:
						result.Tag_ABI_VFP_args = num;
						break;
					case 29:
						result.Tag_ABI_WMMX_args = num;
						break;
					case 30:
						result.Tag_ABI_optimization_goals = num;
						break;
					case 31:
						result.Tag_ABI_FP_optimization_goals = num;
						break;
					case 32:
						if (str == "0")
							result.Tag_compatibility = Enums.Tag_compatibility.No_TCSR;
						else if (str == "1")
							result.Tag_compatibility = Enums.Tag_compatibility.ABI;
						else result.Tag_compatibility = Enums.Tag_compatibility.No_ABI;
						break;
					case 34:
						result.Tag_CPU_unaligned_access = num;
						break;
					case 36:
						result.Tag_FP_HP_extension = num;
						break;
					case 38:
						result.Tag_ABI_FP_16bit_format = num;
						break;
					case 42:
						result.Tag_MPextension_use = num;
						break;
					case 44:
						result.Tag_DIV_use = num;
						break;
					case 46:
						result.Tag_DSP_extension = num;
						break;
					case 48:
						result.Tag_MVE_arch = num;
						break;
					case 50:
						result.Tag_PAC_extension = num;
						break;
					case 52:
						result.Tag_BTI_extension = num;
						break;
					case 64:
						result.Tag_nodefaults = num;
						break;
					case 65:
						result.Tag_also_compatible_with = str;
						break;
					case 67:
						result.Tag_conformance = str;
						break;
					case 66:
						result.Tag_T2EE_use = num;
						break;
					case 68:
						result.Tag_Virtualization_use = num;
						break;
					case 70:
						result.Tag_MPextension_use = num;
						break;
					case 72:
						result.Tag_FramePointer_use = num;
						break;
					case 74:
						result.Tag_BTI_use = num;
						break;
					case 76:
						result.Tag_PACRET_use = num;
						break;
				}
			}
		}
		return result;
	}

	private getElfSectionSize(
		section: ElfSectionHeader,
		segment: ElfProgramHeader,
	): number {
		return (section.flags & Enums.sh_flags.SHF_TLS) !== 0 &&
			section.type === Enums.sh_type.SHT_NOBITS &&
			segment.type !== Enums.ph_type.PT_TLS
			? 0
			: Number(section.size);
	}
}
