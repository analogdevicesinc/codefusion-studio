/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import type {Soc} from '@common/types/soc';
import {
	getPeripheralList,
	initializeSocPeripherals
} from '../../../utils/soc-peripherals';
import {initializeSocPackage} from '../../../utils/soc-pins';
import {filterSignals} from './filters';

const mock = {
	Name: 'MAX32660',
	Schema: '1.5.1',
	Parts: [],
	MemoryTypes: [],
	MemoryAliasTypes: [],
	SystemMemory: [],
	Cores: [],
	Peripherals: [
		{
			Name: 'MISC',
			Description: 'Miscellaneous',
			Cores: [],
			Assignable: false,
			Signals: [
				{
					Name: 'SWDIO',
					Description: 'Serial Wire Debug I/O'
				}
			]
		}
	],
	ClockNodes: [],
	Controls: {
		ClockConfig: []
	},
	Registers: [],
	Packages: [
		{
			Name: 'TQFN20',
			Pins: ['12', '2'].map(Name => ({
				Name,
				Signals: [
					{
						Peripheral: 'MISC',
						Name: 'SWDIO',
						PinMuxConfig: []
					}
				]
			}))
		}
	]
} as unknown as Soc;

describe('filterSignals', () => {
	beforeEach(() => {
		initializeSocPackage(mock.Packages[0]);
		initializeSocPeripherals(mock.Peripherals);
	});

	it('includes a signal when any of its locations is available', () => {
		const misc = getPeripheralList().find(
			peripheral => peripheral.name === 'MISC'
		)!;
		const swdio = misc.signals.SWDIO;

		const filteredSignals = filterSignals(
			{
				...misc,
				signals: {
					...misc.signals,
					SWDIO: {...swdio, currentTarget: '12'}
				}
			},
			'available',
			[
				{
					pinId: '12',
					isFocused: false,
					appliedSignals: [
						{
							Pin: '12',
							Peripheral: 'MISC',
							Name: 'SWDIO'
						}
					]
				}
			]
		);

		expect(filteredSignals).to.have.property('SWDIO');
	});
});
