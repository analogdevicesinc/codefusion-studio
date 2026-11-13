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

import {RootState} from '../../../../../state/store';
import {useStore} from 'react-redux';

import {
	DIAGRAM_CHART_ROW_ID,
	GRID
} from '../../../../../common/constants/timeline';
import {getTimelineMinZoomSpan} from '../../../../../common/utils/time-axis-utils';
import {getMinimumTickInterval} from '../../../../../common/utils/axis-scale';
import {useTimelineTooltipPosition} from '../../../../../common/hooks/use-timeline-tooltip-position';
import useColors from '../../../../../common/hooks/use-colors';
import {
	addWheelListener,
	computeNewDataZoomValues,
	formatTimestampTooltip
} from '../../../../../common/utils/timeline-diagram';
import type {
	DataZoom,
	DataZoomEvent,
	RowStateUpdate
} from '../../../../../common/types/timeline';
import type {SevEventSource} from '../../../../../common/types/events';

import styles from './timestamps-chart-row.module.scss';

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
	const activeStore = useStore<RootState>();

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
			const timeMode =
				activeStore.getState().timelineReducer.timeMode;

			return formatTimestampTooltip(
				eventSource,
				timeMode,
				dataIndex,
				colors
			);
		},
		[eventSource, colors, activeStore]
	);

	const minZoomSpan = getTimelineMinZoomSpan(timestampRange);
	const options = useMemo(
		(): EChartsOption => ({
			tooltip: {
				show: true,
				trigger: 'item',
				renderMode: 'html',
				enterable: false,
				confine: false,
				appendTo: () => containerRef.current ?? document.body,
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
					minValueSpan: minZoomSpan,
					zoomOnMouseWheel: 'ctrl',
					moveOnMouseWheel: false,
					moveOnMouseMove: false,
					preventDefaultMouseMove: false,
					zoomLock: false,
					cursorGrab: 'default',
					cursorGrabbing: 'default'
				}
			],
			grid: {
				...GRID,
				top: 0,
				containLabel: false // Hide/Show the Y axis labels
			},
			xAxis: {
				type: 'value',
				show: false,
				data: [],
				boundaryGap: false,
				animation: false,
				animationDurationUpdate: 0,
				animationEasingUpdate: 'linear',
				splitLine: {
					show: false
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
				minInterval: getMinimumTickInterval(timestampRange)
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
						color: colors.dotColor
					},
					emphasis: {
						itemStyle: {
							color: colors.hoverDotColor
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
			minZoomSpan,
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
			data-row-id={id}
			data-test={`${DIAGRAM_CHART_ROW_ID}:${eventSource.id}`}
			onMouseEnter={() => {
				onRowStateChange({rowIndex, isHovered: true});
			}}
			onMouseLeave={() => {
				onRowStateChange({rowIndex, isHovered: false});
			}}
		>
			<div
				className={styles.offsetBlock}
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
				className={styles.offsetBlock}
				data-test='timeline-diagram:empty-block'
			/>
		</div>
	);
}

export default memo(TimestampsChartRow);
