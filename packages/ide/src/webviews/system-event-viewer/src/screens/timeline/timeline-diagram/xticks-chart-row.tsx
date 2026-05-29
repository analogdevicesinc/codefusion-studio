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

import {memo, useEffect, useMemo, useRef} from 'react';
import ReactECharts from 'echarts-for-react';
import type {EChartsOption} from 'echarts-for-react';

import {
	GRID,
	MIN_VALUE_SPAN
} from '../../../common/constants/timeline';
import {
	getAxisLabelStyle,
	minIntervalForUnit
} from '../../../common/utils/x-axis-ticks';
import useXAxisBase from '../../../common/hooks/use-x-axis-base';
import useColors from '../../../common/hooks/use-colors';

import styles from './timeline-diagram.module.scss';

type DiagramHeaderProps = {
	timestampRange: {min: number; max: number};
	registerHeaderChart: (inst: any) => void;
	unregisterHeaderChart: (inst: any) => void;
};

/**
 * This component is responsible for rendering the chart showing the time axis.
 * It subscribes to the x-axis base changes via the useXAxisBase hook and updates the tick values accordingly.
 * So, on dataZoom changes, the x-axis ticks will update without causing re-renders of this component.
 * @param timestampRange - The range of timestamps to display on the x-axis.
 * @param registerHeaderChart - Callback to register the header chart instance.
 * @param unregisterHeaderChart - Callback to unregister the header chart instance.
 * @returns
 */
function XTicksChartRow({
	timestampRange,
	registerHeaderChart,
	unregisterHeaderChart
}: Readonly<DiagramHeaderProps>) {
	const chartRef = useRef<ReactECharts>(null);
	const colors = useColors();
	const {unit} = useXAxisBase(timestampRange);

	const axisLabelStyle = useMemo(
		() => ({
			...getAxisLabelStyle(timestampRange, unit),
			color: colors.defaultForeground,
			fontSize: 11,
			fontWeight: 500,
			lineHeight: 13,
			align: 'center',
			margin: 0
		}),
		[colors, unit, timestampRange]
	);

	const options = useMemo(
		(): EChartsOption => ({
			animation: false,
			animationDurationUpdate: 0,
			animationEasingUpdate: 'linear',
			xAxis: {
				type: 'value',
				min: timestampRange.min,
				max: timestampRange.max,
				minInterval: minIntervalForUnit(unit), // Prevent excessive ticks for small units
				position: 'top',
				animation: false,
				axisLabel: axisLabelStyle,
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
				left: GRID.left + 10,
				right: GRID.right + 10,
				containLabel: true
			},
			dataZoom: [
				{
					type: 'inside',
					xAxisIndex: 0,
					minValueSpan: MIN_VALUE_SPAN
				}
			],
			series: []
		}),
		[timestampRange, colors, unit, axisLabelStyle]
	);

	// Unregister chart instance
	useEffect(
		() => () => {
			unregisterHeaderChart(chartRef.current);
		},
		[unregisterHeaderChart]
	);

	return (
		<div
			className={styles.timelineHeader}
			data-test='timeline-diagram:xticks-chart-row'
		>
			<ReactECharts
				ref={chartRef}
				option={options}
				style={{
					height: 'inherit'
				}}
				onChartReady={registerHeaderChart}
			/>
		</div>
	);
}

export default memo(XTicksChartRow);
