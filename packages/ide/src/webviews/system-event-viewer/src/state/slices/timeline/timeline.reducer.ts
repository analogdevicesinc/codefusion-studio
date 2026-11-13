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
import {setEventSourceTree} from '../event-sources/event-sources.reducer';
import type {EventSourceTreeNode} from '../../../common/types/events';
import type {
	DataZoom,
	MeasurePhase
} from '../../../common/types/timeline';
import {
	INITIAL_DATA_ZOOM,
	MEASURE_PHASE,
	TIMELINE_LIST_DEFAULT_WIDTH
} from '../../../common/constants/timeline';

import type {TimeMode} from '../../../common/utils/time-mode-formatters';

type TimelineState = {
	referenceValue: string;
	dataZoom: DataZoom;
	timeMode: TimeMode;
	timeAvailability: {abs: boolean};
	measurePhase: MeasurePhase;
	expandedGroupIds: Record<string, true>;
	eventSourcesListWidth: number;
};

const initialState: TimelineState = {
	referenceValue: '',
	timeMode: 'relative',
	timeAvailability: {abs: false},
	dataZoom: INITIAL_DATA_ZOOM,
	measurePhase: MEASURE_PHASE.IDLE,
	expandedGroupIds: {},
	eventSourcesListWidth: TIMELINE_LIST_DEFAULT_WIDTH
};

const getGroupIds = (
	nodes: EventSourceTreeNode[],
	groupIds = new Set<string>()
): Set<string> => {
	for (const node of nodes) {
		if (node.type === 'group') {
			groupIds.add(node.id);

			getGroupIds(node.children, groupIds);
		}
	}

	return groupIds;
};

const timelineSlice = createSlice({
	name: 'timeline',
	initialState,
	reducers: {
		setDataZoom(state, action: PayloadAction<DataZoom>) {
			state.dataZoom = action.payload;
		},
		setEventSourcesListWidth(state, action: PayloadAction<number>) {
			state.eventSourcesListWidth = action.payload;
		},
		setReferenceValue(state, action: PayloadAction<string>) {
			state.referenceValue = action.payload;
		},
		setTimeMode(state, action: PayloadAction<TimeMode>) {
			state.timeMode = action.payload;
		},
		setTimeAvailability(
			state,
			action: PayloadAction<TimelineState['timeAvailability']>
		) {
			state.timeAvailability = action.payload;

			if (!action.payload.abs && state.timeMode === 'absolute') {
				state.timeMode = 'relative';
			}
		},
		resetDataZoom(state) {
			state.dataZoom = INITIAL_DATA_ZOOM;
		},
		setMeasurePhase(state, action: PayloadAction<MeasurePhase>) {
			state.measurePhase = action.payload;
		},
		resetMeasurePhase(state) {
			state.measurePhase = MEASURE_PHASE.IDLE;
		},
		toggleGroupExpanded(state, action: PayloadAction<string>) {
			const groupId = action.payload;

			if (state.expandedGroupIds[groupId]) {
				state.expandedGroupIds = Object.fromEntries(
					Object.entries(state.expandedGroupIds).filter(
						([expandedGroupId]) => expandedGroupId !== groupId
					)
				);
			} else {
				state.expandedGroupIds = {
					...state.expandedGroupIds,
					[groupId]: true
				};
			}
		}
	},
	// It's used for cleaning up expandedGroupIds when the event source tree changes, such as from creating or removing groups.
	extraReducers: builder => {
		builder.addCase(setEventSourceTree, (state, action) => {
			const groupIds = getGroupIds(action.payload);
			const keys = Object.keys(state.expandedGroupIds);

			for (const expandedGroupId of keys) {
				if (!groupIds.has(expandedGroupId)) {
					delete state.expandedGroupIds[expandedGroupId];
				}
			}
		});
	}
});

export const {
	setDataZoom,
	setEventSourcesListWidth,
	resetDataZoom,
	setReferenceValue,
	setTimeMode,
	setTimeAvailability,
	setMeasurePhase,
	resetMeasurePhase,
	toggleGroupExpanded
} = timelineSlice.actions;
export const timelineReducer = timelineSlice.reducer;
