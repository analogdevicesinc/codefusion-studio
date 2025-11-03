/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import {configurePreloadedStore} from '../../../state/store';
import PeripheralEntry from './PeripheralEntry';
import {setSignalAssignment} from '../../../state/slices/peripherals/peripherals.reducer';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';

const max32690wlp = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

describe('Peripheral Entry', () => {
	context('MAX32690-WLP', () => {
		beforeEach(() => {
			cy.viewport(1920, 1080);
		});

		it('should show peripheral error when the peripherals signal is missing pin assignment', () => {
			const reduxStore = configurePreloadedStore(max32690wlp);

			reduxStore.dispatch(
				setSignalAssignment({
					peripheral: 'GPIO0',
					signalName: 'P0.2',
					projectId: 'CM4-proj'
				})
			);

			cy.mount(
				<PeripheralEntry
					projectId='CM4-proj'
					peripheralName='GPIO0'
					preassigned={false}
					controls={{}}
				/>,
				reduxStore
			);

			cy.get('[data-test="peripheral-assignment:conflict"]').should(
				'exist'
			);
		});

		it('should not show peripheral error when the peripheral has no signals', () => {
			const reduxStore = configurePreloadedStore(max32690wlp);

			cy.mount(
				<PeripheralEntry
					projectId='CM4-proj'
					peripheralName='GPIO0'
					preassigned={false}
					controls={{}}
				/>,
				reduxStore
			);

			cy.get('[data-test="peripheral-assignment:conflict"]').should(
				'not.exist'
			);
		});
	});

	describe('when the peripheral signal has a pin assigned', () => {
		const reduxStore = configurePreloadedStore(max32690wlp);
		const peripheral = 'GPIO0';
		const signalName = 'P0.1';
		const pinId = 'J2';

		before(() => {
			reduxStore.dispatch(
				setAppliedSignal({
					Pin: pinId,
					Peripheral: peripheral,
					Name: signalName
				})
			);
		});

		it('Should not show peripheral error', () => {
			reduxStore.dispatch(
				setSignalAssignment({
					peripheral,
					signalName,
					projectId: 'CM4-proj'
				})
			);

			reduxStore.dispatch(
				setAppliedSignal({
					Pin: pinId,
					Peripheral: peripheral,
					Name: signalName
				})
			);
			cy.mount(
				<PeripheralEntry
					projectId='CM4-proj'
					peripheralName='GPIO0'
					preassigned={false}
					controls={{}}
				/>,
				reduxStore
			);

			cy.get('[data-test="peripheral-assignment:conflict"]').should(
				'not.exist'
			);
		});
	});
});
