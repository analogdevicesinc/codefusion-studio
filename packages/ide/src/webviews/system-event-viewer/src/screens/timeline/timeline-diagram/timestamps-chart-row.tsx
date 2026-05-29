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

import {memo, useCallback, useEffect, useMemo, useRef} from 'react';
import ReactECharts from 'echarts-for-react';
import type {EChartsOption} from 'echarts-for-react';
import type {EChartsType} from 'echarts/core';

import {
	DIAGRAM_CHART_ROW_ID,
	GRID,
	MIN_TICK_INTERVAL,
	MIN_VALUE_SPAN
} from '../../../common/constants/timeline';
import {useTimelineTooltipPosition} from '../../../common/hooks/use-timeline-tooltip-position';
import useColors from '../../../common/hooks/use-colors';
import {
	addWheelListener,
	computeNewDataZoomValues,
	formatTimestampTooltip
} from '../../../common/utils/timeline-diagram';
import type {
	DataZoom,
	DataZoomEvent,
	RowStateUpdate
} from '../../../common/types/timeline';
import type {SevEventSource} from '../../../common/types/events';

import styles from './timeline-diagram.module.scss';

type EventsDiagramProps = {
	id: string;
	rowIndex: number;
	eventSource: SevEventSource;
	timestampRange: {min: number; max: number};
	containerRef: React.RefObject<HTMLDivElement>;
	registerChart: (id: string, inst: any) => void;
	unregisterChart: (id: string) => void;
	onRowStateChange: (update: RowStateUpdate) => void;
	onDataZoomChange: (dataZoom: DataZoom) => void;
};

/**
 * This component is responsible for rendering a single row in the timeline diagram,
 * which includes the timestamps chart for a specific event source.
 * It also handles zooming and panning interactions.
 *
 * Important note:
 * Do not rely on React re-renders to update the chart; use ECharts methods instead.
 * Do not keep internal react state in this component
 * Keep the props minimal
 */
function TimestampsChartRow({
	id,
	rowIndex,
	eventSource,
	timestampRange,
	containerRef,
	registerChart,
	unregisterChart,
	onRowStateChange,
	onDataZoomChange
}: Readonly<EventsDiagramProps>) {
	const chartRef = useRef<any>(null);
	const wheelCleanupRef = useRef<() => void>();
	const colors = useColors();

	const tooltipPos = useTimelineTooltipPosition(
		containerRef,
		chartRef
	);

	const data = useMemo(
		() => eventSource.timestamps.map(item => [item.value, 0, 8]),
		[eventSource.timestamps]
	);

	const tooltipFormatter = useCallback(
		(params: any) => {
			const dataIndex: number = params.dataIndex ?? 0;

			return formatTimestampTooltip(eventSource, dataIndex, colors);
		},
		[eventSource, colors]
	);

	const options = useMemo(
		(): EChartsOption => ({
			tooltip: {
				show: true,
				trigger: 'item',
				renderMode: 'html',
				enterable: true,
				confine: false,
				appendTo: () => containerRef.current ?? document.body,
				className: `${styles.timelineTooltip}`,
				transitionDuration: 0,
				displayTransition: false,
				backgroundColor: colors.editorWidgetBackground,
				borderColor: colors.editorWidgetColor,
				padding: [16],
				axisPointer: {
					animation: false
				},
				showDelay: 0,
				hideDelay: 0,
				extraCssText: '',
				position: tooltipPos,
				formatter: tooltipFormatter
			},
			axisPointer: {
				link: []
			},
			dataZoom: [
				{
					type: 'inside',
					xAxisIndex: 0,
					minValueSpan: MIN_VALUE_SPAN,
					zoomOnMouseWheel: 'ctrl',
					moveOnMouseWheel: false,
					moveOnMouseMove: false,
					preventDefaultMouseMove: false,
					zoomLock: false
				}
			],
			grid: {
				...GRID,
				top: 0,
				containLabel: false // Hide/Show the Y axis labels
			},
			xAxis: {
				type: 'value',
				data: [],
				boundaryGap: false,
				animation: false,
				animationDurationUpdate: 0,
				animationEasingUpdate: 'linear',
				splitLine: {
					show: false,
					lineStyle: {
						color: colors.borderColor,
						width: 1
					}
				},
				axisLine: {
					show: false
				},
				axisTick: {
					show: false
				},
				position: 'top',
				min: timestampRange.min,
				max: timestampRange.max,
				minInterval: MIN_TICK_INTERVAL
			},
			yAxis: {
				type: 'category',
				data: eventSource,
				inverse: true,
				animation: false,
				splitLine: {
					show: true
				},
				axisLine: {
					show: false
				}
			},
			series: [
				{
					name: 'Events',
					type: 'scatter',
					symbolSize: (val: number[]) => val[2],
					data,
					symbol: 'circle',
					animationDelay: 0,
					itemStyle: {
						color: colors.itemColor
					},
					emphasis: {
						itemStyle: {
							color: colors.hoverItemColor
						}
					},
					cursor: 'default',
					animation: false,
					markArea: {}
				}
			]
		}),
		[
			colors,
			data,
			eventSource,
			timestampRange,
			containerRef,
			tooltipPos,
			tooltipFormatter
		]
	);

	const handleChartReady = useCallback(
		(instance: EChartsType) => {
			registerChart(id, instance);

			// The purpose is to add a wheel listener to the chart instance
			// to stop the propagation of wheel events when ctrl key is not pressed
			// so that the browser can handle scrolling normally
			wheelCleanupRef.current?.();
			wheelCleanupRef.current = addWheelListener(instance);
		},
		[id, registerChart]
	);

	const handleDataZoom = useCallback(
		(params: DataZoomEvent) => {
			const {start, end} = computeNewDataZoomValues(params);

			onDataZoomChange({start, end});
		},
		[onDataZoomChange]
	);

	const onEvents = useMemo(() => {
		const onZoom = (params: DataZoomEvent) => {
			handleDataZoom(params);
		};

		return {
			datazoom: onZoom,
			dataZoom: onZoom // Safety alias
		};
	}, [handleDataZoom]);

	// Unregister chart instance
	useEffect(
		() => () => {
			unregisterChart(id);
			wheelCleanupRef.current?.();
		},
		[id, unregisterChart]
	);

	return (
		<div
			className={styles.chartContainer}
			data-row-index={rowIndex}
			data-test={`${DIAGRAM_CHART_ROW_ID}:${eventSource.id}`}
			onMouseEnter={() => {
				onRowStateChange({rowIndex, isHovered: true});
			}}
			onMouseLeave={() => {
				onRowStateChange({rowIndex, isHovered: false});
			}}
		>
			<div
				className={styles.emptyBlock}
				data-test='timeline-diagram:empty-block'
			/>

			<ReactECharts
				ref={chartRef}
				option={options}
				className={styles.timestampsChartRow}
				onChartReady={handleChartReady}
				onEvents={onEvents}
			/>

			<div
				className={styles.emptyBlock}
				data-test='timeline-diagram:empty-block'
			/>
		</div>
	);
}

export default memo(TimestampsChartRow);
