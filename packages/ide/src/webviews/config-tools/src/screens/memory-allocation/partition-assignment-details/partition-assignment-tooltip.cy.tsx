/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {type Soc} from '@common/types/soc';

const mock = formatSocCoreMemoryBlocks(
	(await import('@socs/max32657-wlp.json')).default as unknown as Soc
);

const mockNoAliases = formatSocCoreMemoryBlocks(
	(await import('@socs/max32690-wlp.json')).default as unknown as Soc
);

import type {CfsConfig} from 'cfs-types';
import {formatSocCoreMemoryBlocks} from '../../../utils/json-formatter';
import {configurePreloadedStore} from '../../../state/store';
import PartitionAssignmentDetails from './partition-assignment-details';

const mockedConfigDict = {
	SchemaVersion: '2.1.0',
	DataModelVersion: '1.0.0',
	Soc: 'MAX32657',
	Package: 'WLP',
	BoardName: 'EvKit_V1',
	Timestamp: '2025-08-13T12:18:05.080Z',
	Pins: [],
	ClockNodes: [],
	Projects: [
		{
			CoreNum: 0,
			CoreId: 'CM33',
			ProjectId: 'CM33-NS',
			PluginId: 'com.analog.project.zephyr41.plugin',
			PluginVersion: '1.0.0',
			FirmwarePlatform: 'zephyr-4.1',
			ExternallyManaged: false,
			Family: 'Cortex-M',
			Partitions: [
				{
					Name: 'TestPartition',
					StartAddress: '0x01000000',
					Size: 524288,
					IsOwner: true,
					Access: 'R',
					Config: {}
				}
			],
			Peripherals: [
				{
					Name: 'CM4 SysTick',
					Signals: [],
					Config: {
						ENABLE: 'FALSE'
					}
				}
			]
		},
		{
			CoreNum: 1,
			CoreId: 'CM33',
			ProjectId: 'CM33-S',
			PluginId: 'com.analog.project.msdk.plugin',
			PluginVersion: '1.1.0',
			FirmwarePlatform: 'zephyr-4.1',
			ExternallyManaged: false,
			Secure: true,
			Family: 'Cortex-M',
			Partitions: [
				{
					Name: 'TestPartition2',
					StartAddress: '0x01080001',
					Size: 524288,
					IsOwner: false,
					Access: 'R',
					Config: {}
				}
			],
			Peripherals: []
		}
	]
} as unknown as CfsConfig;

const mockedConfigDictNoAliases = {
	SchemaVersion: '2.1.0',
	DataModelVersion: '1.0.0',
	Soc: 'MAX32690',
	Package: 'WLP',
	BoardName: 'EvKit_V1',
	Timestamp: '2025-08-13T12:18:05.080Z',
	Pins: [],
	ClockNodes: [],
	Projects: [
		{
			CoreNum: 0,
			CoreId: 'CM4',
			ProjectId: 'CM4-NS',
			PluginId: 'com.analog.project.msdk.plugin',
			PluginVersion: '1.0.0',
			FirmwarePlatform: 'msdk',
			ExternallyManaged: false,
			Secure: false,
			Family: 'Cortex-M',
			Partitions: [
				{
					Name: 'TestPartition',
					StartAddress: '0x20000000',
					Size: 131072,
					IsOwner: true,
					Access: 'R/W/X',
					Config: {}
				}
			],
			Peripherals: []
		}
	]
} as unknown as CfsConfig;

describe('Partition Assignment Tooltip', () => {
	describe('Partition Details Page', () => {
		beforeEach(() => {
			const reduxStore = configurePreloadedStore(
				mock as unknown as Soc,
				mockedConfigDict
			);
			cy.viewport(1068, 688);
			cy.mount(<PartitionAssignmentDetails />, reduxStore);
		});

		it('should show tooltip when alias memory entries exist and Secure flag is not set', () => {
			cy.dataTest('partition-details-chevron').eq(0).click();
			cy.dataTest('CM33-NS-partition-card-details-info-icon').should(
				'exist'
			);

			cy.dataTest('CM33-NS-partition-card-details-info-icon').trigger(
				'mouseover'
			);

			// Make sure tooltip has correct header
			cy.dataTest('alias-tooltip-header')
				.children()
				.eq(0)
				.should('have.text', 'TESTPARTITION');

			// Make sure tooltip shows correct physical address
			cy.dataTest('alias-tooltip-physical-address')
				.children()
				.eq(1)
				.should('have.text', '0x01000000 - 0x0107FFFF');

			// Make sure tooltip shows correct software address
			cy.dataTest('alias-tooltip-software-address')
				.children()
				.eq(1)
				.should('have.text', '0x11000000 - 0x1107FFFF');

			cy.dataTest('CM33-NS-partition-card-details-info-icon').trigger(
				'mouseout'
			);
		});

		it('should show tooltip for Secure projects', () => {
			cy.dataTest('partition-details-chevron').eq(1).click();
			cy.dataTest('CM33-S-partition-card-details-info-icon').trigger(
				'mouseover'
			);

			// Make sure tooltip has correct header
			cy.dataTest('alias-tooltip-header')
				.children()
				.eq(0)
				.should('have.text', 'TESTPARTITION2');

			// Make sure tooltip shows correct physical address
			cy.dataTest('alias-tooltip-physical-address')
				.children()
				.eq(1)
				.should('have.text', '0x01080001 - 0x01100000');

			// Make sure tooltip shows correct software address
			cy.dataTest('alias-tooltip-software-address')
				.children()
				.eq(1)
				.should('have.text', '0x11080001 - 0x11100000');
		});
	});
});

describe('Partition Assignment Tooltip - No Alias SoC', () => {
	let noAliasStore: ReturnType<typeof configurePreloadedStore>;

	describe('Partition Details Page', () => {
		beforeEach(() => {
			noAliasStore = configurePreloadedStore(
				mockNoAliases as unknown as Soc,
				mockedConfigDictNoAliases
			);
			cy.viewport(1068, 688);
			cy.mount(<PartitionAssignmentDetails />, noAliasStore);
		});

		it('should not show tooltip for cores without alias memory entries and Secure flag is False', () => {
			cy.dataTest('partition-details-chevron').eq(0).click();
			cy.dataTest('CM4-NS-partition-card-details-info-icon').should(
				'not.exist'
			);
		});
	});
});
