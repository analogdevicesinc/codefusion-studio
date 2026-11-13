/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import type {
	TFormFieldValue,
	TFormNumericBase
} from 'cfs-react-library';
import type {
	AppliedSignal,
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../common/types/soc';
import {type PeripheralConfig} from '../types/peripherals';
import {convertDecimalToHex} from './memory';

export function findProjectIdBySignalName(
	name: string,
	allocations: Map<string, PeripheralConfig>
): string | undefined {
	for (const [, peripheral] of allocations) {
		const signal =
			peripheral.signals &&
			Object.values(peripheral.signals).find(
				signal => signal.name === name
			);
		if (signal) return signal.projectId;
	}

	return undefined;
}

// Collator for natural, case-insensitive sorting of peripheral names and groups
const peripheralCollator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base'
});

/**
 * Groups assignable peripherals and sorts groups, standalone peripherals,
 * and group members by name using natural, case-insensitive order.
 *
 * - Peripherals that are `assignable` and have a `group` are grouped together
 *   under that group's name.
 * - Peripherals within each group are ordered alphabetically by name.
 * - Peripherals without a `group` (or not assignable) are kept as standalone
 *   entries.
 *
 * @param peripherals - Array of formatted peripherals with signals.
 * @returns An ordered array of objects, each containing:
 *   - `group` (optional): the group name
 *   - `peripherals`: the peripherals belonging to that group (or a single item if ungrouped)
 */
export function groupPeripherals(
	peripherals: Array<FormattedPeripheral<FormattedPeripheralSignal>>
) {
	const grouped = peripherals.reduce<
		Record<
			string,
			Array<FormattedPeripheral<FormattedPeripheralSignal>>
		>
	>((acc, p) => {
		if (p.assignable && p.group) {
			(acc[p.group] ??= []).push(p);
		}

		return acc;
	}, {});

	const groups = new Set<string>();
	const orderedPeripherals: Array<{
		group?: string;
		peripherals: Array<
			FormattedPeripheral<FormattedPeripheralSignal>
		>;
	}> = [];

	for (const p of peripherals) {
		if (p.assignable && p.group) {
			if (!groups.has(p.group)) {
				orderedPeripherals.push({
					group: p.group,
					peripherals: grouped[p.group]
				});
				groups.add(p.group);
			}
		} else {
			orderedPeripherals.push({
				peripherals: [p]
			});
		}
	}

	return orderedPeripherals
		.map(peripheralGroup => ({
			...peripheralGroup,
			peripherals: [...peripheralGroup.peripherals].sort((a, b) =>
				peripheralCollator.compare(a.name, b.name)
			)
		}))
		.sort((a, b) =>
			peripheralCollator.compare(
				a.group ?? a.peripherals[0].name,
				b.group ?? b.peripherals[0].name
			)
		);
}

export function getAppliedSignal(
	signalsForTargetPin: AppliedSignal[],
	peripheral: string,
	signal: string,
	targetPinId: string
): AppliedSignal | undefined {
	const appliedSignal = signalsForTargetPin.find(
		signals =>
			signals.Pin === targetPinId &&
			signals.Peripheral === peripheral &&
			signals.Name === signal
	);

	return appliedSignal;
}

export const updateProjectCardOpenState = (
	openProjectCards: string[],
	projectId: string,
	open: boolean
): string[] => {
	if (open) {
		// Add projectId and remove duplicates
		return [...openProjectCards, projectId].filter(
			(id, idx, arr) => arr.indexOf(id) === idx
		);
	}

	// Remove projectId from array
	return openProjectCards.filter(id => id !== projectId);
};

/**
 * Formats a peripheral numeric value as hexadecimal.
 *
 * @param value - The numeric value to format
 * @returns The formatted hexadecimal value
 */
export function formatPeripheralHexValue(value: number): string {
	return value === 0 ? '0x0' : convertDecimalToHex(value);
}

/**
 * Converts a value based on numeric base format
 * @param value - The value to be formatted
 * @param numericBase - The numeric base to format the value
 * @returns - Formatted value as a string
 */
export function formatValueByNumericBase(
	value: TFormFieldValue,
	numericBase?: TFormNumericBase
): string {
	if (!numericBase) {
		return String(value);
	}

	if (numericBase === 'Hexadecimal') {
		if (typeof value === 'number') {
			return formatPeripheralHexValue(value);
		}

		if (typeof value === 'string') {
			const numericValue = parseInt(value, 16);

			return formatPeripheralHexValue(numericValue);
		}
	}

	return String(value);
}

/**
 * Formats configuration values based on their config format
 * @param config - Record of configuration values (can be undefined)
 * @param configFormat - Optional configuration format containing numeric base mapping
 * @returns - Record of formatted configuration values as strings
 */
export function formatPeripheralConfigValues(
	config: Record<string, TFormFieldValue> | undefined,
	configFormat?: PeripheralConfig['configFormat']
): Record<string, string> {
	if (!config) {
		return {};
	}

	const formatEntry = ([key, value]: [string, TFormFieldValue]): [
		string,
		string
	] => {
		const numericBase = configFormat?.numericBase?.[key];

		return [key, formatValueByNumericBase(value, numericBase)];
	};

	return Object.fromEntries(Object.entries(config).map(formatEntry));
}
