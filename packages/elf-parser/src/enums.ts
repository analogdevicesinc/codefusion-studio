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
// Enum Order is very important!
export enum FunctionRecursiveType
{
	// Not a recursive function
	NoRecursion = 0,

	// The function is making calls that reach a self recursive or a graph loop call, but it is not part of the loop
	ReachesRecursion,

	// Not a self recursive function, but within a loop in the graph
	GraphLoop,

	// Calls Itself
	SelfRecursive,
}

export enum DataResult {
	OK,
	INVALID,
}

export enum e_type {
	ET_NONE = 0,
	ET_REL = 1,
	ET_EXEC = 2,
	ET_DYN = 3,
	ET_CORE = 4,
	ET_LOOS = 0xfe00,
	ET_HIOS = 0xfeff,
	ET_LOPROC = 0xff00,
	ET_HIPROC = 0xffff,
}

export enum e_machine {
	EM_NONE = 0,
	EM_M32 = 1,
	EM_SPARC = 2,
	EM_386 = 3,
	EM_68K = 4,
	EM_88K = 5,
	reserved = 6,
	EM_860 = 7,
	EM_MIPS = 8,
	EM_S370 = 9,
	EM_MIPS_RS3_LE = 10,
	reserved1 = 11 - 14,
	EM_PARISC = 15,
	reserved2 = 16,
	EM_VPP500 = 17,
	EM_SPARC32PLUS = 18,
	EM_960 = 19,
	EM_PPC = 20,
	EM_PPC64 = 21,
	EM_S390 = 22,
	reserved3 = 23 - 35,
	EM_V800 = 36,
	EM_FR20 = 37,
	EM_RH32 = 38,
	EM_RCE = 39,
	EM_ARM = 40,
	EM_ALPHA = 41,
	EM_SH = 42,
	EM_SPARCV9 = 43,
	EM_TRICORE = 44,
	EM_ARC = 45,
	EM_H8_300 = 46,
	EM_H8_300H = 47,
	EM_H8S = 48,
	EM_H8_500 = 49,
	EM_IA_64 = 50,
	EM_MIPS_X = 51,
	EM_COLDFIRE = 52,
	EM_68HC12 = 53,
	EM_MMA = 54,
	EM_PCP = 55,
	EM_NCPU = 56,
	EM_NDR1 = 57,
	EM_STARCORE = 58,
	EM_ME16 = 59,
	EM_ST100 = 60,
	EM_TINYJ = 61,
	EM_X86_64 = 62,
	EM_PDSP = 63,
	EM_PDP10 = 64,
	EM_PDP11 = 65,
	EM_FX66 = 66,
	EM_ST9PLUS = 67,
	EM_ST7 = 68,
	EM_68HC16 = 69,
	EM_68HC11 = 70,
	EM_68HC08 = 71,
	EM_68HC05 = 72,
	EM_SVX = 73,
	EM_ST19 = 74,
	EM_VAX = 75,
	EM_CRIS = 76,
	EM_JAVELIN = 77,
	EM_FIREPATH = 78,
	EM_ZSP = 79,
	EM_MMIX = 80,
	EM_HUANY = 81,
	EM_PRISM = 82,
	EM_AVR = 83,
	EM_FR30 = 84,
	EM_D10V = 85,
	EM_D30V = 86,
	EM_V850 = 87,
	EM_M32R = 88,
	EM_MN10300 = 89,
	EM_MN10200 = 90,
	EM_PJ = 91,
	EM_OPENRISC = 92,
	EM_ARC_A5 = 93,
	EM_XTENSA = 94,
	EM_VIDEOCORE = 95,
	EM_TMM_GPP = 96,
	EM_NS32K = 97,
	EM_TPC = 98,
	EM_SNP1K = 99,
	EM_ST200 = 100,
	EM_RISCV = 243,
}

export enum e_version {
	EV_NONE = 0,
	EV_CURRENT = 1,
}

export enum e_flags {
	EF_SPARC_EXT_MASK = 0xffff00,

	EF_SPARC_32PLUS = 0x000100,
	EF_SPARC_SUN_US1 = 0x000200,
	EF_SPARC_HAL_R1 = 0x000400,

	EF_SPARC_SUN_US3 = 0x000800,

	EF_SPARCV9_MM = 0x3,
	EF_SPARCV9_TSO = 0x0,

	EF_SPARCV9_PSO = 0x1,
	EF_SPARCV9_RMO = 0x2,
}

export enum e_flags_arm {
	EF_ARM_EABIMASK = 0xff000000,
	EF_ARM_RELEXEC = 0x01,
	EF_ARM_SYMSARESORTED = 0x04,
	EF_ARM_DYNSYMSUSESEGIDX = 0x08,
	EF_ARM_MAPSYMSFIRST = 0x10,
	EF_ARM_EABI_UNKNOWN = 0x00000000,
	EF_ARM_EABI_VER1 = 0x01000000,
	EF_ARM_EABI_VER2 = 0x02000000,
	EF_ARM_EABI_VER3 = 0x03000000,
	EF_ARM_EABI_VER4 = 0x04000000,
	EF_ARM_EABI_VER5 = 0x05000000,
	EF_ARM_BE8 = 0x00800000,
	EF_ARM_LE8 = 0x00400000,
	EF_ARM_ABI_FLOAT_SOFT = 0x200,
	EF_ARM_ABI_FLOAT_HARD = 0x400,
	EF_ARM_INTERWORK = 0x04,
	EF_ARM_APCS_26 = 0x08,
	EF_ARM_APCS_FLOAT = 0x10,
	EF_ARM_PIC = 0x20,
	EF_ARM_ALIGN8 = 0x40,
	EF_ARM_NEW_ABI = 0x80,
	EF_ARM_OLD_ABI = 0x100,
	EF_ARM_SOFT_FLOAT = 0x200,
	EF_ARM_VFP_FLOAT = 0x400,
}

export enum e_flags_riscv {
	EF_RISCV_RVC = 0x0001,
	EF_RISCV_RVE = 0x0008,
	EF_RISCV_TSO = 0x0010,
	EF_RISCV_FLOAT_ABI = 0x0006,
	EF_RISCV_FLOAT_ABI_SOFT = 0x0000,
	EF_RISCV_FLOAT_ABI_SINGLE = 0x0002,
	EF_RISCV_FLOAT_ABI_DOUBLE = 0x0004,
	EF_RISCV_FLOAT_ABI_QUAD = 0x0006,
}

export enum e_ident_index {
	EI_MAG0 = 0,
	EI_MAG1 = 1,
	EI_MAG2 = 2,
	EI_MAG3 = 3,
	EI_CLASS = 4,
	EI_DATA = 5,
	EI_VERSION = 6,
	EI_OSABI = 7,
	EI_ABIVERSION = 8,
	EI_PAD = 9,
	EI_NIDENT = 16,
}

export enum EI_CLASS {
	ELFCLASSNONE = 0,
	ELFCLASS32 = 1,
	ELFCLASS64 = 2,
}
export enum EI_DATA {
	ELFDATANONE = 0,
	ELFDATA2LSB = 1,
	ELFDATA2MSB = 2,
}

export enum EI_OSABI {
	ELFOSABI_NONE = 0,
	ELFOSABI_HPUX = 1,
	ELFOSABI_NETBSD = 2,
	ELFOSABI_LINUX = 3,
	ELFOSABI_SOLARIS = 6,
	ELFOSABI_AIX = 7,
	ELFOSABI_IRIX = 8,
	ELFOSABI_FREEBSD = 9,
	ELFOSABI_TRU64 = 10,
	ELFOSABI_MODESTO = 11,
	ELFOSABI_OPENBSD = 12,
	ELFOSABI_OPENVMS = 13,
	ELFOSABI_NSK = 14,
	specific = 64 - 255,
}

export enum sh_flags {
	SHF_WRITE = 0x1,
	SHF_ALLOC = 0x2,
	SHF_EXECINSTR = 0x4,
	SHF_ORDERED = 0x40000000,
	SHF_EXCLUDE = 0x80000000,
	SHF_MASKPROC = 0xf0000000,
	SHF_TLS = 0x400,
	SHF_MASKOS = 0x0ff00000,
	SHF_GROUP = 0x200,
	SHF_OS_NONCONFORMING = 0x100,
	SHF_LINK_ORDER = 0x80,
	SHF_INFO_LINK = 0x40,
	SHF_STRINGS = 0x20,
	SHF_MERGE = 0x10,
}

export enum sh_type {
	SHT_NULL = 0,
	SHT_PROGBITS = 1,
	SHT_SYMTAB = 2,
	SHT_STRTAB = 3,
	SHT_RELA = 4,
	SHT_HASH = 5,
	SHT_DYNAMIC = 6,
	SHT_NOTE = 7,
	SHT_NOBITS = 8,
	SHT_REL = 9,
	SHT_SHLIB = 10,
	SHT_DYNSYM = 11,
	SHT_INIT_ARRAY = 14,
	SHT_FINI_ARRAY = 15,
	SHT_PREINIT_ARRAY = 16,
	SHT_GROUP = 17,
	SHT_SYMTAB_SHNDX = 18,
	SHT_RELR = 19,
	SHT_LOPROC = 0x70000000,
	SHT_HIPROC = 0x7fffffff,
	SHT_LOUSER = 0x80000000,
	SHT_HIUSER = 0xffffffff,

	// The remaining values are not in the standard.
	// Incremental build data.
	SHT_GNU_INCREMENTAL_INPUTS = 0x6fff4700,
	SHT_GNU_INCREMENTAL_SYMTAB = 0x6fff4701,
	SHT_GNU_INCREMENTAL_RELOCS = 0x6fff4702,
	SHT_GNU_INCREMENTAL_GOT_PLT = 0x6fff4703,
	// Object attributes.
	SHT_GNU_ATTRIBUTES = 0x6ffffff5,
	// GNU style dynamic hash table.
	SHT_GNU_HASH = 0x6ffffff6,
	// List of prelink dependencies.
	SHT_GNU_LIBLIST = 0x6ffffff7,
	// Versions defined by file.
	//SHT_SUNW_verdef = 0x6ffffffd,
	SHT_GNU_verdef = 0x6ffffffd,
	// Versions needed by file.
	//SHT_SUNW_verneed = 0x6ffffffe,
	SHT_GNU_verneed = 0x6ffffffe,
	// Symbol versions,
	//SHT_SUNW_versym = 0x6fffffff,
	SHT_GNU_versym = 0x6fffffff,

	//SHT_SPARC_GOTDATA = 0x70000000,

	/* Additional section types.  */
	SHT_ARM_EXIDX = 0x70000001 /* Section holds ARM unwind info.  */,
	SHT_ARM_PREEMPTMAP = 0x70000002 /* Section pre-emption details.  */,
	SHT_ARM_ATTRIBUTES = 0x70000003 /* Section holds attributes.  */,
	SHT_ARM_DEBUGOVERLAY = 0x70000004 /* Section holds overlay debug info.  */,
	SHT_ARM_OVERLAYSECTION = 0x70000005 /* Section holds GDB and overlay integration info.  */,

	// x86_64 unwind information.
	//SHT_X86_64_UNWIND = 0x70000001,

	// MIPS-specific section types.
	// Section contains register usage information.
	SHT_MIPS_REGINFO = 0x70000006,
	// Section contains miscellaneous options.
	SHT_MIPS_OPTIONS = 0x7000000d,
	// ABI related flags section.
	SHT_MIPS_ABIFLAGS = 0x7000002a,

	// AARCH64-specific section type.
	//SHT_AARCH64_ATTRIBUTES = 0x70000003,

	// CSKY-specific section types.
	// Object file compatibility attributes.
	//SHT_CSKY_ATTRIBUTES = 0x70000001,

	// Link editor is to sort the entries in this section based on the
	// address specified in the associated symbol table entry.
	//SHT_ORDERED = 0x7fffffff,
}

export enum ph_type {
	PT_NULL = 0,
	PT_LOAD = 1,
	PT_DYNAMIC = 2,
	PT_INTERP = 3,
	PT_NOTE = 4,
	PT_SHLIB = 5,
	PT_PHDR = 6,
	PT_TLS = 7,
	PT_LOOS = 0x60000000,
	PT_HIOS = 0x6fffffff,
	PT_LOPROC = 0x70000000,
	PT_HIPROC = 0x7fffffff,
	// The remaining values are not in the standard.
	// Frame unwind information.
	PT_GNU_EH_FRAME = 0x6474e550,
	//PT_SUNW_EH_FRAME = 0x6474e550,
	// Stack flags.
	PT_GNU_STACK = 0x6474e551,
	// Read only after relocation.
	PT_GNU_RELRO = 0x6474e552,
	// Platform architecture compatibility information
	//PT_ARM_ARCHEXT = 0x70000000,
	// Exception unwind tables
	PT_ARM_EXIDX = 0x70000001,
	// Register usage information.  Identifies one .reginfo section.
	//PT_MIPS_REGINFO =0x70000000,
	// Runtime procedure table.
	//PT_MIPS_RTPROC = 0x70000001,
	// .MIPS.options section.
	PT_MIPS_OPTIONS = 0x70000002,
	// .MIPS.abiflags section.
	PT_MIPS_ABIFLAGS = 0x70000003,
	// Platform architecture compatibility information
	//PT_AARCH64_ARCHEXT = 0x70000000,
	// Exception unwind tables
	//PT_AARCH64_UNWIND = 0x70000001,
	// 4k page table size
	//PT_S390_PGSTE = 0x70000000,
	PT_GNU_SFRAME = 0x6474e554,
	PT_GNU_MBIND_NUM = 4096,
	PT_GNU_MBIND_LO = 0x6474e555,
	PT_GNU_MBIND_HI = 0x6474f554,
}

export enum ph_flags {
	None = 0,
	PF_X = 1,
	PF_W = 2,
	PF_WX = 3,
	PF_R = 4,
	PF_RX = 5,
	PF_RW = 6,
	PF_RWX = 7,
}

export enum sym_type {
	NOTYPE = 0,
	OBJECT = 1,
	FUNC = 2,
	SECTION = 3,
	FILE = 4,
	COMMON = 5,
	TLS = 6,
	LOOS = 10,
	HIOS = 12,
	LOPROC = 13,
	HIPROC = 15,
}

export enum sym_binding {
	LOCAL = 0,
	GLOBAL = 1,
	WEAK = 2,
	LOPROC = 13,
	HIPROC = 15,
}

export enum sym_visibility {
	STV_DEFAULT = 0,
	STV_INTERNAL = 1,
	STV_HIDDEN = 2,
	STV_PROTECTED = 3,
	STV_EXPORTED = 4,
	STV_SINGLETON = 5,
	STV_ELIMINATE = 6,
}

export enum cpu_arch {
	Prev4 = 0,
	Armv4 = 1,
	Armv4T = 2,
	Armv5T = 3, // e.g. Arm9TDMI
	Armv5TE = 4, // e.g. Arm946E-S
	Armv5TEJ = 5, // e.g. Arm926EJ-S
	Armv6 = 6, // e.g. Arm1136J-S
	Armv6KZ = 7, // e.g. Arm1176JZ-S
	Armv6T2 = 8, // e.g. Arm1156T2F-S
	Armv6K = 9, // e.g. Arm1136J-S
	Armv7 = 10, // e.g. Cortex-A8, Cortex-M3
	Armv6M = 11, // e.g. Cortex-M1
	Armv6SM = 12, // v6-M with the System extensions
	Armv7EM = 13, // v7-M with DSP extensions
	Armv8A = 14,
	Armv8R = 15,
	Armv8Mbaseline = 16,
	Armv8Mmainline = 17,
	Armv81A = 18,
	Armv82A = 19,
	Armv83A = 20,
	Armv81M = 21,
	Armv9A = 22,
}

export enum arch_profile {
	NA = 0, //Architecture profile is not applicable
	A = 0x41, //The application profile (e.g. for Cortex-A8)
	R = 0x52, //The real-time profile (e.g. for Cortex-R4)
	M = 0x4d, // The microcontroller profile (e.g. for Cortex-M3)
	S = 0x53,
}

export enum isa_use {
	NotPermitted = 0,
	Permitted = 1,
}

export enum thumb_isa_use {
	NotPermitted = 0,
	Deprecated_16Bit = 1,
	Deprecated_32Bit = 2,
	Thumbcode = 3,
}

export enum WMMX_arch {
	NotPermitted = 0,
	v1 = 1,
	v2 = 2,
}
export enum fp_arch {
	NotPermitted = 0,
	v1 = 1,
	v2 = 2,
	v3 = 3,
	v3_DS = 4,
	v4 = 5,
	v4_DS = 6,
	v8 = 7,
	v8_DS = 8,
}

export enum SIMD_arch {
	NotPermitted = 0,
	SIMDv1 = 1,
	SIMDv2 = 2,
	Armv8 = 3,
	Armv8_1 = 4,
}

export enum MVE_arch {
	NotPermitted = 0,
	Int_M = 1,
	FP_M = 2,
}

export enum FP_HP_extension {
	HP_ASIMD = 0,
	HP_v3 = 1,
	HP_v8_2 = 2,
}

export enum CPU_unaligned_access {
	UnaAlign = 0,
	v6 = 1,
}

export enum T2EE_use {
	NotPermitted = 0,
	Permitted = 1,
}

export enum Virtualization_use {
	NotPermitted = 0,
	TrustZone = 1,
	HVC = 2,
	TrustZoneHVC = 3,
}

export enum MPextension_use {
	NotPermitted = 0,
	v7MP = 1,
}

export enum DIV_use {
	NotPermitted = 1,
	Intended = 0,
	SDIV = 2,
}

export enum DSP_extension {
	DSP = 0,
	ThumbDSP = 1,
}

export enum PAC_extension {
	NotPermitted = 0,
	NOP = 1,
	NoNOP = 2,
}

export enum BTI_extension {
	NotPermitted = 0,
	NOP = 1,
	NoNOP = 2,
}

export enum PCS_config {
	NoStd = 0,
	Bare = 1,
	Linux = 2,
	LinuxDSO = 3,
	PalmOS = 4,
	Reserved = 5,
	SymbianOS = 6,
	ReservedSymb = 7,
}

export enum PCS_R9_use {
	V6 = 0,
	SB = 1,
	TLS = 2,
	Unused = 3,
}
export enum PCS_RW_data {
	Permitted = 0,
	PC = 1,
	SB = 2,
	NotPermitted = 3,
}
export enum PCS_RO_data {
	Permitted = 0,
	PC = 1,
	NotPermitted = 2,
}
export enum PCS_GOT_use {
	NotPermitted = 0,
	Direct = 1,
	GOT = 2,
}
export enum PCS_wchar_t {
	NotPermitted = 0,
	v2 = 2,
	v4 = 4,
}
export enum ABI_enum_size {
	NotPermitted = 0,
	Smalest = 1,
	v32 = 2,
	Every = 3,
}
export enum ABI_align_needed {
	NotPermitted = 0,
	v8 = 1,
	v4 = 2,
	Reserved = 3,
	v8_2n = 4,
}
export enum ABI_align_preserved {
	NotPermitted = 0,
	v8 = 1,
	v8SP = 2,
	Reserved = 3,
	v8_2n = 4,
}
export enum ABI_FP_rounding {
	IEEE_754 = 0,
	IEEE_754_RT = 1,
}
export enum ABI_FP_denormal {
	Flushed = 0,
	IEEE_754 = 1,
	Sign = 2,
}
export enum ABI_FP_exceptions {
	Exact = 0,
	Inexact = 1,
}
export enum ABI_FP_user_exceptions {
	NotUse = 0,
	Use = 1,
}
export enum ABI_FP_number_model {
	NotUse = 0,
	IEEE_754 = 1,
	Numbers = 2,
	IEEE_754_FP = 3,
}
export enum ABI_FP_16bit_format {
	NotPermitted = 0,
	NOP = 1,
	NoNOP = 2,
}
export enum BTI_extension {
	NotUse = 0,
	IEEE_754 = 1,
	VFPv3 = 2,
}
export enum ABI_VFP_args {
	AAPCS_BV = 0,
	AAPCS_VFP = 1,
	AAPCS_TCS = 2,
	ALL_VFP = 3,
}

export enum ABI_WMMX_args {
	AAPCS_BV = 0,
	Intel = 1,
	TCS = 2,
}
export enum FramePointer_use {
	Tag_FP = 0,
	FR_LR = 1,
	FR_FP = 2,
}
export enum BTI_use {
	NoBT = 0,
	BT_Enforce = 1,
}
export enum PACRET_use {
	No_RASD = 0,
	RASD = 1,
}
export enum ABI_optimization_goals {
	NoOpt = 0,
	Speed = 1,
	AggressivelySpeed = 2,
	SmallSize = 3,
	AggressivelySmallSize = 4,
	GoodDebugging = 5,
	BestDebugging = 6,
}

export enum ABI_HardFP_use {
	Tag_FP = 0,
	SP_Tag_FP = 1,
	Reserved = 2,
	FP_Tag_FP = 3,
}
export enum Tag_compatibility {
	No_TCSR = 0,
	ABI = 1,
	No_ABI = 2,
}

// Special section indices.
export enum SpecialSectionIndices {
	SHN_UNDEF = 0,
	//SHN_LORESERVE = 0xff00,
	SHN_LOPROC = 0xff00,
	SHN_HIPROC = 0xff1f,
	SHN_LOOS = 0xff20,
	SHN_HIOS = 0xff3f,
	SHN_ABS = 0xfff1,
	SHN_COMMON = 0xfff2,
	SHN_XINDEX = 0xffff,
	//SHN_HIRESERVE = 0xffff,

	// Provide for initial and final section ordering in conjunction
	// with the SHF_LINK_ORDER and SHF_ORDERED section flags.
	//SHN_BEFORE = 0xff00,
	SHN_AFTER = 0xff01,

	// x86_64 specific large common symbol.
	SHN_X86_64_LCOMMON = 0xff02,
}
