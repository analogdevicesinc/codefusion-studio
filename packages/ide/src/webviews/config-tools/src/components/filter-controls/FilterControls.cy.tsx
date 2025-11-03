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
import FilterControls from './FilterControls';

const mock = (await import(`@socs/max32690-tqfn.json`))
	.default as unknown as Soc;

describe('Filter Controls', () => {
	it('Selects/deselects filters correctly', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '39',
				Peripheral: 'ADC',
				Name: 'AIN0'
			})
		);

		cy.mount(<FilterControls />, reduxStore);

		cy.dataTest('filter-control:assigned').click();

		cy.dataTest('filter-control:assigned')
			.should('have.attr', 'appearance')
			.and('equal', 'primary');

		cy.dataTest('filter-control:available').click();

		cy.dataTest('filter-control:assigned')
			.should('have.attr', 'appearance')
			.and('equal', 'secondary');
	});

	it('Does pin assignment and checks chip filters numbers', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '39',
				Peripheral: 'ADC',
				Name: 'AIN0'
			})
		);

		cy.mount(<FilterControls />, reduxStore);

		cy.dataTest('filter-control:assigned')
			.should('have.attr', 'data-value')
			.and('equal', '1');

		cy.dataTest('filter-control:available')
			.should('have.attr', 'data-value')
			.and('equal', '37');
	});

	it('Does pin conflict and checks chip filter numbers', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '39',
				Peripheral: 'ADC',
				Name: 'AIN0'
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '39',
				Peripheral: 'GPIO3',
				Name: 'P3.0'
			})
		);

		cy.mount(<FilterControls />, reduxStore);

		cy.dataTest('filter-control:conflicts')
			.should('have.attr', 'data-value')
			.and('equal', '1');
	});

	it('Removes pin conflict and disables conflict chip', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '39',
				Peripheral: 'ADC',
				Name: 'AIN0'
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '39',
				Peripheral: 'GPIO3',
				Name: 'P3.0'
			})
		);

		cy.mount(<FilterControls />, reduxStore).then(() => {
			cy.wrap(
				reduxStore.dispatch(
					removeAppliedSignal({
						Pin: '39',
						Peripheral: 'GPIO3',
						Name: 'P3.0'
					})
				)
			).then(() => {
				cy.dataTest('filter-control:conflicts')
					.should('have.attr', 'appearance')
					.and('equal', 'secondary');

				cy.dataTest('filter-control:conflicts').should(
					'have.attr',
					'disabled'
				);
			});
		});
	});
});
