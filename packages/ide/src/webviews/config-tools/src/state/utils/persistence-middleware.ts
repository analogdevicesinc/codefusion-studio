/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import {
	type ActionCreatorWithPayload,
	createListenerMiddleware
} from '@reduxjs/toolkit';
import type {RootState} from '../store';

import {
	formatClockNodePersistencePayload,
	formatProjectPersistencePayload,
	formatPinPersistencePayload,
	filterClockFrequencies
} from '../../utils/persistence';
import {
	assignCoprogrammedSignal,
	removeAppliedCoprogrammedSignals,
	removeAppliedSignal,
	setAppliedSignal,
	updateAppliedSignal,
	setAppliedSignalControlValue,
	setResetControlValues
} from '../slices/pins/pins.reducer';
import {
	type ClockNodeSet,
	setClockNodeControlValue
} from '../slices/clock-nodes/clockNodes.reducer';
import {updatePersistedConfig} from '../../utils/api';
import {getPrimaryProjectId} from '../../utils/config';
import {getTargetControls} from '../../utils/clock-nodes';
import {
	evaluateClockCondition,
	getClockFrequencyDictionary,
	type GlobalConfig
} from '../../utils/rpn-expression-resolver';
import {
	createPartition,
	editPartition,
	removePartition
} from '../slices/partitions/partitions.reducer';

import {
	setPeripheralAssignment,
	setSignalAssignment,
	setSignalGroupAssignment,
	setPeripheralDescription,
	setSignalDescription,
	setPeripheralConfig,
	removePeripheralAssignment,
	removeSignalAssignment
} from '../slices/peripherals/peripherals.reducer';
import type {
	AppliedSignal,
	ClockNodesDictionary,
	PinState
} from '../../../../common/types/soc';
import type {PeripheralConfig} from '../../types/peripherals';
import type {ControlErrorTypes} from '@common/types/errorTypes';
import {getClockCanvas} from '../../utils/clock-canvas';
import {
	computeClockNodesStatus,
	type ClockNodeStatus
} from '../../utils/clock-evaluation';
import {computeFrequencies} from '../../utils/rpn-expression-resolver';
import {
	selectAppliedSignalsMap,
	selectAssignedPins
} from '../slices/pins/pins.selector';
import {selectPeripheralAllocations} from '../slices/peripherals/peripherals.selector';

export const persistedActions: Array<ActionCreatorWithPayload<any>> =
	[
		setAppliedSignal,
		removeAppliedSignal,
		updateAppliedSignal,
		setAppliedSignalControlValue,
		setResetControlValues,
		setClockNodeControlValue,
		// NOTE: clock node Errors are stored on the clockNodes slice.
		// When a control validation error is set/cleared, we must persist
		// the updated ClockNodes (and derived ClockFrequencies) as well.
		// The clock-nodes reducer reuses the same action creator type
		// (`ClockNodeSet`) for both value and error updates, so we only
		// need to listen to `setClockNodeControlValue` here.
		assignCoprogrammedSignal,
		removeAppliedCoprogrammedSignals,
		createPartition,
		editPartition,
		removePartition,
		setPeripheralAssignment,
		removePeripheralAssignment,
		removeSignalAssignment,
		setPeripheralConfig,
		setSignalAssignment,
		setSignalGroupAssignment,
		setPeripheralDescription,
		setSignalDescription
	];

let lastModifiedClockNode:
	| {
			Name: string;
			Control: string;
			Value: string;
			Error: ControlErrorTypes | undefined;
	  }
	| undefined;

type ClockPersistenceContext = {
	clockNodes: ClockNodesDictionary;
	assignedPins: PinState[];
	pinConfig: Record<string, AppliedSignal>;
	peripheralConfig: Record<string, Record<string, PeripheralConfig>>;
	nodeStatuses: Record<string, ClockNodeStatus>;
};

function computeNodeStatuses(
	clockNodes: ClockNodesDictionary,
	assignedPins: PinState[],
	pinConfig: Record<string, AppliedSignal>,
	peripheralConfig: Record<string, Record<string, PeripheralConfig>>
): Record<string, ClockNodeStatus> {
	const globalConfig = {
		clockconfig: clockNodes,
		pinconfig: pinConfig,
		peripheralconfig: peripheralConfig,
		assignedPins
	};

	const computedFrequencies = computeFrequencies(globalConfig);

	return computeClockNodesStatus(
		clockNodes,
		computedFrequencies,
		globalConfig
	);
}

function getModifiedClockNodes({
	clockNodes,
	assignedPins,
	pinConfig,
	peripheralConfig,
	nodeStatuses
}: ClockPersistenceContext) {
	const projectId = getPrimaryProjectId();
	const canvas = getClockCanvas();
	const baseGlobalConfig = {
		clockconfig: clockNodes,
		pinconfig: pinConfig,
		peripheralconfig: peripheralConfig,
		assignedPins
	};

	return Object.values(clockNodes)
		.filter(clockNode =>
			Object.entries(clockNode.controlValues ?? {}).some(
				([control, controlVal]) =>
					controlVal !== clockNode.initialControlValues?.[control]
			)
		)
		.filter(clockNode => {
			const nodeStatus = nodeStatuses[clockNode.Name];

			// Include the node only if it is enabled
			return nodeStatus?.enabled ?? false;
		})
		.map(clockNode => {
			const globalConfig: GlobalConfig = {
				...baseGlobalConfig,
				currentNode: clockNode.Name
			};

			const canvasCondition = Object.values(canvas?.parts ?? {}).find(
				part =>
					part.name === clockNode.Name &&
					(!part.mount ||
						evaluateClockCondition(globalConfig, part.mount))
			)?.condition;

			const targetControls = getTargetControls(
				'clockConfig',
				projectId ?? '',
				clockNode.Name
			);

			const isClockNodeEnabled = canvasCondition
				? evaluateClockCondition(globalConfig, canvasCondition)
				: true;

			const enabledControls = Object.keys(
				clockNode.controlValues ?? {}
			).reduce<Record<string, boolean>>((acc, control) => {
				const controlCondition = targetControls[control]?.Condition;

				const isControlEnabled = controlCondition
					? evaluateClockCondition(globalConfig, controlCondition)
					: true;

				acc[control] = isClockNodeEnabled && isControlEnabled;

				return acc;
			}, {});

			return {...clockNode, EnabledControls: enabledControls};
		});
}

export function getPersistenceListenerMiddleware(
	actionsArray: Array<ActionCreatorWithPayload<unknown>>
) {
	return actionsArray.map(action => {
		const listenerMiddleware = createListenerMiddleware();

		listenerMiddleware.startListening({
			actionCreator: action,
			effect(action, listenerApi) {
				if (
					(action.payload as Record<string, unknown>)
						?.discardPersistence
				)
					return;

				const state = listenerApi.getState() as RootState;
				let modifiedClockNodes;
				let updatedClockNode;
				let initialControlValues;
				let updatedPins;
				let updatedProjects;
				let clockFrequencies;
				let nodeStatuses: Record<string, ClockNodeStatus> | undefined;

				if (
					action.type.includes('Pins') ||
					action.type.includes('ClockConfig')
				) {
					const assignedPins = selectAssignedPins(state);
					const pinConfig = selectAppliedSignalsMap(state);
					const peripheralConfig = selectPeripheralAllocations(state);

					// Compute node statuses and modified nodes from current state
					nodeStatuses = computeNodeStatuses(
						state.clockNodesReducer.clockNodes,
						assignedPins,
						pinConfig,
						peripheralConfig
					);

					modifiedClockNodes = getModifiedClockNodes({
						clockNodes: state.clockNodesReducer.clockNodes,
						assignedPins,
						pinConfig,
						peripheralConfig,
						nodeStatuses
					});

					if (action.type.includes('Pins')) {
						updatedPins = formatPinPersistencePayload(
							state.pinsReducer.pins
						);
					}

					if (action.type.includes('ClockConfig')) {
						const payload = action.payload as ClockNodeSet;
						const {name} = payload;

						if (name) {
							lastModifiedClockNode =
								formatClockNodePersistencePayload(payload);
						}

						if (lastModifiedClockNode === undefined) return;

						// Use latest node statuses to filter clock frequencies
						if (!nodeStatuses) {
							nodeStatuses = computeNodeStatuses(
								state.clockNodesReducer.clockNodes,
								assignedPins,
								pinConfig,
								peripheralConfig
							);
						}

						clockFrequencies = filterClockFrequencies(
							nodeStatuses,
							getClockFrequencyDictionary()
						);
						updatedClockNode = lastModifiedClockNode;
						initialControlValues =
							state.clockNodesReducer.clockNodes[
								lastModifiedClockNode.Name
							].initialControlValues;

						lastModifiedClockNode = undefined;
					}
				}

				if (
					action.type.includes('Partitions') ||
					action.type.includes('Peripherals') ||
					action.type === 'Pins/setAppliedSignalControlValue' ||
					action.type === 'Pins/setResetControlValues' ||
					action.type === 'Pins/setAppliedSignal' || // NOTE we need this as a newly enabled pin gets configs assigned in this step.
					action.type === 'Pins/removeAppliedSignal' // NOTE we need this as when deleting a signal from a project, we delay persisting the project changes until we update the pins, to avoid a race condition
				) {
					updatedProjects = formatProjectPersistencePayload(
						state.partitionsReducer.partitions,
						state.peripheralsReducer.assignments,
						state.pinsReducer.pins
					);
				}

				updatePersistedConfig({
					updatedPins,
					initialControlValues,
					updatedClockNode,
					modifiedClockNodes,
					updatedProjects,
					clockFrequencies
				})?.catch(e => {
					console.error(
						'There was an error in the persistence process: ',
						e
					);
				});
			}
		});

		return listenerMiddleware.middleware;
	});
}
