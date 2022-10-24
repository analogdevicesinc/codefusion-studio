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
import { ElfSymbolData } from "./ElfSymbol.js";

enum TargetOs {
	Unknown = 0,
	RTOS_Zephyr,
	RTOS_MSDK,
}

type SymbolValueToStringFunction = (val: bigint) => string;

export class SymbolValue {
	public key: string;
	public name: string;
	public value: number;
	public stringValue: string;

	private toStringFunction: SymbolValueToStringFunction;

	constructor(
		key: string,
		name: string,
		// eslint-disable-next-line @typescript-eslint/unbound-method
		fn: SymbolValueToStringFunction = SymbolValue.decimal,
	) {
		this.key = key;
		this.name = name;
		this.toStringFunction = fn;
	}

	public parse(val: bigint) {
		this.value = Number(val);
		this.stringValue = this.toStringFunction(val);
	}

	public static hex(value: bigint): string {
		return "0x" + value.toString(16);
	}

	public static decimal(value: bigint): string {
		return value.toString();
	}
}

/**
 * ELF file Heuristics
 */
export class ElfHeuristics {
	public targetOs = TargetOs.Unknown;
	public entries = new Map<string, SymbolValue>();

	public debug = false;

	public symbolsOfInterest = new Map<TargetOs, SymbolValue[]>([
		[
			// Zephyr
			TargetOs.RTOS_Zephyr,
			[
				new SymbolValue(
					"CONFIG_FLASH_SIZE",
					"Flash size",
					(val) => SymbolValue.decimal(val) + " KB",
				),
				new SymbolValue(
					"CONFIG_SRAM_SIZE",
					"SRAM size",
					(val) => SymbolValue.decimal(val) + " KB",
				),
				new SymbolValue(
					"CONFIG_MAIN_STACK_SIZE",
					"Main stack size",
					(val) => SymbolValue.decimal(val) + " B",
				),
				new SymbolValue(
					"CONFIG_HEAP_MEM_POOL_SIZE",
					"Heap memory pool size",
					(val) => SymbolValue.decimal(val) + " B",
				),
				new SymbolValue(
					"CONFIG_FLASH_LOAD_SIZE",
					"Flash load size",
					(val) => SymbolValue.decimal(val) + " B",
				),
			],
		],
		[
			// MSDK
			TargetOs.RTOS_MSDK,
			[
				new SymbolValue(
					"Stack_Size",
					"Stack Size",
					(val) => SymbolValue.decimal(val) + " B",
				),
				new SymbolValue(
					"Heap_Size",
					"Heap Size",
					(val) => SymbolValue.decimal(val) + " B",
				),
				new SymbolValue(
					"ARM_SRAM_SIZE",
					"ARM SRAM size",
					(val) => SymbolValue.decimal(val) + " B",
				),
				new SymbolValue(
					"ARM_FLASH_SIZE",
					"ARM Flash size",
					(val) => SymbolValue.decimal(val) + " B",
				),
				new SymbolValue(
					"_RISCV_SRAM_SIZE",
					"RISCV SRAM size",
					(val) => SymbolValue.decimal(val) + " B",
				),
				new SymbolValue(
					"_RISCV_FLASH_SIZE",
					"RISCV Flash size",
					(val) => SymbolValue.decimal(val) + " B",
				),
			],
		],
	]);

	public collect(sym: ElfSymbolData) {
		if (
			this.targetOs == TargetOs.Unknown &&
			sym.infoType === Enums.sym_type.FUNC &&
			sym.nameStr === "z_sched_init"
		) {
			this.targetOs = TargetOs.RTOS_Zephyr;
		}

		// All interesting syms are in the ABS section, there their address is their value
		if (
			sym.sectionHeaderIndex !== Enums.SpecialSectionIndices.SHN_ABS.valueOf()
		)
			return;

		// Extract the order of the array from symbolsOfInterest because incomming symbols are not ordered
		const order = Array.from(this.symbolsOfInterest.values())
			.flat()
			.map((symbolValue) => symbolValue.key);

		for (const [os, props] of this.symbolsOfInterest) {
			const prop = props.find((e) => e.key === sym.nameStr);
			if (prop != undefined) {
				if (this.targetOs == TargetOs.Unknown) {
					this.targetOs = os;
				} else if (this.targetOs != os) {
					break;
				}
				prop.parse(sym.value);
				this.entries.set(prop.name, prop);
				if (this.debug) {
					console.log(
						`Heuristics: "${TargetOs[os]}": "${prop.name}" = "${prop.stringValue}" / 0x${sym.value.toString(16)} / ${sym.value}`,
					);
				}
			}
		}
		// Sort entries based on the defined order in the symbolsOfInterest
		this.entries = new Map(
			Array.from(this.entries.entries()).sort(
				([, valueA], [, valueB]) =>
					order.indexOf(valueA.key) - order.indexOf(valueB.key),
			),
		);
	}

	public getTargetOs(): string {
		switch (this.targetOs) {
			case TargetOs.RTOS_Zephyr:
				return "Zephyr RTOS";
			case TargetOs.RTOS_MSDK:
				return "MSDK";
			default:
			case TargetOs.Unknown:
				return "Unknown";
		}
	}

	public getSymbolEntries(): Map<string, SymbolValue> {
		return this.entries;
	}
}
