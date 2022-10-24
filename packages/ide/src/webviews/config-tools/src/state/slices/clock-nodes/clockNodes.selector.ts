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
import {useSelector} from 'react-redux';
import {type ClockNodeState} from '@common/types/soc';

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
	clockNodes =>
		Object.values(clockNodes).flatMap(clockNodeForType =>
			Object.values(clockNodeForType)
		)
);

export const useClockNodesConfig = () => {
	const nodes = useAppSelector(selectAllClockNodes);

	return Object.values(nodes).reduce<Record<string, ClockNodeState>>(
		(acc, curr) => {
			acc[curr.Name] = curr;

			return acc;
		},
		{}
	);
};

export const useModifiedClockNodes = () => {
	const nodes = useAppSelector(selectAllClockNodes);

	return Object.values(nodes).reduce<Record<string, ClockNodeState>>(
		(acc, curr) => {
			if (
				Object.entries(curr.controlValues ?? {}).some(
					([key, val]) =>
						val !== undefined &&
						val !== '' &&
						val !== curr.initialControlValues?.[key]
				)
			) {
				acc[curr.Name] = curr;
			}

			return acc;
		},
		{}
	);
};

const selectClockNodeByName = createSelector(
	[
		selectAllClockNodes,
		(_: RootState, name: string | undefined) => name
	],
	(allClockNodes, name) =>
		allClockNodes.find(clockNode => clockNode.Name === name)
);

export const useClockNodeState = (name: string | undefined) =>
	useSelector((state: RootState) =>
		selectClockNodeByName(state, name)
	);

export const useActiveClockNodeType = () =>
	useAppSelector(
		state => state.clockNodesReducer.activeClockNodeType
	);

export const useClockConfigs = () =>
	useAppSelector(state => state.clockNodesReducer.clockConfig);

export const useConfigForClockNode = (clockNodeId: string) =>
	useAppSelector(state =>
		state.clockNodesReducer.clockConfig.find(
			config => config.Id === clockNodeId
		)
	);

export function useControl(
	type: string | undefined,
	clockNode: string | undefined,
	control: string
) {
	return useAppSelector(state => {
		if (type && clockNode) {
			return state.clockNodesReducer.clockNodes[type][clockNode]
				.controlValues?.[control];
		}

		return undefined;
	});
}

export function useClockConfigError(
	type: string,
	clockNode: string,
	control: string
) {
	return useAppSelector(state => {
		if (type && clockNode) {
			return state.clockNodesReducer.clockNodes[type][clockNode]
				.Errors?.[control];
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
