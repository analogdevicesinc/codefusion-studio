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

import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {
	EventNode,
	EventTree,
	SevContentCard
} from '../../../common/utils/types';

import {ROOT_NODE_ID} from '../../../common/utils/constants';

/**
 * Purpose for this dictionary is to solve a false positive risk raised by the agent regarding prototype pollution
 */
const createDictionary = <T>(): Record<string, T> =>
	Object.create(null) as Record<string, T>;

type EventTreeState = {
	rootIds: string[];
	nodesById: Record<string, EventNode>;
	childrenByParentId: Record<string, string[]>;
	expandedIds: Record<string, boolean>;
	cacheById: Record<string, boolean>;
	card: SevContentCard | undefined;
};

export const eventTreeInitialState: EventTreeState = {
	rootIds: [],
	nodesById: createDictionary<EventNode>(),
	childrenByParentId: createDictionary<string[]>(),
	expandedIds: createDictionary<boolean>(),
	cacheById: createDictionary<boolean>(),
	card: undefined
};

function upsertNodes(
	state: EventTreeState,
	nodes: EventTree
): string[] {
	const ids: string[] = [];

	nodes.forEach(node => {
		state.nodesById[node.path] = node;
		ids.push(node.path);
	});

	return ids;
}

const eventTreeSlice = createSlice({
	name: 'eventTree',
	initialState: eventTreeInitialState,
	reducers: {
		setRootChildren(state, action: PayloadAction<EventTree>) {
			const rootIds = upsertNodes(state, action.payload);

			state.rootIds = rootIds;
			state.childrenByParentId[ROOT_NODE_ID] = rootIds;
			state.cacheById[ROOT_NODE_ID] = true;
		},
		setNodeChildren(
			state,
			action: PayloadAction<{parentId: string; children: EventTree}>
		) {
			const {parentId, children} = action.payload;
			const childIds = upsertNodes(state, children);

			state.childrenByParentId[parentId] = childIds;
			state.cacheById[parentId] = true;
		},
		updateNodeTreeItem(
			state,
			action: PayloadAction<{
				nodeId: string;
				treeItem: EventNode['treeItem'];
			}>
		) {
			const {nodeId, treeItem} = action.payload;

			if (!state.nodesById[nodeId]) return;

			state.nodesById[nodeId].treeItem = treeItem;
		},
		toggleNodeExpanded(state, action: PayloadAction<string>) {
			state.expandedIds[action.payload] =
				!state.expandedIds[action.payload];
		},
		setNodeExpanded(
			state,
			action: PayloadAction<{nodeId: string; isExpanded: boolean}>
		) {
			const {nodeId, isExpanded} = action.payload;
			state.expandedIds[nodeId] = isExpanded;
		},
		setCard(
			state,
			action: PayloadAction<SevContentCard | undefined>
		) {
			state.card = action.payload;
		},
		clearTree(state) {
			state.rootIds = [];
			state.nodesById = createDictionary<EventNode>();
			state.childrenByParentId = createDictionary<string[]>();
			state.cacheById = createDictionary<boolean>();
			state.expandedIds = createDictionary<boolean>();
		}
	}
});

export const {
	setRootChildren,
	setNodeChildren,
	updateNodeTreeItem,
	toggleNodeExpanded,
	setNodeExpanded,
	setCard,
	clearTree
} = eventTreeSlice.actions;
export const eventTreeReducer = eventTreeSlice.reducer;
