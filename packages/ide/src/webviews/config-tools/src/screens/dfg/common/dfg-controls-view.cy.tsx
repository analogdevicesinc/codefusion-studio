/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import {LocalizationProvider} from '@common/contexts/LocaleContext';
import {DFGControlsView} from './dfg-controls-view';
import type {
	ConfigFields,
	ControlCfg
} from '../../../../../common/types/soc';

describe('DFGControlsView', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		(window as any).__webview_localization_resources__ = {
			cfgtools: {
				dfg: {nonDefaultValue: 'Non-default value'}
			}
		};
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

		// After typing 11, which is above the max allowed value, the value should still be 11
		cy.dataTest(numberInputId)
			.shadow()
			.within(() => {
				cy.get('#control').should('have.value', '11');
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

	it('marks non-default values and removes the marker after resetting', () => {
		const controls = fakeRequest<Record<string, ControlCfg[]>>({
			TestProperty: [
				{
					Id: 'PRIORITY',
					Type: 'integer',
					Description: 'Stream Priority',
					Default: 0,
					MinimumValue: 0,
					MaximumValue: 3,
					Increment: 1,
					NumericBase: 'Decimal'
				}
			]
		});

		cy.mount(
			<DFGControlsViewWrapper
				controls={controls}
				socConfig={{PRIORITY: {VALUE: []}}}
			/>
		);

		const controlTestId =
			'dfg-test-controls:control-PRIORITY-control-input';

		cy.dataTest('dfg-test-controls:non-default-value').should(
			'not.exist'
		);
		cy.contains('Stream Priority *').should('not.exist');

		cy.dataTest(controlTestId)
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('1');
			});

		cy.dataTest('dfg-test-controls:non-default-value')
			.should('exist')
			.and('contain.text', '*')
			.and('contain.text', 'Non-default value');
		cy.contains('Stream Priority *').should('exist');

		cy.dataTest(controlTestId)
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('0');
			});

		cy.dataTest('dfg-test-controls:non-default-value').should(
			'not.exist'
		);
		cy.contains('Stream Priority *').should('not.exist');
	});

	it('marks persisted non-default values on the initial render', () => {
		const controls = fakeRequest<Record<string, ControlCfg[]>>({
			TestProperty: [
				{
					Id: 'PRIORITY',
					Type: 'integer',
					Description: 'Stream Priority',
					Default: 0,
					MinimumValue: 0,
					MaximumValue: 3,
					Increment: 1,
					NumericBase: 'Decimal'
				}
			]
		});

		cy.mount(
			<DFGControlsViewWrapper
				controls={controls}
				socConfig={{PRIORITY: {VALUE: []}}}
				initialData={{PRIORITY: '1'}}
			/>
		);

		cy.dataTest('dfg-test-controls:non-default-value')
			.should('exist')
			.and('contain.text', '*')
			.and('contain.text', 'Non-default value');
		cy.contains('Stream Priority *').should('exist');
	});
});

function DFGControlsViewWrapper({
	controls,
	initialData,
	socConfig = {
		TestString: {},
		TestNumber: {
			VALUE: [
				{
					Register: 'CSS_DFG_IS_CTL_F0',
					Field: 'IS_BUFFER_SIZE',
					Value: '1',
					Operation: 'Write'
				}
			]
		}
	}
}: {
	readonly controls: Promise<Record<string, ControlCfg[]>>;
	readonly initialData?: Record<string, string | number | boolean>;
	readonly socConfig?: ConfigFields;
}) {
	const [data, setData] = useState<
		Record<string, string | number | boolean>
	>(initialData ?? {});

	return (
		<LocalizationProvider namespace='cfgtools'>
			<DFGControlsView
				data={data}
				controlsPrms={controls}
				propertyName='TestProperty'
				testId='dfg-test-controls'
				socConfig={socConfig}
				onControlChange={(field, value) => {
					setData(prevData => {
						if (value === undefined) {
							return Object.fromEntries(
								Object.entries(prevData).filter(
									([key]) => key !== field
								)
							);
						}

						return {
							...prevData,
							[field]: value
						};
					});
				}}
			/>
		</LocalizationProvider>
	);
}

async function fakeRequest<T>(data: T, delay = 100): Promise<T> {
	return new Promise<T>(resolve => {
		setTimeout(() => {
			resolve(data);
		}, delay);
	});
}
