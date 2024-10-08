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
/* eslint-disable max-nested-callbacks */
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../../state/store';
import PinControl from './PinControl';
import {setAppliedSignal} from '../../../../state/slices/pins/pins.reducer';

const wlp = await import(
	'../../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(m => m.default);

describe('Pin Grid Elemment', () => {
	it('Should display a tooltip on hover with the assigned functions information', () => {
		const store = configurePreloadedStore(wlp as unknown as Soc);

		cy.wrap(
			store.dispatch(
				setAppliedSignal({
					Pin: 'F4',
					Peripheral: 'I2S0',
					Name: 'CLKEXT',
					registers: []
				})
			)
		).then(() => {
			cy.mount(<PinControl id='F4' />, store).then(() => {
				cy.dataTest('pin:P0.23').should('exist').trigger('mouseover');

				cy.dataTest('pin:tooltip:F4').should('exist');

				cy.dataTest('pin:tooltip:assigned')
					.children()
					.should('have.length', 2)
					.first()
					.should('contain.text', 'Functions assigned:');

				cy.dataTest('pin:tooltip:appliedSignal:CLKEXT').should(
					'contain.text',
					'I2S0.CLKEXT'
				);

				cy.dataTest('pin:tooltip:available')
					.children()
					.should('have.length', 3)
					.first()
					.should('contain.text', 'Functions available:');

				cy.dataTest('pin:tooltip:availableSignal:P0.23').should(
					'contain.text',
					'GPIO0.P0.23 (default)'
				);

				cy.dataTest('pin:tooltip:availableSignal:PT15').should(
					'contain.text',
					'PT15.PT15'
				);
			});
		});
	});

	it('Should display a tooltip with conflict information when pin is in conflict', () => {
		const store = configurePreloadedStore(wlp as unknown as Soc);

		cy.wrap(
			store.dispatch(
				setAppliedSignal({
					Pin: 'F4',
					Peripheral: 'I2S0',
					Name: 'CLKEXT',
					registers: []
				})
			)
		).then(() => {
			cy.wrap(
				store.dispatch(
					setAppliedSignal({
						Pin: 'F4',
						Peripheral: 'GPIO0',
						Name: 'P0.23',
						registers: []
					})
				)
			).then(() => {
				cy.mount(<PinControl id='F4' />, store).then(() => {
					cy.dataTest('pin:P0.23')
						.should('exist')
						.trigger('mouseover');

					cy.dataTest('pin:tooltip:F4').should('exist');

					cy.dataTest('pin:tooltip:conflictMarker').should('exist');
				});
			});
		});
	});
});
