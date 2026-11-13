/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import type {EditableConnection} from '../../types/sru';
import {CONFIG_TOOLS_TELEMETRY_ACTIONS} from './telemetry-reporter';
import {initializeSruData} from '../../utils/sru';
import {
	getSruResetTelemetryEvent,
	getSruTelemetryEvent
} from './sru-telemetry-reporter';
import {
	initializePinBufferSubGroup,
	initializeSruDefaultConnection
} from '../../test-utils/sru-test-utils';

function createEditedInput(
	name: string,
	peripheralSubGroup: string,
	peripheralName: string
): EditableConnection {
	return {
		input: {Name: name, PeripheralSubGroup: peripheralSubGroup},
		peripheralName
	} as EditableConnection;
}

function createEditedOutput(
	name: string,
	peripheralSubGroup: string,
	peripheralName: string
): EditableConnection {
	return {
		output: {Name: name, PeripheralSubGroup: peripheralSubGroup},
		peripheralName
	} as EditableConnection;
}

describe('sru-telemetry-reporter', () => {
	describe('sru/setSruConnection', () => {
		beforeEach(() => {
			initializePinBufferSubGroup();
		});

		afterEach(() => {
			initializeSruData([]);
		});

		it('creates a peripheral input signal modification event', () => {
			const event = getSruTelemetryEvent(
				{
					input: 'SRC0_CLK_IP_I',
					source: 'DAI0_PB04_O'
				},
				createEditedInput('SRC0_CLK_IP_I', 'SRC 0', 'ASRC0')
			);

			expect(event).to.deep.equal({
				action:
					CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_INPUT_CONNECTION_MODIFIED,
				metadata: {
					peripheral: 'ASRC0',
					outputSignal: 'DAI0_PB04_O',
					inputSignal: 'SRC0_CLK_IP_I'
				}
			});
		});

		it('creates a peripheral output signal modification event', () => {
			const event = getSruTelemetryEvent(
				{
					input: 'SRC0_DAT_IP_I',
					source: 'SRC0_DAT_OP_O'
				},
				createEditedOutput('SRC0_DAT_OP_O', 'SRC 0', 'ASRC0')
			);

			expect(event).to.deep.equal({
				action:
					CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_OUTPUT_CONNECTION_MODIFIED,
				metadata: {
					peripheral: 'ASRC0',
					outputSignal: 'SRC0_DAT_OP_O',
					inputSignal: 'SRC0_DAT_IP_I'
				}
			});
		});

		it('creates a pin buffer input signal modification event', () => {
			const event = getSruTelemetryEvent(
				{
					input: 'DAI0_PB02_I',
					source: 'DAI0_PB07_O'
				},
				createEditedInput('DAI0_PB02_I', 'DAI0_PB02', 'DAI0')
			);

			expect(event).to.deep.equal({
				action:
					CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_PIN_BUFFER_INPUT_SIGNAL_MODIFIED,
				metadata: {
					outputSignal: 'DAI0_PB07_O',
					inputSignal: 'DAI0_PB02_I'
				}
			});
		});

		it('creates a pin buffer output signal modification event', () => {
			const event = getSruTelemetryEvent(
				{
					input: 'DAI0_PB02_I',
					source: 'DAI0_PB07_O'
				},
				createEditedOutput('DAI0_PB07_O', 'DAI0_PB02', 'DAI0')
			);

			expect(event).to.deep.equal({
				action:
					CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_PIN_BUFFER_OUTPUT_SIGNAL_MODIFIED,
				metadata: {
					outputSignal: 'DAI0_PB07_O',
					inputSignal: 'DAI0_PB02_I'
				}
			});
		});

		it('does not classify an unrelated selected signal event', () => {
			const event = getSruTelemetryEvent(
				{
					input: 'SRC0_CLK_IP_I',
					source: 'DAI0_PB04_O'
				},
				createEditedInput('OTHER_INPUT', 'SRC 0', 'ASRC0')
			);

			expect(event).to.be.undefined;
		});

		it('creates a pin buffer direction modification event', () => {
			const event = getSruTelemetryEvent(
				{
					input: 'DAI0_PBEN02_I',
					source: 'DAI0_PB07_O'
				},
				createEditedOutput('DAI0_PB07_O', 'DAI0_PB02', 'DAI0')
			);

			expect(event).to.deep.equal({
				action:
					CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_PIN_BUFFER_DIRECTION_MODIFIED,
				metadata: {
					directionValue: 'bidirectional',
					outputSignal: 'DAI0_PB07_O',
					inputSignal: 'DAI0_PBEN02_I'
				}
			});
		});
	});

	describe('sru/resetSruConnection', () => {
		beforeEach(() => {
			initializeSruDefaultConnection();
		});

		it('creates a connection reset event', () => {
			const event = getSruResetTelemetryEvent(
				'SRC0_CLK_IP_I',
				createEditedOutput('SRC0_DAT_OP_O', 'SRC 0', 'ASRC0'),
				'SRC0_DAT_OP_O'
			);

			expect(event).to.deep.equal({
				action: CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_RESET_SOURCE,
				metadata: {
					peripheral: 'ASRC0',
					outputSignal: 'DAI0_PB04_O',
					inputSignal: 'SRC0_CLK_IP_I'
				}
			});
		});
	});
});
