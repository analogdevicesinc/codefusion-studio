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
import Peripheral from '../../../components/peripheral/Peripheral';
import {configurePreloadedStore} from '../../../state/store';
const mock = await import(
	`../../../../../../../../cli/src/socs/${Cypress.env('DEV_SOC_ID')}.json`
);

describe('Function component', () => {
	const reduxStore = configurePreloadedStore(mock as Soc);

	it('Assigns coprogrammed signals correctly', () => {
		const peripheral = Object.values(
			reduxStore.getState().peripheralsReducer.peripherals
		).find(peripheral => peripheral.name === 'MISC');

		if (peripheral) {
			cy.mount(
				<Peripheral
					isLastPeripheralGroup
					title={peripheral.name}
					signals={Object.values(peripheral.signals.dict)}
				/>,
				reduxStore
			);

			cy.dataTest('MISC').click();

			cy.dataTest('MISC-SWDIO').within(() => {
				cy.get('label').click();
			});

			cy.dataTest('MISC-SWDCLK').within(() => {
				cy.get('svg').should('exist');
				cy.get('span')
					.should('have.css', 'background-color')
					.and('eq', 'rgb(14, 99, 156)');
			});
		}
	});
});
