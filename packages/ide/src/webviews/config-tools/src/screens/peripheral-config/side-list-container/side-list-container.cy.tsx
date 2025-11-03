/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

/* eslint-disable max-nested-callbacks */
import SideListContainer from './side-list-container';
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import type {CfsConfig} from 'cfs-plugins-api';

const mock = (await import('@socs/max32690-wlp.json'))
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

		// @NOTE Make sure {allocatedPeripheralName} is part of mocked perihperals!
		const allocatedPeripheralName = 'ADC';

		cy.mount(<SideListContainer />, reduxStore);

		cy.dataTest(`filter-control:all`).click();

		cy.dataTest(`allocate-${allocatedPeripheralName}-button`)
			.should('exist')
			.click();

		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		cy.dataTest(`allocate-${allocatedPeripheralName}-button`).should(
			'not.exist'
		);
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

		cy.dataTest(`peripheral-signal-${allocatedSignalName}-chevron`)
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

		cy.dataTest(`no-group-${allocatedPeripheralName}-container`)
			.should('exist')
			.click();

		cy.dataTest(`allocate-${allocatedPeripheralName}-button`)
			.should('exist')
			.click();

		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		cy.get(`[data-test="core-CM4-proj"]`).should('exist');
	});
});
