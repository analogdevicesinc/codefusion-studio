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
import {configurePreloadedStore} from '../../state/store';
import {
	removeAppliedSignal,
	setAppliedSignal
} from '../../state/slices/pins/pins.reducer';
import {Suspense, lazy} from 'react';

const mock = await import(
	`../../../../../../../cli/src/socs/${Cypress.env('DEV_SOC_ID')}.json`
);

// Lazy loading components in tests allow the soc to be available before the component is rendered
const FilterControls = lazy(async () => import('./FilterControls'));

function LazyFilterControls() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<FilterControls />
		</Suspense>
	);
}

describe('Filter Controls', () => {
	const reduxStore = configurePreloadedStore(mock as Soc);
	const {registers} =
		reduxStore.getState().appContextReducer.registersScreen;

	it('Selects/deselects filters correctly', () => {
		cy.mount(<LazyFilterControls />, reduxStore);

		cy.dataTest('Assigned').click();

		cy.dataTest('Assigned')
			.should('have.attr', 'appearance')
			.and('equal', 'primary');

		cy.dataTest('Available').click();

		cy.dataTest('Assigned')
			.should('have.attr', 'appearance')
			.and('equal', 'secondary');
	});

	it('Does pin assignment and checks chip filters numbers', () => {
		cy.mount(<LazyFilterControls />, reduxStore);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '39',
				Peripheral: 'ADC',
				Name: 'AIN0',
				registers
			})
		);

		cy.dataTest('Assigned')
			.should('have.attr', 'data-value')
			.and('equal', '31');

		cy.dataTest('Available')
			.should('have.attr', 'data-value')
			.and('equal', '37');
	});

	it('Does pin conflict and checks chip filter numbers', () => {
		cy.mount(<LazyFilterControls />, reduxStore);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '39',
				Peripheral: 'GPIO3',
				Name: 'P3.0',
				registers
			})
		);

		cy.dataTest('Conflicts')
			.should('have.attr', 'data-value')
			.and('equal', '1');
	});

	it('Removes pin conflict and disables conflict chip', () => {
		cy.mount(<LazyFilterControls />, reduxStore);

		reduxStore.dispatch(
			removeAppliedSignal({
				Pin: '39',
				Peripheral: 'GPIO3',
				Name: 'P3.0'
			})
		);

		cy.dataTest('Conflicts').should('have.attr', 'disabled');
	});
});
