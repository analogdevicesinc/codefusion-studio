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
 
import {
	sh_flags,
	sh_type,
	e_flags_riscv,
	e_flags_arm,
	e_machine
} from "elf-parser";

export const getFlags = (flagsValue: sh_flags): string => {
	const flagMappings = [
		{ flag: sh_flags.SHF_WRITE, symbol: "W" },
		{ flag: sh_flags.SHF_ALLOC, symbol: "A" },
		{ flag: sh_flags.SHF_EXECINSTR, symbol: "X" },
		{ flag: sh_flags.SHF_ORDERED, symbol: "O" },
		{ flag: sh_flags.SHF_EXCLUDE, symbol: "E" },
		{ flag: sh_flags.SHF_MASKPROC, symbol: "M" }
	];

	const result = flagMappings
		.map(({ flag, symbol }) => (flagsValue & flag ? symbol : ""))
		.join("");

	return result;
};

export const getBucket = (
	flagsValue: sh_flags,
	typeValue: sh_type
): string => {
	if (!(flagsValue & sh_flags.SHF_ALLOC)) {
		return "";
	}

	if (
		flagsValue & sh_flags.SHF_EXECINSTR ||
		!(flagsValue & sh_flags.SHF_WRITE)
	) {
		return "Text";
		return "Text";
	}

	if (typeValue & sh_type.SHT_NOBITS) {
		return "Bss";
	}

	return "Data";
};

const decodeRiscvMachineFlags = (
	flagsValue: e_flags_riscv
): Record<string, string> => {
	const result: Record<string, string> = {};
	if (flagsValue & e_flags_riscv.EF_RISCV_RVC) {
		result.EF_RISCV_RVC = "RVC";
	}

	if (flagsValue & e_flags_riscv.EF_RISCV_RVE) {
		result.EF_RISCV_RVE = "RVE";
	}

	if (flagsValue & e_flags_riscv.EF_RISCV_TSO) {
		result.EF_RISCV_TSO = "TSO";
	}
	switch (flagsValue & e_flags_riscv.EF_RISCV_FLOAT_ABI) {
		case +e_flags_riscv.EF_RISCV_FLOAT_ABI_SOFT:
			result.EF_RISCV_FLOAT_ABI_SOFT = "soft-float ABI";
			break;

		case +e_flags_riscv.EF_RISCV_FLOAT_ABI_SINGLE:
			result.EF_RISCV_FLOAT_ABI_SINGLE = "single-float ABI";
			break;

		case +e_flags_riscv.EF_RISCV_FLOAT_ABI_DOUBLE:
			result.EF_RISCV_FLOAT_ABI_DOUBLE = "double-float ABI";
			break;

		case +e_flags_riscv.EF_RISCV_FLOAT_ABI_QUAD:
			result.EF_RISCV_FLOAT_ABI_QUAD = "quad-float ABI";
			break;
	}

	return result;
};

const decodeArmMachineFlags = (
	flagsValue: e_flags_arm
): Record<string, string> => {
	const result: Record<string, string> = {};
	const eabi = flagsValue & e_flags_arm.EF_ARM_EABIMASK;
	let unknown = false;

	flagsValue &= ~e_flags_arm.EF_ARM_EABIMASK;

	if (flagsValue & e_flags_arm.EF_ARM_RELEXEC) {
		result.EF_ARM_RELEXEC = "relocatable executable";
		flagsValue &= ~e_flags_arm.EF_ARM_RELEXEC;
	}

	if (flagsValue & e_flags_arm.EF_ARM_PIC) {
		result.EF_ARM_PIC = "position independent";
		flagsValue &= ~e_flags_arm.EF_ARM_PIC;
	}
	switch (eabi) {
		default:
			result.UNRECOGNIZED_EABI = "<unrecognized EABI>";
			if (flagsValue) {
				unknown = true;
			}
			break;
		case +e_flags_arm.EF_ARM_EABI_VER1:
			result.EF_ARM_EABI_VER1 = "Version1 EABI";
			while (flagsValue) {
				const flag = flagsValue & -flagsValue;
				flagsValue &= ~flag;

				switch (flag) {
					case +e_flags_arm.EF_ARM_SYMSARESORTED:
						result.EF_ARM_SYMSARESORTED = "sorted symbol tables";
						break;

					default:
						unknown = true;
						break;
				}
			}
			break;
		case +e_flags_arm.EF_ARM_EABI_VER2:
			result.EF_ARM_EABI_VER2 = "Version2 EABI";
			while (flagsValue) {
				const flag = flagsValue & -flagsValue;
				flagsValue &= ~flag;

				switch (flag) {
					case +e_flags_arm.EF_ARM_SYMSARESORTED:
						result.EF_ARM_SYMSARESORTED = "sorted symbol tables";
						break;

					case +e_flags_arm.EF_ARM_DYNSYMSUSESEGIDX:
						result.EF_ARM_DYNSYMSUSESEGIDX =
							"dynamic symbols use segment index";
						break;

					case +e_flags_arm.EF_ARM_MAPSYMSFIRST:
						result.EF_ARM_MAPSYMSFIRST =
							"mapping symbols precede others";
						break;

					default:
						unknown = true;
						break;
				}
			}
			break;
		case +e_flags_arm.EF_ARM_EABI_VER3:
			result.EF_ARM_EABI_VER3 = "Version3 EABI";
			break;
		case +e_flags_arm.EF_ARM_EABI_VER4:
			result.EF_ARM_EABI_VER4 = "Version4 EABI";
			while (flagsValue) {
				const flag = flagsValue & -flagsValue;
				flagsValue &= ~flag;

				switch (flag) {
					case +e_flags_arm.EF_ARM_BE8:
						result.EF_ARM_BE8 = "BE8";
						break;

					case +e_flags_arm.EF_ARM_LE8:
						result.EF_ARM_LE8 = "LE8";
						break;

					default:
						unknown = true;
						break;
				}
			}
			break;
		case +e_flags_arm.EF_ARM_EABI_VER5:
			result.EF_ARM_EABI_VER5 = "Version5 EABI";
			while (flagsValue) {
				const flag = flagsValue & -flagsValue;
				flagsValue &= ~flag;

				switch (flag) {
					case +e_flags_arm.EF_ARM_BE8:
						result.EF_ARM_BE8 = "BE8";
						break;

					case +e_flags_arm.EF_ARM_LE8:
						result.EF_ARM_LE8 = "LE8";
						break;

					case +e_flags_arm.EF_ARM_ABI_FLOAT_SOFT:
						result.EF_ARM_ABI_FLOAT_SOFT = "soft-float ABI";
						break;

					case +e_flags_arm.EF_ARM_ABI_FLOAT_HARD:
						result.EF_ARM_ABI_FLOAT_HARD = "hard-float ABI";
						break;

					default:
						unknown = true;
						break;
				}
			}
			break;
		case +e_flags_arm.EF_ARM_EABI_UNKNOWN:
			result.EF_ARM_EABI_UNKNOWN = "GNU EABI";
			while (flagsValue) {
				const flag = flagsValue & -flagsValue;
				flagsValue &= ~flag;

				switch (flag) {
					case +e_flags_arm.EF_ARM_INTERWORK:
						result.EF_ARM_INTERWORK = "interworking enabled";
						break;

					case +e_flags_arm.EF_ARM_APCS_26:
						result.EF_ARM_APCS_26 = "uses APCS/26";
						break;

					case +e_flags_arm.EF_ARM_APCS_FLOAT:
						result.EF_ARM_APCS_FLOAT = "uses APCS/float";
						break;

					case +e_flags_arm.EF_ARM_PIC:
						result.EF_ARM_PIC = "position independent";
						break;

					case +e_flags_arm.EF_ARM_ALIGN8:
						result.EF_ARM_ALIGN8 = "8 bit structure alignment";
						break;

					case +e_flags_arm.EF_ARM_NEW_ABI:
						result.EF_ARM_NEW_ABI = "uses new ABI";
						break;

					case +e_flags_arm.EF_ARM_OLD_ABI:
						result.EF_ARM_OLD_ABI = "uses old ABI";
						break;

					case +e_flags_arm.EF_ARM_SOFT_FLOAT:
						result.EF_ARM_SOFT_FLOAT = "software FP";
						break;

					case +e_flags_arm.EF_ARM_VFP_FLOAT:
						result.EF_ARM_VFP_FLOAT = "VFP";
						break;

					default:
						unknown = true;
						break;
				}
			}
	}
	if (unknown) {
		result.UNKNOWN = "<unknown>";
	}
	return result;
};

export const getMachineFlags = (
	flagsValue: string | number,
	machine: string | number
): Record<string, string> => {
	let result = {};
	if (flagsValue) {
		switch (machine) {
			default:
				break;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			case e_machine.EM_ARM:
				result = decodeArmMachineFlags(flagsValue as e_flags_arm);
				break;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			case e_machine.EM_RISCV:
				result = decodeRiscvMachineFlags(flagsValue as e_flags_riscv);
				break;
		}
	}
	return result;
};
