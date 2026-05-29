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
import type {
	DataZoom,
	MeasurePhase
} from '../../../common/types/timeline';
import {
	INITIAL_DATA_ZOOM,
	MEASURE_PHASE
} from '../../../common/constants/timeline';

type TimelineState = {
	tickValue: string;
	dataZoom: DataZoom;
	measurePhase: MeasurePhase;
};

const initialState: TimelineState = {
	tickValue: '',
	dataZoom: INITIAL_DATA_ZOOM,
	measurePhase: MEASURE_PHASE.IDLE
};

const timelineSlice = createSlice({
	name: 'timeline',
	initialState,
	reducers: {
		setDataZoom(state, action: PayloadAction<DataZoom>) {
			state.dataZoom = action.payload;
		},
		setTickValue(state, action: PayloadAction<string>) {
			state.tickValue = action.payload;
		},
		resetDataZoom(state) {
			state.dataZoom = INITIAL_DATA_ZOOM;
		},
		setMeasurePhase(state, action: PayloadAction<MeasurePhase>) {
			state.measurePhase = action.payload;
		},
		resetMeasurePhase(state) {
			state.measurePhase = MEASURE_PHASE.IDLE;
		}
	}
});

export const {
	setDataZoom,
	resetDataZoom,
	setTickValue,
	setMeasurePhase,
	resetMeasurePhase
} = timelineSlice.actions;
export const timelineReducer = timelineSlice.reducer;
