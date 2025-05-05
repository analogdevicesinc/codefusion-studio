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
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ElfFileParser, SYMBOLS_TABLE_ID } from "elf-parser";
import { getMachineFlags } from "./elf-flags-handler.js";
import { ph_flags, ph_type } from "elf-parser/dist/enums.js";
import { ElfProgramHeader } from "elf-parser/dist/ElfProgramHeader.js";
import { ElfSectionHeader } from "elf-parser/dist/ElfSectionHeader.js";
import { ElfDataModel } from "elf-parser/dist/ElfDataModel.js";

export interface HeaderResponseData {
	[key: string]: string | number;
	headerSize: number;
	entryPoint: string | number;
	flags: number;
	osAbi: number;
	osAbiVersion: number;
	classType: number;
	dataEncoding: number;
	magicNumber: string | number;
	version: number;
	machine: number;
	programHeaderOffset: string | number;
	programHeaderEntrySize: number;
	programHeaderEntryCount: number;
	sectionHeaderOffset: string | number;
	sectionHeaderEntrySize: number;
	sectionHeaderEntryCount: number;
	sectionHeaderStringTableIndex: number;
	fileType: number;
	elfVersion: number;
}

export interface HeaderInfo {
	label: string;
	value: string | number;
}

const mapFieldValueToMeaning = (
	field: keyof HeaderResponseData,
	value: string | number
): string | number => {
	const mappingFunction = valueMappings[field];

	if (typeof mappingFunction === "function") {
		return mappingFunction(value);
	} else {
		return value;
	}
};

export const convertHeaderBigIntsToStrings = (
	headerInfo: Record<string, unknown>
): HeaderResponseData => {
	const convertedHeader: HeaderResponseData =
		{} as HeaderResponseData;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	Object.entries(headerInfo).forEach(([key, value]) => {
		if (typeof value === "bigint") {
			convertedHeader[key as keyof HeaderResponseData] =
				value.toString();
		} else {
			convertedHeader[key as keyof HeaderResponseData] =
				value as HeaderResponseData[keyof HeaderResponseData];
		}
	});

	return convertedHeader;
};

export const convertHeaderBigIntsToNumber = (
	headerInfo: Record<string, unknown>
): HeaderResponseData => {
	const convertedHeader: HeaderResponseData =
		{} as HeaderResponseData;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	Object.entries(headerInfo).forEach(([key, value]) => {
		if (typeof value === "bigint") {
			convertedHeader[key as keyof HeaderResponseData] = Number(
				BigInt.asUintN(32, value)
			);
		} else {
			convertedHeader[key as keyof HeaderResponseData] =
				value as HeaderResponseData[keyof HeaderResponseData];
		}
	});

	return convertedHeader;
};

export const mapHeaderInfoData = (
	data: HeaderResponseData
): HeaderInfo[] => {
	const decodedFlags = getMachineFlags(
		data.flags.toString(),
		data.machine
	);
	const decodedFlagsValues = Object.values(decodedFlags);
	decodedFlagsValues.unshift(decimalToHex(data.flags));
	const allFlags = decodedFlagsValues.join(", ");
	const dataWithAllFlags = { ...data, flags: allFlags };
	const mappedData = Object.entries(dataWithAllFlags).map(
		([field, value]) => ({
			label: labelMappings[field],
			value: mapFieldValueToMeaning(
				field as keyof HeaderResponseData,
				value
			)
		})
	);
	return mappedData.filter((item) => item.label !== "Mag");
};

export const decimalToHex = (decimal: number | bigint) =>
	`0x${decimal.toString(16).toUpperCase().padStart(8, "0")}`;

export type TSymbol = Record<
	string,
	bigint | number | string | undefined
>;

export interface TSection {
	id: number;
	type: number;
	address: string;
	size: number;
	symbols: TSymbol[];
	flags?: string;
	bucket: string;
	name?: string;
}

export interface TSegment {
	id: number;
	type: number | string;
	address: string;
	size: number;
	flags: string;
	align: number;
}

export interface TExtendedSegment extends TSegment {
	sections?: TSection[];
}

export interface TExtendedSymbol extends TSection {
	section: string;
	sectionIndex: string;
}

const serializeSymbols = (symbols: TSymbol[]): TSymbol[] =>
	symbols.map((symbol: TSymbol) => ({
		...symbol,
		size:
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			symbol.size || symbol.size === 0n
				? symbol.size.toString()
				: undefined,
		address:
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			symbol.address || symbol.address === 0n
				? decimalToHex(symbol.address as bigint)
				: undefined
	}));

const getFormattedDbSymbols = (parser: ElfFileParser) => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	const dbSymbols: TSymbol[] = parser.query(
		`SELECT * FROM ${SYMBOLS_TABLE_ID}`
	);

	return serializeSymbols(dbSymbols);
};

const filterSectionsBySegment = (
	indexList: number[],
	elfModel: ElfDataModel
): ElfSectionHeader[] => {
	return elfModel.elfSectionHeaders.filter(
		(section: ElfSectionHeader) => {
			const found = indexList.find(
				(index) => index === section.index
			);

			// 0 is falsy
			if (found !== undefined) return section;
		}
	);
};

export const filterSymbolsToSection = (
	section: ElfSectionHeader,
	elfModel: ElfDataModel,
	parser: ElfFileParser
) => {
	const result: TSymbol[] = [];
	const dbSymbols: TSymbol[] = getFormattedDbSymbols(parser);

	for (const symSection of elfModel.elfSymbols) {
		for (const parserSymbol of symSection.symbolData) {
			if (parserSymbol.sectionHeaderIndex === section.index) {
				const dbSymbol: TSymbol | undefined = [...dbSymbols].find(
					(item: TSymbol) => item.id === parserSymbol.dbId,
				);

				if (dbSymbol) {
					result.push(dbSymbol);
				}
			}
		}
	}

	return result;
};

export const mapSections = (
	sections: ElfSectionHeader[],
	elfModel: ElfDataModel,
	parser: ElfFileParser
) =>
	[...sections].map((section: ElfSectionHeader) => ({
		id: section.index,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		address: decimalToHex(section.address),
		symbols: filterSymbolsToSection(section, elfModel, parser),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		name: section.getShNameString(),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		type: section.getTypeString(),
		size: Number(section.size),
		flags: section.getFlagsString()
	}));

export const getSegmentFlags = (flags: ph_flags): string => {
	switch (flags) {
		case ph_flags.None: {
			return "None";
		}

		case ph_flags.PF_X: {
			return "X";
		}

		case ph_flags.PF_W: {
			return "W";
		}

		case ph_flags.PF_WX: {
			return "WX";
		}

		case ph_flags.PF_R: {
			return "R";
		}

		case ph_flags.PF_RX: {
			return "RX";
		}

		case ph_flags.PF_RW: {
			return "RW";
		}

		case ph_flags.PF_RWX: {
			return "RWX";
		}

		default: {
			return "None";
		}
	}
};


export const getSegmentTypes = (flags: ph_type): string => {
	switch (flags) {
		case ph_type.PT_LOAD: {
			return "LOAD";
		}

		case ph_type.PT_DYNAMIC: {
			return "DYNAMIC";
		}

		case ph_type.PT_INTERP: {
			return "INTERP";
		}

		case ph_type.PT_NOTE: {
			return "NOTE";
		}

		case ph_type.PT_SHLIB: {
			return "SHLIB";
		}

		case ph_type.PT_PHDR: {
			return "PHDR";
		}

		case ph_type.PT_TLS: {
			return "TLS";
		}

		case ph_type.PT_LOPROC: {
			return "LOPROC";
		}

		case ph_type.PT_HIPROC: {
			return "HIPROC";
		}

		case ph_type.PT_ARM_EXIDX: {
			return "ARM_EXIDX";
		}

		default: {
			return "PT_NULL";
		}
	}
};

export const mapSegments = (
	segments: ElfProgramHeader[],
	elfModel: ElfDataModel,
	parser: ElfFileParser
): TExtendedSegment[] | TSegment[] =>
	[...segments].map((segment: ElfProgramHeader) => ({
		id: segment.index,
		align: Number(segment.alignment),
		flags: getSegmentFlags(segment.flags),
		size: Number(segment.memorySize),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		address: decimalToHex(segment.virtualAddress),
		type: getSegmentTypes(segment.type),
		sections: mapSections(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			filterSectionsBySegment(segment.sectionIndexList, elfModel),
			elfModel,
			parser
		)
	}));

type FieldValueMapper = Record<
	string,
	(value: string | number) => string | number
>;

const valueMappings: FieldValueMapper = {
	fileType: (value: string | number) => {
		switch (value) {
			case 0:
				return "NONE (None)";
			case 1:
				return "REL (Relocatable file)";
			case 2:
				return "EXEC (Executable file)";
			case 3:
				return "DYN (Shared object file)";
			case 4:
				return "CORE (Core file)";
			case 0xfe00:
				return "Operating system-specific (LOOS)";
			case 0xfeff:
				return "Operating system-specific (HIOS)";
			case 0xff00:
				return "Processor-specific (LOPROC)";
			case 0xffff:
				return "Processor-specific (HIPROC)";
			default:
				return "Unknown";
		}
	},
	osAbi: (value: string | number) => {
		switch (value) {
			case 0:
				return "UNIX - System V";
			case 1:
				return "UNIX - HP-UX";
			case 2:
				return "UNIX - NetBSD";
			case 3:
				return "UNIX - GNU";
			case 6:
				return "UNIX - Solaris";
			case 7:
				return "UNIX - AIX";
			case 8:
				return "UNIX - IRIX";
			case 9:
				return "UNIX - FreeBSD";
			case 10:
				return "UNIX - TRU64";
			case 11:
				return "Novell Modesto";
			case 12:
				return "UNIX - OpenBSD";
			case 13:
				return "VMS - OpenVMS";
			case 14:
				return "HP - Non-Stop Kernel";
			case 15:
				return "AROS";
			default:
				return "Unknown";
		}
	},
	dataEncoding: (value: string | number) => {
		switch (value) {
			case 0:
				return "none";
			case 1:
				return "2's complement, little endian";
			case 2:
				return "2's complement, big endian";
			default:
				return "Unknown";
		}
	},
	classType: (value: string | number) => {
		switch (value) {
			case 0:
				return "none";
			case 1:
				return "ELF32";
			case 2:
				return "ELF64";
			default:
				return "Unknown";
		}
	},
	magicNumber: (value: string | number) => {
		if (value === "\x7fELF") {
			return "ELF";
		}

		return "Unknown";
	},
	elfVersion: (value: string | number) => {
		switch (value) {
			case 0:
				return decimalToHex(0);
			case 1:
				return decimalToHex(1);
			default:
				return "Unknown";
		}
	},
	headerSize: (value: string | number) => value.toString(),
	entryPoint: (value: string | number): string =>
		decimalToHex(Number(value)),
	flags: (value: string | number) => value,
	// eslint-disable-next-line complexity
	machine(value: string | number) {
		switch (value) {
			case 0:
				return "None";
			case 1:
				return "WE32100";
			case 2:
				return "Sparc";
			case 3:
				return "Intel 80386";
			case 4:
				return "MC68000";
			case 5:
				return "MC88000";
			case 6:
				return "Intel MCU";
			case 7:
				return "Intel 80860";
			case 8:
				return "MIPS R3000";
			case 9:
				return "IBM System/370";
			case 10:
				return "MIPS R4000 big-endian";
			case 15:
				return "HPPA";
			case 17:
				return "Fujitsu VPP500";
			case 18:
				return "Sparc v8+";
			case 19:
				return "Intel 80960";
			case 20:
				return "PowerPC";
			case 21:
				return "PowerPC64";
			case 22:
				return "IBM S/390";
			case 23:
				return "SPU";
			case 36:
				return "Renesas V850 (using RH850 ABI)";
			case 37:
				return "Fujitsu FR20";
			case 38:
				return "TRW RH32";
			case 39:
				return "MCORE";
			case 40:
				return "ARM";
			case 41:
				return "Digital Alpha";
			case 42:
				return "Renesas / SuperH SH";
			case 43:
				return "Sparc v9";
			case 44:
				return "Siemens Tricore";
			case 45:
				return "ARC";
			case 46:
				return "Renesas H8/300";
			case 47:
				return "Renesas H8/300H";
			case 48:
				return "Renesas H8S";
			case 49:
				return "Renesas H8/500";
			case 50:
				return "Intel IA-64";
			case 51:
				return "Stanford MIPS-X";
			case 52:
				return "Motorola ColdFire";
			case 53:
				return "Motorola MC68HC12 Microcontroller";
			case 54:
				return "Fujitsu Multimedia Accelerator";
			case 55:
				return "Siemens PCP";
			case 56:
				return "Sony nCPU embedded RISC processor";
			case 57:
				return "Denso NDR1 microprocessor";
			case 58:
				return "Motorola Star*Core processor";
			case 59:
				return "Toyota ME16 processor";
			case 60:
				return "STMicroelectronics ST100 processor";
			case 61:
				return "Advanced Logic Corp. TinyJ embedded processor";
			case 62:
				return "Advanced Micro Devices X86-64";
			case 63:
				return "Sony DSP Processor";
			case 64:
				return "Digital Equipment Corp. PDP-10";
			case 65:
				return "Digital Equipment Corp. PDP-11";
			case 66:
				return "Siemens FX66 microcontroller";
			case 67:
				return "STMicroelectronics ST9+ 8/16 bit microcontroller";
			case 68:
				return "STMicroelectronics ST7 8-bit microcontroller";
			case 69:
				return "Motorola MC68HC16 Microcontroller";
			case 70:
				return "Motorola MC68HC11 Microcontroller";
			case 71:
				return "Motorola MC68HC08 Microcontroller";
			case 72:
				return "Motorola MC68HC05 Microcontroller";
			case 73:
				return "Silicon Graphics SVx";
			case 74:
				return "STMicroelectronics ST19 8-bit microcontroller";
			case 75:
				return "Digital VAX";
			case 76:
				return "Axis Communications 32-bit embedded processor";
			case 77:
				return "Infineon Technologies 32-bit embedded processor";
			case 78:
				return "Element 14 64-bit DSP Processor";
			case 79:
				return "LSI Logic's 16-bit DSP processor";
			case 80:
				return "Donald Knuth's educational 64-bit processor";
			case 81:
				return "Harvard University machine-independent object files";
			case 82:
				return "Vitesse Prism";
			case 83:
				return "Atmel AVR 8-bit microcontroller";
			case 84:
				return "Fujitsu FR30";
			case 85:
				return "d10v";
			case 86:
				return "d30v";
			case 87:
				return "Renesas V850";
			case 88:
				return "Renesas M32R (formerly Mitsubishi M32r)";
			case 89:
				return "mn10300";
			case 90:
				return "mn10200";
			case 91:
				return "picoJava";
			case 92:
				return "OpenRISC 1000";
			case 93:
				return "ARCompact";
			case 94:
				return "Tensilica Xtensa Processor";
			case 95:
				return "Alphamosaic VideoCore processor";
			case 96:
				return "Thompson Multimedia General Purpose Processor";
			case 97:
				return "National Semiconductor 32000 series";
			case 98:
				return "Tenor Network TPC processor";
			case 99:
				return "Trebia SNP 1000 processor";
			case 100:
				return "STMicroelectronics ST200 microcontroller";
			case 101:
				return "Ubicom IP2xxx 8-bit microcontrollers";
			case 102:
				return "MAX Processor";
			case 103:
				return "National Semiconductor CompactRISC";
			case 104:
				return "Fujitsu F2MC16";
			case 105:
				return "Texas Instruments msp430 microcontroller";
			case 106:
				return "Analog Devices Blackfin";
			case 107:
				return "S1C33 Family of Seiko Epson processors";
			case 108:
				return "Sharp embedded microprocessor";
			case 109:
				return "Arca RISC microprocessor";
			case 110:
				return "Unicore";
			case 111:
				return "eXcess 16/32/64-bit configurable embedded CPU";
			case 112:
				return "Icera Semiconductor Inc. Deep Execution Processor";
			case 113:
				return "Altera Nios II";
			case 114:
				return "National Semiconductor CRX microprocessor";
			case 115:
				return "Motorola XGATE embedded processor";
			case 116:
				return "Infineon Technologies xc16x";
			case 117:
				return "Renesas M16C series microprocessors";
			case 118:
				return "Microchip Technology dsPIC30F Digital Signal Controller";
			case 119:
				return "Freescale Communication Engine RISC core";
			case 120:
				return "Renesas M32c";
			case 131:
				return "Altium TSK3000 core";
			case 132:
				return "Freescale RS08 embedded processor";
			case 134:
				return "Cyan Technology eCOG2 microprocessor";
			case 135:
				return "SUNPLUS S+Core";
			case 136:
				return "New Japan Radio (NJR) 24-bit DSP Processor";
			case 137:
				return "Broadcom VideoCore III processor";
			case 138:
				return "Lattice Mico32";
			case 139:
				return "Seiko Epson C17 family";
			case 140:
				return "Texas Instruments TMS320C6000 DSP family";
			case 141:
				return "Texas Instruments TMS320C2000 DSP family";
			case 142:
				return "Texas Instruments TMS320C55x DSP family";
			case 144:
				return "TI PRU I/O processor";
			case 160:
				return "STMicroelectronics 64bit VLIW Data Signal Processor";
			case 161:
				return "Cypress M8C microprocessor";
			case 162:
				return "Renesas R32C series microprocessors";
			case 163:
				return "NXP Semiconductors TriMedia architecture family";
			case 164:
				return "QUALCOMM DSP6 Processor";
			case 165:
				return "Intel 8051 and variants";
			case 166:
				return "STMicroelectronics STxP7x family";
			case 167:
				return "Andes Technology compact code size embedded RISC processor family";
			case 168:
				return "Cyan Technology eCOG1X family";
			case 169:
				return "Dallas Semiconductor MAXQ30 Core microcontrollers";
			case 170:
				return "New Japan Radio (NJR) 16-bit DSP Processor";
			case 171:
				return "M2000 Reconfigurable RISC Microprocessor";
			case 172:
				return "Cray Inc. NV2 vector architecture";
			case 173:
				return "Renesas RX";
			case 174:
				return "Imagination Technologies Meta processor architecture";
			case 175:
				return "MCST Elbrus general purpose hardware architecture";
			case 176:
				return "Cyan Technology eCOG16 family";
			case 177:
				return "Xilinx MicroBlaze";
			case 178:
				return "Freescale Extended Time Processing Unit";
			case 179:
				return "Infineon Technologies SLE9X core";
			case 180:
				return "Intel L1OM";
			case 181:
				return "Intel K1OM";
			case 182:
				return "Intel (reserved)";
			case 183:
				return "AArch64";
			case 184:
				return "ARM (reserved)";
			case 185:
				return "Atmel Corporation 32-bit microprocessor";
			case 186:
				return "STMicroeletronics STM8 8-bit microcontroller";
			case 187:
				return "Tilera TILE64 multicore architecture family";
			case 188:
				return "Tilera TILEPro multicore architecture family";
			case 190:
				return "NVIDIA CUDA architecture";
			case 191:
				return "Tilera TILE-Gx multicore architecture family";
			case 192:
				return "CloudShield architecture family";
			case 193:
				return "KIPO-KAIST Core-A 1st generation processor family";
			case 194:
				return "KIPO-KAIST Core-A 2nd generation processor family";
			case 195:
				return "ARCv2";
			case 196:
				return "Open8 8-bit RISC soft processor core";
			case 197:
				return "Renesas RL78";
			case 198:
				return "Broadcom VideoCore V processor";
			case 199:
				return "Renesas 78K0R";
			case 200:
				return "Freescale 56800EX Digital Signal Controller (DSC)";
			case 201:
				return "Beyond BA1 CPU architecture";
			case 202:
				return "Beyond BA2 CPU architecture";
			case 203:
				return "XMOS xCORE processor family";
			case 204:
				return "Microchip 8-bit PIC(r) family";
			case 205:
				return "Intel Graphics Technology";
			case 210:
				return "KM211 KM32 32-bit processor";
			case 211:
				return "KM211 KMX32 32-bit processor";
			case 212:
				return "KM211 KMX16 16-bit processor";
			case 213:
				return "KM211 KMX8 8-bit processor";
			case 214:
				return "KM211 KVARC processor";
			case 215:
				return "Paneve CDP architecture family";
			case 216:
				return "Cognitive Smart Memory Processor";
			case 217:
				return "Bluechip Systems CoolEngine";
			case 218:
				return "Nanoradio Optimized RISC";
			case 219:
				return "CSR Kalimba architecture family";
			case 220:
				return "Zilog Z80";
			case 221:
				return "CDS VISIUMcore processor";
			case 222:
				return "FTDI Chip FT32";
			case 223:
				return "Moxie";
			case 224:
				return "AMD GPU";
			case 243:
				return "RISC-V";
			case 244:
				return "Lanai 32-bit processor";
			case 245:
				return "CEVA Processor Architecture Family";
			case 246:
				return "CEVA X2 Processor Family";
			case 247:
				return "Linux BPF";
			case 248:
				return "Graphcore Intelligent Processing Unit";
			case 249:
				return "Imagination Technologies";
			case 250:
				return "Netronome Flow Processor";
			case 251:
				return "NEC Vector Engine";
			case 252:
				return "C-SKY";
			case 253:
				return "Synopsys ARCv3 64-bit processor";
			case 254:
				return "MOS Technology MCS 6502 processor";
			case 255:
				return "Synopsys ARCv3 32-bit processor";
			case 256:
				return "Kalray VLIW core of the MPPA processor family";
			case 257:
				return "WDC 65816/65C816";
			case 258:
				return "LoongArch";
			case 259:
				return "ChipON KungFu32";
			case 0x2530:
				return "Morpho Techologies MT processor";
			case 0x9026:
				return "Alpha";
			case 0x4157:
				return "Web Assembly";
			case 0x5aa5:
				return "OpenDLX";
			case 0xad45:
				return "Sanyo XStormy16 CPU core";
			case 0xfeba:
				return "Vitesse IQ2000";
			case 0xfeb0:
			case 0xfebb:
				return "Altera Nios";
			case 0xf00d:
				return "Toshiba MeP Media Engine";
			case 0x1223:
				return "Adapteva EPIPHANY";
			case 0x5441:
				return "Fujitsu FR-V";
			case 0x4def:
				return "Freescale S12Z";
			default:
				return "Unknown";
		}
	},
	sectionHeaderOffset: (value: string | number) => value,
	programHeaderOffset: (value: string | number) => value,
	sectionHeaderEntrySize: (value: string | number) => value,
	programHeaderEntrySize: (value: string | number) => value
};

const labelMappings: Record<string, string> = {
	classType: "Class",
	osAbi: "OS ABI",
	machine: "Machine",
	programHeaderOffset: "Program headers start",
	headerSize: "Header size",
	sectionHeaderEntrySize: "Section headers size",
	dataEncoding: "Data",
	osAbiVersion: "ABI Version",
	elfVersion: "Version",
	sectionHeaderOffset: "Section headers start",
	programHeaderEntrySize: "Program headers size",
	sectionHeaderEntryCount: "Number of section headers",
	version: "Header Version",
	fileType: "Type",
	entryPoint: "Entry point address",
	flags: "Flags",
	programHeaderEntryCount: "Number of program headers",
	sectionHeaderStringTableIndex: "Section header string table index",
	magicNumber: "Mag"
};

/********** ARM Attributes mappings **********/

export const mapArmAttributes = (
	attributes: Record<string, string | number>
): { label: string; value: string | null | number }[] => {
	return Object.entries(attributes).map(([field, value]) => ({
		label: field,
		value: mapArmToString(field, value)
	}));
};

const mapArmToString = (
	field: string,
	value: string | number | undefined
): string | null | number => {
	// if value is number then mapping it, otherwise return the value or null
	if (typeof value === "number") {
		const fieldFn = armMappings[field];
		// if the field has no mapping object then don't call fn
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (fieldFn === undefined) return value;

		return fieldFn(value);
	}

	return value ? value.trim() : null;
};

const armMappings: Record<
	string,
	(value: string | number) => string
> = {
	Tag_CPU_arch: (value: string | number) => {
		switch (value) {
			case 0:
				return "Pre-v4";
			case 1:
				return "v4";
			case 2:
				return "v4T";
			case 3:
				return "v5T";
			case 4:
				return "v5TE";
			case 5:
				return "v5TEJ";
			case 6:
				return "v6";
			case 7:
				return "v6KZ";
			case 8:
				return "v6T2";
			case 9:
				return "v6K";
			case 10:
				return "v7";
			case 11:
				return "v6-M";
			case 12:
				return "v6S-M";
			case 13:
				return "v7E-M";
			case 14:
				return "v8";
			case 15:
				return "v8-R";
			case 16:
				return "v8-M.baseline";
			case 17:
				return "v8-M.mainline";
			case 18:
				return "v8.1-A";
			case 19:
				return "v8.2-A";
			case 20:
				return "v8.3-A";
			case 21:
				return "v8.1-M.mainline";
			case 22:
				return "v9";
			default:
				return "Unknown";
		}
	},
	Tag_CPU_arch_profile: (value: string | number) => {
		switch (value) {
			case 0:
				return "None";
			case 0x41:
				return "Application";
			case 0x52:
				return "Realtime";
			case 0x4d:
				return "Microcontroller";
			case 0x53:
				return "Application or Realtime";
			default:
				return "Unknown";
		}
	},
	Tag_ARM_ISA_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "No";
			case 1:
				return "Yes";
			default:
				return "Unknown";
		}
	},
	Tag_THUMB_ISA_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "No";
			case 1:
				return "Thumb-1";
			case 2:
				return "Thumb-2";
			case 3:
				return "Yes";
			default:
				return "Unknown";
		}
	},
	Tag_FP_arch: (value: string | number) => {
		switch (value) {
			case 0:
				return "No";
			case 1:
				return "VFPv1";
			case 2:
				return "VFPv2";
			case 3:
				return "VFPv3";
			case 4:
				return "VFPv3-D16";
			case 5:
				return "VFPv4";
			case 6:
				return "VFPv4-D16";
			case 7:
				return "FP for ARMv8";
			case 8:
				return "FPv5/FP-D16 for ARMv8";
			default:
				return "Unknown";
		}
	},
	Tag_WMMX_arch: (value: string | number) => {
		switch (value) {
			case 0:
				return "No";
			case 1:
				return "WMMXv1";
			case 2:
				return "WMMXv2";
			default:
				return "Unknown";
		}
	},
	Tag_Advanced_SIMD_arch: (value: string | number) => {
		switch (value) {
			case 0:
				return "No";
			case 1:
				return "NEONv1";
			case 2:
				return "NEONv1 with Fused-MAC";
			case 3:
				return "NEON for ARMv8";
			case 4:
				return "NEON for ARMv8.1";
			default:
				return "Unknown";
		}
	},
	Tag_PCS_config: (value: string | number) => {
		switch (value) {
			case 0:
				return "None";
			case 1:
				return "Bare platform";
			case 2:
				return "Linux application";
			case 3:
				return "Linux DSO";
			case 4:
				return "PalmOS 2004";
			case 5:
				return "PalmOS (reserved)";
			case 6:
				return "SymbianOS 2004";
			case 7:
				return "SymbianOS (reserved)";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_PCS_R9_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "V6";
			case 1:
				return "SB";
			case 2:
				return "TLS";
			case 3:
				return "Unused";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_PCS_RW_data: (value: string | number) => {
		switch (value) {
			case 0:
				return "Absolute";
			case 1:
				return "PC-relative";
			case 2:
				return "SB-relative";
			case 3:
				return "None";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_PCS_RO_data: (value: string | number) => {
		switch (value) {
			case 0:
				return "Absolute";
			case 1:
				return "PC-relative";
			case 2:
				return "None";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_PCS_GOT_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "None";
			case 1:
				return "direct";
			case 2:
				return "GOT-indirect";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_PCS_wchar_t: (value: string | number) => {
		switch (value) {
			case 0:
				return "None";
			case 1:
				return "??? 1";
			case 2:
				return "2";
			case 3:
				return "??? 3";
			case 4:
				return "4";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_FP_rounding: (value: string | number) => {
		switch (value) {
			case 0:
				return "Unused";
			case 1:
				return "Needed";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_FP_denormal: (value: string | number) => {
		switch (value) {
			case 0:
				return "Unused";
			case 1:
				return "Needed";
			case 2:
				return "Sign only";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_FP_exceptions: (value: string | number) => {
		switch (value) {
			case 0:
				return "Unused";
			case 1:
				return "Needed";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_FP_user_exceptions: (value: string | number) => {
		switch (value) {
			case 0:
				return "Unused";
			case 1:
				return "Needed";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_FP_number_model: (value: string | number) => {
		switch (value) {
			case 0:
				return "Unused";
			case 1:
				return "Finite";
			case 2:
				return "RTABI";
			case 3:
				return "IEEE 754";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_align_needed: (value: string | number) => {
		switch (value) {
			case 0:
				return "None";
			case 1:
				return "8-byte";
			case 2:
				return "4-byte";
			case 3:
				return "??? 3";
			case 4:
				return "8-byte up to 2n-byte extended alignment";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_enum_size: (value: string | number) => {
		switch (value) {
			case 0:
				return "Unused";
			case 1:
				return "small";
			case 2:
				return "int";
			case 3:
				return "forced to int";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_HardFP_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "As Tag_FP_arch";
			case 1:
				return "SP only";
			case 2:
				return "Reserved";
			case 3:
				return "Deprecated";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_VFP_args: (value: string | number) => {
		switch (value) {
			case 0:
				return "AAPCS";
			case 1:
				return "VFP registers";
			case 2:
				return "custom";
			case 3:
				return "compatible";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_WMMX_args: (value: string | number) => {
		switch (value) {
			case 0:
				return "AAPCS";
			case 1:
				return "WMMX registers";
			case 2:
				return "custom";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_optimization_goals: (value: string | number) => {
		switch (value) {
			case 0:
				return "None";
			case 1:
				return "Prefer Speed";
			case 2:
				return "Aggressive Speed";
			case 3:
				return "Prefer Size";
			case 4:
				return "Aggressive Size";
			case 5:
				return "Prefer Debug";
			case 6:
				return "Aggressive Debug";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_FP_optimization_goals: (value: string | number) => {
		switch (value) {
			case 0:
				return "None";
			case 1:
				return "Prefer Speed";
			case 2:
				return "Aggressive Speed";
			case 3:
				return "Prefer Size";
			case 4:
				return "Aggressive Size";
			case 5:
				return "Prefer Accuracy";
			case 6:
				return "Aggressive Accuracy";
			default:
				return "Unknown";
		}
	},
	Tag_CPU_unaligned_access: (value: string | number) => {
		switch (value) {
			case 0:
				return "None";
			case 1:
				return "v6";
			default:
				return "Unknown";
		}
	},
	Tag_FP_HP_extension: (value: string | number) => {
		switch (value) {
			case 0:
				return "Not Allowed";
			case 1:
				return "Allowed";
			default:
				return "Unknown";
		}
	},
	Tag_ABI_FP_16bit_format: (value: string | number) => {
		switch (value) {
			case 0:
				return "None";
			case 1:
				return "IEEE 754";
			case 2:
				return "Alternative Format";
			default:
				return "Unknown";
		}
	},
	Tag_DSP_extension: (value: string | number) => {
		switch (value) {
			case 0:
				return "Follow architecture";
			case 1:
				return "Allowed";
			default:
				return "Unknown";
		}
	},
	Tag_MPextension_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "Not Allowed";
			case 1:
				return "Allowed";
			default:
				return "Unknown";
		}
	},
	Tag_DIV_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "Allowed in Thumb-ISA, v7-R or v7-M";
			case 1:
				return "Not allowed";
			case 2:
				return "Allowed in v7-A with integer division extension";
			default:
				return "Unknown";
		}
	},
	Tag_T2EE_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "Not Allowed";
			case 1:
				return "Allowed";
			default:
				return "Unknown";
		}
	},
	Tag_Virtualization_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "Not Allowed";
			case 1:
				return "TrustZone";
			case 2:
				return "Virtualization Extensions";
			case 3:
				return "TrustZone and Virtualization Extensions";
			default:
				return "Unknown";
		}
	},
	Tag_MPextension_use_legacy: (value: string | number) => {
		switch (value) {
			case 0:
				return "Not Allowed";
			case 1:
				return "Allowed";
			default:
				return "Unknown";
		}
	},
	Tag_MVE_arch: (value: string | number) => {
		switch (value) {
			case 0:
				return "No MVE";
			case 1:
				return "MVE Integer only";
			case 2:
				return "MVE Integer and FP";
			default:
				return "Unknown";
		}
	},
	Tag_PAC_extension: (value: string | number) => {
		switch (value) {
			case 0:
				return "No PAC/AUT instructions";
			case 1:
				return "PAC/AUT instructions permitted in the NOP space";
			case 2:
				return "PAC/AUT instructions permitted in the NOP and in the non-NOP space";
			default:
				return "Unknown";
		}
	},
	Tag_BTI_extension: (value: string | number) => {
		switch (value) {
			case 0:
				return "BTI instructions not permitted";
			case 1:
				return "BTI instructions permitted in the NOP space";
			case 2:
				return "BTI instructions permitted in the NOP and in the non-NOP space";
			default:
				return "Unknown";
		}
	},
	Tag_BTI_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "Compiled without branch target enforcement";
			case 1:
				return "Compiled with branch target enforcement";
			default:
				return "Unknown";
		}
	},
	Tag_PACRET_use: (value: string | number) => {
		switch (value) {
			case 0:
				return "Compiled without return address signing and authentication";
			case 1:
				return "Compiled with return address signing and authentication";
			default:
				return "Unknown ";
		}
	}
};
