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

import {memo} from 'react';
import type {EChartsType} from 'echarts/core';
import TimelineGroupRow from './timeline-group-row';

import type {
	TimelineGroupRow as GroupRowType,
	TimelineSourceRow
} from '../../../../../common/types/events';
import type {
	DataZoom,
	Range,
	RowStateUpdate
} from '../../../../../common/types/timeline';
import {isTimelineChartRow} from '../../../../../common/utils/events';
import TimestampsChartRowContainer from './timestamps-chart-row-container';

type TimestampsRowProps = Readonly<{
	row: TimelineSourceRow | GroupRowType;
	rowIndex: number;
	timestampRange: Range;
	containerRef: React.RefObject<HTMLDivElement>;
	registerChart: (id: string, instance: EChartsType) => void;
	unregisterChart: (id: string) => void;
	onRowStateChange: (update: RowStateUpdate) => void;
	onDataZoomChange: (dataZoom: DataZoom, rowId: string) => void;
}>;

/**
 * Purpose of this component is to render either a group row or a source row based on the type of the row.
 * It is used in the TimelineDiagram component to render the rows of the timeline.
 *
 * @returns A React element representing either a group row or a source row.
 * @remarks This component is memoized to prevent unnecessary re-renders.
 */
function TimelineRow(props: TimestampsRowProps) {
	const {row, rowIndex, onRowStateChange} = props;

	if (row.type === 'group' && !isTimelineChartRow(row)) {
		return (
			<TimelineGroupRow
				row={row}
				index={rowIndex}
				handleRowStateChange={onRowStateChange}
			/>
		);
	}

	return <TimestampsChartRowContainer {...props} />;
}

export default memo(TimelineRow);
