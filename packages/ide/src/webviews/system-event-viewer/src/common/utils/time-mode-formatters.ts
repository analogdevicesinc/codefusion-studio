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

import {AbsoluteTimeMode} from './absolute-time-mode';
import {ClockTicksTimeMode} from './clock-ticks-time-mode';
import {RelativeTimeMode} from './relative-time-mode';
import {getRoundingTolerance} from './axis-scale';
import {getTimeContext} from './time-context';

import type {
	PreparedMeasurementValue,
	Range
} from '../types/timeline';
import type {TimeContext} from '../types/events';

export {configureTimeContext} from './time-context';

/**
 * Numeric inputs, visible ranges, intervals, and prepared positions use seconds.
 * Formatting returns text without changing stored coordinates.
 * Optional raw tick counts preserve the original event values in all modes.
 * Axis positions and background measurements have no original event count.
 */
export interface TimeModeInfo {
	formatAxisLabels: (
		value: number,
		visibleRange: Range,
		context: TimeContext
	) => string;
	formatReferenceLabel: (
		value: number,
		visibleRange: Range,
		context: TimeContext
	) => string;
	formatTimestampLabel: (
		value: number | PreparedMeasurementValue,
		context: TimeContext,
		rawTicks?: number
	) => string;
	/** Returns tick spacing in seconds; the header chart generates the positions. */
	computeTickInterval: (
		visibleRange: Range,
		context: TimeContext
	) => number;
	/** Prepares a background coordinate and exact elapsed parts without changing them during formatting. */
	prepareMeasurementValue: (
		value: number,
		visibleRange: Range,
		context: TimeContext
	) => PreparedMeasurementValue;
	formatTimeDiff: (
		start: number | PreparedMeasurementValue,
		end: number | PreparedMeasurementValue,
		context: TimeContext,
		startTicks?: number,
		endTicks?: number
	) => string;
}

const RELATIVE_TIME = new RelativeTimeMode();
const CLOCK_TICKS_TIME = new ClockTicksTimeMode();
const ABSOLUTE_TIME = new AbsoluteTimeMode();

const getTimeModeInfo = (mode: TimeMode): TimeModeInfo =>
	TIME_MODE_INFO[mode];

/** Formats ticks within the full timestamp range, using the visible range for scale. */
export const getTickFormatter = (
	range: Range,
	visibleRange: Range,
	mode: TimeMode
): {formatter: (value: number) => string} => {
	const context = getTimeContext();
	const tolerance = getRoundingTolerance(
		Math.max(Math.abs(range.min), Math.abs(range.max))
	);

	return {
		formatter: value => {
			const isInvalid =
				!Number.isFinite(value) ||
				value < range.min - tolerance ||
				value > range.max + tolerance;

			if (isInvalid) return '';

			return getTimeModeInfo(mode).formatAxisLabels(
				Math.max(range.min, Math.min(range.max, value)),
				visibleRange,
				context
			);
		}
	};
};

/** Formats a tick at the visible scale; the chart adapter handles range exclusion. */
export const formatAxisLabels = (
	value: number,
	visibleRange: Range,
	mode: TimeMode
): string =>
	getTimeModeInfo(mode).formatAxisLabels(
		value,
		visibleRange,
		getTimeContext()
	);

/** Formats the reference from the visible left edge at the selected resolution. */
export const formatReferenceLabel = (
	value: number,
	visibleRange: Range,
	mode: TimeMode
): string =>
	getTimeModeInfo(mode).formatReferenceLabel(
		value,
		visibleRange,
		getTimeContext()
	);

/** Returns the selected mode's tick interval in seconds. */
export const computeTickInterval = (
	visibleRange: Range,
	mode: TimeMode
): number =>
	getTimeModeInfo(mode).computeTickInterval(
		visibleRange,
		getTimeContext()
	);

/**
 * Formats a numeric timestamp or exact prepared value at full supported precision, independently of zoom.
 * Relative example: 4.205 becomes 4s 205ms. Missing values have no label.
 * rawTicks is present for original events, but absent for calculated background positions.
 */
export const formatTimestampLabel = (
	value: number | PreparedMeasurementValue | undefined,
	mode: TimeMode,
	rawTicks?: number
): string | undefined =>
	value === undefined
		? undefined
		: getTimeModeInfo(mode).formatTimestampLabel(
				value,
				getTimeContext(),
				rawTicks
			);

/**
 * Returns the background coordinate and exact elapsed parts to store;
 * At millisecond precision: 4.205637 becomes 4.205, then displays as "4s 205ms".
 * Snapped events skip this step and keep the full label: "4s 205ms 637µs".
 */
export const prepareMeasurementValue = (
	value: number | undefined,
	visibleRange: Range,
	mode: TimeMode
): PreparedMeasurementValue | undefined => {
	if (value === undefined) return undefined;

	return getTimeModeInfo(mode).prepareMeasurementValue(
		value,
		visibleRange,
		getTimeContext()
	);
};

/** Formats the full signed difference between stored values without using zoom. */
export const formatTimeDiff = (
	start: number | PreparedMeasurementValue | undefined,
	end: number | PreparedMeasurementValue | undefined,
	mode: TimeMode,
	startTicks?: number,
	endTicks?: number
): string | undefined => {
	if (start === undefined || end === undefined) return undefined;

	return getTimeModeInfo(mode).formatTimeDiff(
		start,
		end,
		getTimeContext(),
		startTicks,
		endTicks
	);
};

const TIME_MODE_INFO = {
	relative: RELATIVE_TIME,
	absolute: ABSOLUTE_TIME,
	clock: CLOCK_TICKS_TIME
} satisfies Record<string, TimeModeInfo>;

export type TimeMode = keyof typeof TIME_MODE_INFO;
