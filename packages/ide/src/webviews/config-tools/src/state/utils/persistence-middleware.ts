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
	formatPinPersistencePayload
} from '../../utils/persistence';
import {
	removeAppliedSignal,
	setAppliedSignal,
	setAppliedSignalControlValue
} from '../slices/pins/pins.reducer';
import {
	type ClockNodeSet,
	setClockNodeControlValue
} from '../slices/clock-nodes/clockNodes.reducer';
import {
	getClockCanvas,
	updatePersistedClockNodesAssignments,
	updatePersistedPinAssignments
} from '../../utils/api';
import {
	evaluateClockCondition,
	type ClockConfigNodes,
	type GlobalConfig
} from '../../utils/rpn-expression-resolver';

export const persistedActions: Array<ActionCreatorWithPayload<any>> =
	[
		setAppliedSignal,
		removeAppliedSignal,
		setAppliedSignalControlValue,
		setClockNodeControlValue
	];

export function getPersistenceListenerMiddleware(
	actionsArray: Array<ActionCreatorWithPayload<unknown>>
) {
	return actionsArray.map(action => {
		const listenerMiddleware = createListenerMiddleware();

		listenerMiddleware.startListening({
			actionCreator: action,
			async effect(action, listenerApi) {
				if (
					(action.payload as Record<string, unknown>)
						?.discardPersistence
				)
					return;

				const state = listenerApi.getState() as RootState;

				const assignedPins = Object.values(
					state.pinsReducer.pins
				).filter(pin => pin.appliedSignals.length);

				const {clockConfig} = state.clockNodesReducer;

				const clockConfigNodes = Object.values(
					state.clockNodesReducer.clockNodes
				)
					.flatMap(clockNodeForType =>
						Object.values(clockNodeForType).map(
							clockNode => clockNode
						)
					)
					.reduce<ClockConfigNodes>((acc, clockNode) => {
						acc[clockNode.Name] = clockNode;

						return acc;
					}, {});

				const canvas = await getClockCanvas();

				const modifiedClockNodes = Object.values(
					state.clockNodesReducer.clockNodes
				)
					.flatMap(clockNodeForType =>
						Object.values(clockNodeForType).filter(clockNode =>
							Object.entries(clockNode.controlValues ?? {}).some(
								([control, controlVal]) =>
									controlVal !==
									clockNode.initialControlValues?.[control]
							)
						)
					)
					.map(clockNode => {
						const globalConfig: GlobalConfig = {
							clockconfig: clockConfigNodes,
							assignedPins,
							currentNode: clockNode.Name
						};

						const canvasCondition = Object.values(
							canvas?.parts ?? {}
						).find(
							part =>
								part.name === clockNode.Name &&
								(!part.mount ||
									evaluateClockCondition(globalConfig, part.mount))
						)?.condition;

						const isClockNodeEnabled = canvasCondition
							? evaluateClockCondition(globalConfig, canvasCondition)
							: true;

						const enabledControls = Object.keys(
							clockNode.controlValues ?? {}
						).reduce<Record<string, boolean>>((acc, control) => {
							const controlCondition = clockConfig.find(
								config => config.Id === control
							)?.Condition;

							const isControlEnabled = controlCondition
								? evaluateClockCondition(
										globalConfig,
										controlCondition
									)
								: true;

							acc[control] = isClockNodeEnabled && isControlEnabled;

							return acc;
						}, {});

						return {...clockNode, EnabledControls: enabledControls};
					});

				if (action.type.includes('Pins')) {
					updatePersistedPinAssignments(
						formatPinPersistencePayload(state.pinsReducer.pins),
						modifiedClockNodes
					)?.catch(e => {
						console.error(
							'There was an error in the persistence process: ',
							e
						);
					});
				}

				if (action.type.includes('ClockConfig')) {
					const payload = action.payload as ClockNodeSet;
					const {type, name} = payload;

					if (type) {
						updatePersistedClockNodesAssignments(
							formatClockNodePersistencePayload(payload),
							state.clockNodesReducer.clockNodes[type][name]
								.initialControlValues,
							modifiedClockNodes
						)?.catch(e => {
							console.error(
								'There was an error in the persistence process: ',
								e
							);
						});
					}
				}
			}
		});

		return listenerMiddleware.middleware;
	});
}
