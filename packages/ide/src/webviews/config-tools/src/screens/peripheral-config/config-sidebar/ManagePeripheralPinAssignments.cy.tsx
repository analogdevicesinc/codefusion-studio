/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import ManagePeripheralPinAssignments from './ManagePeripheralPinAssignments';
import {
	setActivePeripheral,
	setSignalAssignment,
	setPeripheralConfig
} from '../../../state/slices/peripherals/peripherals.reducer';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';

const max32690wlp = await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
);

describe('Manage Pin Assignments from Peripheral Config Sidebar', () => {
	beforeEach(() => {
		cy.viewport(262, 688);

		localStorage.setItem(
			'Package',
			JSON.stringify(max32690wlp.Packages[0])
		);

		localStorage.setItem(
			'Peripherals',
			JSON.stringify(max32690wlp.Peripherals)
		);

		localStorage.setItem(
			'Controls',
			JSON.stringify(max32690wlp.Controls)
		);
	});

	it('Should display a list of assigned signals including the pin assignment information', () => {
		const reduxStore = configurePreloadedStore(
			max32690wlp as unknown as Soc
		);

		const GPIO0 = 'GPIO0';
		const projectId = 'RV-proj';
		const signalName = 'P0.1';
		const signalWithoutPin = 'P0.2';
		const signalAssignedToDifferentCore = 'P0.3';
		const pinId = 'J2';
		const pinLabel = 'P0.1';

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: GPIO0,
				signalName,
				projectId
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: pinId,
				Peripheral: GPIO0,
				Name: signalName
			})
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: GPIO0,
				signalName: signalWithoutPin,
				projectId
			})
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: GPIO0,
				signalName: signalAssignedToDifferentCore,
				projectId: 'CM4-proj'
			})
		);

		reduxStore.dispatch(setActivePeripheral(`${GPIO0}:${projectId}`));

		cy.mount(<ManagePeripheralPinAssignments />, reduxStore).then(
			() => {
				// Signal with pin assignment should display the pin assignment information
				cy.dataTest(`signal-assignment:${signalName}`).within(() => {
					cy.dataTest('signal-assignment:name').should(
						'contain',
						signalName
					);

					cy.dataTest('pin-assignment-info').should(
						'contain',
						`${pinLabel} (${pinId})`
					);
				});

				// Signal with no pin assignment should display '--'
				cy.dataTest(`signal-assignment:${signalWithoutPin}`).within(
					() => {
						cy.dataTest('signal-assignment:name').should(
							'contain',
							signalWithoutPin
						);

						cy.dataTest('pin-assignment-info').should(
							'contain',
							'--'
						);
					}
				);

				// Signal assigned to a different core should not display in the list
				cy.dataTest(
					`signal-assignment:${signalAssignedToDifferentCore}`
				).should('not.exist');
			}
		);
	});

	it('Should show conflict icon and required status for signals with required pin assignments', () => {
		const reduxStore = configurePreloadedStore(
			max32690wlp as unknown as Soc
		);

		const SPI0 = 'SPI0';
		const coreId = 'RV';
		const signalName = 'MISO';

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: SPI0,
				signalName,
				projectId: 'RV-proj'
			})
		);

		reduxStore.dispatch(
			setActivePeripheral(`${SPI0}:${coreId}-proj`)
		);

		reduxStore.dispatch(
			setPeripheralConfig({
				peripheralId: SPI0,
				config: {
					DIRECTION: 'TARGET',
					MODE: 'FOUR_WIRE',
					WORD_SIZE: '2'
				}
			})
		);

		cy.mount(<ManagePeripheralPinAssignments />, reduxStore).then(
			() => {
				cy.dataTest(`signal-assignment:${signalName}`).within(() => {
					cy.dataTest('pin-assignment-info').should(
						'have.text',
						'--(required)'
					);
					cy.dataTest('signal-assignment:conflict').should(
						'be.visible'
					);
				});
			}
		);
	});
});
