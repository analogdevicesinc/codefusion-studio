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

import {request} from '@common/api';

import type {
	CfsEventsDocument,
	CfsEventState,
	CfsEventSourceIndexEntry,
	EventSourceTreeNode,
	SevEventSource
} from './types/events';
import type {SevSaveType} from './types/files';
import {
	mapEventSources,
	normalizeEventSourceIndex
} from './utils/events';

const SevMessageType = {
	data: 'sev-data',
	jsonErrors: 'sev-json-errors'
} as const;

type SevMessage = {
	type: (typeof SevMessageType)[keyof typeof SevMessageType];
	body?: CfsEventsDocument;
	errors?: string[];
};

type SevOnDataCallback = (data: {
	sources: SevEventSource[];
	tickFrequency: number;
	tickEpoch?: string;
	eventSourceIndex?: EventSourceTreeNode[];
	state?: CfsEventState;
	lastUpdate?: string;
	jsonErrors?: string[];
}) => void;

/**
 * Subscribe to event source data pushed from the extension.
 * Returns an unsubscribe function.
 */
export function subscribeToEventSources(
	onData: SevOnDataCallback
): () => void {
	const handler = (event: MessageEvent) => {
		const {type, body, errors} = event.data as SevMessage;

		if (
			type !== SevMessageType.data &&
			type !== SevMessageType.jsonErrors
		) {
			return;
		}

		switch (type) {
			case SevMessageType.data:
				if (body) {
					const sources = mapEventSources(body);

					onData({
						sources,
						tickFrequency: body.tickFrequency,
						tickEpoch: body.tickEpoch,
						eventSourceIndex: normalizeEventSourceIndex(
							body.eventSourceIndex,
							sources
						),
						state: body.state,
						lastUpdate: body.lastUpdate,
						jsonErrors: []
					});
				}

				break;
			case SevMessageType.jsonErrors:
				if (errors?.length) {
					onData({
						sources: [],
						tickFrequency: 0,
						tickEpoch: '',
						eventSourceIndex: undefined,
						state: undefined,
						lastUpdate: undefined,
						jsonErrors: errors
					});
				}

				break;
			default:
				break;
		}
	};

	window.addEventListener('message', handler);

	return () => {
		window.removeEventListener('message', handler);
	};
}

export async function createFile(
	saveType: SevSaveType
): Promise<string | undefined> {
	return request('sev-create-file', {saveType}) as Promise<
		string | undefined
	>;
}

export async function updateEventSourceIndex(
	eventSourceIndex: CfsEventSourceIndexEntry[]
): Promise<void> {
	return request('sev-update-event-source-index', {
		eventSourceIndex
	}) as Promise<void>;
}
