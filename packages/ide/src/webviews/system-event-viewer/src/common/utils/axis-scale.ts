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

import {
	MIN_TICK_INTERVAL,
	MIN_ZOOM_WINDOW_TICKS
} from '../constants/timeline';
import type {DataZoom, Range} from '../types/timeline';

/**
 * Splits a value into its containing block and the remainder within that block.
 * Value and positive block size must use the same numeric units.
 *
 * Examples:
 * - Relative time:
 * splitValueAtScale(1_234_567_000, 1_000_000) => {wholeUnits: 1234, blockStart: 1_234_000_000, remainder: 567_000}
 * So, reference value is `1s 234ms` and tick `567µs`.
 *
 * - Clock ticks: at 1 MHz, one millisecond contains 1_000 ticks
 * splitValueAtScale(1_234_567, 1_000) => {wholeUnits: 1234 (complete blocks of 1000 ticks), blockStart: 1_234_000, remainder: 567}
 * So, reference is `1234000` and tick `+567`.
 *
 * - Absolute time: represent the time since midnight
 * splitValueAtScale(32_569_234_567_000, 1_000_000) => {wholeUnits: 32_569_234, blockStart: 32_569_234_000_000, remainder: 567_000}
 * blockStart: 09:02:49.234 and remainder: 567µs.
 * So, reference is 01.05.2026 09:02:49 234ms and tick 567µs
 */
export const splitValueAtScale = (
	value: number,
	blockSize: number
): {wholeUnits: number; blockStart: number; remainder: number} => {
	const wholeUnits = Math.floor(value / blockSize);
	const blockStart = wholeUnits * blockSize;

	return {wholeUnits, blockStart, remainder: value - blockStart};
};

/**
 * Break a value into several components.
 * Callers choose the numeric domain and apply rounding before decomposition.
 *
 * Examples:
 * decomposeAxisValue(123940, [1000, 1]) => [123, 940]
 *
 * decomposeAxisValue(1_234_567_000, [1_000_000_000, 1_000_000, 1_000, 1]) => [1 (s), 234 (ms), 567 (us), 0 (ns)]
 *
 * decomposeAxisValue(
		32_569_234_567_000,
		[
			3_600_000_000_000, // One hour in nanoseconds
			60_000_000_000,    // One minute
			1_000_000_000,     // One second
			1_000_000,         // One millisecond
			1_000,             // One microsecond
			1                  // One nanosecond
		]
	);
 * [9, 2, 49, 234, 567, 0]
 *  h  m   s   ms   µs  ns
 */
export const decomposeAxisValue = (
	value: number,
	unitSizes: readonly number[]
): number[] => {
	let remainder = value;

	return unitSizes.map(unitSize => {
		const part = splitValueAtScale(remainder, unitSize);
		remainder = part.remainder;

		return part.wholeUnits;
	});
};

/**
 * Calculates the visible portion of a numeric range using zoom percentages.
 * The result uses the same coordinates as the input; no time-mode conversion occurs.
 *
 * @param range The full numeric range of the axis.
 * @param dataZoom The current data zoom percentages.
 * @returns The visible range, without clamping zoom. Collapsed/reversed zoom has zero span.
 */
export const getVisibleRange = (
	range: Range,
	dataZoom: DataZoom
): Range => {
	const axisSpan = range.max - range.min;
	const spanPct = Math.max(0, dataZoom.end - dataZoom.start);

	const visibleSpan = axisSpan * (spanPct / 100);
	const visibleStart = range.min + axisSpan * (dataZoom.start / 100);
	const visibleEnd = visibleStart + visibleSpan;

	return {min: visibleStart, max: visibleEnd};
};

// Aim for about five intervals, independently of chart width.
const TIME_AXIS_INTERVAL_COUNT = 5;

/** Chooses 1, 2, or 5 times a power of ten in the caller's numeric units. */
export const calculateInterval = (
	span: number,
	minimumInterval: number,
	fallback: number
): number => {
	if (!Number.isFinite(span) || span <= 0) return fallback;

	const desiredInterval = Math.max(
		span / TIME_AXIS_INTERVAL_COUNT,
		minimumInterval
	);

	const magnitude = 10 ** Math.floor(Math.log10(desiredInterval));
	const fraction = desiredInterval / magnitude;

	let multiplier = 1;

	if (fraction < 1.5) {
		multiplier = 1;
	} else if (fraction < 3.5) {
		multiplier = 2;
	} else if (fraction < 7.5) {
		multiplier = 5;
	} else {
		multiplier = 10;
	}

	// Remove multiplication noise before comparing against unit sizes.
	return Math.max(
		minimumInterval,
		Number((multiplier * magnitude).toPrecision(15))
	);
};

/** Rounds a positive interval upward to a decimal 1/2/5 step. */
export const roundUpInterval = (interval: number): number => {
	const steps = [1, 2, 5, 10];
	const magnitude = 10 ** Math.floor(Math.log10(interval));
	const multiplier =
		steps.find(step => step * magnitude >= interval) ?? 10;

	return Number((multiplier * magnitude).toPrecision(15));
};

/** Estimates arithmetic noise in the same units as the coordinate. */
export const getRoundingTolerance = (magnitude: number): number =>
	Number.EPSILON * Math.max(1, Math.abs(magnitude)) * 4;

/** Repairs near-boundary arithmetic noise without rounding arbitrary positions. */
export const normalizeBoundary = (
	value: number,
	interval: number,
	coordinateMagnitude = value
): number => {
	const boundary = Math.round(value / interval) * interval;
	const tolerance = Math.min(
		interval / 4,
		getRoundingTolerance(coordinateMagnitude)
	);

	return Math.abs(value - boundary) <= tolerance ? boundary : value;
};

/** Keeps tick spacing distinguishable at the recording's coordinate magnitude. */
export const getMinimumTickInterval = (range: Range): number => {
	const magnitude = Math.max(
		Math.abs(range.min),
		Math.abs(range.max),
		range.max - range.min
	);

	if (!Number.isFinite(magnitude)) return MIN_TICK_INTERVAL;

	return roundUpInterval(
		Math.max(MIN_TICK_INTERVAL, getRoundingTolerance(magnitude) * 4)
	);
};

/** Returns the shared minimum window for charts and zoom controls, in seconds. */
export const getMinimumZoomSpan = (range: Range): number =>
	getMinimumTickInterval(range) * MIN_ZOOM_WINDOW_TICKS;

/** Clamps all zoom requests before the chart, footer and store receive them. */
export const clampDataZoom = (
	dataZoom: DataZoom,
	range: Range,
	minimumSpan = getMinimumZoomSpan(range)
): DataZoom => {
	const span = range.max - range.min;

	if (
		!Number.isFinite(span) ||
		span <= 0 ||
		!Number.isFinite(dataZoom.start) ||
		!Number.isFinite(dataZoom.end)
	) {
		return {start: 0, end: 100};
	}

	const minPercent = Math.min(100, (minimumSpan / span) * 100);
	const requestedPercent = Math.max(0, dataZoom.end - dataZoom.start);
	const windowPercent = Math.min(
		100,
		Math.max(minPercent, requestedPercent)
	);
	const center = (dataZoom.start + dataZoom.end) / 2;
	const start = Math.max(
		0,
		Math.min(100 - windowPercent, center - windowPercent / 2)
	);

	return {start, end: start + windowPercent};
};
