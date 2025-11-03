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

import type {Gasket} from '@common/types/soc';
import type {DFGStream} from 'cfs-plugins-api';

let gaskets: Gasket[];
const gasketDictionary: Record<string, Gasket> = {};

/**
 * Initializes the dfg related dictionaries.
 * Should be called once at app startup.
 */
export function initializeDfg(nodes: Gasket[] | undefined) {
	gaskets = nodes ?? [];

	gaskets.forEach(node => {
		gasketDictionary[node.Name] = node;
	});
}

export function getGasketDictionary() {
	return gasketDictionary;
}

export function getGasketModel() {
	return gaskets;
}

/**
 * For Cypress Tests.
 * Resets the dfg dictionaries.
 * Should be called in tests to ensure clean state.
 */
export function resetDfg() {
	gaskets = [];

	// Clear the dictionary by removing all keys
	for (const key in gasketDictionary) {
		if (Object.prototype.hasOwnProperty.call(gasketDictionary, key)) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete gasketDictionary[key];
		}
	}
}

/**
 * Utility functions for working with stream destinations and gaskets
 */

/**
 * Checks if a stream has a destination with the specified gasket name
 */
export function streamHasDestinationGasket(
	stream: DFGStream,
	gasketName: string
): boolean {
	return stream.Destinations.some(dest => dest.Gasket === gasketName);
}

/**
 * Finds the destination in a stream that matches the specified gasket name,
 * undefined if not found
 */
export function findDestinationByGasket(
	stream: DFGStream,
	gasketName: string
) {
	return stream.Destinations.find(dest => dest.Gasket === gasketName);
}

/**
 * Filters streams to those that have the specified gasket as one of its destinations
 */
export function filterStreamsByDestinationGasket(
	streams: DFGStream[],
	gasketName: string
): DFGStream[] {
	return streams.filter(stream =>
		streamHasDestinationGasket(stream, gasketName)
	);
}
