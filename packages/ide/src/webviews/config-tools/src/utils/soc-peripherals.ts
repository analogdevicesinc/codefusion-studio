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

import type {
	ConfigFields,
	ControlCfg,
	FormattedPeripheral,
	FormattedPeripheralSignal,
	Peripheral
} from '../../../common/types/soc';
import {getSocPeripherals} from './api';
import {isPinReserved} from './is-pin-reserved';
import {evaluateCondition} from './rpn-expression-resolver';
import {type PeripheralConfig} from '../types/peripherals';
import {getCachedSocPackage} from './soc-pins';
import {computeDefaultValues} from './compute-register-value';
import {getProjectInfoList} from './config';

let peripheralDict: Record<
	string,
	FormattedPeripheral<FormattedPeripheralSignal>
> = {};

const peripheralList: Array<
	FormattedPeripheral<FormattedPeripheralSignal>
> = [];

let socPeripherals: Peripheral[] = [];
let preallocatedPeripherals: Record<
	string,
	Array<FormattedPeripheral<FormattedPeripheralSignal>>
> = {};

if (import.meta.env.MODE === 'development') {
	initSocPeripherals();
} else {
	socPeripherals = await getSocPeripherals();
}

function initSocPeripherals() {
	socPeripherals = (window as any).__DEV_SOC__?.Peripherals ?? [];

	if ((window as any).Cypress) {
		const storagePeripherals =
			localStorage.getItem('Peripherals') ?? '[]';

		socPeripherals = JSON.parse(storagePeripherals);
	}
}

function getCachedSocPeripherals() {
	if (socPeripherals.length === 0) {
		initSocPeripherals();
	}

	return socPeripherals;
}

export function formatSocPeripheralDictionary(
	socPeripherals: Peripheral[]
) {
	const socPackage = getCachedSocPackage();

	for (const peripheral of socPeripherals) {
		const newPeripheral: FormattedPeripheral<FormattedPeripheralSignal> =
			{
				name: peripheral.Name,
				signals: {},
				description: peripheral.Description,
				security: peripheral.Security ?? 'Any',
				cores: peripheral.Cores ?? [],
				...(peripheral.Preassigned && {
					preassigned: peripheral.Preassigned
				}),
				...(peripheral.SignalGroup && {
					signalGroup: peripheral.SignalGroup
				}),
				...(peripheral.Config && {config: peripheral.Config})
			};

		if (peripheral.Signals) {
			for (const signal of peripheral.Signals) {
				const newSignal = {
					name: signal.Name,
					description: signal.Description,
					...(signal.Required && {required: signal.Required}),
					pins: []
				};

				newPeripheral.signals[newSignal.name] = newSignal;
			}
		}

		peripheralDict[peripheral.Name] = newPeripheral;
	}

	for (const pin of socPackage?.Pins ?? []) {
		if (pin.Signals && !isPinReserved(pin.Name)) {
			const newPin = {
				Name: pin.Name,
				Label: pin.Label,
				Description: pin.Description,
				Position: pin.Position,
				Signals: pin.Signals
			};

			for (const signal of pin.Signals) {
				const targetSignal =
					peripheralDict[signal.Peripheral ?? '']?.signals[
						signal.Name
					];

				targetSignal.pins.push(newPin);
			}
		}
	}

	return peripheralDict;
}

export function categorizeAllocationsByName(
	allocations: Record<string, Record<string, PeripheralConfig>>
): Map<string, PeripheralConfig> {
	return Object.values(allocations)
		.flatMap(peripherals => Object.values(peripherals))
		.reduce((map, item) => {
			if (map.has(item.name)) {
				const existing = map.get(item.name)!;
				Object.assign(existing.signals, item.signals);
			} else {
				map.set(item.name, {...item, signals: {...item.signals}});
			}

			return map;
		}, new Map<string, PeripheralConfig>());
}

export function filterAvailablePeripherals(
	perihperals: Array<FormattedPeripheral<FormattedPeripheralSignal>>,
	allocations: Record<string, Record<string, PeripheralConfig>>
) {
	const allocationMap = categorizeAllocationsByName(allocations);
	const list = perihperals.flatMap(peripheral => {
		// Scenario with signal grouping
		if (peripheral.signalGroup) {
			if (allocationMap.get(peripheral.signalGroup)) {
				return [];
			}

			return [peripheral];
		}

		// Scenario with no signals, just peripheral
		if (Object.keys(peripheral.signals).length === 0) {
			if (allocationMap.get(peripheral.name)) {
				return [];
			}

			return [peripheral];
		}

		// Scenario with individual signals
		const allocatedSignals = Array.from(allocationMap.values())
			.filter(item => item.name === peripheral.name)
			.flatMap(item => Object.values(item.signals));

		if (
			allocatedSignals.length ===
			Object.keys(peripheral.signals).length
		) {
			return [];
		}

		return [peripheral];
	});

	return list;
}

export function filterAllocatedPeripherals(
	perihperals: Array<FormattedPeripheral<FormattedPeripheralSignal>>,
	allocations: Record<string, Record<string, PeripheralConfig>>
) {
	const allocationMap = categorizeAllocationsByName(allocations);
	const list = perihperals.filter(perihperal =>
		allocationMap.has(perihperal.name)
	);

	return list;
}

export function getPeripheralList() {
	if (peripheralList.length === 0) {
		const dict = getSocPeripheralDictionary();
		peripheralList.push(...Object.values(dict));
	}

	return peripheralList;
}

export function resetSocPeripherals() {
	socPeripherals = [];
	peripheralDict = {};
	preallocatedPeripherals = {};
	peripheralList.splice(0, peripheralList.length);
	preallocatedPeripherals = {};
}

export function getSocPeripheralDictionary() {
	if (Object.keys(peripheralDict).length === 0) {
		const socPeripherals = getCachedSocPeripherals();

		peripheralDict = formatSocPeripheralDictionary(socPeripherals);
	}

	return peripheralDict;
}

/**
 * Retrieves the list of peripherals that are preallocated to a project.
 * Initializes and caches the list if not already present.
 * @returns A record of preallocated peripherals grouped by project ID
 */
export function getPreallocatedPeripherals() {
	if (Object.keys(preallocatedPeripherals).length === 0) {
		const peripherals = getSocPeripheralDictionary();
		const projectInfo = getProjectInfoList();

		Object.values(peripherals).forEach(peripheral => {
			if (peripheral.preassigned) {
				(peripheral.cores ?? []).forEach(core => {
					const projectId =
						projectInfo
							?.filter(project => project.CoreId === core)
							?.find(project => {
								if (peripheral.security === 'Secure') {
									return (
										typeof project.Secure === 'undefined' ||
										project.Secure
									);
								}

								if (peripheral.security === 'Non-Secure') {
									return (
										typeof project.Secure !== 'undefined' &&
										!project.Secure
									);
								}

								return true;
							})?.ProjectId ?? '';

					if (!preallocatedPeripherals[projectId]) {
						preallocatedPeripherals[projectId] = [];
					}

					preallocatedPeripherals[projectId].push(peripheral);
				});
			}
		});
	}

	return preallocatedPeripherals;
}

export function getPeripheralSignals(peripheralName: string) {
	const peripherals = getSocPeripheralDictionary();

	return peripherals[peripheralName]?.signals ?? {};
}

const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base'
});

export function isPeripheralConfigurable(
	peripheral: FormattedPeripheral<FormattedPeripheralSignal>
) {
	return peripheral.cores?.length;
}

export function getConfigurablePeripherals() {
	const list = getPeripheralList();
	const preallocatedPeripherals = getPreallocatedPeripherals();

	const preallocatedPeripheralNames = new Set(
		Object.values(preallocatedPeripherals).flatMap(peripherals =>
			peripherals.map(peripheral => peripheral.name)
		)
	);

	const filteredAndSortedList = list
		.filter(
			item =>
				isPeripheralConfigurable(item) &&
				!preallocatedPeripheralNames.has(item.name)
		)
		.map(peripheral => ({
			...peripheral,
			signals: Object.fromEntries(
				Object.entries(peripheral.signals).sort(([keyA], [keyB]) =>
					collator.compare(keyA, keyB)
				)
			)
		}))
		.sort((a, b) => collator.compare(a.name, b.name));

	return filteredAndSortedList;
}

export function getIsPeripheralSignalRequired(
	peripheral: string,
	signal: string,
	cfg?: Record<string, string>
) {
	const peripherals = getSocPeripheralDictionary();

	const condition =
		peripherals[peripheral]?.signals[signal]?.required;

	// In the data model, the lack of a "Required" property means the signal assignment is not required.
	// However, default to true for GPIO (aka non-grouped) signals, which are required if you assign them.
	// Non configurable peripherals are also not required.
	if (!condition) {
		return (
			!peripherals[peripheral]?.signalGroup &&
			isPeripheralConfigurable(peripherals[peripheral])
		);
	}

	return evaluateCondition(cfg, condition);
}

/**
 * Retrieves the reset values for a given peripheral.
 *
 * @param peripheral - The name of the peripheral.
 * @returns A record of configuration values for the peripheral.
 */
export function getPeripheralSocConfig(peripheral: string) {
	const peripherals = getSocPeripheralDictionary();
	const targetPeripheral = peripherals[peripheral];

	if (targetPeripheral?.config) {
		return targetPeripheral.config;
	}

	return {};
}

/**
 * Computes a flattened configuration object from a nested peripheral configuration.
 *
 * @param peripheralId - The name of the peripheral
 * @returns A flattened record of configuration values grouped by category
 */
export function computePeripheralResetValues(
	peripheralId: string,
	availableControls: ControlCfg[]
) {
	let peripheralSocConfig = getPeripheralSocConfig(peripheralId);

	// Filter config values based on available controls
	if (availableControls?.length) {
		peripheralSocConfig = Object.entries(
			peripheralSocConfig
		).reduce<ConfigFields>((acc, [key, value]) => {
			if (availableControls.some(control => control.Id === key)) {
				acc[key] = value;
			}

			return acc;
		}, {});
	}

	const computedDefaultValues = computeDefaultValues(
		peripheralSocConfig,
		availableControls
	);

	// For plugin options, the default value is not always provided by SoC.
	// If the control has a "Hint" property, use that value instead.
	if (availableControls?.length) {
		availableControls.forEach(control => {
			if (!computedDefaultValues[control.Id]) {
				computedDefaultValues[control.Id] = control.Hint ?? '';
			}
		});
	}

	return computedDefaultValues;
}
