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

import {configurePreloadedStore} from '../../state/store';
import PinMUX from './PinMux';
import type {Soc} from '@common/types/soc';

const mock = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

describe('PinMUX component', () => {
	beforeEach(() => {
		cy.viewport(1280, 800);
	});

	it('Should display the correct pins after filtering with the correct pin list for the peripheral - signal', () => {
		const reduxStore = configurePreloadedStore(mock);

		const canPeripheralResults = [
			{id: 'CAN1-RX', selectedPin: 'L4'},
			{id: 'CAN1-TX', selectedPin: 'G3'}
		];

		cy.mount(<PinMUX />, reduxStore);

		cy.dataTest('pinmux:header').should('exist');
		cy.dataTest('pinmux:peripheral-navigation').should('exist');
		cy.dataTest('pinmux:header').within(() => {
			cy.dataTest('search-control-input').should('exist');
			cy.dataTest('search-control-input')
				.shadow()
				.find('input')
				.type('RX');
		});

		cy.dataTest('search-result-CAN1 RX').first().click();

		canPeripheralResults.forEach(item => {
			cy.dataTest(`${item.id}`)
				.should('exist')
				.find('> vscode-dropdown')
				.should('have.attr', 'current-value', `${item.selectedPin}`);
		});
	});

	it('Should not keep a canvas pin highlighted after closing details opened from a reserved signal search', () => {
		const reduxStore = configurePreloadedStore(mock);

		cy.mount(<PinMUX />, reduxStore);

		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.type('RSTN');
		cy.dataTest('filter-control:signals').click();
		cy.dataTest('search-result-MISC RSTN').click();

		cy.dataTest('peripheral-pins-reserved:MISC').should('not.exist');
		cy.dataTest('MISC-RSTN').should('exist');

		cy.contains('section', 'MISC').click();

		cy.dataTest('pin:P1.8').click();
		cy.get('#pin-details-title').should('contain.text', 'P1.8');
		cy.get('#focused-pin-backdrop').click();
		cy.get('#pin-details-title').should('not.exist');
		cy.then(() => {
			expect(
				reduxStore.getState().pinsReducer.pins.A2.isFocused
			).to.equal(false);
		});
	});
});
