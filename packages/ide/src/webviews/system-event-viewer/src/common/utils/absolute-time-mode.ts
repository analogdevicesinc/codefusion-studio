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
	calculateInterval,
	decomposeAxisValue,
	splitValueAtScale
} from './axis-scale';
import {
	AXIS_SCALES,
	formatDuration,
	getMeasurementResolution,
	normalizeParts,
	normalizeTimeParts,
	NS_PER_SECOND,
	resolveElapsedParts,
	UNIT_SIZES
} from './absolute-relative-shared-utils';
import {getTimeMinimumTickInterval} from './time-axis-utils';
import {getAbsoluteTimeContext} from './time-context';
import type {TimeModeInfo} from './time-mode-formatters';
import type {
	PreparedMeasurementValue,
	Range,
	TimeParts
} from '../types/timeline';
import type {TimeContext} from '../types/events';

const DAY_SECONDS = 86400;
const SECOND_STEPS = [1, 2, 5, 10, 15, 20, 30];
const FIXED_INTERVALS = [
	...SECOND_STEPS,
	...SECOND_STEPS.map(step => step * 60),
	...[1, 2, 3, 4, 6, 12].map(step => step * 3600),
	...[1, 2, 7, 14].map(step => step * DAY_SECONDS)
];
const UNIT_LABELS = AXIS_SCALES.slice(1).map(scale => scale.label);

const selectInterval = (
	range: Range,
	context: TimeContext
): number => {
	const desired = Math.max(0, range.max - range.min) / 5;
	const minimum = getTimeMinimumTickInterval(range, context);

	if (!Number.isFinite(desired) || desired < 1) {
		return calculateInterval(range.max - range.min, minimum, 0.01);
	}

	const dayMagnitude =
		10 **
		Math.max(
			1,
			Math.floor(Math.log10(Math.max(desired, minimum) / DAY_SECONDS))
		);

	const longIntervals = [1, 2, 5, 10]
		.map(step => step * dayMagnitude * DAY_SECONDS)
		.filter(value => value >= 20 * DAY_SECONDS);

	return [...FIXED_INTERVALS, ...longIntervals]
		.filter(value => value >= minimum)
		.reduce((selected, value) =>
			Math.abs(value - desired) <= Math.abs(selected - desired)
				? value
				: selected
		);
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** Uses Date only for whole-second local calendar fields. */
const formatLocalDateTime = (instant: TimeParts) => {
	const date = new Date(instant.seconds * 1000);
	const time = [date.getHours(), date.getMinutes(), date.getSeconds()]
		.map(pad)
		.join(':');

	const day = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).padStart(4, '0')}`;

	return {time, timestamp: `${day} ${time}`};
};

/** Floors one background instant to a local boundary; never generates calendar ticks. */
const floorLocalBackground = (
	seconds: number,
	resolution: number
): number => {
	if (resolution < 60) {
		return Math.floor(seconds / resolution) * resolution;
	}

	const date = new Date(seconds * 1000);
	date.setSeconds(0, 0);

	if (resolution >= 3600) date.setMinutes(0);
	if (resolution >= DAY_SECONDS) date.setHours(0);

	return date.getTime() / 1000;
};

/** Formats elapsed seconds as local calendar time while retaining fractional nanoseconds. */
export class AbsoluteTimeMode implements TimeModeInfo {
	private instant(
		value: number | PreparedMeasurementValue,
		context: TimeContext,
		rawTicks?: number,
		roundFraction = Math.round
	): TimeParts | undefined {
		const epoch = getAbsoluteTimeContext(context.tickEpoch)?.epoch;

		if (!epoch) return undefined;

		const elapsed = resolveElapsedParts(
			value,
			context,
			rawTicks,
			roundFraction
		);

		return normalizeParts(
			epoch.seconds + elapsed.seconds,
			epoch.nanoseconds + elapsed.nanoseconds
		);
	}

	private scaleIndex(range: Range, context: TimeContext): number {
		if (range.max <= range.min) return 0;
		const interval = this.computeTickInterval(range, context);

		return AXIS_SCALES.findIndex(
			scale => interval >= scale.sizeInNs / NS_PER_SECOND
		);
	}

	/** Selects a fixed elapsed interval; ECharts generates its multiples in header coordinates. */
	computeTickInterval(range: Range, context: TimeContext): number {
		return selectInterval(range, context);
	}

	/** Promotes fractional boundaries and includes dates for midnight and long views. */
	formatAxisLabels(
		value: number,
		range: Range,
		context: TimeContext
	): string {
		if (!Number.isFinite(value)) return '';

		const original = this.instant(value, context);
		if (!original) return '';

		const instant = normalizeTimeParts(
			original,
			this.computeTickInterval(range, context),
			value
		);

		const labels = formatLocalDateTime(instant);
		if (
			range.max - range.min >= DAY_SECONDS ||
			(labels.time === '00:00:00' && instant.nanoseconds === 0)
		) {
			return labels.timestamp;
		}

		const components = decomposeAxisValue(
			instant.nanoseconds,
			UNIT_SIZES
		);

		let index = this.scaleIndex(range, context);
		while (index > 0 && components[index] === 0) index -= 1;

		return index === 0
			? labels.time
			: `${components[index]}${UNIT_LABELS[index - 1]}`;
	}

	/** Floors the visible reference while keeping the enclosing fractional units and required zeros. */
	formatReferenceLabel(
		value: number,
		range: Range,
		context: TimeContext
	): string {
		if (!Number.isFinite(value)) return '';

		const instant = this.instant(
			value,
			context,
			undefined,
			Math.floor
		);
		if (!instant) return '';

		const interval = this.computeTickInterval(range, context);
		const date = new Date(instant.seconds * 1000);
		const day = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).padStart(4, '0')}`;

		if (interval >= DAY_SECONDS) return day;

		if (interval >= 1) {
			const hours =
				interval >= 3600
					? Math.floor(date.getHours() / (interval / 3600)) *
						(interval / 3600)
					: date.getHours();
			const minutes =
				interval < 3600
					? Math.floor(date.getMinutes() / (interval / 60)) *
						(interval / 60)
					: 0;
			const seconds =
				interval < 60
					? Math.floor(date.getSeconds() / interval) * interval
					: 0;

			return `${day} ${[hours, minutes, seconds].map(pad).join(':')}`;
		}

		const count = Math.max(0, this.scaleIndex(range, context) - 1);
		const reference = splitValueAtScale(
			instant.nanoseconds,
			UNIT_SIZES[count]
		).blockStart;
		const components = decomposeAxisValue(
			reference,
			UNIT_SIZES.slice(1)
		).slice(0, count);

		return [
			formatLocalDateTime(instant).timestamp,
			...components.map(
				(part, index) => `${part}${UNIT_LABELS[index]}`
			)
		].join(' ');
	}

	/** Formats original counts or exact prepared parts without passing fractions through Date. */
	formatTimestampLabel(
		value: number | PreparedMeasurementValue,
		context: TimeContext,
		rawTicks?: number
	): string {
		if (
			!Number.isFinite(
				typeof value === 'number' ? value : value.value
			)
		) {
			return '';
		}

		const instant = this.instant(value, context, rawTicks);
		if (!instant) return '';

		const components = decomposeAxisValue(
			instant.nanoseconds,
			UNIT_SIZES.slice(1)
		);

		while (
			components.length &&
			components[components.length - 1] === 0
		) {
			components.pop();
		}

		return [
			formatLocalDateTime(instant).timestamp,
			...components.map(
				(part, index) => `${part}${UNIT_LABELS[index]}`
			)
		].join(' ');
	}

	/** Quantizes the wall-clock background and stores its elapsed equivalent with exact parts. */
	prepareMeasurementValue(
		value: number,
		range: Range,
		context: TimeContext
	): PreparedMeasurementValue {
		const epoch = getAbsoluteTimeContext(context.tickEpoch)?.epoch;
		const original = Number.isFinite(value)
			? this.instant(value, context)
			: undefined;

		if (!epoch || !original) return {value};

		const resolution = getMeasurementResolution(
			this.computeTickInterval(range, context),
			value
		);
		const instant = normalizeTimeParts(original, resolution, value);
		const seconds =
			resolution >= 1
				? floorLocalBackground(instant.seconds, resolution)
				: instant.seconds;
		const nanoseconds =
			resolution >= 1
				? 0
				: splitValueAtScale(
						instant.nanoseconds,
						Math.round(resolution * NS_PER_SECOND)
					).blockStart;

		let parts = normalizeParts(
			seconds - epoch.seconds,
			nanoseconds - epoch.nanoseconds
		);
		if (parts.seconds < 0) parts = {seconds: 0, nanoseconds: 0};

		return {
			value: parts.seconds + parts.nanoseconds / NS_PER_SECOND,
			parts
		};
	}

	/** Subtracts precise elapsed endpoints; the epoch and timezone do not affect duration. */
	formatTimeDiff(
		start: number | PreparedMeasurementValue,
		end: number | PreparedMeasurementValue,
		context: TimeContext,
		startTicks?: number,
		endTicks?: number
	): string {
		if (!getAbsoluteTimeContext(context.tickEpoch)) return '';

		const first = resolveElapsedParts(start, context, startTicks);
		const last = resolveElapsedParts(end, context, endTicks);

		return formatDuration(
			last.seconds - first.seconds,
			last.nanoseconds - first.nanoseconds
		);
	}
}
