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
import {setClockNodeDetailsTargetNode} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {configurePreloadedStore} from '../../../state/store';
import ClockConfigSideContainer from './Side';
const mock = await import(
	`../../../../../../../../cli/src/socs/${Cypress.env('CLOCK_CONFIG_DEV_SOC_ID')}.json`
);

describe('Clock config side component', () => {
	const reduxStore = configurePreloadedStore(mock as Soc);

	it('Opens a clock node type correctly', () => {
		cy.mount(<ClockConfigSideContainer />, reduxStore);

		cy.dataTest('RV32 Mux').should('not.exist');

		cy.dataTest('MUX').click();

		cy.dataTest('RV32 Mux').should('exist');
	});

	it('Opens and closes clock node details view correctly', async () => {
		cy.mount(<ClockConfigSideContainer />, reduxStore);

		reduxStore.dispatch(setClockNodeDetailsTargetNode('32KIN'));

		cy.dataTest('side-32KIN').should('exist');

		cy.dataTest('Mux').should('not.exist');

		reduxStore.dispatch(setClockNodeDetailsTargetNode(undefined));

		cy.dataTest('Mux').should('exist');
	});

	it('Adds an input error and checks title correctly renders conflict icon', async () => {
		cy.mount(<ClockConfigSideContainer />, reduxStore);

		reduxStore.dispatch(setClockNodeDetailsTargetNode('P0.23'));

		cy.dataTest('side-P0.23').should('exist');

		cy.dataTest('FREQ-P0.23-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').type('test');
			});

		reduxStore.dispatch(setClockNodeDetailsTargetNode(undefined));

		cy.get('#Pin input-conflict').should('exist');
	});
});
