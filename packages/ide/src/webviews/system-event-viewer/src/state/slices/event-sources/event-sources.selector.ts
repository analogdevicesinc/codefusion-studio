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
import {createSelector} from '@reduxjs/toolkit';
import {
	getVisibleAnchorRowIds,
	isTimelineChartRow
} from '../../../common/utils/events';
import {getVisibleTimelineRows} from '../../../common/utils/events-group';
import {useAppSelector} from '../../store';

import type {RootState} from '../../store';

const selectEventSources = (state: RootState) =>
	state.eventSourcesReducer.eventSources;

const selectEventSourceIndex = (state: RootState) =>
	state.eventSourcesReducer.eventSourceIndex;

const selectExpandedGroupIds = (state: RootState) =>
	state.timelineReducer.expandedGroupIds;

export const selectEventSourceTree = createSelector(
	[selectEventSourceIndex, selectEventSources],
	(eventSourceIndex, eventSources) =>
		eventSourceIndex ??
		eventSources.map(eventSource => ({
			type: 'leaf' as const,
			id: eventSource.id,
			sourceName: eventSource.name
		}))
);

export const selectVisibleTimelineRows = createSelector(
	[selectEventSourceTree, selectExpandedGroupIds],
	getVisibleTimelineRows
);

export const selectVisibleAnchorRowIds = createSelector(
	[selectEventSourceTree, selectExpandedGroupIds],
	getVisibleAnchorRowIds
);

export const selectMeasurementRowProjection = createSelector(
	[selectVisibleTimelineRows, selectVisibleAnchorRowIds],
	(visibleRows, visibleAnchorRowIds) => {
		const visibleRowIds = visibleRows.map(row => row.id);
		const visibleChartRowIds: ReadonlySet<string> = new Set(
			visibleRows.filter(isTimelineChartRow).map(row => row.id)
		);
		const visibleGroupRowIds: ReadonlySet<string> = new Set(
			visibleRows
				.filter(row => row.type === 'group')
				.map(row => row.id)
		);

		return {
			visibleRowIds,
			visibleChartRowIds,
			visibleGroupRowIds,
			visibleAnchorRowIds
		};
	}
);

export const useEventSources = () =>
	useAppSelector(selectEventSources);

export const useVisibleTimelineRows = () =>
	useAppSelector(selectVisibleTimelineRows);

export const useVisibleAnchorRowIds = () =>
	useAppSelector(selectVisibleAnchorRowIds);

export const useMeasurementRowProjection = () =>
	useAppSelector(selectMeasurementRowProjection);

export const useEventsLoading = () =>
	useAppSelector(state => state.eventSourcesReducer.loading);

export const useJsonValidationErrors = () =>
	useAppSelector(
		state => state.eventSourcesReducer.jsonValidationErrors
	);
