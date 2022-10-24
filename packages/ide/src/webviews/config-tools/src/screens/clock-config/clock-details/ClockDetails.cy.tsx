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
import {
	setClockNodeDetailsTargetNode,
	setClockNodeControlValue
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {configurePreloadedStore} from '../../../state/store';
import ClockDetails from './ClockDetails';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';

const mock = await import(
	`../../../../../../../../cli/src/socs/${Cypress.env('CLOCK_CONFIG_DEV_SOC_ID')}.json`
);

describe('Clock details component', () => {
	const reduxStore = configurePreloadedStore(mock as Soc);

	const {registers} =
		reduxStore.getState().appContextReducer.registersScreen;

	reduxStore.dispatch(
		setAppliedSignal({
			Pin: 'F4',
			Peripheral: 'MISC',
			Name: 'CLKEXT',
			registers
		})
	);

	reduxStore.dispatch(
		setClockNodeControlValue({
			type: 'Mux',
			name: 'SYS_OSC Mux',
			key: 'MUX',
			value: 'External Clock on P0.23',
			error: undefined
		})
	);

	it('Adds a non-valid integer value and checks for errors', () => {
		const store = {...reduxStore};

		store.dispatch(setClockNodeDetailsTargetNode('P0.23'));

		cy.mount(<ClockDetails />, store);

		cy.dataTest('P0_23_FREQ-P0.23-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').type('test');
			});

		cy.dataTest('P0_23_FREQ-P0.23-error').should(
			'contain.text',
			'Invalid input type'
		);

		cy.dataTest('P0_23_FREQ-P0.23-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear();
				cy.wait(1000);
			});

		cy.dataTest('P0_23_FREQ-P0.23-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').type('800000001');
			});

		cy.dataTest('P0_23_FREQ-P0.23-error').should(
			'contain',
			'Value exceeds the range 1 to 80000000'
		);

		cy.dataTest('P0_23_FREQ-P0.23-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear();
				cy.wait(1000);
			});

		cy.dataTest('P0_23_FREQ-P0.23-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').type('1');
			});

		cy.dataTest('P0_23_FREQ-P0.23-error').should('be.empty');

		cy.dataTest('P0_23_FREQ-P0.23-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').clear();
				cy.wait(1000);
			});
	});

	it('Checks that controls are disabled when clock conditions are not met', () => {
		const store = {...reduxStore};

		store.dispatch(setClockNodeDetailsTargetNode('TMR0/1/2/3'));

		cy.mount(<ClockDetails />, store);

		cy.dataTest('TMR0a_MUX-TMR0/1/2/3').should(
			'have.attr',
			'aria-disabled',
			'true'
		);

		cy.dataTest('TMR0_ENABLE-TMR0/1/2/3').within(() => {
			cy.get('span').click();
		});

		cy.dataTest('TMR0a_MUX-TMR0/1/2/3').should(
			'have.attr',
			'aria-disabled',
			'false'
		);
	});

	it('Checks that controls are disabled when pinmux conditions are not met', () => {
		const store = {...reduxStore};

		reduxStore.dispatch(setClockNodeDetailsTargetNode('P0.27'));

		cy.mount(<ClockDetails />, store);

		cy.dataTest('P0_27_FREQ-P0.27-control-input').should(
			'have.attr',
			'disabled'
		);
	});

	it('Checks that input controls are persisted', () => {
		const store = {...reduxStore};

		store.dispatch(setClockNodeDetailsTargetNode('P0.23'));

		cy.mount(<ClockDetails />, store).then(() => {
			cy.dataTest('P0_23_FREQ-P0.23-control-input')
				.shadow()
				.within(() => {
					cy.get('#control').type('22');
					cy.wait(1000);
				})
				.then(() => {
					cy.wrap(
						reduxStore.dispatch(
							setClockNodeDetailsTargetNode(undefined)
						)
					).then(() => {
						cy.wrap(
							reduxStore.dispatch(
								setClockNodeDetailsTargetNode('P0.23')
							)
						).then(() => {
							cy.dataTest('P0_23_FREQ-P0.23-control-input').should(
								'have.attr',
								'current-value',
								'22'
							);
						});
					});
				});
		});
	});
});
