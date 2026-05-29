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

import {createAsyncThunk} from '@reduxjs/toolkit';
import {getChildren, getTreeItem} from '../../../common/api';
import {ROOT_NODE_ID} from '../../../common/utils/constants';
import type {EventNode, EventTree} from '../../../common/utils/types';
import type {RootState} from '../../store';
import {
	clearTree,
	setNodeChildren,
	setRootChildren
} from './event-tree.reducer';
import {
	selectExpandedNodeIds,
	selectNodeById
} from './event-tree.selector';

// Avoid duplicate requests for the same node
const pendingChildrenRequests = new Map<string, Promise<void>>();

export const loadChildrenByNodeThunk = createAsyncThunk<
	void,
	{parentId: string; element?: EventNode},
	{state: RootState}
>(
	'eventTree/loadChildrenByNode',
	async ({parentId, element}, {dispatch}) => {
		if (pendingChildrenRequests.has(parentId)) {
			await pendingChildrenRequests.get(parentId);

			return;
		}

		const requestPromise = requestAndStoreChildren(
			parentId,
			element,
			dispatch
		)
			.catch(() => {
				if (parentId === ROOT_NODE_ID) {
					dispatch(clearTree());
				}
			})
			.finally(() => {
				pendingChildrenRequests.delete(parentId);
			});

		pendingChildrenRequests.set(parentId, requestPromise);

		await requestPromise;
	}
);

export const refreshVisibleTreeThunk = createAsyncThunk<
	void,
	void,
	{state: RootState}
>('eventTree/refreshVisibleTree', async (_, {dispatch, getState}) => {
	await dispatch(loadChildrenByNodeThunk({parentId: ROOT_NODE_ID}));

	const state = getState();
	const expandedNodeIds = [...new Set(selectExpandedNodeIds(state))];

	const expandedGroups = expandedNodeIds
		.map(nodeId => selectNodeById(state, nodeId))
		.filter((node): node is EventNode => Boolean(node?.isGroup));

	await Promise.all(
		expandedGroups.map(async node =>
			dispatch(
				loadChildrenByNodeThunk({parentId: node.path, element: node})
			)
		)
	);
});

export const refreshTreeThunk = createAsyncThunk<
	void,
	{body?: string},
	{state: RootState}
>('eventTree/refreshTree', async ({body}, {dispatch, getState}) => {
	if (body) {
		const state = getState();
		const node = selectNodeById(state, body);

		if (node?.isGroup) {
			await dispatch(
				loadChildrenByNodeThunk({
					parentId: node.path,
					element: node
				})
			);

			return;
		}
	}

	await dispatch(refreshVisibleTreeThunk());
});

async function hydrateTreeItems(
	nodes: EventTree
): Promise<EventTree> {
	return Promise.all(
		nodes.map(async node => {
			try {
				const treeItem = await getTreeItem(node);

				return {
					...node,
					treeItem
				};
			} catch (error) {
				return node; // Keep node visible even if tree-item fails.
			}
		})
	);
}

async function requestAndStoreChildren(
	parentId: string,
	element: EventNode | undefined,
	dispatch: (action: unknown) => void
): Promise<void> {
	const children = await getChildren(element);
	const hydratedChildren = await hydrateTreeItems(children);

	if (parentId === ROOT_NODE_ID) {
		dispatch(setRootChildren(hydratedChildren));

		return;
	}

	dispatch(setNodeChildren({parentId, children: hydratedChildren}));
}
