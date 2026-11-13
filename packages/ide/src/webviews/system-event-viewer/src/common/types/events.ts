/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

// The CfsEventsStates constants is placed here intentionally
// because will be removed and consumed from the common types together with the other relevant types
export const CfsEventsStates = [
	'active',
	'running',
	'ended',
	'file'
] as const;

// Types for the received JSON schema
export type CfsEventsDocument = {
	lastUpdate: string;
	tickFrequency: number;
	tickEpoch?: string;
	state?: CfsEventState;
	eventSources: EventsDictionary;
	eventSourceIndex?: CfsEventSourceIndexEntry[];
};

export type CfsEventState = (typeof CfsEventsStates)[number];

export type EventsDictionary = Record<string, CfsEventSource>;
export type CfsEventSource = {
	events: CfsEventEntry[];
};
export type CfsEventEntry = {
	ts: number;
	msg?: string;
};

export type CfsEventSourceIndexEntry = string | CfsEventSourceGroup;
export type CfsEventSourceGroup = {
	name: string;
	events: CfsEventSourceIndexEntry[];
};

// Types used in UI
export type SevEventSource = {
	id: string;
	name: string;
	alias?: string;
	timestamps: Timestamp[];
	checked: boolean;
};
export type Timestamp = {
	id: number;
	value: number; // Timeline coordinate in seconds.
	rawTicks?: number; // Original timestamp count from the document.
	evSourceName: string;
	description: string;
};

export type TimestampList = Array<Timestamp & {alias?: string}>;

export type EventSourceTreeNode = EventSource | EventSourceGroup;
export type EventSource = {
	type: 'leaf';
	id: string;
	sourceName: string;
};
export type EventSourceGroup = {
	type: 'group';
	id: string;
	name: string;
	children: EventSourceTreeNode[];
	descendantSourceNames: string[];
};

export type TimelineRow = TimelineSourceRow | TimelineGroupRow;
export type TimelineSourceRow = EventSource & {
	depth: number;
	siblingIndex: number;
	siblingCount: number;
};
export type TimelineGroupRow = Omit<EventSourceGroup, 'children'> & {
	depth: number;
	siblingIndex: number;
	siblingCount: number;
	isExpanded: boolean;
};

export type TimeContext = {
	tickFrequency: number;
	tickEpoch?: string;
};

export type MenuAction =
	| 'top'
	| 'up'
	| 'down'
	| 'bottom'
	| 'renameGroup'
	| 'ungroup'
	| 'extractNode';
export type PanelPlacement = 'bottom' | 'top';
export type EventSourceDropPosition = 'before' | 'center' | 'after';

export type EventSourceMoveIntent =
	| Readonly<{
			type: 'menu';
			action: MenuAction;
	  }>
	| Readonly<{
			type: 'drag';
			targetNodeId: string;
			position: EventSourceDropPosition;
	  }>;
