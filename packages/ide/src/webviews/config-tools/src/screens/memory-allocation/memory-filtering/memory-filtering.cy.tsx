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

import type {CfsConfig} from 'cfs-types';
import {MemoryFiltering} from './memory-filtering';
import type {Soc} from '../../../../../common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import {formatSocCoreMemoryBlocks} from '../../../utils/json-formatter';

const mock = formatSocCoreMemoryBlocks(
	(await import('@socs/max32657-wlp.json')).default as unknown as Soc
);

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

describe('Memory Filtering', () => {
	beforeEach(() => {
		cy.viewport(480, 200);

		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc,
			mockedConfigDict
		);

		cy.mount(<MemoryFiltering />, reduxStore);
	});

	it('should correctly display memory types', () => {
		cy.dataTest('memory-type-filter').click();

		cy.dataTest('multiselect-option-RAM').should('exist');
		cy.dataTest('multiselect-option-Flash').should('exist');
	});

	it('should correctly display project labels and badges', () => {
		cy.dataTest('project-filter').click();

		cy.dataTest('multiselect-option-CM33-NS').should('exist');
		cy.dataTest('multiselect-option-CM33-NS')
			.find('vscode-badge')
			.should('exist')
			.and('contain.text', 'NS');

		cy.dataTest('multiselect-option-CM33-S').should('exist');
		cy.dataTest('multiselect-option-CM33-S')
			.find('vscode-badge')
			.should('exist')
			.and('contain.text', 'S');
	});
});
