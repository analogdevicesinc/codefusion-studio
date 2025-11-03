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

const max32690wlp = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

describe('Manage Pin Assignments from Peripheral Config Sidebar', () => {
	beforeEach(() => {
		cy.viewport(262, 688);
	});

	it('Should display a list of assigned signals including the pin assignment information', () => {
		const reduxStore = configurePreloadedStore(max32690wlp);

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

				// Should render toggle
				cy.dataTest(`${GPIO0}-${pinLabel}-span`).should('exist');

				// Signal with pin assignment should have the toggle checked
				cy.dataTest(`${GPIO0}-${pinLabel}-span`).should(
					'have.attr',
					'data-checked',
					'true'
				);

				// Signal with no pin assignment should display '--'
				cy.dataTest(`signal-assignment:${signalWithoutPin}`).within(
					() => {
						cy.dataTest('signal-assignment:name').should(
							'contain',
							signalWithoutPin
						);

						// Signal with no pin assignment should have error Icon
						cy.dataTest('signal-assignment:conflict').should(
							'be.visible'
						);
					}
				);

				cy.dataTest('signal-assignment:error').should('exist');

				cy.dataTest('signal-assignment:error').should(
					'contain',
					`${GPIO0} ${signalWithoutPin} needs to be enabled`
				);

				// Should render toggle
				cy.dataTest(`${GPIO0}-${signalWithoutPin}-span`).should(
					'exist'
				);

				// Signal with no pin assignment should have the toggle un-checked
				cy.dataTest(`${GPIO0}-${signalWithoutPin}-span`).should(
					'have.attr',
					'data-checked',
					'false'
				);

				// Signal assigned to a different core should not display in the list
				cy.dataTest(
					`signal-assignment:${signalAssignedToDifferentCore}`
				).should('not.exist');
			}
		);
	});

	it('Should show conflict icon and required status for signals with required pin assignments', () => {
		const reduxStore = configurePreloadedStore(max32690wlp);

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
					cy.dataTest('signal-assignment:conflict').should(
						'be.visible'
					);
				});

				cy.dataTest('signal-assignment:error').should('exist');

				cy.dataTest('signal-assignment:error').should(
					'contain',
					`${SPI0} ${signalName} needs to be enabled`
				);
			}
		);
	});

	it('Should allow toggling a signal assignment on and off', () => {
		const reduxStore = configurePreloadedStore(max32690wlp);

		const GPIO0 = 'GPIO0';
		const projectId = 'RV-proj';
		const signalName = 'P0.1';
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
				// Signal with pin assignment should have the toggle checked
				cy.dataTest(`${GPIO0}-${pinLabel}-span`).should(
					'have.attr',
					'data-checked',
					'true'
				);

				// Click to toggle off to un-assign the pin
				cy.dataTest(`${GPIO0}-${pinLabel}-span`).click();

				// Toggle should be un-checked
				cy.dataTest(`${GPIO0}-${pinLabel}-span`).should(
					'have.attr',
					'data-checked',
					'false'
				);

				//should show error message
				cy.dataTest('signal-assignment:error').should('exist');

				cy.dataTest('signal-assignment:error').should(
					'contain',
					`${GPIO0} ${signalName} needs to be enabled`
				);

				cy.dataTest('signal-assignment:conflict').should(
					'be.visible'
				);
			}
		);
	});

	it('should show conflict error when signal is assigned to a pin that is already in conflict', () => {
		const reduxStore = configurePreloadedStore(max32690wlp);

		const GPIO1 = 'GPIO1';
		const CAN0 = 'CAN0';
		const projectId = 'RV-proj';
		const signalName = 'P1.24';
		const pinId = 'J7';
		const pinLabel = 'P1.24';

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: GPIO1,
				signalName,
				projectId
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: pinId,
				Peripheral: GPIO1,
				Name: signalName
			})
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: CAN0,
				signalName,
				projectId
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: pinId,
				Peripheral: CAN0,
				Name: signalName
			})
		);

		reduxStore.dispatch(setActivePeripheral(`${GPIO1}:${projectId}`));

		cy.mount(<ManagePeripheralPinAssignments />, reduxStore).then(
			() => {
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

				// Signal with pin assignment should have the toggle checked
				cy.dataTest(`${GPIO1}-${pinLabel}-span`).should(
					'have.attr',
					'data-checked',
					'true'
				);

				//should show error message
				cy.dataTest('signal-assignment:error').should('exist');

				cy.dataTest('signal-assignment:error').should(
					'contain',
					`Pin conflict for ${signalName}`
				);

				// Click to toggle off to un-assign the pin
				cy.dataTest(`${GPIO1}-${pinLabel}-span`).click();

				// should show unassign error message if signal is required
				cy.dataTest('signal-assignment:error').should('exist');

				cy.dataTest('signal-assignment:error').should(
					'contain',
					`${GPIO1} ${signalName} needs to be enabled`
				);
			}
		);
	});
});
