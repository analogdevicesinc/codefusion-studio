/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import {DFGControlsView} from '../common/dfg-controls-view';
import type {ConfigFields, ControlCfg} from '../../../../../common/types/soc';

/**
 * Tests that integer-typed DFG stream controls provided by a plugin (PluginOption: true)
 * use their Hint field as the default value, as added in compute-register-value.ts.
 *
 * DFGControlsView is mounted directly — this is the component that calls
 * computeDefaultValues, and the plugin stream control context is expressed via
 * the 'ASS DFGStreamConfig' propertyName and fieldName='Source'.
 */
describe('DFG Stream Plugin Integer Control Hint Default Values', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should use Hint as the default value for a plugin integer stream control, and validate below-minimum input', () => {
		const propertyName = 'ASS DFGStreamConfig';
		const pluginIntControlId = 'PLUGIN_SAMPLE_RATE';
		const hintDefaultValue = '48000';
		// MinimumValue is 8000, well below the Hint of 48000
		const controls: Record<string, ControlCfg[]> = {
			[propertyName]: [
				// The plugin integer control with a Hint providing the default value
				{
					Id: pluginIntControlId,
					Description: 'Sample Rate',
					Type: 'integer',
					PluginOption: true,
					Hint: hintDefaultValue,
					MinimumValue: 8000,
					MaximumValue: 192000,
					Increment: 1,
					NumericBase: 'Decimal'
				}
			]
		};

		const socConfig: ConfigFields = {
			[pluginIntControlId]: {VALUE: []}
		};

		cy.mount(
			<DFGStreamPluginControlWrapper
				controls={fakeRequest(controls)}
				propertyName={propertyName}
				socConfig={socConfig}
			/>
		);

		const controlTestId = `dfg-stream-controls:control-${pluginIntControlId}-control-input`;
		const controlErrorTestId = `dfg-stream-controls:control-${pluginIntControlId}-error`;

		// The plugin integer control should be rendered in the PLUGIN OPTIONS section
		cy.dataTest(controlTestId).should('exist');

		// The control's initial value should be the Hint value (48000), which is
		// above the minimum (8000), so no validation error should be shown
		cy.dataTest(controlTestId)
			.shadow()
			.within(() => {
				cy.get('#control').should('have.value', hintDefaultValue);
			});

		cy.dataTest(controlErrorTestId).should('not.exist');

		// Type a value below the minimum (8000) and verify an error is shown
		cy.dataTest(controlTestId)
			.shadow()
			.within(() => {
				cy.get('#control').clear().type('100');
			});

		cy.dataTest(controlErrorTestId).should('exist');
	});
});

function DFGStreamPluginControlWrapper({
	controls,
	propertyName,
	socConfig
}: {
	readonly controls: Promise<Record<string, ControlCfg[]>>;
	readonly propertyName: string;
	readonly socConfig: ConfigFields;
}) {
	const [data, setData] = useState<
		Record<string, string | number | boolean>
	>({});

	return (
		<DFGControlsView
			data={data}
			controlsPrms={controls}
			propertyName={propertyName}
			fieldName='Source'
			gasketName='ASS'
			testId='dfg-stream-controls'
			socConfig={socConfig}
			onControlChange={(field, value) => {
				setData(prev => ({...prev, [field]: value}));
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
