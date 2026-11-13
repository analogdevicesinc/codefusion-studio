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
import {logTelemetryEvent} from '../../utils/api';
import {
	getSruDefaultConnections,
	getSruInputSignals,
	getSruSignalPeripheral,
	isPinBufferSubGroup
} from '../../utils/sru';
import {getPinBufferDirection} from '../../utils/sru-signals';
import type {RootState} from '../store';
import {CONFIG_TOOLS_TELEMETRY_ACTIONS} from './telemetry-reporter';

export type SruConnectionPayload = {input: string; source: string};
type SignalType = 'input' | 'output';
type SruTelemetryEvent = {
	action: string;
	metadata: Record<string, unknown>;
};

export function reportSruConnectionSet(
	payload: SruConnectionPayload,
	originalState: RootState
): void {
	/**
	 * This is the connection currently being edited. We need it to verify whether
	 * the signal is an input or an output - so we're getting the optional
	 * 'input' or 'output' property on this object.
	 * The correct way to do this would be passing 'input' or 'output' in the Redux action.
	 */
	const editedConnection =
		originalState.sruReducer.editableConnections?.[0];

	const event = getSruTelemetryEvent(payload, editedConnection);

	if (event) {
		void logTelemetryEvent(event.action, event.metadata);
	}
}

export function getSruTelemetryEvent(
	connection: SruConnectionPayload,
	editedConnection?: EditableConnection
): SruTelemetryEvent | undefined {
	const metadata = {
		outputSignal: connection.source,
		inputSignal: connection.input
	};

	const direction = getDirectionChange(connection);

	if (direction) {
		return {
			action:
				CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_PIN_BUFFER_DIRECTION_MODIFIED,
			metadata: {...metadata, directionValue: direction}
		};
	}

	const signalType = getMatchingEditedSignalType(
		connection,
		editedConnection
	);

	if (!signalType) return undefined;

	const isPinBuffer = isPinBufferConnection(
		connection,
		editedConnection
	);

	const action = getConnectionTelemetryAction(
		signalType,
		isPinBuffer
	);

	return {
		action,
		metadata: isPinBuffer
			? metadata
			: {...metadata, peripheral: editedConnection?.peripheralName}
	};
}

function getDirectionChange(connection: SruConnectionPayload) {
	const inputSignal = getSruInputSignals()[connection.input];

	return inputSignal?.IsPinBufferEnable
		? getPinBufferDirection(connection.source)
		: undefined;
}

function isPinBufferConnection(
	connection: SruConnectionPayload,
	editedConnection?: EditableConnection
): boolean {
	const editedSignal =
		editedConnection?.input ?? editedConnection?.output;
	const inputSignal = getSruInputSignals()[connection.input];

	return (
		isPinBufferSubGroup(editedSignal?.PeripheralSubGroup) ||
		isPinBufferSubGroup(inputSignal?.PeripheralSubGroup)
	);
}

function getConnectionTelemetryAction(
	signalType: SignalType,
	isPinBuffer: boolean
): string {
	if (isPinBuffer) {
		return signalType === 'input'
			? CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_PIN_BUFFER_INPUT_SIGNAL_MODIFIED
			: CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_PIN_BUFFER_OUTPUT_SIGNAL_MODIFIED;
	}

	return signalType === 'input'
		? CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_INPUT_CONNECTION_MODIFIED
		: CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_OUTPUT_CONNECTION_MODIFIED;
}

function getMatchingEditedSignalType(
	connection: SruConnectionPayload,
	editedConnection?: EditableConnection
): SignalType | undefined {
	if (editedConnection?.input?.Name === connection.input) {
		return 'input';
	}

	if (editedConnection?.output?.Name === connection.source) {
		return 'output';
	}

	return undefined;
}

export function reportSruConnectionReset(
	payload: string,
	originalState: RootState
): void {
	const editedConnection =
		originalState.sruReducer.editableConnections?.[0];
	const previousSource =
		originalState.sruReducer.modifiedConnections[payload];
	const event = getSruResetTelemetryEvent(
		payload,
		editedConnection,
		previousSource
	);

	void logTelemetryEvent(event.action, event.metadata);
}

export function getSruResetTelemetryEvent(
	input: string,
	editedConnection?: EditableConnection,
	previousSource?: string
): SruTelemetryEvent {
	const defaultSource = getSruDefaultConnections()[input];
	const sourceBeforeReset = previousSource ?? defaultSource;

	const matchesEditedConnection =
		editedConnection?.input?.Name === input ||
		editedConnection?.output?.Name === sourceBeforeReset;

	const peripheral = matchesEditedConnection
		? editedConnection.peripheralName
		: getSruSignalPeripheral(input);

	return {
		action: CONFIG_TOOLS_TELEMETRY_ACTIONS.SRU_RESET_SOURCE,
		metadata: {
			peripheral,
			outputSignal: defaultSource,
			inputSignal: input
		}
	};
}
