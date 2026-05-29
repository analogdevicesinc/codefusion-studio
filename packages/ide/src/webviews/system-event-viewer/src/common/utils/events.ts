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

import {EV_LIST_WIDTH_PROPERTY} from '../constants/timeline';

import type {
	CfsEventsDocument,
	SevEventSource,
	TimestampList
} from '../../common/types/events';

export function sortAllTimestamps(
	eventSources: SevEventSource[]
): TimestampList {
	const flat: TimestampList = [];

	for (const event of eventSources) {
		for (const timestamp of event.timestamps) {
			flat.push({
				id: timestamp.id,
				name: event.name,
				alias: event.alias,
				value: timestamp.value,
				description: timestamp.description
			});
		}
	}

	return flat.sort((a, b) => a.value - b.value);
}

export const mapEventSources = (
	document: CfsEventsDocument
): SevEventSource[] => {
	const events = document.events ?? {};
	const freq = Number(document.tickFrequency);

	const convertToSeconds = (ticks: number) =>
		Number.isFinite(freq) && freq > 0 ? ticks / freq : ticks;

	return Object.keys(events).map(
		(eventId: string, index: number) => ({
			id: `${eventId}-${index}`,
			name: eventId,
			alias: eventId,
			checked: Boolean(events[eventId]),
			timestamps: events[eventId].timestamps.map(
				(timestamp: number, tIndex: number) => ({
					id: tIndex,
					value: convertToSeconds(timestamp),
					name: `name-for-${convertToSeconds(timestamp)}`,
					description: `description text`
				})
			)
		})
	);
};

// The purpose of this is to persist the width to be consumed in different components
// for example, in the footer to apply padding-left equal to the list width, and in the diagram to calculate the remaining width for the charts
export const setListWidthProperty = (
	host: HTMLElement,
	width: number
) => {
	if (!host) return;

	host.style.setProperty(EV_LIST_WIDTH_PROPERTY, `${width}px`);
};
