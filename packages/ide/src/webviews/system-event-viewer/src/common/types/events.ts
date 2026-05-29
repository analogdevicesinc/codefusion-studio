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
export type CfsEventState = (typeof CfsEventsStates)[number];

export type CfsEventsDocument = {
	schemaVersion: '0.2';
	lastUpdate: string;
	tickFrequency?: number;
	ticksEpoch?: string;
	state?: CfsEventState;
	events: EventsDictionary;
};

export type EventsDictionary = Record<
	string,
	Record<'timestamps', number[]>
>;

export type SevEventSource = {
	id: string;
	name: string;
	alias?: string;
	timestamps: Timestamp[];
	checked: boolean;
};

export type Timestamp = {
	id: number;
	value: number;
	name: string;
	description: string;
};

export type TimestampList = Array<Timestamp & {alias?: string}>;

export type MenuAction = 'top' | 'up' | 'down' | 'bottom';
export type PanelPlacement = 'bottom' | 'top';
