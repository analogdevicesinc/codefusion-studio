/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

/* eslint-disable @typescript-eslint/consistent-type-assertions */
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal,
	Package,
	Pin
} from '@common/types/soc';
import {isPinReserved} from './is-pin-reserved';

let socPackage: Package = {} as Package;
let pinDictionary: Record<string, Pin> = {};
let configurablePins: Pin[] | undefined;
let fixedFuntionPins: Pin[] | undefined;

/**
 * Initializes the SoC package and resets pin dictionaries.
 * Should be called once at app startup.
 */
export function initializeSocPackage(pkg: Package | undefined) {
	resetPinInfo();

	socPackage = pkg ?? ({} as Package);
}

function formatSocPinsDictionary(
	socPackage: Package
): Record<string, Pin> {
	return (socPackage?.Pins ?? []).reduce<Record<string, Pin>>(
		(acc, pin) => {
			acc[pin.Name] = {
				...pin,
				Signals: pin.Signals?.map(signal => ({
					...signal,
					coprogrammedSignals: socPackage.CoprogrammedSignals?.filter(
						coprogrammedSignalOuterArray =>
							coprogrammedSignalOuterArray.some(
								coprogrammedSignalObj =>
									coprogrammedSignalObj.Pin === pin.Name &&
									coprogrammedSignalObj.Peripheral ===
										signal.Peripheral
							)
					)?.flatMap(coprogrammedSignalOuterArray =>
						coprogrammedSignalOuterArray.filter(
							coprogrammedSignalObj =>
								coprogrammedSignalObj.Pin !== pin.Name
						)
					)
				}))
			};

			return acc;
		},
		{}
	);
}

export function getCachedSocPackage() {
	return socPackage ?? {};
}

function populatePinDictionary() {
	pinDictionary = formatSocPinsDictionary(socPackage);
}

export function resetPinInfo() {
	pinDictionary = {};
	socPackage = {} as Package;
	configurablePins = undefined;
	fixedFuntionPins = undefined;
}

// Function to get pinSocDictionary, with fallback to localStorage
export function getSocPinDictionary() {
	if (Object.keys(pinDictionary).length === 0) {
		populatePinDictionary();
	}

	return pinDictionary;
}

// For Cypress Tests.
// Should be called in tests to ensure clean state.
export function resetPinDictionary() {
	// Clear the dictionary by removing all keys
	for (const key in pinDictionary) {
		if (Object.prototype.hasOwnProperty.call(pinDictionary, key)) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete pinDictionary[key];
		}
	}
}

export function getSocPinDetails(id: string) {
	const socPins = getSocPinDictionary();

	return socPins[id] ?? {};
}

export function getConfigurablePins() {
	if (Array.isArray(configurablePins) && configurablePins.length)
		return configurablePins;

	const socPins = getSocPinDictionary();

	configurablePins = Object.values(socPins).filter(
		pin => !isPinReserved(pin.Name)
	);

	return configurablePins;
}

export function getFixedFuntionPins() {
	if (Array.isArray(fixedFuntionPins) && fixedFuntionPins.length)
		return fixedFuntionPins;

	const socPins = getSocPinDictionary();

	fixedFuntionPins = Object.values(socPins).filter(pin =>
		isPinReserved(pin.Name)
	);

	return fixedFuntionPins;
}

/**
 * @param pins
 * @param peripherals
 * @returns A dictionary where each key is a `peripheral__signal` string and the value is an array of pins for that pair.
 */
export function getPinsByPeripheralSignalDictionary(
	pins: Pin[],
	peripherals: Array<FormattedPeripheral<FormattedPeripheralSignal>>
) {
	const dictionary: Record<string, Pin[]> = {};

	for (const pin of pins) {
		for (const signal of pin?.Signals ?? []) {
			const peripheral = peripherals.find(
				p => p.name === signal.Peripheral
			);
			if (!peripheral) continue;

			const {name, signals} = peripheral;
			const signalEntry = signals[signal.Name];
			if (!signalEntry) continue;

			dictionary[`${name}__${signal.Name}`] = signalEntry.pins;
		}
	}

	return dictionary;
}
