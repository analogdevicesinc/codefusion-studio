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

import {type Soc} from '../../../../../common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import SignalEntry from './SignalEntry';

const mock = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

describe('Signal Entry', () => {
	it('should not allow signal configuration when there is a signal group', () => {
		const mockSignal = 'CTS';
		const mockPeripheral = 'UART0';

		const reduxStore = configurePreloadedStore(mock);

		cy.mount(
			<SignalEntry signal={mockSignal} peripheral={mockPeripheral} />,
			reduxStore
		);

		cy.get('[data-test="signal-assignment:config"]').should(
			'not.exist'
		);
	});

	it('should allow to signal configuration when there is no signal group', () => {
		const mockSignal = 'PO.12';
		const mockPeripheral = 'GPIO0';

		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);

		cy.mount(
			<SignalEntry signal={mockSignal} peripheral={mockPeripheral} />,
			reduxStore
		);

		cy.get('[data-test="signal-assignment:config"]').should('exist');
	});
});
