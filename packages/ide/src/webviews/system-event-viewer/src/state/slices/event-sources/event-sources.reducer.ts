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

import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {getEventSourcesInTreeOrder} from '../../../common/utils/events-group';
import type {
	EventSourceTreeNode,
	SevEventSource
} from '../../../common/types/events';

type EventSourceData = {
	eventSources: SevEventSource[];
	eventSourceIndex?: EventSourceTreeNode[];
};

type EventSourcesState = EventSourceData & {
	jsonValidationErrors: string[];
	loading: boolean;
};

export const eventSourcesInitialState: EventSourcesState = {
	eventSources: [],
	eventSourceIndex: undefined,
	jsonValidationErrors: [],
	loading: true
};

const eventSourcesSlice = createSlice({
	name: 'eventSources',
	initialState: eventSourcesInitialState,
	reducers: {
		setEventSourceData(
			state,
			action: PayloadAction<EventSourceData>
		) {
			const {eventSources, eventSourceIndex} = action.payload;
			const shouldPreserveFlatOrder =
				eventSources.length > 0 &&
				eventSourceIndex === undefined &&
				state.eventSourceIndex === undefined &&
				state.eventSources.length > 0;

			if (shouldPreserveFlatOrder) {
				const incomingSourceByName = new Map(
					eventSources.map(eventSource => [
						eventSource.name,
						eventSource
					])
				);
				const currentSourceNames = new Set(
					state.eventSources.map(eventSource => eventSource.name)
				);
				const currentSources = state.eventSources
					.map(eventSource =>
						incomingSourceByName.get(eventSource.name)
					)
					.filter(
						(eventSource): eventSource is SevEventSource =>
							eventSource !== undefined
					);
				const newSources = eventSources.filter(
					eventSource => !currentSourceNames.has(eventSource.name)
				);

				state.eventSources = [...currentSources, ...newSources];
			} else {
				state.eventSources = eventSources;
			}

			state.eventSourceIndex = eventSourceIndex;
		},
		setEventSources(state, action: PayloadAction<SevEventSource[]>) {
			state.eventSources = action.payload ?? [];
		},
		setEventSourceTree(
			state,
			action: PayloadAction<EventSourceTreeNode[]>
		) {
			state.eventSources = getEventSourcesInTreeOrder(
				action.payload,
				state.eventSources
			);
			state.eventSourceIndex = action.payload;
		},
		setJsonValidationErrors(state, action: PayloadAction<string[]>) {
			state.jsonValidationErrors = action.payload;
		},
		setLoading(state, action: PayloadAction<boolean>) {
			state.loading = action.payload;
		},
		clearEvents(state) {
			state.eventSources = [];
			state.eventSourceIndex = undefined;
		}
	}
});

export const {
	setEventSourceData,
	setEventSources,
	setEventSourceTree,
	setJsonValidationErrors,
	setLoading,
	clearEvents
} = eventSourcesSlice.actions;
export const eventSourcesReducer = eventSourcesSlice.reducer;
