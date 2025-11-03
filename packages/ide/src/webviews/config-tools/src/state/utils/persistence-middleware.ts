/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
	setClockNodeControlValue,
	setDiagramData
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
	PinDictionary,
	ClockNodesDictionary
} from '../../../../common/types/soc';
import type {ControlErrorTypes} from '@common/types/errorTypes';
import {getClockCanvas} from '../../utils/clock-canvas';

export const persistedActions: Array<ActionCreatorWithPayload<any>> =
	[
		setAppliedSignal,
		removeAppliedSignal,
		updateAppliedSignal,
		setAppliedSignalControlValue,
		setResetControlValues,
		setClockNodeControlValue,
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
		setSignalDescription,
		setDiagramData
	];

let lastModifiedClockNode:
	| {
			Name: string;
			Control: string;
			Value: string;
			Error: ControlErrorTypes | undefined;
	  }
	| undefined;

function getModifiedClockNodes(
	clockNodes: ClockNodesDictionary,
	pins: PinDictionary,
	diagramData: Record<
		string,
		{enabled: boolean | undefined; error: boolean | undefined}
	>
) {
	const assignedPins = Object.values(pins).filter(
		pin => pin.appliedSignals.length
	);

	const projectId = getPrimaryProjectId();
	const canvas = getClockCanvas();

	return Object.values(clockNodes)
		.filter(clockNode =>
			Object.entries(clockNode.controlValues ?? {}).some(
				([control, controlVal]) =>
					controlVal !== clockNode.initialControlValues?.[control]
			)
		)
		.filter(clockNode => {
			const nodeData = diagramData[clockNode.Name];

			// Include the node only if it doesn't exist in diagram data or is explicitly enabled
			return Boolean(nodeData?.enabled);
		})
		.map(clockNode => {
			const globalConfig: GlobalConfig = {
				clockconfig: clockNodes,
				assignedPins,
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

				if (
					action.type.includes('Pins') ||
					action.type.includes('ClockConfig')
				) {
					modifiedClockNodes = getModifiedClockNodes(
						state.clockNodesReducer.clockNodes,
						state.pinsReducer.pins,
						state.clockNodesReducer.diagramData
					);

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

							return;
						}

						if (lastModifiedClockNode === undefined) return;

						// Given that the diagram is updated after the sidebar selection is done
						// we need to wait for this action to acccess correctly the last diagram state data
						clockFrequencies = filterClockFrequencies(
							state.clockNodesReducer.diagramData,
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
					action.type === 'Pins/setAppliedSignal' // NOTE we need this as a newly enabled pin gets configs assigned in this step.
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
