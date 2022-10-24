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

const mock = await import(
	`../../../../../../../../cli/src/socs/${Cypress.env('DEV_SOC_ID')}.json`
);
const clockConfigMock = await import(
	`../../../../../../../../cli/src/socs/${Cypress.env('CLOCK_CONFIG_DEV_SOC_ID')}.json`
);

describe('Register body component', () => {
	it('Filters registers by search input', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		cy.mount(<RegisterBody />, reduxStore);

		cy.dataTest('search-input').shadow().find('input').type('GPIO');

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
		cy.dataTest('search-input')
			.shadow()
			.find('input')
			.type('randomRegister');

		// Verify that the "No results found" message is displayed
		cy.contains('div', 'No results found')
			.should('be.visible')
			.and('have.css', 'text-align', 'center');

		cy.dataTest('search-input').shadow().find('input').clear();
	});

	it('Verifies the initial state of Modified and Unmodified chips with no pin assignments, reflecting the reset value of the MCU.', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		cy.mount(<RegisterBody />, reduxStore);

		// Verify the 'Modified' chip is disabled
		cy.get('[data-test="Modified"]').should('be.disabled');

		// Verify the 'Unmodified' chip is enabled and contains the correct count
		cy.get('[data-test="Unmodified"]')
			.should('not.be.disabled')
			.and('contain.text', '72');
	});

	it('Filters registers by modified/unmodified state', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		const {registers} =
			reduxStore.getState().appContextReducer.registersScreen;

		// Apply a signal
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '41',
				Peripheral: 'LPTMR0',
				Name: 'IOA',
				registers
			})
		);

		cy.mount(<RegisterBody />, reduxStore);

		// Verify the 'Modified' chip is enabled and contains the correct count
		cy.get('[data-test="Modified"]')
			.should('not.be.disabled')
			.and('contain.text', '2');

		// Verify the 'Unmodified' chip is enabled and contains the correct count
		cy.get('[data-test="Unmodified"]')
			.should('not.be.disabled')
			.and('contain.text', '70');

		// Click on 'Modified' chip
		cy.get('[data-test="Modified"]').click();

		// Verify that there are results
		cy.dataTest('register-table-grid').within(() => {
			cy.get('vscode-data-grid-row')
				.not(':first')
				.each($row => {
					cy.wrap($row).should('exist').and('not.be.empty');
				});
		});
	});

	describe('Verify modal details', () => {
		it('Checks initial values before dispatch', () => {
			const reduxStore = configurePreloadedStore(mock as Soc);

			cy.mount(<RegisterBody />, reduxStore);

			cy.dataTest('GPIO0_EN0-data-grid-row').within(() => {
				cy.dataTest('GPIO0_EN0-name-grid-cell').click();
			});

			cy.dataTest('inner-modal').should('be.visible');

			cy.dataTest('inner-modal').within(() => {
				cy.dataTest('PIN23-2-data-grid-cell')
					.scrollIntoView()
					.should('be.visible')
					.should('have.text', '0x1');
			});

			cy.get('vscode-button').contains('Close').click();

			cy.dataTest('inner-modal').should('not.exist');

			cy.dataTest('GCR_CLKCTRL-data-grid-row').within(() => {
				cy.dataTest('GCR_CLKCTRL-name-grid-cell').click();
			});

			cy.dataTest('inner-modal').should('be.visible');

			cy.dataTest('inner-modal').within(() => {
				cy.dataTest('SYSCLK_SEL-2-data-grid-cell')
					.scrollIntoView()
					.should('be.visible')
					.should('have.text', '0x0');
			});
		});

		it('Checks values after dispatch for pin config', () => {
			const reduxStore = configurePreloadedStore(mock as Soc);

			cy.mount(<RegisterBody />, reduxStore);

			const {registers} =
				reduxStore.getState().appContextReducer.registersScreen;
			reduxStore.dispatch(
				setAppliedSignal({
					Pin: '13',
					Peripheral: 'MISC',
					Name: 'CLKEXT',
					registers
				})
			);

			cy.get('[data-test="Modified"]').click();

			cy.dataTest('GPIO0_EN0-data-grid-row').within(() => {
				cy.dataTest('GPIO0_EN0-name-grid-cell').click();
			});

			cy.dataTest('inner-modal').should('be.visible');

			cy.dataTest('inner-modal').within(() => {
				cy.dataTest('PIN23-2-data-grid-cell')
					.scrollIntoView()
					.should('be.visible')
					.should('have.text', '0x0');
			});
		});
	});

	it('Checks values after dispatch for clock config', () => {
		const reduxStore = configurePreloadedStore(
			clockConfigMock as Soc
		);

		cy.mount(<RegisterBody />, reduxStore);

		reduxStore.dispatch(
			setClockNodeControlValue({
				type: 'Mux',
				name: 'SYS_OSC Mux',
				key: 'MUX',
				value: 'CLKEXT'
			})
		);

		reduxStore.dispatch(
			setClockNodeControlValue({
				type: 'Pin Input',
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

		cy.dataTest('inner-modal').should('be.visible');

		cy.dataTest('inner-modal').within(() => {
			cy.dataTest('SYSCLK_SEL-2-data-grid-cell')
				.scrollIntoView()
				.should('be.visible')
				.should('have.text', '0x7');
		});
	});
});
