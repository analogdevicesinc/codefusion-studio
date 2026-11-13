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
	decomposeAxisValue,
	getRoundingTolerance,
	normalizeBoundary,
	roundUpInterval
} from './axis-scale';
import type {
	PreparedMeasurementValue,
	TimeParts
} from '../types/timeline';
import type {TimeContext} from '../types/events';

/** Number of nanoseconds in one second, shared by both time displays. */
export const NS_PER_SECOND = 1e9;

type RelativeAxisScale = Readonly<{
	unit: 's' | 'ms' | 'us' | 'ns';
	label: string;
	sizeInNs: number;
}>;

// Ordered largest to smallest: the preceding scale supplies the reference block.
export const AXIS_SCALES: readonly RelativeAxisScale[] = [
	{
		unit: 's',
		label: 's',
		sizeInNs: 1e9
	},
	{
		unit: 'ms',
		label: 'ms',
		sizeInNs: 1e6
	},
	{
		unit: 'us',
		label: 'µs',
		sizeInNs: 1e3
	},
	{
		unit: 'ns',
		label: 'ns',
		sizeInNs: 1
	}
];

/** Sizes of seconds, milliseconds, microseconds and nanoseconds, in nanoseconds. */
export const UNIT_SIZES = AXIS_SCALES.map(scale => scale.sizeInNs);

/** Splits seconds without multiplying the whole coordinate by a billion. */
export const splitSeconds = (value: number): TimeParts => {
	const wholeSeconds = Math.floor(value);
	const nanoseconds = Math.round(
		(value - wholeSeconds) * NS_PER_SECOND
	);
	const carrySeconds = Math.floor(nanoseconds / NS_PER_SECOND);

	return {
		seconds: wholeSeconds + carrySeconds,
		nanoseconds: nanoseconds - carrySeconds * NS_PER_SECOND
	};
};

/** Normalizes fractional carry without combining whole seconds with nanoseconds. */
export const normalizeParts = (
	seconds: number,
	nanoseconds: number
): TimeParts => {
	const carry = Math.floor(nanoseconds / NS_PER_SECOND);
	return {
		seconds: seconds + carry,
		nanoseconds: nanoseconds - carry * NS_PER_SECOND
	};
};

/** Resolves original counts or stored measurement parts before falling back to numeric seconds. */
export const resolveElapsedParts = (
	value: number | PreparedMeasurementValue,
	context: TimeContext,
	rawTicks?: number,
	roundFraction = Math.round
): TimeParts => {
	const frequency = context.tickFrequency;
	if (
		rawTicks !== undefined &&
		Number.isSafeInteger(rawTicks) &&
		Number.isSafeInteger(frequency) &&
		frequency > 0
	) {
		const seconds = Math.floor(rawTicks / frequency);

		return normalizeParts(
			seconds,
			roundFraction(
				((rawTicks - seconds * frequency) / frequency) * NS_PER_SECOND
			)
		);
	}

	if (typeof value !== 'number' && value.parts) return value.parts;

	const numeric = typeof value === 'number' ? value : value.value;
	const seconds = Math.floor(numeric);
	const fraction = (numeric - seconds) * NS_PER_SECOND;
	// Repair arithmetic noise before a reference is floored to its enclosing unit.
	const nearest = Math.round(fraction);
	const tolerance = Math.min(
		0.25,
		getRoundingTolerance(numeric * NS_PER_SECOND)
	);

	return normalizeParts(
		seconds,
		roundFraction(
			Math.abs(fraction - nearest) <= tolerance ? nearest : fraction
		)
	);
};

const formatComponents = (
	components: readonly number[],
	labels: readonly string[]
): string => {
	const firstNonZero = components.findIndex(value => value !== 0);
	if (firstNonZero === -1) return '0ns';

	let lastNonZero = components.length - 1;
	while (components[lastNonZero] === 0) lastNonZero -= 1;

	return components
		.slice(firstNonZero, lastNonZero + 1)
		.map((value, index) => `${value}${labels[firstNonZero + index]}`)
		.join(' ');
};

/** Formats a nonnegative elapsed timestamp while keeping total seconds intact. */
export const formatElapsedTime = ({
	seconds,
	nanoseconds
}: TimeParts): string =>
	formatComponents(
		[
			seconds,
			...decomposeAxisValue(nanoseconds, UNIT_SIZES.slice(1))
		],
		AXIS_SCALES.map(scale => scale.label)
	);

/** Formats signed elapsed time up to days, independently of calendar dates. */
export const formatDuration = (
	seconds: number,
	nanoseconds = 0
): string => {
	if (!Number.isFinite(seconds) || !Number.isFinite(nanoseconds)) {
		return '';
	}

	const parts = splitSeconds(seconds);
	const fraction = parts.nanoseconds + nanoseconds;
	const carrySeconds = Math.floor(fraction / NS_PER_SECOND);

	let wholeSeconds = parts.seconds + carrySeconds;
	let fractionNs = fraction - carrySeconds * NS_PER_SECOND;

	const isNegative = wholeSeconds < 0;

	if (isNegative) {
		wholeSeconds = -wholeSeconds;

		if (fractionNs !== 0) {
			wholeSeconds -= 1;
			fractionNs = NS_PER_SECOND - fractionNs;
		}
	}

	const label = formatComponents(
		[
			...decomposeAxisValue(wholeSeconds, [86400, 3600, 60, 1]),
			...decomposeAxisValue(fractionNs, UNIT_SIZES.slice(1))
		],
		['d', 'h', 'm', ...AXIS_SCALES.map(scale => scale.label)]
	);

	return `${isNegative ? '-' : ''}${label}`;
};

// Long-range backgrounds use days once the tick interval reaches 30 elapsed days.
const MEASUREMENT_SCALES = [
	{interval: 30 * 86400, resolution: 86400},
	{interval: 86400, resolution: 3600},
	{interval: 3600, resolution: 60},
	{interval: 60, resolution: 1},
	{interval: 1, resolution: 1e-3},
	{interval: 1e-3, resolution: 1e-6}
];

/** Chooses background precision from the selected tick interval and numeric accuracy. */
export const getMeasurementResolution = (
	tickInterval: number,
	coordinateMagnitude: number
): number => {
	const resolution =
		MEASUREMENT_SCALES.find(scale => tickInterval >= scale.interval)
			?.resolution ?? 1e-9;

	return Math.max(
		resolution,
		roundUpInterval(
			Math.max(1e-9, getRoundingTolerance(coordinateMagnitude) * 4)
		)
	);
};

/** Removes conversion noise only near a known tick or preparation grid. */
export const normalizeTimeParts = (
	parts: TimeParts,
	resolution: number,
	coordinateMagnitude: number
): TimeParts => {
	const nanoseconds = Math.round(
		normalizeBoundary(
			parts.nanoseconds,
			Math.min(1, resolution) * NS_PER_SECOND,
			coordinateMagnitude * NS_PER_SECOND
		)
	);

	const carrySeconds = Math.floor(nanoseconds / NS_PER_SECOND);

	return {
		seconds: parts.seconds + carrySeconds,
		nanoseconds: nanoseconds - carrySeconds * NS_PER_SECOND
	};
};
