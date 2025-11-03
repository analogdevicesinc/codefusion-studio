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

import {
	type Partition,
	setSideBarState,
	updateActivePartition
} from '../../../state/slices/partitions/partitions.reducer';
import {type Soc} from '../../../../../common/types/soc';

const mock = formatSocCoreMemoryBlocks(
	(await import('@socs/max32657-wlp.json')).default as unknown as Soc
);

import type {CfsConfig} from 'cfs-plugins-api';
import {formatSocCoreMemoryBlocks} from '../../../utils/json-formatter';
import {configurePreloadedStore} from '../../../state/store';
import {PartitionSidebar} from './partition-sidebar';

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
			Partitions: [],
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
			Partitions: [],
			Peripherals: []
		}
	]
} as unknown as CfsConfig;

export const createMockPartition = (): Partition => ({
	displayName: 'TestPartition',
	type: 'Flash',
	baseBlock: {
		Access: 'R/W',
		AddressEnd: '0x10fffff',
		AddressStart: '0x1000000',
		Description: 'Flash Memory Region 0',
		Location: 'Internal',
		MinimumAlignment: 8192,
		Name: 'flash0',
		Type: 'Flash',
		Width: 8
	},
	blockNames: ['flash0'],
	startAddress: '0x1000000',
	size: 1048576,
	displayUnit: undefined,
	projects: []
});

describe('Partition Sidebar Aliases', () => {
	const reduxStore = configurePreloadedStore(
		mock as unknown as Soc,
		mockedConfigDict
	);

	before(() => {
		reduxStore.dispatch(
			setSideBarState({
				isSidebarMinimised: false,
				sidebarPartition: {
					displayName: '',
					type: '',
					baseBlock: {
						Name: '',
						Description: '',
						AddressStart: '',
						AddressEnd: '',
						Width: 0,
						MinimumAlignment: undefined,
						Access: '',
						Location: '',
						Type: '',
						TrustZone: undefined
					},
					blockNames: [],
					startAddress: '',
					size: 0,
					projects: [],
					config: undefined
				}
			})
		);
		cy.viewport(262, 688);
	});

	describe('Memory Blocks Section', () => {
		it('should not show aliases for Non-Secure cores', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.wrap(
				reduxStore.dispatch(
					updateActivePartition(createMockPartition())
				)
			);

			cy.dataTest('assigned-cores-multiselect').get('button').click();
			cy.dataTest('multiselect-option-CM33-NS')
				.should('be.visible')
				.click();

			cy.dataTest(
				'software-start-address-CM33-flash0-0x11000000'
			).should('not.exist');
		});
		it('should sync software addresses with physical address', () => {
			cy.mount(
				<PartitionSidebar
					isFormTouched={false}
					onClose={cy.stub}
					onFormTouched={cy.stub}
				/>,
				reduxStore
			);

			cy.wrap(
				reduxStore.dispatch(
					updateActivePartition(createMockPartition())
				)
			);

			cy.dataTest('assigned-cores-multiselect').get('button').click();
			cy.dataTest('multiselect-option-CM33-S')
				.should('be.visible')
				.click();

			cy.get(
				'[data-test="software-start-address-CM33-flash0-0x11000000"] input'
			).should('have.value', '11000000');

			cy.get('[data-test="start-address"] input')
				.clear()
				.type('01000004');

			cy.get(
				'[data-test="software-start-address-CM33-flash0-0x11000000"] input'
			).should('have.value', '11000004');
		});
	});
});
