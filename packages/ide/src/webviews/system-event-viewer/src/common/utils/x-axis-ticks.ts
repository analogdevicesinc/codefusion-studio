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
	UNITS_ID as UNITS,
	UNITS_LABEL as LABELS,
	MIN_TICK_INTERVAL,
	INITIAL_DATA_ZOOM,
	UNIT_SEC_PER_PX,
	DEFAULT_VISIBLE_WIDTH_PX
} from '../../common/constants/timeline';
import type {EChartsType} from 'echarts/core';
import type {Base, DataZoom, Range, Unit} from '../types/timeline';

/**
 * Format the axis labels based on the selected unit.
 * @param value - The value to format.
 * @param unit - The unit for formatting.
 * @returns The formatted label.
 */
export function formatAxisLabels(
	range: Range,
	value: number,
	unit: Unit
): string {
	if (value < range.min || value > range.max) {
		return '';
	}

	const totalNs = Math.round(value * 1e9);
	const s = Math.floor(totalNs / 1e9);
	const afterS = totalNs - s * 1e9;
	const ms = Math.floor(afterS / 1e6);
	const afterMs = afterS - ms * 1e6;
	const us = Math.floor(afterMs / 1e3);
	const ns = afterMs - us * 1e3;

	if (unit === UNITS.S) {
		return formatSecondsLabel(value);
	}

	if (unit === UNITS.MS) {
		return formatMillisecondsLabel(ms, s);
	}

	if (unit === UNITS.US) {
		return formatMicrosecondsLabel(us, ms, s);
	}

	// NS unit: prefer higher-unit labels on boundaries instead of "0ns"
	// example labels: 800ns - 900ns - 0ns - 100ns - 200ns; the "0ns" would become "5us"
	if (ns === 0) {
		if (us === 0) {
			if (ms === 0) return `${s}${LABELS.s}`;

			return `${ms}${LABELS.ms}`;
		}

		return `${us}${LABELS.us}`;
	}

	return `${ns}${LABELS.ns}`;
}

function formatSecondsLabel(valueSec: number) {
	const valueString = valueSec.toFixed(1);

	return `${valueString.replace(/\.?0+$/, '')}${LABELS.s}`;
}

function formatMillisecondsLabel(ms: number, s: number) {
	// On exact second boundary show seconds, else residual ms within the current second
	if (ms === 0) return `${s}${LABELS.s}`;

	return `${ms}${LABELS.ms}`;
}

function formatMicrosecondsLabel(us: number, ms: number, s: number) {
	// On exact millisecond boundary show absolute ms; on exact second boundary show seconds
	if (us === 0) {
		if (ms === 0) return `${s}${LABELS.s}`;

		return `${ms}${LABELS.ms}`;
	}

	return `${us}${LABELS.us}`;
}

/**
 * Prevent excessive ticks for small units by enforcing a minimum interval between ticks based on the selected unit
 * @param unit - The unit for which to determine the minimum interval.
 * @returns The minimum interval in seconds.
 */
export function minIntervalForUnit(unit: Unit): number {
	switch (unit) {
		case UNITS.S:
			return 1e-2; // 10ms
		case UNITS.MS:
			return 1e-3; // 1ms
		case UNITS.US:
			return 1e-6; // 1μs
		case UNITS.NS:
			return MIN_TICK_INTERVAL;
		default:
			return MIN_TICK_INTERVAL;
	}
}

const unitForSecondsPerPx = (secondsPerPx: number): Unit => {
	if (secondsPerPx >= UNIT_SEC_PER_PX.S) {
		return UNITS.S;
	}

	if (secondsPerPx >= UNIT_SEC_PER_PX.MS) {
		return UNITS.MS;
	}

	if (secondsPerPx >= UNIT_SEC_PER_PX.US) {
		return UNITS.US;
	}

	return UNITS.NS;
};

/**
 * Determine the correct unit for the X axis ticks based on the currently visible time span.
 * If width is unavailable, use a default width to estimate seconds-per-pixel.
 * @param visibleSpan - The currently visible time span in seconds.
 * @returns Time unit
 */
export function computeUnit(
	visibleSpan: number,
	visibleAxisWidthPx?: number
): Unit {
	if (visibleSpan <= 0) return UNITS.S;

	const axisWidthPx =
		visibleAxisWidthPx !== undefined && visibleAxisWidthPx > 0
			? visibleAxisWidthPx
			: DEFAULT_VISIBLE_WIDTH_PX;
	const secondsPerPx = visibleSpan / axisWidthPx;

	return unitForSecondsPerPx(secondsPerPx);
}

/**
 * Destructure the leftmost value into its constituent time units.
 * @param leftValue - The leftmost value in seconds.
 * @returns An object containing the seconds, milliseconds, and microseconds components.
 */
export function destructureLeftBase(leftValue: number): Base {
	const totalNs = Math.floor(leftValue * 1e9);
	const s = Math.floor(totalNs / 1e9);
	const afterS = totalNs - s * 1e9;
	const ms = Math.floor(afterS / 1e6);
	const afterMs = afterS - ms * 1e6;
	const us = Math.floor(afterMs / 1e3);

	// NS remainder not needed for base
	return {s, ms, us};
}

/**
 * Compute the tick value to display on the X axis based on the current data zoom, unit, and base values.
 * @param dataZoom - The current data zoom state.
 * @param unit - The current unit of time.
 * @param base - The base values for seconds, milliseconds, and microseconds.
 * @param leftValInSeconds - The leftmost value in seconds.
 * @returns The formatted tick value as a string.
 */
export const computeTickValue = (
	dataZoom: DataZoom,
	unit: Unit,
	base: Base,
	leftValInSeconds: number
) => {
	if (
		(dataZoom.start === INITIAL_DATA_ZOOM.start &&
			dataZoom.end === INITIAL_DATA_ZOOM.end) ||
		unit === UNITS.S
	) {
		return '';
	}

	if (unit === UNITS.MS) {
		return `${base.s}${LABELS.s}`;
	}

	if (unit === UNITS.US) {
		// Show integer seconds + milliseconds if leftmost >= 1ms
		if (leftValInSeconds >= 1e-3) {
			const parts = [];

			if (base.s > 0) {
				parts.push(`${base.s}${LABELS.s}`);
			}

			parts.push(`${base.ms}${LABELS.ms}`);

			return parts.join(' ');
		}

		return '';
	}

	// NS unit
	if (leftValInSeconds >= 1e-6) {
		const parts = [];

		if (base.s > 0) {
			parts.push(`${base.s}${LABELS.s}`);
		}

		if (base.ms > 0 || base.s > 0) {
			parts.push(`${base.ms}${LABELS.ms}`);
		}

		parts.push(`${base.us}${LABELS.us}`);

		return parts.join(' ');
	}

	return '';
};

export const syncHeaderChartBase = (
	headerChart: EChartsType,
	range: Range,
	newDataZoom: DataZoom
) => {
	const {visibleStart, visibleEnd, visibleSpanSec} =
		getVisibleTimeWindow(range, newDataZoom);

	const startPx = headerChart.convertToPixel(
		{xAxisIndex: 0},
		visibleStart
	);
	const endPx = headerChart.convertToPixel(
		{xAxisIndex: 0},
		visibleEnd
	);

	const visibleAxisWidthPx = Math.abs(endPx - startPx);
	const unit = computeUnit(visibleSpanSec, visibleAxisWidthPx);

	headerChart.setOption(
		{
			xAxis: {
				minInterval: minIntervalForUnit(unit), // Lower bound to prevent too-dense ticks at tiny units
				axisLabel: {...getAxisLabelStyle(range, unit)}
			}
		},
		false
	);
};

export const getVisibleTimeWindow = (
	range: Range,
	dataZoom: DataZoom
) => {
	const axisSpan = range.max - range.min;
	const spanPct = Math.max(0, dataZoom.end - dataZoom.start);
	const visibleSpanSec = axisSpan * (spanPct / 100);
	const visibleStart = range.min + axisSpan * (dataZoom.start / 100);
	const visibleEnd = visibleStart + visibleSpanSec;

	return {visibleStart, visibleEnd, visibleSpanSec};
};

export const getAxisLabelStyle = (range: Range, unit: Unit) => ({
	showMinLabel: unit === UNITS.S,
	showMaxLabel: unit === UNITS.S,
	formatter(value: number) {
		return formatAxisLabels(range, value, unit);
	}
});
