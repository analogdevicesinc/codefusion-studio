/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
	type AppliedSignal,
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../common/types/soc';
import {type PeripheralConfig} from '../types/peripherals';

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

/**
 * Groups a list of peripherals by their `group` property while preserving the
 * original input order of groups and ungrouped peripherals.
 *
 * - Peripherals that are `assignable` and have a `group` are grouped together
 *   under that group's name.
 * - The function ensures that each group appears only once in the output, in
 *   the order of their first occurrence.
 * - Peripherals without a `group` (or not assignable) are kept as standalone
 *   entries in the result, also in input order.
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

	return orderedPeripherals;
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
