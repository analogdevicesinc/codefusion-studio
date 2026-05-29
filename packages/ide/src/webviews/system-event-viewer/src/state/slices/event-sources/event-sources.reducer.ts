/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import type {SevEventSource} from '../../../common/types/events';

type EventSourcesState = {
	eventSources: SevEventSource[];
	jsonValidationErrors: string[];
	loading: boolean;
};

export const eventSourcesInitialState: EventSourcesState = {
	eventSources: [],
	jsonValidationErrors: [],
	loading: true
};

const eventSourcesSlice = createSlice({
	name: 'eventSources',
	initialState: eventSourcesInitialState,
	reducers: {
		setEventSources(state, action: PayloadAction<SevEventSource[]>) {
			state.eventSources = action.payload ?? [];
		},
		setJsonValidationErrors(state, action: PayloadAction<string[]>) {
			state.jsonValidationErrors = action.payload;
		},
		setLoading(state, action: PayloadAction<boolean>) {
			state.loading = action.payload;
		},
		clearEvents(state) {
			state.eventSources = [];
		}
	}
});

export const {
	setEventSources,
	setJsonValidationErrors,
	setLoading,
	clearEvents
} = eventSourcesSlice.actions;
export const eventSourcesReducer = eventSourcesSlice.reducer;
