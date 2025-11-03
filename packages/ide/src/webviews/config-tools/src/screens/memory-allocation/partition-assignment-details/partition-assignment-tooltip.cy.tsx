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

import {type Soc} from '../../../../../common/types/soc';

const mock = formatSocCoreMemoryBlocks(
	(await import('@socs/max32657-wlp.json')).default as unknown as Soc
);

import type {CfsConfig} from 'cfs-plugins-api';
import {formatSocCoreMemoryBlocks} from '../../../utils/json-formatter';
import {configurePreloadedStore} from '../../../state/store';
import PartitionAssignmentDetails from './partition-assignment-details';

const mockedConfigDict = {
	DataModelVersion: '1.0.0',
	DataModelSchemaVersion: '1.0.0',
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
			Secure: false,
			Family: 'Cortex-M',
			Partitions: [
				{
					Name: 'TestPartition',
					StartAddress: '0x01000000',
					Size: 1048576,
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
					Name: 'TestPartition',
					StartAddress: '0x01000000',
					Size: 1048576,
					IsOwner: false,
					Access: 'R',
					Config: {}
				}
			],
			Peripherals: []
		}
	]
} as unknown as CfsConfig;

describe('Partition Assignment Tooltip', () => {
	const reduxStore = configurePreloadedStore(
		mock as unknown as Soc,
		mockedConfigDict
	);

	describe('Partition Details Page', () => {
		before(() => {
			cy.viewport(1068, 688);
			cy.mount(<PartitionAssignmentDetails />, reduxStore);
		});

		it('should only show tooltip for Secure projects', () => {
			// Make sure Non-Secure projects don't show tooltip
			cy.dataTest('partition-details-chevron').eq(0).click();
			cy.dataTest('CM33-NS-partition-card-details-info-icon').should(
				'not.exist'
			);

			// Make sure Secure projects show tooltip
			cy.dataTest('partition-details-chevron').eq(2).click();
			cy.dataTest('CM33-S-partition-card-details-info-icon').trigger(
				'mouseover'
			);

			// Make sure tooltip hase correct header
			cy.dataTest('alias-tooltip-header').should(
				'have.text',
				'TESTPARTITION'
			);

			// Make sure tooltip shows correct physical address
			cy.dataTest('alias-tooltip-physical-address')
				.children()
				.eq(1)
				.should('have.text', '0x01000000 - 0x010FFFFF');

			// Make sure tooltip shows correct software address
			cy.dataTest('alias-tooltip-software-address')
				.children()
				.eq(1)
				.should('have.text', '0x11000000 - 0x110FFFFF');
		});
	});
});
