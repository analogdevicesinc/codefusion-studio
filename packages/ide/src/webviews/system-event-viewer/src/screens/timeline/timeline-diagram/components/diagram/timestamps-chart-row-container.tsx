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

import {memo, useCallback, useMemo} from 'react';
import type {EChartsType} from 'echarts/core';
import TimestampsChartRow from './timestamps-chart-row';
import {useEventSources} from '../../../../../state/slices/event-sources/event-sources.selector';

import type {
	SevEventSource,
	TimelineGroupRow,
	TimelineSourceRow
} from '../../../../../common/types/events';
import type {
	DataZoom,
	Range,
	RowStateUpdate
} from '../../../../../common/types/timeline';

type TimestampsChartRowContainerProps = Readonly<{
	row: TimelineSourceRow | TimelineGroupRow;
	rowIndex: number;
	timestampRange: Range;
	containerRef: React.RefObject<HTMLDivElement>;
	registerChart: (id: string, instance: EChartsType) => void;
	unregisterChart: (id: string) => void;
	onRowStateChange: (update: RowStateUpdate) => void;
	onDataZoomChange: (dataZoom: DataZoom, rowId: string) => void;
}>;

function TimestampsChartRowContainer({
	row,
	rowIndex,
	timestampRange,
	containerRef,
	registerChart,
	unregisterChart,
	onRowStateChange,
	onDataZoomChange
}: TimestampsChartRowContainerProps) {
	const eventSources = useEventSources();
	const handleDataZoomChange = useCallback(
		(dataZoom: DataZoom) => {
			onDataZoomChange(dataZoom, row.id);
		},
		[onDataZoomChange, row.id]
	);

	const eventSource = useMemo<SevEventSource | undefined>(() => {
		if (row.type === 'leaf') {
			return eventSources.find(source => source.id === row.id);
		}

		const descendantSourceNames = new Set(row.descendantSourceNames);
		const timestamps = eventSources
			.filter(source => descendantSourceNames.has(source.name))
			.flatMap(source => source.timestamps)
			.sort((first, second) => first.value - second.value);

		return {
			id: row.id,
			name: row.name,
			alias: row.name,
			checked: true,
			timestamps
		};
	}, [eventSources, row]);

	if (!eventSource) return null;

	return (
		<TimestampsChartRow
			id={row.id}
			rowIndex={rowIndex}
			eventSource={eventSource}
			timestampRange={timestampRange}
			containerRef={containerRef}
			registerChart={registerChart}
			unregisterChart={unregisterChart}
			onRowStateChange={onRowStateChange}
			onDataZoomChange={handleDataZoomChange}
		/>
	);
}

export default memo(TimestampsChartRowContainer);
