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
	PeripheralSearchResult,
	PinSearchResult,
	SignalSearchResult
} from '../../../hooks/use-pinmux-search-results';

export type FormatedSearchResultItem = {
	sourceIndex: number;
	key: string;
	displayName: string;
	subDisplayName?: string;
};

const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base'
});

const sortByDisplayName = <T extends {displayName: string}>(
	items: readonly T[]
): T[] =>
	[...items].sort((a, b) =>
		collator.compare(a.displayName, b.displayName)
	);

export function formatPinResults(
	results: PinSearchResult[]
): FormatedSearchResultItem[] {
	return sortByDisplayName(
		results.map((result, index) => ({
			sourceIndex: index,
			key: `${result.pin.label}-${result.pin.name}-pin`,
			displayName: result.pin.label,
			subDisplayName: `(${result.pin.name})`
		}))
	);
}

export function formatSignalResults(
	results: SignalSearchResult[]
): FormatedSearchResultItem[] {
	return sortByDisplayName(
		results.map((result, index) => ({
			sourceIndex: index,
			key: `${result.signal.peripheral}-${result.signal.name}-signal`,
			displayName: `${result.signal.peripheral} ${result.signal.name}`
		}))
	);
}

export function formatPeripheralResults(
	results: PeripheralSearchResult[]
): FormatedSearchResultItem[] {
	return sortByDisplayName(
		results.map((result, index) => ({
			sourceIndex: index,
			key: `${result.peripheral}-peripheral`,
			displayName: result.peripheral
		}))
	);
}
