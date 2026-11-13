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

import {type ConfiguredProject} from '@common/api';
import type {Soc, PinDictionary} from '@common/types/soc';
import {type Partition} from '../state/slices/partitions/partitions.reducer';
import {type PeripheralConfig} from '../types/peripherals';
import {
	formatProjectPersistencePayload,
	applyPersistedPinConfig
} from './persistence';
import {sysPlannerDataInit} from './sys-planner-data-init';
import type {CfsConfig} from 'cfs-types';
import {formatPeripheralSignalsTargets} from './json-formatter';
import {formatValueByNumericBase} from './peripheral';
import {computePeripheralResetValues} from './soc-peripherals';

const MAX32690wlp = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const MAX32655ctbga = (await import('@socs/max32655-ctbga.json'))
	.default as unknown as Soc;

const mockedConfig = {
	Soc: 'MAX32690',
	BoardName: 'Cypress',
	Package: 'WLP',
	Projects: [
		{
			CoreId: 'CM4',
			ProjectId: 'CM4-proj',
			PluginId: '',
			PluginVersion: '',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			PlatformConfig: {
				test: 'test'
			},
			Partitions: [],
			Peripherals: []
		}
	]
} as unknown as CfsConfig;

describe('Persistance', () => {
	before(() => {
		sysPlannerDataInit(MAX32690wlp, mockedConfig);
	});

	it('formatProjectPersistencePayload should correctly format data', () => {
		const peripheralName = 'ADC';
		const peripheralDescription = 'Some description';
		const gpioSignalName = 'P0.1';
		const signalName = 'AIN0';
		const signalDescription = 'GPIO signal description';
		const coreId = 'CM4';
		const projectId = 'CM4-proj';
		const config = {CFG: 'CFG_VAL'};
		const sigConfig = {S_CFG: 'S_CFG_VAL'};

		const partitionName = 'TEST_PART';
		const partitionType = 'FLASH';
		const partitionStartAddr = '1000';
		const partitionStartAddrFormatted = '0x00001000';
		const partitionSize = 100;
		const partitionPluginConfig = {P_P_CFG: 'P_P_CFG_VAL'};
		const partitionAccess = 'R';

		const partitions: Partition[] = [
			{
				displayName: partitionName,
				type: partitionType,
				baseBlock: {
					Name: '',
					Description: '',
					AddressStart: '',
					AddressEnd: '',
					Width: 0,
					Access: '',
					Location: '',
					Type: ''
				},
				blockNames: [],
				startAddress: partitionStartAddr,
				size: partitionSize,
				projects: [
					{
						coreId,
						projectId,
						label: '',
						access: partitionAccess,
						owner: false
					}
				],
				config: {[projectId]: partitionPluginConfig}
			}
		];
		const peripheralAssigments: Record<string, PeripheralConfig> = {
			ADC: {
				name: peripheralName,
				description: peripheralDescription,
				projectId,
				signals: {
					AIN0: {
						name: signalName,
						projectId,
						config: sigConfig
					}
				},
				config
			},
			GPIO: {
				name: 'GPIO',
				config: {},
				signals: {
					gpioSignalName: {
						name: gpioSignalName,
						description: signalDescription,
						projectId,
						config: {}
					}
				}
			}
		};

		const expectedResult: Array<Partial<ConfiguredProject>> = [
			{
				FirmwarePlatform: '',
				CoreId: coreId,
				PluginId: '',
				PluginVersion: '',
				ExternallyManaged: false,
				PlatformConfig: {
					test: 'test'
				},
				Partitions: [
					{
						Name: partitionName,
						StartAddress: partitionStartAddrFormatted,
						Size: partitionSize,
						IsOwner: false,
						Access: partitionAccess,
						Config: partitionPluginConfig
					}
				],
				Peripherals: [
					{
						Name: peripheralName,
						Description: peripheralDescription,
						Signals: [
							{
								Name: signalName,
								Config: sigConfig
							}
						],
						Config: config
					},
					{
						Name: 'GPIO',
						Signals: [
							{
								Name: gpioSignalName,
								Description: signalDescription,
								Config: {}
							}
						],
						Config: {}
					}
				]
			}
		];

		const pins: PinDictionary = {
			pin1: {
				pinId: 'pin1',
				isFocused: false,
				appliedSignals: [
					{
						Pin: 'pin1',
						Peripheral: peripheralName,
						Name: signalName,
						PinCfg: sigConfig
					}
				]
			}
		};

		const result = formatProjectPersistencePayload(
			partitions,
			peripheralAssigments,
			pins
		);

		expect(result[0].Peripherals).to.deep.equal(
			expectedResult[0].Peripherals
		);
	});

	it('Should load the correct signal-pin assignment from the file', () => {
		const persistedPins = [
			{
				Peripheral: 'OWM',
				Pin: 'H5',
				Signal: 'IO'
			},
			{
				Peripheral: 'OWM',
				Pin: 'H9',
				Signal: 'PE'
			}
		];

		const defaultConfig = formatPeripheralSignalsTargets(
			MAX32655ctbga,
			[]
		);
		expect(defaultConfig.OWM.signalsTargets.IO).to.equal('G7');
		expect(defaultConfig.OWM.signalsTargets.PE).to.equal('G4');

		const persistedPinsConfig = formatPeripheralSignalsTargets(
			MAX32655ctbga,
			persistedPins
		);
		expect(persistedPinsConfig.OWM.signalsTargets.IO).to.equal('H5');
		expect(persistedPinsConfig.OWM.signalsTargets.PE).to.equal('H9');
	});

	it('formatProjectPersistencePayload should correctly format numeric base values', () => {
		const peripheralName = 'I2C0';
		const peripheralDescription = 'Inter-Integrated Circuit 0';
		const projectId = 'CM4-proj';

		const peripheralAssigments: Record<string, PeripheralConfig> = {
			[peripheralName]: {
				name: peripheralName,
				description: peripheralDescription,
				projectId,
				signals: {},
				config: {
					MODE: 'TARGET',
					TARGET0_ADDR: '000000FF',
					TARGET1_ADDR: '0',
					CLK_LO: '100'
				},
				configFormat: {
					numericBase: {
						TARGET0_ADDR: 'Hexadecimal',
						TARGET1_ADDR: 'Hexadecimal',
						CLK_LO: 'Decimal'
					}
				}
			}
		};

		const partitions: Partition[] = [];
		const pins: PinDictionary = {};

		const result = formatProjectPersistencePayload(
			partitions,
			peripheralAssigments,
			pins
		);

		const resultPeripheral = result[0].Peripherals?.find(
			p => p.Name === peripheralName
		);

		expect(resultPeripheral?.Config).to.deep.equal({
			MODE: 'TARGET',
			TARGET0_ADDR: '0x000000FF',
			TARGET1_ADDR: '0x0',
			CLK_LO: '100'
		});
	});

	it('formatValueByNumericBase should prefix numeric hexadecimal zero', () => {
		expect(formatValueByNumericBase(0, 'Hexadecimal')).to.equal(
			'0x0'
		);
	});

	it('computePeripheralResetValues should prefix hexadecimal zero defaults', () => {
		const defaults = computePeripheralResetValues(
			'I2C0',
			MAX32690wlp.Controls.I2C0
		);

		expect(defaults.TARGET0_ADDR).to.equal('0x0');
	});

	it('applyPersistedPinConfig should restore distinct PinCfg for peripherals sharing the same signal name', () => {
		const dataModelPins: PinDictionary = {
			G5: {pinId: 'G5', isFocused: false, appliedSignals: []},
			H5: {pinId: 'H5', isFocused: false, appliedSignals: []}
		};

		const persistedPinConfig = [
			{Pin: 'G5', Peripheral: 'TMR0', Signal: 'IOA'},
			{Pin: 'H5', Peripheral: 'TMR1', Signal: 'IOA'}
		];

		const persistedCores: ConfiguredProject[] = [
			{
				CoreId: 'CM4',
				ProjectId: 'CM4',
				PluginId: '',
				PluginVersion: '',
				FirmwarePlatform: '',
				ExternallyManaged: false,
				PlatformConfig: {},
				Partitions: [],
				Peripherals: [
					{
						Name: 'TMR0',
						Signals: [
							{
								Name: 'IOA',
								Config: {
									TMR_SIGNAL_TYPE: 'IN',
									PWR: 'VDDIO',
									PS: 'DIS'
								}
							}
						],
						Config: {}
					},
					{
						Name: 'TMR1',
						Signals: [
							{
								Name: 'IOA',
								Config: {
									TMR_SIGNAL_TYPE: 'OUT',
									PWR: 'VDDIO',
									DS: '0'
								}
							}
						],
						Config: {}
					}
				]
			}
		];

		applyPersistedPinConfig(
			dataModelPins,
			persistedPinConfig,
			persistedCores
		);

		expect(dataModelPins.G5.appliedSignals[0].PinCfg).to.deep.equal({
			TMR_SIGNAL_TYPE: 'IN',
			PWR: 'VDDIO',
			PS: 'DIS'
		});
		expect(dataModelPins.H5.appliedSignals[0].PinCfg).to.deep.equal({
			TMR_SIGNAL_TYPE: 'OUT',
			PWR: 'VDDIO',
			DS: '0'
		});
	});
});
