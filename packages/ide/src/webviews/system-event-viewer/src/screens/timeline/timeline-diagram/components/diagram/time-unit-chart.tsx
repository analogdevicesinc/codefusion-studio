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

import {
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef
} from 'react';
import ReactECharts from 'echarts-for-react';
import type {EChartsType} from 'echarts/core';
import type {EChartsOption} from 'echarts-for-react';
import {
	GRID,
	GRID_TIME_LABEL as LABEL
} from '../../../../../common/constants/timeline';
import useTimeAxis from '../../../../../common/hooks/use-time-axis';
import useColors from '../../../../../common/hooks/use-colors';
import type {TimeMode} from '../../../../../common/utils/time-mode-formatters';
import type {
	HeaderChartHandle,
	Range
} from '../../../../../common/types/timeline';
import {handleHeaderChart} from '../../../../../common/utils/timeline-diagram';
import styles from './time-unit-chart.module.scss';
import {getRichOption} from '../../../../../common/utils/time-axis-utils';

type TimeUnitChartProps = {
	timestampRange: Range;
	timeMode: TimeMode;
	registerHeaderChart: (handle: HeaderChartHandle) => void;
	unregisterHeaderChart: () => void;
};

// The header owns dynamic setOption calls so coordinates and chart options change together.
const BASE_OPTIONS: EChartsOption = {animation: false, series: []};

/** Renders the numeric header chart and exposes its pixel conversions in elapsed seconds. */
function TimeUnitChart({
	timestampRange,
	timeMode,
	registerHeaderChart,
	unregisterHeaderChart
}: Readonly<TimeUnitChartProps>) {
	const colors = useColors();
	const {
		coordinates,
		range,
		visibleRange,
		tickInterval,
		axisLabelOptions,
		minZoomSpan
	} = useTimeAxis(timestampRange, timeMode);

	const options = useMemo(
		(): EChartsOption => ({
			animation: false,
			animationDurationUpdate: 0,
			xAxis: {
				type: 'value',
				min: range.min,
				max: range.max,
				minInterval: tickInterval,
				maxInterval: tickInterval,
				position: 'top',
				animation: false,
				axisLabel: {
					...axisLabelOptions,
					color: colors.defaultForeground,
					fontSize: LABEL.fontSize,
					fontWeight: LABEL.fontWeight,
					lineHeight: 13,
					align: 'center',
					margin: 0
				},
				axisLine: {
					show: true
				},
				axisTick: {
					show: true,
					length: 6,
					lineStyle: {
						color: colors.borderColor,
						width: 1
					}
				},
				splitLine: {
					show: false
				}
			},
			yAxis: {
				show: false
			},
			grid: {
				...GRID,
				top: 10,
				left: LABEL.left,
				right: LABEL.right,
				containLabel: true
			},
			dataZoom: [
				{
					type: 'inside',
					xAxisIndex: 0,
					startValue: visibleRange.min,
					endValue: visibleRange.max,
					rangeMode: ['value', 'value'],
					minValueSpan: minZoomSpan,
					cursorGrab: 'default',
					cursorGrabbing: 'default',
					zoomLock: false,
					zoomOnMouseWheel: false
				}
			],
			series: []
		}),
		[
			colors,
			range,
			visibleRange,
			tickInterval,
			axisLabelOptions,
			minZoomSpan
		]
	);

	const appliedCoordinates = useRef(coordinates);
	const pending = useRef({coordinates, options});
	const header = useRef<HeaderChartHandle>();
	const resizeObserver = useRef<ResizeObserver>();

	const applyOptions = useCallback((chart: EChartsType) => {
		const snapshot = pending.current;
		const {xAxis, dataZoom} = snapshot.options;
		const {axisLabel, minInterval: interval} = xAxis;
		const {startValue: min, endValue: max} = dataZoom[0];
		appliedCoordinates.current = snapshot.coordinates;

		// Match tick numbers instead of comparing floating-point timestamps.
		const edgeTicks = [
			axisLabel.showMinLabel
				? Math.round(min / interval)
				: Math.ceil(min / interval),
			axisLabel.showMaxLabel
				? Math.round(max / interval)
				: Math.floor(max / interval)
		];

		const labels = {
			...axisLabel,
			rich: getRichOption(edgeTicks, snapshot.options, chart),
			formatter: (value: number) => {
				const text = axisLabel.formatter(value);
				const edge = edgeTicks.indexOf(Math.round(value / interval));

				return text && edge !== -1 ? `{edge${edge}|${text}}` : text;
			}
		};

		chart.setOption(
			{
				...snapshot.options,
				xAxis: {...xAxis, axisLabel: labels}
			},
			{
				notMerge: true,
				lazyUpdate: false
			}
		);
	}, []);

	useLayoutEffect(() => {
		pending.current = {coordinates, options};
		if (header.current) applyOptions(header.current.chart);
	}, [coordinates, options, applyOptions]);

	const handleReady = useCallback(
		(chart: EChartsType) => {
			applyOptions(chart);
			const handle = handleHeaderChart(chart, appliedCoordinates);
			header.current = handle;
			registerHeaderChart(handle);

			resizeObserver.current?.disconnect();
			resizeObserver.current = new ResizeObserver(() => {
				chart.resize();
				applyOptions(chart);
			});
			resizeObserver.current.observe(chart.getDom());
		},
		[applyOptions, registerHeaderChart]
	);

	useEffect(
		() => () => {
			resizeObserver.current?.disconnect();
			header.current = undefined;
			unregisterHeaderChart();
		},
		[unregisterHeaderChart]
	);

	return (
		<div
			className={styles.timeUnitChartContainer}
			data-test='timeline-diagram:time-unit-chart'
		>
			<ReactECharts
				option={BASE_OPTIONS}
				style={{height: 'inherit'}}
				onChartReady={handleReady}
			/>
		</div>
	);
}

export default memo(TimeUnitChart);
