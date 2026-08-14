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
import type {RootState} from '../store';
import {logTelemetryEvent} from '../../utils/api';
import {getSocPeripheralDictionary} from '../../utils/soc-peripherals';
import {type Partition} from '../slices/partitions/partitions.reducer';

let configToolChangeCount = 0;

/**
 * Config Tools telemetry action names.
 *
 * IMPORTANT: These string values MUST match the corresponding entries in the
 * extension backend `src/telemetry/action-names.ts`. The backend only forwards
 * recognized action names to the telemetry service, so any drift here causes
 * events to be silently dropped. Specific user-entered values (config values,
 * control values, partition field values, etc.) must never be included in the
 * metadata as they can leak sensitive data.
 */
export const CONFIG_TOOLS_TELEMETRY_ACTIONS = {
	CONFIG_TOOLS_INTERACTION: 'config_tools_interaction',
	CONFIG_TOOLS_SCREEN_NAVIGATED: 'config_tools_screen_navigated',
	PERIPHERAL_ALLOCATED: 'peripheral_allocated',
	PERIPHERAL_DEALLOCATED: 'peripheral_deallocated',
	PERIPHERAL_CONFIGURED: 'peripheral_configured',
	PIN_SIGNAL_ASSIGNED: 'pin_signal_assigned',
	PIN_SIGNAL_REMOVED: 'pin_signal_removed',
	PIN_CONTROL_CONFIGURED: 'pin_control_configured',
	CLOCK_NODE_CONFIGURED: 'clock_node_configured',
	CLOCK_VALIDATION_ERROR: 'clock_validation_error',
	MEMORY_PARTITION_CREATED: 'memory_partition_created',
	MEMORY_PARTITION_MODIFIED: 'memory_partition_modified',
	MEMORY_PARTITION_DELETED: 'memory_partition_deleted',
	DFG_STREAM_CREATED: 'dfg_stream_created'
} as const;

type ActionPayload = Record<string, any>;
type CoprogrammedSignal = {
	Pin: string;
	Peripheral: string;
	Name: string;
};

/**
 * Emits a telemetry event for a persisted Redux action, keyed on the action
 * type. Called from the persistence listener middleware so that every tracked
 * config edit is reported from a single choke-point.
 *
 * @param action - The dispatched action (type and payload).
 * @param originalState - The Redux state before the action was applied, used
 * to resolve metadata for removals where the entity is already gone from the
 * current state.
 */
export function reportPersistedActionTelemetry(
	action: {type: string; payload: unknown},
	originalState: RootState
): void {
	const payload = (action.payload ?? {}) as ActionPayload;

	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.CONFIG_TOOLS_INTERACTION,
		{
			actionType: action.type.split('/')[0],
			configToolChangeCount: ++configToolChangeCount
		}
	);

	switch (action.type) {
		case 'Peripherals/setPeripheralAssignment':
		case 'Peripherals/setSignalGroupAssignment':
			reportPeripheralAllocated(payload);
			break;

		case 'Peripherals/removePeripheralAssignment':
			reportPeripheralDeallocated(payload, originalState);
			break;

		case 'Peripherals/setPeripheralConfig':
			reportPeripheralConfigured(payload);
			break;

		case 'Pins/setAppliedSignal':
			reportPinSignalAssigned(payload);
			break;

		case 'Pins/removeAppliedSignal':
			reportPinSignalRemoved(payload);
			break;

		case 'Pins/updateAppliedSignal':
			reportPinSignalRemoved(payload.removeSignal as ActionPayload);
			reportPinSignalAssigned(payload.addSignal as ActionPayload);
			break;

		case 'Pins/assignCoprogrammedSignal':
			logCoprogrammedSignalEvents(
				CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_ASSIGNED,
				(action.payload ?? []) as CoprogrammedSignal[]
			);
			break;

		case 'Pins/removeAppliedCoprogrammedSignals':
			logCoprogrammedSignalEvents(
				CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_REMOVED,
				(action.payload ?? []) as CoprogrammedSignal[]
			);
			break;

		case 'Pins/setAppliedSignalControlValue':
			reportPinControlConfigured(payload);
			break;

		case 'ClockConfig/setClockNodeControlValue':
			reportClockNodeConfigured(payload);
			break;

		case 'Partitions/createPartition':
			reportPartitionCreated(payload);
			break;

		case 'Partitions/editPartition':
			reportPartitionModified(payload);
			break;

		case 'Partitions/removePartition':
			reportPartitionRemoved(payload, originalState);
			break;

		default:
			break;
	}
}

/**
 * Emits a telemetry event for each signal in a coprogrammed signal batch
 * action (assignment or removal).
 *
 * @param telemetryAction - The telemetry action name to log for each signal.
 * @param signals - The batch of applied signals from the action payload.
 */
function logCoprogrammedSignalEvents(
	telemetryAction: string,
	signals: CoprogrammedSignal[]
): void {
	signals.forEach(signal => {
		void logTelemetryEvent(telemetryAction, {
			pinId: signal.Pin,
			peripheralName: signal.Peripheral,
			signalName: signal.Name
		});
	});
}

function reportPeripheralAllocated(payload: ActionPayload): void {
	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.PERIPHERAL_ALLOCATED,
		{
			peripheralName: payload.peripheral,
			projectId: payload.projectId,
			peripheralSecurity:
				getSocPeripheralDictionary()[payload.peripheral as string]
					?.security
		}
	);
}

function reportPeripheralDeallocated(
	payload: ActionPayload,
	originalState: RootState
): void {
	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.PERIPHERAL_DEALLOCATED,
		{
			peripheralName: payload.peripheral,
			projectId:
				originalState.peripheralsReducer.assignments[
					payload.peripheral as string
				]?.projectId
		}
	);
}

function reportPeripheralConfigured(payload: ActionPayload): void {
	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.PERIPHERAL_CONFIGURED,
		{
			peripheralName: payload.peripheralId,
			configKeys: Object.keys(
				(payload.config as Record<string, unknown>) ?? {}
			)
		}
	);
}

function reportPinSignalAssigned(payload: ActionPayload): void {
	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_ASSIGNED,
		{
			pinId: payload.Pin,
			peripheralName: payload.Peripheral,
			signalName: payload.Name
		}
	);
}

function reportPinSignalRemoved(payload: ActionPayload): void {
	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_SIGNAL_REMOVED,
		{
			pinId: payload.Pin,
			peripheralName: payload.Peripheral,
			signalName: payload.Name
		}
	);
}

function reportPinControlConfigured(payload: ActionPayload): void {
	const control = (payload.control ?? {}) as Record<string, unknown>;
	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.PIN_CONTROL_CONFIGURED,
		{
			pinId: control.pinId,
			controlKey: control.control
		}
	);
}

function reportClockNodeConfigured(payload: ActionPayload): void {
	const hasValidationError = payload.error !== undefined;

	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.CLOCK_NODE_CONFIGURED,
		{
			nodeName: payload.name,
			controlKey: payload.key,
			hasValidationError
		}
	);
}

function reportPartitionCreated(payload: ActionPayload): void {
	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.MEMORY_PARTITION_CREATED,
		{
			partitionStartAddress: payload.startAddress,
			partitionType: payload.type,
			partitionSize: payload.size,
			assignedProjects: (
				(payload.projects as Array<{projectId: string}>) ?? []
			)
				.map(project => project.projectId)
				.join(',')
		}
	);
}

function reportPartitionModified(payload: ActionPayload): void {
	const sidebarPartition = (payload.sidebarPartition ??
		{}) as Partition;

	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.MEMORY_PARTITION_MODIFIED,
		{
			partitionStartAddress: sidebarPartition.startAddress,
			partitionType: sidebarPartition.type,
			partitionSize: sidebarPartition.size,
			assignedProjects:
				sidebarPartition.projects?.map(p => p.projectId)?.join(',') ??
				''
		}
	);
}

function reportPartitionRemoved(
	payload: ActionPayload,
	originalState: RootState
): void {
	const startAddress = payload.startAddress as string;
	const partition = originalState.partitionsReducer.partitions.find(
		candidate =>
			parseInt(candidate.startAddress, 16) ===
			parseInt(startAddress, 16)
	);

	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.MEMORY_PARTITION_DELETED,
		{
			partitionStartAddress: partition?.startAddress
		}
	);
}
