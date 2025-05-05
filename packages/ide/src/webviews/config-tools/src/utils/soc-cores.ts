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

import type {Core} from '@common/types/soc';
import {getCores} from './api';

export type SocCoreDictionary = Record<string, Core>;
export type SocCoreList = Core[];

let socCores: Core[] = [];
const socCoreDictionary: Record<string, Core> = {};

if (import.meta.env.MODE === 'development') {
	// Allow overriding the soc controls in test mode
	if (
		(window as any).Cypress &&
		window.localStorage.getItem('Cores')
	) {
		socCores = JSON.parse(
			window.localStorage.getItem('Cores') ?? '[]'
		);
	} else {
		socCores = (window as any).__DEV_SOC__?.Cores ?? [];
	}
} else {
	socCores = await getCores();
}

/**
 * Returns a dictionary of SoC cores.
 * @returns {SocCoreDictionary} A dictionary where the key is the core ID and the value is the core object.
 */
export function getSocCoreDictionary(): SocCoreDictionary {
	const cores = getSocCoreList();

	if (Object.values(socCoreDictionary).length === 0) {
		cores.forEach(core => {
			if (!(core.Name in socCoreDictionary)) {
				socCoreDictionary[core.Id] = core;
			}
		});
	}

	return socCoreDictionary;
}

/**
 * Returns a list of SoC cores.
 * @returns {SocCoreList} An array of core objects.
 */
export function getSocCoreList(): SocCoreList {
	if (socCores.length === 0) {
		// Attempt to populate the pin dictionary from localStorage (for testing purposes)
		const localStorageCores = localStorage.getItem('Cores');

		if (localStorageCores) {
			socCores = JSON.parse(localStorageCores);
		}
	}

	return socCores;
}

/**
 * Returns the definition of a specific SoC core.
 * @param {string} coreName - The id of the core.
 * @returns {Core | undefined} The core object if found, otherwise undefined.
 */
export function getSocCoreDefinition(
	coreName: string
): Core | undefined {
	const coreDict = getSocCoreDictionary();

	if (!coreDict[coreName]) {
		return undefined;
	}

	return socCoreDictionary[coreName];
}

/**
 * Returns the ID of the primary core from the SoC core dictionary.
 * @returns {string | undefined} The ID of the primary core if found, otherwise undefined.
 */
export function getPrimaryCoreId(): string | undefined {
	const coreDict = getSocCoreDictionary();

	const primaryCore = Object.values(coreDict).find(
		core => core.IsPrimary
	);

	return primaryCore?.Id;
}

/**
 * Resets the socCores array to an empty array and clears all entries in the socCoreDictionary.
 * This function is used to reset the state of core-related data structures.
 */
export function resetCoreDict() {
	socCores = [];
	Object.keys(socCoreDictionary).forEach(key => {
		Reflect.deleteProperty(socCoreDictionary, key);
	});
}
