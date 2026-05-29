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

import {request} from '@common/api';
import type {
	EventNode,
	EventTree,
	EventTreeItem
} from './utils/types';

export async function getChildren(
	element?: EventNode
): Promise<EventTree> {
	return request('get-children', {element}) as Promise<EventTree>;
}

export async function getTreeItem(
	element: EventNode
): Promise<EventTreeItem> {
	return request('get-tree-item', {
		element
	}) as Promise<EventTreeItem>;
}

export async function setEventCheckbox(
	node: EventNode,
	value: boolean
): Promise<void> {
	return request('set-node-checkbox', {
		node,
		value
	}) as Promise<void>;
}
