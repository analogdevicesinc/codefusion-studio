/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import {Peripheral} from '@common/types/soc';
import {initializeSruData} from '../utils/sru';
import {initializeSocControls} from '../utils/soc-controls';

export function initializePinBufferSubGroup(): void {
	const peripherals: Peripheral[] = [
		{
			Name: 'DAI0',
			Description: 'DAI0',
			Cores: [],
			Signals: [],
			ClockNode: '',
			SRU: {
				Inputs: [
					{
						Name: 'DAI0_PBEN02_I',
						Description: 'Pin buffer direction control',
						SignalType: 'Clock Signals',
						PeripheralSubGroup: 'DAI0_PB02',
						IsPinBufferEnable: true,
						Config: {}
					},
					{
						Name: 'DAI0_PB02_I',
						Description: 'Pin buffer input',
						SignalType: 'Clock Signals',
						PeripheralSubGroup: 'DAI0_PB02',
						Config: {}
					}
				],
				Outputs: []
			}
		}
	];

	initializeSruData(peripherals);
}

export function initializeSruDefaultConnection(): void {
	initializeSocControls({
		SruConfig: [
			{
				Id: 'TEST_ROUTE',
				Description: 'Test SRU routing control',
				Type: 'enum',
				Default: 'DAI0_PB04_O',
				EnumValues: [
					{
						Id: 'DAI0_PB04_O',
						Description: 'DAI0_PB04_O',
						Value: 3
					}
				]
			}
		]
	});

	const peripherals: Peripheral[] = [
		{
			Name: 'ASRC0',
			Description: 'ASRC0',
			Cores: [],
			Signals: [],
			ClockNode: '',
			SRU: {
				Inputs: [
					{
						Name: 'SRC0_CLK_IP_I',
						Description: 'SRC0 clock input',
						SignalType: 'Clock Signals',
						PeripheralSubGroup: 'SRC 0',
						Config: {
							TEST_ROUTE: {
								VALUE: []
							}
						}
					}
				],
				Outputs: []
			}
		}
	];

	initializeSruData(peripherals);
}
