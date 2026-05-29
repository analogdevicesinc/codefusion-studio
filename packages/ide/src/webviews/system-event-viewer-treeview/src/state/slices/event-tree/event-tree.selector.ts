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

import {useAppSelector} from '../../store';
import type {RootState} from '../../store';

export const selectNodeById = (state: RootState, nodeId: string) =>
	state.eventTreeReducer.nodesById[nodeId];

export const selectExpandedNodeIds = (state: RootState) =>
	Object.keys(state.eventTreeReducer.expandedIds).filter(
		nodeId => state.eventTreeReducer.expandedIds[nodeId]
	);

export const useRootNodeIds = () =>
	useAppSelector(
		(state: RootState) => state.eventTreeReducer.rootIds
	);

export const useNodeById = (nodeId: string) =>
	useAppSelector(state => selectNodeById(state, nodeId));

export const useNodeChildIds = (nodeId: string) =>
	useAppSelector(
		state => state.eventTreeReducer.childrenByParentId[nodeId] ?? []
	);

export const useNodeExpanded = (nodeId: string) =>
	useAppSelector(
		state => state.eventTreeReducer.expandedIds[nodeId] ?? false
	);

export const useNodeCache = (nodeId: string) =>
	useAppSelector(
		state => state.eventTreeReducer.cacheById[nodeId] ?? false
	);

export const useInfoCard = () =>
	useAppSelector(state => state.eventTreeReducer.card);
