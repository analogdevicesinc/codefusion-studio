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
import type {ConfiguredPin} from '@common/api';
import type {Soc} from '@common/types/soc';
import {setActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.reducer';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import {configurePreloadedStore} from '../../../state/store';
import PinconfigDisplay from './PinconfigDisplay';

const mock = await import(
	`../../../../../../../../cli/src/socs/${Cypress.env('DEV_SOC_ID')}.json`
);

describe('PinconfigDisplay component', () => {
	// For the third test
	const persistedPinConfig: ConfiguredPin[] = [
		{
			Pin: '39',
			Peripheral: 'ADC',
			Signal: 'AIN0',
			Config: {MODE: 'IN', PWR: 'VDDIOH', PS: 'DIS'},
			ControlResetValues: {MODE: 'IN', PWR: 'VDDIO', PS: 'DIS'}
		}
	];

	const reduxStore = configurePreloadedStore(
		mock as Soc,
		persistedPinConfig
	);

	const {registers} =
		reduxStore.getState().appContextReducer.registersScreen;

	it('Checks for correctly computed defaults', () => {
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '41',
				Peripheral: 'LPTMR0',
				Name: 'IOA',
				registers
			})
		);

		reduxStore.dispatch(
			setActiveConfiguredSignal({
				peripheralName: 'LPTMR0',
				signalName: 'IOA',
				pinId: '41'
			})
		);

		cy.mount(<PinconfigDisplay />, reduxStore);

		cy.dataTest('TMR_SIGNAL_TYPE-IOA-control-dropdown').should(
			'have.value',
			'IN'
		);

		cy.dataTest('PWR-IOA-control-dropdown').should(
			'have.value',
			'VDDIO'
		);

		cy.dataTest('PS-IOA-control-dropdown').should(
			'have.value',
			'DIS'
		);
	});

	it('Changes dropdown values and verifies for correct recomputations', () => {
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '7',
				Peripheral: 'GPIO0',
				Name: 'P0.7',
				registers
			})
		);

		reduxStore.dispatch(
			setActiveConfiguredSignal({
				peripheralName: 'GPIO0',
				signalName: 'P0.7',
				pinId: '7'
			})
		);

		cy.mount(<PinconfigDisplay />, reduxStore);

		cy.dataTest('MODE-P0.7-control-dropdown').click();

		cy.dataTest('P0.7-7-OUT').click();

		cy.dataTest('package-display-info')
			.find('p')
			.first()
			.should('have.text', '∗');

		cy.dataTest('PS-P0.7-control-dropdown').should('not.exist');

		cy.dataTest('DS-P0.7-control-dropdown').should('have.value', '0');
	});

	it('Correctly resets to default values a pre-configured signal', () => {
		reduxStore.dispatch(
			setActiveConfiguredSignal({
				peripheralName: 'ADC',
				signalName: 'AIN0',
				pinId: '39'
			})
		);

		cy.mount(<PinconfigDisplay />, reduxStore);

		cy.dataTest('package-display-info')
			.find('p')
			.first()
			.should('have.text', '∗');

		cy.dataTest('reset-to-default').click();

		cy.dataTest('package-display-info').should('not.exist');

		cy.dataTest('PWR-AIN0-control-dropdown').should(
			'have.value',
			'VDDIO'
		);
	});
});
