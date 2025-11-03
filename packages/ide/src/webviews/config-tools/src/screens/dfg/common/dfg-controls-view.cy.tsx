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

import {useState} from 'react';
import {DFGControlsView} from './dfg-controls-view';
import type {ControlCfg} from '../../../../../common/types/soc';

describe('DFGControlsView', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render dynamic controls and show errors for invalid inputs', () => {
		const controls = fakeRequest<Record<string, ControlCfg[]>>({
			TestProperty: [
				{
					Id: 'TestString',
					Type: 'text',
					Description: 'test string field',
					Pattern: '^[A-Za-z]+$'
				},
				{
					Id: 'TestNumber',
					Type: 'integer',
					Description: 'test number field',
					MinimumValue: 0,
					MaximumValue: 10
				}
			]
		});
		cy.mount(<DFGControlsViewWrapper controls={controls} />);

		const stringInputId =
			'dfg-test-controls:control-TestString-control-input';
		const numberInputId =
			'dfg-test-controls:control-TestNumber-control-input';

		cy.dataTest(stringInputId).should('exist');

		cy.dataTest('dfg-test-controls:control-TestString-error').should(
			'not.exist'
		);

		cy.dataTest(stringInputId)
			.shadow()
			.within(() => {
				cy.get('#control').type('invalid@Input');
			});

		cy.dataTest('dfg-test-controls:control-TestString-error').should(
			'exist'
		);

		cy.dataTest(stringInputId)
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('validInput');
			});

		cy.dataTest('dfg-test-controls:control-TestString-error').should(
			'not.exist'
		);

		cy.dataTest(numberInputId).should('exist');

		cy.dataTest('dfg-test-controls:control-TestNumber-error').should(
			'not.exist'
		);

		cy.dataTest(numberInputId)
			.shadow()
			.within(() => {
				cy.get('#control').type('11');
			});

		cy.dataTest('dfg-test-controls:control-TestNumber-error').should(
			'exist'
		);

		cy.dataTest(numberInputId)
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('1');
			});

		cy.dataTest('dfg-test-controls:control-TestNumber-error').should(
			'not.exist'
		);
	});
});

function DFGControlsViewWrapper({
	controls
}: {
	readonly controls: Promise<Record<string, ControlCfg[]>>;
}) {
	const [data, setData] = useState<
		Record<string, string | number | boolean>
	>({});

	return (
		<DFGControlsView
			data={data}
			controlsPrms={controls}
			propertyName='TestProperty'
			testId='dfg-test-controls'
			socConfig={{
				TestString: {},
				TestNumber: {
					VALUE: [
						{
							Register: 'CSS_DFG_IS_CTL_F0',
							Field: 'IS_BUFFER_SIZE',
							Value: 'val',
							Operation: 'Write'
						}
					]
				}
			}}
			onControlChange={(field, value) => {
				setData({...data, [field]: value});
			}}
		/>
	);
}

async function fakeRequest<T>(data: T, delay = 100): Promise<T> {
	return new Promise<T>(resolve => {
		setTimeout(() => {
			resolve(data);
		}, delay);
	});
}
