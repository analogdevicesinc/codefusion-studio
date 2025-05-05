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
import SignalConfig from './SignalConfig';

describe('Signal Config', () => {
	const mockSignalName = 'PO.1';

	it('should render configuration unavaiable when there is no pin assignment', () => {
		cy.mount(
			<SignalConfig isMissingPinAssignement signal={mockSignalName} />
		);

		cy.get('[data-test="config-unavailable:signal"]')
			.should('exist')
			.should(
				'have.text',
				`Configuration unavailable until ${mockSignalName} is assigned to a pin.`
			);
	});

	it('should not render configuration unavaiable when there is a pin assignment', () => {
		cy.mount(
			<SignalConfig
				isMissingPinAssignement={false}
				signal={mockSignalName}
			/>
		);

		cy.get('[data-test="config-unavailable:signal"]').should(
			'not.exist'
		);
	});
});
