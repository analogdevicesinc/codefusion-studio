/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
	type CustomTLV,
	type HeaderSizeUnit,
	type SlotSizeUnit
} from '../types/application-packages';
import {ByteUnitMap} from '../types/memory';

export type SizeUnitChangeResult<T extends string> = {
	bytesValue: number;
	newDisplayValue: number;
	newUnit: T;
};

export type SizeChangeResult = {
	bytesValue: number;
	displayValue: number;
};

/**
 *  Validates the header size based on the display value and unit.
 * @param displayValue
 * @param unit
 * @returns bytesValue: the header size in bytes based on the unit
 *          displayValue: the header size display value based on the unit
 */

export function computeHeaderSizeChange(
	displayValue: number,
	unit: HeaderSizeUnit
): SizeChangeResult {
	return {
		bytesValue: displayValue * ByteUnitMap[unit],
		displayValue
	};
}

/**
 *  Validates the slot size based on the display value and unit.
 * @param displayValue
 * @param unit
 * @returns bytesValue: the slot size in bytes based on the unit
 *          displayValue: the slot size display value based on the unit
 */

export function computeSlotSizeChange(
	displayValue: number,
	unit: SlotSizeUnit
): SizeChangeResult {
	return {
		bytesValue: displayValue * ByteUnitMap[unit],
		displayValue
	};
}

/**
 * Computes the new slot size display value and bytes value when the unit is changed.
 *
 * @param currentDisplaySize
 * @param currentUnit
 * @param newUnit
 * @returns  bytesValue: the slot size in bytes based on the new unit
 *           newDisplayValue: the slot size display value based on the new unit
 *           newUnit: the new slot size unit
 */

export function computeSlotUnitChange(
	currentDisplaySize: number,
	currentUnit: SlotSizeUnit,
	newUnit: SlotSizeUnit
): SizeUnitChangeResult<SlotSizeUnit> {
	const bytesValue = currentDisplaySize * ByteUnitMap[currentUnit];
	const newDisplayValue = Math.round(
		bytesValue / ByteUnitMap[newUnit]
	);

	return {
		bytesValue: newDisplayValue * ByteUnitMap[newUnit],
		newDisplayValue,
		newUnit
	};
}

/**
 * Computes the size of a custom TLV value in bytes, including overhead.
 * @param value - The TLV value as a string.
 * @returns The size of the TLV in bytes, including overhead.
 */

const TLV_OVERHEAD_BYTES = 4;
const HEX_PREFIX = '0x';

export function computeCustomTlvSize(value: string): number {
	const trimmedValue = value.trim();

	if (!trimmedValue) {
		return TLV_OVERHEAD_BYTES;
	}

	if (trimmedValue.toLowerCase().startsWith(HEX_PREFIX)) {
		const hexDigits = trimmedValue
			.slice(HEX_PREFIX.length)
			.replace(/[^0-9A-Fa-f]/g, '');
		const byteCount = Math.ceil(hexDigits.length / 2);

		return TLV_OVERHEAD_BYTES + byteCount;
	}

	return TLV_OVERHEAD_BYTES + value.length;
}

export function computeTotalCustomTlvSize(
	customTlvs: CustomTLV[]
): number {
	return customTlvs.reduce(
		(total, tlv) => total + computeCustomTlvSize(tlv.value),
		0
	);
}

const MAX_ADDRESS = 0xffffffff;

/**
 * Strips an optional `0x` or `0X` prefix from a hex string.
 */
export function stripHexPrefix(value: string): string {
	return value.replace(/^0[xX]/, '');
}

/**
 * Computes the exclusive end address of an image slot given a hex
 * start address and slot size in bytes.
 *
 * The returned end address is exclusive, i.e. it represents the first
 * address after the slot (`start + size`).  For example a slot at
 * `10000` with size 4096 (0x1000) returns `11000`.
 *
 * @param locationAddress - The start address as a hex string (with or without 0x prefix).
 * @param slotSizeBytes - The slot size in bytes.
 * @returns The exclusive end address as an uppercase hex string (without 0x prefix),
 *          or `undefined` if the inputs are invalid or the result overflows.
 */
export function computeEndAddress(
	locationAddress: string,
	slotSizeBytes: number
): string | undefined {
	if (!locationAddress || slotSizeBytes <= 0) {
		return undefined;
	}

	const hexDigits = stripHexPrefix(locationAddress).replace(
		/[^0-9A-Fa-f]/g,
		''
	);

	if (!hexDigits.length || hexDigits.length > 8) {
		return undefined;
	}

	const startAddress = parseInt(hexDigits, 16);

	if (Number.isNaN(startAddress)) {
		return undefined;
	}

	const endAddress = startAddress + slotSizeBytes;

	if (endAddress > MAX_ADDRESS) {
		return undefined;
	}

	return endAddress.toString(16).toUpperCase();
}
