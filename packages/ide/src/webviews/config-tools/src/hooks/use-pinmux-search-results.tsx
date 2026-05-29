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
import {useMemo} from 'react';
import {useSearchString} from '../state/slices/app-context/appContext.selector';
import {getSocPinDictionary} from '../utils/soc-pins';
import {MIN_PINCONFIG_SEARCH_LENGTH} from '../screens/pinmux/constants/search-scope';

export type PinSearchResult = {
	pin: {
		label: string;
		name: string;
	};
};

export type SignalSearchResult = {
	signal: {
		name: string;
		peripheral: string;
	};
};

export type PeripheralSearchResult = {
	peripheral: string;
	pins: string[];
};

export const usePinmuxSearchResults = () => {
	const search = useSearchString('pinconfig').toLowerCase();
	const socPins = Object.values(getSocPinDictionary());

	const pinIndex = useMemo(
		() =>
			socPins.map(pin => ({
				name: pin.Name,
				label: pin.Label,
				labelLower: pin.Label.toLowerCase(),
				nameLower: pin.Name.toLowerCase()
			})),
		[socPins]
	);

	const signalIndex = useMemo(
		() =>
			socPins.flatMap(
				pin =>
					pin.Signals?.map(signal => ({
						signalName: signal.Name,
						signalNameLower: signal.Name?.toLowerCase(),
						peripheral: signal.Peripheral ?? ''
					})) ?? []
			),
		[socPins]
	);

	const peripheralIndex = useMemo(() => {
		const map = new Map<
			string,
			PeripheralSearchResult & {peripheralLower: string}
		>();

		for (const pin of socPins) {
			for (const signal of pin.Signals ?? []) {
				const peripheral = signal.Peripheral;
				if (!peripheral) continue;

				const existing = map.get(peripheral);

				if (existing) {
					if (!existing.pins.includes(pin.Name)) {
						existing.pins.push(pin.Name);
					}
				} else {
					map.set(peripheral, {
						peripheral,
						peripheralLower: peripheral.toLowerCase(),
						pins: [pin.Name]
					});
				}
			}
		}

		return Array.from(map.values());
	}, [socPins]);

	return useMemo(() => {
		if (search.length < MIN_PINCONFIG_SEARCH_LENGTH) {
			return {
				pinResults: [],
				signalResults: [],
				peripheralResults: []
			};
		}

		return {
			pinResults: Array.from(
				new Map(
					pinIndex
						.filter(
							pin =>
								pin.labelLower.includes(search) ||
								pin.nameLower.includes(search)
						)
						.map(pin => [
							pin.name,
							{
								pin: {
									label: pin.label,
									name: pin.name
								}
							}
						])
				).values()
			),

			signalResults: Array.from(
				new Map(
					signalIndex
						.filter(signal =>
							signal.signalNameLower?.includes(search)
						)
						.map(signal => [
							`${signal.signalName}|${signal.peripheral}`,
							{
								signal: {
									name: signal.signalName,
									peripheral: signal.peripheral
								}
							}
						])
				).values()
			),

			peripheralResults: peripheralIndex
				.filter(p => p.peripheralLower.includes(search))
				.map(({peripheral, pins}) => ({
					peripheral,
					pins
				}))
		};
	}, [search, pinIndex, signalIndex, peripheralIndex]);
};
