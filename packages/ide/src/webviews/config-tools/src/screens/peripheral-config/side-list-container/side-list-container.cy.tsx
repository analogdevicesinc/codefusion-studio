/**
 *
 * Copyright (c) 2024 - 2026 Analog Devices, Inc.
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

import SideListContainer from './side-list-container';
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import type {CfsConfig} from 'cfs-types';

const mock = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const mockSingleCore = (await import('@socs/max32657-wlp.json'))
	.default as unknown as Soc;

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			CoreNum: 0,
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: '',
			Secure: false,
			ProjectId: 'CM4-proj',
			CoreId: 'CM4'
		},
		{
			CoreNum: 0,
			Description: 'Risc-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'RISC-V (RV32)',
			PluginId: '',
			Secure: false,
			ProjectId: 'RV-proj',
			CoreId: 'RV'
		}
	]
} as unknown as CfsConfig;

const mockedSingleCoreConfigDict = {
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
		}
	]
} as unknown as CfsConfig;

describe('Pheripheral config side container', () => {
	it('should render peripheral groups in alphabetical order', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);

		cy.get('[data-test^="accordion:"]').then($items => {
			const titles = [...$items].map(item => {
				const titleElement = item.querySelector('.styles-title');
				const titleText = titleElement?.textContent?.trim() ?? '';

				return titleText;
			});

			const sortedTitles = [...titles].sort((a, b) =>
				a.localeCompare(b)
			);
			expect(titles).to.deep.equal(sortedTitles);
		});
	});

	it('should filter allocated peripherals', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		// @NOTE Make sure {allocatedPeripheralName} is part of mocked peripherals!
		const allocatedPeripheralName = 'ADC';

		cy.mount(<SideListContainer />, reduxStore);

		cy.dataTest(`filter-control:all`).click();

		cy.dataTest(`assignable-item:chevron:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		cy.dataTest(
			`assignable-item:chevron:${allocatedPeripheralName}`
		).should('not.exist');
	});

	it('should allocate a signal to a project', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);
		const allocatedPeripheralName = 'GPIO0';
		const allocatedSignalName = 'P0.1';

		cy.dataTest(`accordion:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.dataTest(`assignable-item:chevron:${allocatedSignalName}`)
			.should('exist')
			.click();

		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		cy.get(
			`[data-test="peripheral-block-${allocatedPeripheralName}"]`
		).should('exist');

		cy.get(`[data-test="core-CM4-proj"]`).should('exist');
	});

	it('should allocate a peripheral with no signal to a project', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);
		const allocatedPeripheralName = 'CTB';

		cy.dataTest(
			`assignable-item:container:${allocatedPeripheralName}`
		)
			.should('exist')
			.click();

		cy.dataTest(`assignable-item:chevron:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		cy.get(`[data-test="core-CM4-proj"]`).should('exist');
	});

	it('should auto-allocate a signal with a single core option', () => {
		const reduxStore = configurePreloadedStore(
			mockSingleCore,
			mockedSingleCoreConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);
		const allocatedPeripheralName = 'GPIO0';
		const allocatedSignalName = 'P0.1';

		cy.dataTest(`accordion:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.dataTest(`assignable-item:chevron:${allocatedSignalName}`)
			.should('exist')
			.click();

		cy.get(
			`[data-test="peripheral-block-${allocatedPeripheralName}"]`
		).should('exist');

		cy.get(`[data-test="core-CM33-NS"]`).should('exist');
	});

	it('should auto-allocate a peripheral with a single project option', () => {
		const reduxStore = configurePreloadedStore(
			mockSingleCore,
			mockedSingleCoreConfigDict
		);

		cy.mount(<SideListContainer />, reduxStore);
		const allocatedPeripheralName = 'ICC0';

		cy.dataTest(
			`assignable-item:container:${allocatedPeripheralName}`
		)
			.should('exist')
			.click();

		cy.dataTest(`assignable-item:chevron:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.dataTest(`core-CM33-NS`).should('exist');
	});
});
