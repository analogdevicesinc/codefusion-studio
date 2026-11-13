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
	calculateInterval,
	decomposeAxisValue,
	splitValueAtScale
} from './axis-scale';
import {
	formatDuration,
	resolveElapsedParts,
	formatElapsedTime,
	getMeasurementResolution,
	normalizeTimeParts,
	splitSeconds,
	NS_PER_SECOND,
	AXIS_SCALES,
	UNIT_SIZES
} from './absolute-relative-shared-utils';

import {getTimeMinimumTickInterval} from './time-axis-utils';

import type {TimeModeInfo} from './time-mode-formatters';
import type {
	PreparedMeasurementValue,
	Range,
	TimeParts
} from '../types/timeline';
import type {TimeContext} from '../types/events';

/**
 * Chooses the nearest 1, 2, or 5 times a power of ten to span / 5.
 * These steps land on larger unit boundaries: 200ms includes every second, whereas 300ms skips some seconds.
 * Keep a 100ns minimum unless coordinate precision requires a larger step.
 */
const computeRelativeTickInterval = (
	visibleRange: Range,
	context: TimeContext
): number => {
	return calculateInterval(
		visibleRange.max - visibleRange.min,
		getTimeMinimumTickInterval(visibleRange, context),
		0.01
	);
};

/** Selects axis label detail from the actual tick interval. */
const selectScaleIndex = (
	visibleRange: Range,
	context: TimeContext
): number => {
	if (visibleRange.max <= visibleRange.min) return 0;

	const interval = computeRelativeTickInterval(visibleRange, context);
	const scaleIndex = AXIS_SCALES.findIndex(
		scale => interval >= scale.sizeInNs / NS_PER_SECOND
	);

	return scaleIndex === -1 ? AXIS_SCALES.length - 1 : scaleIndex;
};

/** Formats seconds as relative time with zoom-dependent axis detail. */
export class RelativeTimeMode implements TimeModeInfo {
	/** Formats one tick, promoting a zero selected component to a larger unit. */
	formatAxisLabels(
		value: number,
		visibleRange: Range,
		context: TimeContext
	): string {
		let scaleIndex = selectScaleIndex(visibleRange, context);
		if (AXIS_SCALES[scaleIndex].unit === 's') {
			return `${value.toFixed(1).replace(/\.?0+$/, '')}s`;
		}

		const parts = normalizeTimeParts(
			splitSeconds(value),
			computeRelativeTickInterval(visibleRange, context),
			value
		);
		const components = [
			parts.seconds,
			...decomposeAxisValue(parts.nanoseconds, UNIT_SIZES.slice(1))
		];
		// Promotion depends on the selected component, even if finer digits exist.
		while (scaleIndex > 0 && components[scaleIndex] === 0) {
			scaleIndex -= 1;
		}

		return `${components[scaleIndex]}${AXIS_SCALES[scaleIndex].label}`;
	}

	/**
	 * Floors the visible left edge before formatting the reference through the
	 * next larger unit. Preserve required zeros such as 0s and 1s 0ms 0µs.
	 */
	formatReferenceLabel(
		leftValue: number,
		visibleRange: Range,
		context: TimeContext
	): string {
		const scaleIndex = selectScaleIndex(visibleRange, context);
		const {unit} = AXIS_SCALES[scaleIndex];

		const wholeSeconds = Math.floor(leftValue);
		const [s, ms, us] = [
			wholeSeconds,
			...decomposeAxisValue(
				Math.floor((leftValue - wholeSeconds) * NS_PER_SECOND),
				UNIT_SIZES.slice(1)
			)
		];

		if (unit === 's') return `${s}s`;

		if (unit === 'ms') return `${s}s`;

		const referenceScale = AXIS_SCALES[scaleIndex - 1];
		if (leftValue < referenceScale.sizeInNs / NS_PER_SECOND)
			return '';

		const parts: string[] = [];

		if (s > 0) parts.push(`${s}s`);
		if (unit === 'us' || s > 0 || ms > 0) parts.push(`${ms}ms`);
		if (unit === 'ns') parts.push(`${us}µs`);

		return parts.join(' ');
	}

	/** Formats exact prepared parts or an original timestamp at full supported precision. */
	formatTimestampLabel(
		value: number | PreparedMeasurementValue,
		context: TimeContext,
		rawTicks?: number
	): string {
		const timestamp = typeof value === 'number' ? value : value.value;

		if (!Number.isFinite(timestamp)) return '';

		return formatElapsedTime(
			resolveElapsedParts(value, context, rawTicks)
		);
	}

	/** Chooses decimal elapsed-second spacing for ECharts. */
	computeTickInterval(
		visibleRange: Range,
		context: TimeContext
	): number {
		return computeRelativeTickInterval(visibleRange, context);
	}

	/** Prepares a background position using the visible interval and retains exact elapsed parts. */
	prepareMeasurementValue(
		value: number,
		visibleRange: Range,
		context: TimeContext
	): PreparedMeasurementValue {
		if (!Number.isFinite(value)) return {value: Number.NaN};

		const resolution = getMeasurementResolution(
			computeRelativeTickInterval(visibleRange, context),
			value
		);

		const parts = normalizeTimeParts(
			splitSeconds(Math.max(0, value)),
			resolution,
			value
		);

		const preparedParts: TimeParts =
			resolution >= 1
				? {
						seconds: splitValueAtScale(parts.seconds, resolution)
							.blockStart,
						nanoseconds: 0
					}
				: {
						seconds: parts.seconds,
						nanoseconds: splitValueAtScale(
							parts.nanoseconds,
							Math.round(resolution * NS_PER_SECOND)
						).blockStart
					};

		return {
			value:
				preparedParts.seconds +
				preparedParts.nanoseconds / NS_PER_SECOND,
			parts: preparedParts
		};
	}

	/** Formats the signed difference, retaining exact prepared endpoint fractions. */
	formatTimeDiff(
		start: number | PreparedMeasurementValue,
		end: number | PreparedMeasurementValue,
		context: TimeContext,
		startTicks?: number,
		endTicks?: number
	): string {
		const startParts = resolveElapsedParts(
			start,
			context,
			startTicks
		);
		const endParts = resolveElapsedParts(end, context, endTicks);

		return formatDuration(
			endParts.seconds - startParts.seconds,
			endParts.nanoseconds - startParts.nanoseconds
		);
	}
}
