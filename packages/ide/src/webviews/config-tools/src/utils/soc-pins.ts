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

/* eslint-disable @typescript-eslint/consistent-type-assertions */
import type {Package, Pin} from '@common/types/soc';
import {getSocPackage} from './api';
import {isPinReserved} from './is-pin-reserved';

let socPackage: Package = {} as Package;
let pinDictionary: Record<string, Pin> = {};
let configurablePins: Pin[] | undefined;
let fixedFuntionPins: Pin[] | undefined;

if (import.meta.env.MODE === 'development') {
	initializeSocPackage();
} else {
	socPackage = await getSocPackage();
}

function formatSocPinsDictionary(
	socPackage: Package
): Record<string, Pin> {
	if (
		!Object.keys(socPackage ?? {}).length ||
		!Array.isArray(socPackage.Pins)
	) {
		initializeSocPackage();
	}

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

function initializeSocPackage() {
	socPackage = (window as any).__DEV_SOC__?.Packages[0] ?? [];

	if ((window as any).Cypress) {
		// Attempt to populate the pin dictionary from localStorage (for testing purposes)
		const localStoragePackage =
			localStorage.getItem('Package') ?? '{}';

		socPackage = JSON.parse(localStoragePackage);
	}
}

export function getCachedSocPackage() {
	if (Object.keys(socPackage ?? {}).length === 0) {
		initializeSocPackage();
	}

	return socPackage ?? {};
}

function populatePinDictionary() {
	if (!Object.keys(socPackage ?? {}).length) {
		initializeSocPackage();
	}

	pinDictionary = formatSocPinsDictionary(socPackage);
}

export function resetPinDictionary() {
	pinDictionary = {};
	socPackage = {} as Package;
}

// Function to get pinSocDictionary, with fallback to localStorage
export function getSocPinDictionary() {
	if (Object.keys(pinDictionary).length === 0) {
		populatePinDictionary();
	}

	return pinDictionary;
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
