/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import type {Soc} from '@common/types/soc';
import PinDetails from './PinDetails';
import {configurePreloadedStore} from '../../../state/store';
import {
	setAppliedSignal,
	setPinDetailsTargetPin
} from '../../../state/slices/pins/pins.reducer';

const mock = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

describe('PinDetails component', () => {
	it('Defaults unassigned signals to the pin being viewed', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(setPinDetailsTargetPin('D4'));

		cy.mount(<PinDetails />, reduxStore);

		cy.dataTest('I2C2-SDA')
			.find('> vscode-dropdown')
			.should('have.attr', 'current-value', 'D4');
	});

	it('Shows the pin already assigned to a signal', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'D2',
				Peripheral: 'I2C2',
				Name: 'SDA'
			})
		);
		reduxStore.dispatch(setPinDetailsTargetPin('D4'));

		cy.mount(<PinDetails />, reduxStore);

		cy.dataTest('I2C2-SDA')
			.find('> vscode-dropdown')
			.should('have.attr', 'current-value', 'D2');
	});

	it('Preserves an unassigned signal selection when another signal is assigned', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(setPinDetailsTargetPin('D4'));

		cy.mount(<PinDetails />, reduxStore);

		cy.dataTest('I2C2-SDA').find('> vscode-dropdown').click();
		cy.dataTest('I2C2-SDA')
			.find('> vscode-dropdown')
			.find('> vscode-option')
			.contains('D2')
			.click();

		cy.then(() => {
			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'D4',
					Peripheral: 'PT1',
					Name: 'PT1'
				})
			);
		});

		cy.dataTest('I2C2-SDA')
			.find('> vscode-dropdown')
			.should('have.attr', 'current-value', 'D2');
	});

	it('Should solve the pin conflict from PinDetails by changing the pin for a signal', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'G9',
				Peripheral: 'CAN0',
				Name: 'RX'
			})
		);
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'G9',
				Peripheral: 'GPIO2',
				Name: 'P2.22'
			})
		);
		reduxStore.dispatch(setPinDetailsTargetPin('G9'));

		cy.mount(<PinDetails />, reduxStore);

		cy.dataTest('CAN0-RX').should('exist');
		cy.dataTest('pin:tooltip:conflictMarker').should('exist');

		cy.dataTest('CAN0-RX').find('> vscode-dropdown').click();
		cy.dataTest('CAN0-RX')
			.find('> vscode-dropdown')
			.find('> vscode-option')
			.contains('J7')
			.click();

		cy.dataTest('pin:tooltip:conflictMarker').should('not.exist');
	});

	it('Should not show configure buttons when pin configuration is unavailable', () => {
		const reduxStore = configurePreloadedStore(mock);

		const signals = [
			{Peripheral: 'GPIO1', Name: 'P1.8'},
			{Peripheral: 'I2C2', Name: 'SCL'},
			{Peripheral: 'PT2', Name: 'PT2'},
			{Peripheral: 'UART2', Name: 'RTS'}
		];

		signals.forEach(({Peripheral, Name}) => {
			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'A2',
					Peripheral,
					Name
				})
			);
		});

		reduxStore.dispatch(setPinDetailsTargetPin('A2'));

		cy.mount(<PinDetails />, reduxStore);

		signals.forEach(({Peripheral, Name}) => {
			cy.dataTest(`${Peripheral}-${Name}`).should('exist');

			cy.dataTest(`configure-${Peripheral}-${Name}-button`).should(
				'not.exist'
			);
		});
	});
});
