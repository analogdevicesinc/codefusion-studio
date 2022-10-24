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
import Generate from './Generate';
import {setAppliedSignal} from '../../state/slices/pins/pins.reducer';
import {
	setClockNodeControlValue,
	setDiagramData
} from '../../state/slices/clock-nodes/clockNodes.reducer';

const tqfn = (await import(
	'../../../../../../../cli/src/socs/max32690-tqfn.json'
).then(module => module.default)) as Soc;

const wlp = (await import(
	'../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default)) as Soc;

describe('Generate Screen', () => {
	it('Should allow code generation if no pin assignments are present.', () => {
		const reduxStore = configurePreloadedStore(tqfn);

		cy.mount(<Generate />, reduxStore);

		cy.dataTest('8-column-layout-header')
			.should('exist')
			.should('have.text', 'Generate Code');
		cy.dataTest('8-column-layout-subtitle')
			.should('exist')
			.should(
				'have.text',
				'Select the export module to generate code.'
			);
	});

	it('Should display an error message if pin conflicts are present.', () => {
		const reduxStore = configurePreloadedStore(tqfn);

		const {registers} =
			reduxStore.getState().appContextReducer.registersScreen;

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '39',
				Peripheral: 'ADC',
				Name: 'AIN0',
				registers
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '39',
				Peripheral: 'GPIO3',
				Name: 'P3.0',
				registers
			})
		);

		cy.mount(<Generate />, reduxStore);

		cy.dataTest('8-column-layout-header')
			.should('exist')
			.should('have.text', 'Generate Code: Errors');
		cy.dataTest('generate-pin-conflicts')
			.should('exist')
			.should('have.text', 'Pin Conflicts: 1');
	});

	it('Should display an error message if clock nodes are in error state', () => {
		const reduxStore = configurePreloadedStore(wlp);

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
			setDiagramData({
				'P0.23': {
					enabled: true,
					error: true
				}
			})
		);

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
				value: '100000000',
				error: 'INVALID_MAX_VAL'
			})
		);

		cy.mount(<Generate />, reduxStore);

		cy.dataTest('8-column-layout-header')
			.should('exist')
			.should('have.text', 'Generate Code: Errors');
		cy.dataTest('generate-clock-errors')
			.should('exist')
			.should('have.text', 'Clock Errors');
	});
});
