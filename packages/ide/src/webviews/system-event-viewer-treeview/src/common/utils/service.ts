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

import {setEventCheckbox} from '../api';
import {INFO_CARD_ID, TREE_DATA_CHANGE_ID} from './constants';
import {
	setCard,
	setTreeRefreshing
} from '../../state/slices/event-tree/event-tree.reducer';
import {refreshTreeThunk} from '../../state/slices/event-tree/event-tree.thunks';

import {type AppDispatch} from '../../state/store';
import type {EventNode, SevExtensionMessage} from './types';

const pendingNodeRefreshes = new Map<string, () => void>();

async function waitForNodeRefresh(nodeId: string): Promise<void> {
	return new Promise(resolve => {
		pendingNodeRefreshes.set(nodeId, resolve);
	});
}

function resolveNodeRefresh(nodeId?: string): void {
	// Solves the CodeQL / Unvalidated dynamic method call
	if (
		typeof nodeId !== 'string' ||
		!pendingNodeRefreshes.has(nodeId)
	) {
		return;
	}

	const resolve = pendingNodeRefreshes.get(nodeId);

	if (!resolve) return;

	// Solves the CodeQL / Unvalidated dynamic method call
	if (typeof resolve !== 'function') return;

	pendingNodeRefreshes.delete(nodeId);

	resolve();
}

export async function setNodeCheckbox(
	node: EventNode,
	value: boolean
): Promise<void> {
	const nodeRefreshPromise = waitForNodeRefresh(node.path);

	try {
		await setEventCheckbox(node, value);
	} catch (error) {
		pendingNodeRefreshes.delete(node.path);
		throw error;
	}

	await nodeRefreshPromise;
}

export const startEventTreeService = (dispatch: AppDispatch) => {
	let isServiceDisposed = false;
	let isFullTreeRefreshRunning = false;
	let isFullTreeRefreshQueued = false;

	const refreshNode = async (nodeId: string) => {
		try {
			await dispatch(refreshTreeThunk({body: nodeId})).unwrap();
		} catch {
			// Keep the existing tree state when a refresh fails.
		} finally {
			resolveNodeRefresh(nodeId);
		}
	};

	const runPendingFullTreeRefreshes = async (): Promise<void> => {
		isFullTreeRefreshQueued = false;

		try {
			await dispatch(refreshTreeThunk({body: undefined})).unwrap();
		} catch {
			// Keep the existing tree state when a refresh fails.
		}

		if (isFullTreeRefreshQueued && !isServiceDisposed) {
			await runPendingFullTreeRefreshes();
		}
	};

	const refreshFullTree = async () => {
		if (isFullTreeRefreshRunning) {
			isFullTreeRefreshQueued = true;

			return;
		}

		isFullTreeRefreshRunning = true;
		dispatch(setTreeRefreshing(true));

		try {
			await runPendingFullTreeRefreshes();
		} finally {
			isFullTreeRefreshRunning = false;

			if (!isServiceDisposed) {
				dispatch(setTreeRefreshing(false));
			}
		}
	};

	const onMessageHandler = (event: MessageEvent) => {
		const data = event.data as SevExtensionMessage;

		switch (data.type) {
			case INFO_CARD_ID:
				dispatch(setCard(data.content));

				break;

			case TREE_DATA_CHANGE_ID:
				if (data.body === undefined) {
					void refreshFullTree();
				} else if (typeof data.body === 'string') {
					void refreshNode(data.body);
				}

				break;

			default:
				break;
		}
	};

	window.addEventListener('message', onMessageHandler);

	return () => {
		isServiceDisposed = true;
		isFullTreeRefreshQueued = false;
		window.removeEventListener('message', onMessageHandler);
		dispatch(setTreeRefreshing(false));
		pendingNodeRefreshes.forEach(resolve => {
			resolve();
		});
		pendingNodeRefreshes.clear();
	};
};
