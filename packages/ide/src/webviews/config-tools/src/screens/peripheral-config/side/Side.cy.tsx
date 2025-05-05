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
import PheripheralConfigSideContainer from './Side';
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';

const mock = await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default);

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	projects: [
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
};

describe('Pheripheral config side container', () => {
	before(() => {
		window.localStorage.setItem(
			'Registers',
			JSON.stringify(mock.Registers)
		);

		window.localStorage.setItem(
			'Package',
			JSON.stringify(mock.Packages[0])
		);

		window.localStorage.setItem(
			'Peripherals',
			JSON.stringify(mock.Peripherals)
		);

		window.localStorage.setItem(
			'configDict',
			JSON.stringify(mockedConfigDict)
		);
	});

	it('should render peripheral groups in alphabetical order', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		cy.mount(<PheripheralConfigSideContainer />, reduxStore);

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
			mock as unknown as Soc
		);

		function getAccordionCount() {
			return cy
				.get('[data-test^="accordion:"]')
				.then($accordions => $accordions.length);
		}

		// @NOTE Make sure {allocatedPeripheralName} is part of mocked perihperals!
		const allocatedPeripheralName = 'ADC';

		cy.mount(<PheripheralConfigSideContainer />, reduxStore);

		// Check peripheral count
		cy.get('[data-test^="accordion:"]').then($accordions => {
			const totalCount = $accordions.length;

			cy.dataTest('filter-control:available')
				.click()
				.then(() => {
					getAccordionCount().then(availableCount => {
						// Available peripheral count should be equal to total count
						expect(totalCount).to.equal(availableCount);

						cy.dataTest('filter-control:allocated')
							.click()
							.then(() => {
								// Allocated peripherals should be empty
								cy.get('[data-test^="accordion:"]').should(
									'not.exist'
								);
							});
					});
				});
		});

		cy.dataTest(`filter-control:all`).click();

		cy.dataTest(`accordion:${allocatedPeripheralName}`)
			.should('exist')
			.click();

		cy.dataTest(
			`peripheral-signal-${allocatedPeripheralName}-container`
		)
			.should('exist')
			.click();

		cy.get('[data-test^="core-"][data-test$="-container"]')
			.first()
			.click();

		// Check peripheral count again
		cy.get('[data-test^="accordion:"]').then($accordions => {
			const totalCount = $accordions.length;

			cy.dataTest('filter-control:available')
				.click()
				.then(() => {
					getAccordionCount().then(availableCount => {
						cy.dataTest('filter-control:allocated')
							.click()
							.then(() => {
								getAccordionCount().then(allocatedCount => {
									expect(totalCount).to.equal(
										availableCount + allocatedCount
									);
								});
							});
					});
				});
		});
	});
});
