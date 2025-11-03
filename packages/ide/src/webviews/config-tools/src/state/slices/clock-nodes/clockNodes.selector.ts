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
import {createSelector} from '@reduxjs/toolkit';
import {type RootState, useAppSelector} from '../../store';
import type {
	ClockNodesDictionary,
	ClockNodeState
} from '@common/types/soc';

export function useClockNodeDetailsTargetNode() {
	return useAppSelector(
		store => store.clockNodesReducer.clockNodeDetailsTargetNode
	);
}

export const useClockNodes = () =>
	useAppSelector(state => state.clockNodesReducer.clockNodes);

// Memoize useClockNode to avoid unnecessary re-renders
const selectAllClockNodes = createSelector(
	(state: RootState) => state.clockNodesReducer.clockNodes,
	clockNodes => clockNodes
);

// Properly memoized selector for useClockNodesConfig
const selectClockNodesConfig = createSelector(
	(state: RootState) => state.clockNodesReducer.clockNodes,
	clockNodes => ({...clockNodes})
);

export const useClockNodesConfig = () =>
	useAppSelector(selectClockNodesConfig);

function getDisabledNodeNames(nodes: ClockNodesDictionary): string[] {
	const disabled = new Set<string>();

	Object.values(nodes).forEach(node => {
		const controlValues = node.controlValues ?? {};

		Object.entries(controlValues).forEach(([key, value]) => {
			if (key.endsWith('_ENABLE') && value === 'FALSE') {
				disabled.add(key.replace('_ENABLE', ''));
			}
		});
	});

	return Array.from(disabled);
}

export const useModifiedClockNodes = () => {
	const nodes = useAppSelector(selectAllClockNodes);
	const disabledNodeNames = getDisabledNodeNames(nodes);

	return Object.entries(nodes).reduce<Record<string, ClockNodeState>>(
		(acc, [nodeName, nodeState]) => {
			const controlValues = nodeState.controlValues ?? {};
			const initialValues = nodeState.initialControlValues ?? {};

			const filteredControlValues = Object.entries(
				controlValues
			).reduce<Record<string, any>>((filtered, [key, val]) => {
				// Some nodes like UART have ENABLE propreties which need to be considered.
				// The ones that don't are treatet as enabled.
				const isDisabled = disabledNodeNames.some(name =>
					key.startsWith(name)
				);

				if (
					!isDisabled &&
					val !== undefined &&
					val !== '' &&
					val !== initialValues[key]
				) {
					filtered[key] = val;
				}

				return filtered;
			}, {});

			// Some nodes are grouped like UART0/2,
			// so we must add only the control values that changed.
			if (Object.keys(filteredControlValues).length > 0) {
				acc[nodeName] = {
					...nodeState,
					controlValues: filteredControlValues
				};
			}

			return acc;
		},
		{}
	);
};

export const useClockNodeState = (name: string | undefined) =>
	useAppSelector(
		(state: RootState) =>
			state.clockNodesReducer.clockNodes[name ?? '']
	);

export const useActiveClockNodeType = () =>
	useAppSelector(
		state => state.clockNodesReducer.activeClockNodeType
	);

export function useControl(
	clockNode: string | undefined,
	control: string
) {
	return useAppSelector(state => {
		if (clockNode) {
			return state.clockNodesReducer.clockNodes[clockNode]
				.controlValues?.[control];
		}

		return undefined;
	});
}

export function useClockConfigError(
	clockNode: string,
	control: string
) {
	return useAppSelector(state => {
		if (clockNode) {
			return state.clockNodesReducer.clockNodes[clockNode].Errors?.[
				control
			];
		}
	});
}

export function useDiagramNodeData(clockNodeId: string) {
	return useAppSelector(
		state => state.clockNodesReducer.diagramData[clockNodeId]
	);
}

export function useDiagramData() {
	return useAppSelector(state => state.clockNodesReducer.diagramData);
}
