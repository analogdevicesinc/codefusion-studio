/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import RegisterBody from './RegisterBody';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import {setClockNodeControlValue} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {resetRegisterDictionary} from '../../../utils/register-dictionary';

const mock = await import(
	`../../../../../../../../cli/src/socs/${Cypress.env('DEV_SOC_ID')}.json`
);
const clockConfigMock = await import(
	`../../../../../../../../cli/src/socs/${Cypress.env('CLOCK_CONFIG_DEV_SOC_ID')}.json`
);

describe('Register body component', () => {
	beforeEach(() => {
		window.localStorage.setItem(
			'ClockNodes',
			JSON.stringify(clockConfigMock.ClockNodes)
		);

		window.localStorage.setItem(
			'Registers',
			JSON.stringify(mock.Registers)
		);

		window.localStorage.setItem(
			'Package',
			JSON.stringify(mock.Packages[0])
		);
	});

	afterEach(() => {
		resetRegisterDictionary();
	});

	it('should render the register details header when a register is selected', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		cy.mount(<RegisterBody />, reduxStore);

		cy.dataTest('register-table-grid').within(() => {
			cy.get('vscode-data-grid-row').not(':first').first().click();
		});

		cy.dataTest('register-details-header').should('be.visible');
	});

	it('should navigate back registers table when the user clicks the back button', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		cy.mount(<RegisterBody />, reduxStore);

		cy.dataTest('register-table-grid').within(() => {
			cy.get('vscode-data-grid-row').not(':first').first().click();
		});

		cy.dataTest('register-details-header').should('be.visible');

		cy.dataTest('chevron-left-icon').click();

		cy.dataTest('register-table-grid').should('be.visible');
	});

	it('should succesfully filter on the register details table', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		cy.mount(<RegisterBody />, reduxStore);

		cy.dataTest('register-table-grid').within(() => {
			cy.get('vscode-data-grid-row').not(':first').first().click();
		});

		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.type('RESERVED');

		cy.dataTest('register-details-grid').within(() => {
			cy.get('vscode-data-grid-row')
				.not(':first')
				.each($row => {
					cy.wrap($row).should('contain.text', 'RESERVED');
				});
		});
	});

	it('Filters registers by search input', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		cy.mount(<RegisterBody />, reduxStore);

		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.type('GPIO');

		cy.dataTest('register-table-grid').within(() => {
			cy.get('vscode-data-grid-row')
				.not(':first')
				.each($row => {
					cy.wrap($row).should('contain.text', 'GPIO');
				});
		});
	});

	it('Displays "No results found" when search yields no results', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		cy.mount(<RegisterBody />, reduxStore);

		// Type 'randomRegister' into the search input
		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.type('randomRegister');

		// Verify that the "No results found" message is displayed
		cy.contains('div', 'No results found')
			.should('be.visible')
			.and('have.css', 'text-align', 'center');

		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.clear();
	});

	it('Verifies the initial state of Modified and Unmodified chips with no pin assignments, reflecting the reset value of the MCU.', () => {
		cy.fixture('clock-config-plugin-controls-baremetal.json').then(
			controls => {
				const reduxStore = configurePreloadedStore(
					mock,
					undefined,
					controls
				);

				cy.mount(<RegisterBody />, reduxStore);

				// Verify the 'Modified' chip is disabled
				cy.get('[data-test="Modified"]').should('be.disabled');

				// Verify the 'Unmodified' chip is enabled and contains the correct count
				cy.get('[data-test="Unmodified"]')
					.should('not.be.disabled')
					.and('contain.text', mock.Registers.length.toString());
			}
		);
	});

	it('Filters registers by modified/unmodified state', async () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		// Apply a signal
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '41',
				Peripheral: 'LPTMR0',
				Name: 'IOA'
			})
		);

		cy.mount(<RegisterBody />, reduxStore).then(() => {
			// Verify the 'Modified' chip is enabled and contains the correct count
			cy.get('[data-test="Modified"]')
				.should('not.be.disabled')
				.and('contain.text', '2');

			// Verify the 'Unmodified' chip is enabled and contains the correct count
			cy.get('[data-test="Unmodified"]')
				.should('not.be.disabled')
				.and('contain.text', (mock.Registers.length-2).toString());

			// Click on 'Modified' chip
			cy.get('[data-test="Modified"]').click();

			// Verify that there are results
			cy.dataTest('register-table-grid').within(() => {
				cy.get('vscode-data-grid-row')
					.not(':first')
					// eslint-disable-next-line max-nested-callbacks
					.each($row => {
						cy.wrap($row).should('exist').and('not.be.empty');
					});
			});
		});
	});

	it('Checks values after dispatch for clock config', () => {
		cy.fixture('clock-config-plugin-controls-baremetal.json').then(
			controls => {
				const reduxStore = configurePreloadedStore(
					clockConfigMock as Soc,
					undefined,
					controls
				);

				cy.mount(<RegisterBody />, reduxStore);

				reduxStore.dispatch(
					setClockNodeControlValue({
						name: 'SYS_OSC Mux',
						key: 'MUX',
						value: 'CLKEXT'
					})
				);

				reduxStore.dispatch(
					setClockNodeControlValue({
						name: 'P0.23',
						key: 'P0_23_FREQ',
						value: '23',
						error: undefined
					})
				);

				cy.get('[data-test="Modified"]').click();

				cy.dataTest('GCR_CLKCTRL-data-grid-row').within(() => {
					cy.dataTest('GCR_CLKCTRL-name-grid-cell').click();
				});

				cy.dataTest('bit-group').should('be.visible');

				cy.dataTest('register-details-grid')
					.should('be.visible')
					.and('include.text', 'SYSCLK_SEL');
			}
		);
	});

	it('Updates on Modified chip counts after applying signal and search input', async () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);
		cy.mount(<RegisterBody />, reduxStore).then(() => {
			reduxStore.dispatch(
				setAppliedSignal({
					Pin: '41',
					Peripheral: 'LPTMR0',
					Name: 'IOA'
				})
			);

			cy.get('[data-test="Modified"]').click();

			cy.dataTest('search-control-input')
				.shadow()
				.find('input')
				.type('EN0');

			cy.get('[data-test="Modified"]').should('contain.text', '1');

			cy.dataTest('search-control-input')
				.shadow()
				.find('input')
				.clear();

			cy.get('[data-test="Modified"]').should('contain.text', '2');

			cy.get('[data-test="Unmodified"]').should(
				'contain.text',
				(mock.Registers.length-2).toString()
			);
		});
	});
});
