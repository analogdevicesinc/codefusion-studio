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

import type {INFO_CARD_ID, TREE_DATA_CHANGE_ID} from './constants';

export enum TreeItemCollapsibleState {
	None = 0,
	Collapsed = 1,
	Expanded = 2
}

export enum TreeItemCheckboxState {
	Unchecked = 0,
	Checked = 1
}

export type EventNode = {
	name: string;
	path: string;
	isGroup: boolean;
	treeItem: EventTreeItem;
};

export type EventTree = EventNode[];

export type EventTreeItem = {
	label?: string;
	collapsibleState?: TreeItemCollapsibleState;
	checkboxState?: TreeItemCheckboxState;
	tooltip?: string;
	isDisabled?: boolean;
};

export type SevContentCard = {
	icon: 'info' | 'error';
	title: string;
	description?: string;
};

export type InfoCardStateChangeMessage = {
	type: typeof INFO_CARD_ID;
	content?: SevContentCard;
};

export type TreeDataChangeMessage = {
	type: typeof TREE_DATA_CHANGE_ID;
	body?: string;
};

export type SevExtensionMessage =
	| InfoCardStateChangeMessage
	| TreeDataChangeMessage;

export type SevStateChangeMessage = SevExtensionMessage;
