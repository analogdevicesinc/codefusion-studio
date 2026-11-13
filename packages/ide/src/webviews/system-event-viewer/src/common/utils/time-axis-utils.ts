/**
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
 */

import {clampDataZoom, getMinimumTickInterval} from './axis-scale';
import {MIN_ZOOM_WINDOW_TICKS} from '../constants/timeline';
import {getAbsoluteTimeContext, getTimeContext} from './time-context';
import {
	ELAPSED_COORDINATES,
	type TimeAxisCoordinates
} from './time-axis-coordinates';
import {GRID_TIME_LABEL as LABEL} from '../constants/timeline';
import {format} from 'echarts/core';
import type {TimeContext} from '../types/events';
import type {DataZoom, Range} from '../types/timeline';
import type {TimeMode} from './time-mode-formatters';
import type {EChartsType} from 'echarts/core';

/** Exposes only the header's conversion; other chart data stays in elapsed seconds. */
export const getTimeAxisCoordinates = (
	mode: TimeMode
): TimeAxisCoordinates =>
	mode === 'absolute'
		? (getAbsoluteTimeContext(getTimeContext().tickEpoch)
				?.coordinates ?? ELAPSED_COORDINATES)
		: ELAPSED_COORDINATES;

/** Uses both coordinate magnitudes so switching modes cannot change the precision limit. */
export const getTimeMinimumTickInterval = (
	range: Range,
	context: TimeContext
): number => {
	const coordinates =
		getAbsoluteTimeContext(context.tickEpoch)?.coordinates ??
		ELAPSED_COORDINATES;

	return Math.max(
		getMinimumTickInterval(range),
		getMinimumTickInterval({
			min: coordinates.toAxis(range.min),
			max: coordinates.toAxis(range.max)
		})
	);
};

/** Keeps the minimum zoom window identical across modes, including ABS precision. */
export const getTimelineMinZoomSpan = (range: Range): number =>
	getTimeMinimumTickInterval(range, getTimeContext()) *
	MIN_ZOOM_WINDOW_TICKS;

/** Applies the shared precision limit before synchronizing chart and footer zoom. */
export const clampTimelineDataZoom = (
	zoom: DataZoom,
	range: Range
): DataZoom =>
	clampDataZoom(zoom, range, getTimelineMinZoomSpan(range));

/**
 * Purpose is to return the `rich` text style configurations for the edge ticks of the time axis.
 * @param edgeTicks The tick positions at the edges of the axis.
 * @param options The chart options containing xAxis and dataZoom configurations.
 * @param chart The ECharts instance.
 * @returns An object mapping edge identifiers to rich text style configurations.
 */
export const getRichOption = (
	edgeTicks: number[],
	options: any,
	chart: EChartsType
) => {
	const {xAxis, dataZoom} = options;
	const {axisLabel, minInterval: interval} = xAxis;
	const {startValue: min, endValue: max} = dataZoom[0];
	const chartWidth = chart.getWidth();
	const textStyle = chart.getOption().textStyle;
	const font = `${textStyle?.fontStyle ?? 'normal'} ${LABEL.fontWeight} ${LABEL.fontSize}px ${textStyle?.fontFamily ?? 'sans-serif'}`;

	return Object.fromEntries(
		edgeTicks.map((tick, edge) => {
			const value = tick * interval;
			const textWidth = format.getTextRect(
				axisLabel.formatter(value),
				font
			).width;
			const fraction = max > min ? (value - min) / (max - min) : 0.5;
			const tickPositionPx =
				LABEL.left +
				fraction * (chartWidth - LABEL.left - LABEL.right);
			const alignLeft = tickPositionPx <= chartWidth / 2;
			const space =
				(alignLeft ? tickPositionPx : chartWidth - tickPositionPx) -
				LABEL.edgeInset;

			// A full-width box centers the text; shrink it only enough to prevent clipping.
			return [
				`edge${edge}`,
				{
					width: Math.min(textWidth, 2 * Math.max(0, space)),
					align: alignLeft ? 'left' : 'right'
				}
			];
		})
	);
};
