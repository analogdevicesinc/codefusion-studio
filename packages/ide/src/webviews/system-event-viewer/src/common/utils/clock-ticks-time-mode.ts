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

import {calculateInterval, splitValueAtScale} from './axis-scale';
import type {TimeModeInfo} from './time-mode-formatters';
import type {
	PreparedMeasurementValue,
	Range
} from '../types/timeline';
import type {TimeContext} from '../types/events';

/** Removes conversion noise at integers without rounding fractional positions. */
const normalizeTickBoundary = (value: number): number => {
	const integer = Math.round(value);
	const tolerance = Math.min(
		1e-7,
		Number.EPSILON * Math.max(1, Math.abs(value)) * 4
	);
	return Math.abs(value - integer) <= tolerance ? integer : value;
};

/** Formats seconds coordinates using a document's timestamp clock. */
export class ClockTicksTimeMode implements TimeModeInfo {
	private intervalInTicks(
		visibleRange: Range,
		tickFrequency: number
	): number {
		const span = visibleRange.max - visibleRange.min;

		return calculateInterval(span * tickFrequency, 1, 1);
	}

	private blockSize(
		visibleRange: Range,
		tickFrequency: number
	): number {
		return (
			10 **
			(Math.floor(
				Math.log10(this.intervalInTicks(visibleRange, tickFrequency))
			) +
				2)
		);
	}

	/** Displays full counts at block boundaries and offsets within each block. */
	formatAxisLabels(
		value: number,
		visibleRange: Range,
		{tickFrequency}: TimeContext
	): string {
		if (!Number.isFinite(value)) return '';

		const ticks = Math.round(value * tickFrequency);
		const {blockStart, remainder} = splitValueAtScale(
			ticks,
			this.blockSize(visibleRange, tickFrequency)
		);

		let label = '';

		if (remainder === 0) {
			label = String(ticks);
		} else if (blockStart === 0) {
			label = String(remainder);
		} else {
			label = `+${remainder}`;
		}

		return label;
	}

	/** Formats the block containing the visible left edge, preserving fractions. */
	formatReferenceLabel(
		value: number,
		visibleRange: Range,
		{tickFrequency}: TimeContext
	): string {
		if (!Number.isFinite(value)) return '';

		const ticks = normalizeTickBoundary(value * tickFrequency);
		const reference = splitValueAtScale(
			ticks,
			this.blockSize(visibleRange, tickFrequency)
		).blockStart;

		return reference > 0 ? String(reference) : '';
	}

	/** Formats an original event count, or rounds a seconds coordinate to ticks. */
	formatTimestampLabel(
		value: number | PreparedMeasurementValue,
		{tickFrequency}: TimeContext,
		rawTicks?: number
	): string {
		const timestamp = typeof value === 'number' ? value : value.value;

		return `${rawTicks ?? Math.round(timestamp * tickFrequency)}`;
	}

	/** Chooses whole-count spacing, expressed in elapsed seconds for ECharts. */
	computeTickInterval(
		visibleRange: Range,
		{tickFrequency}: TimeContext
	): number {
		return Number.isFinite(tickFrequency) && tickFrequency > 0
			? this.intervalInTicks(visibleRange, tickFrequency) /
					tickFrequency
			: 1;
	}

	/** Rounds a background position to the nearest tick and returns seconds. */
	prepareMeasurementValue(
		value: number,
		_visibleRange: Range,
		{tickFrequency}: TimeContext
	): PreparedMeasurementValue {
		return {
			value: Math.round(value * tickFrequency) / tickFrequency
		};
	}

	/** Subtracts the same endpoint counts used by timestamp labels. */
	formatTimeDiff(
		start: number | PreparedMeasurementValue,
		end: number | PreparedMeasurementValue,
		{tickFrequency}: TimeContext,
		startTicks?: number,
		endTicks?: number
	): string {
		const startValue =
			typeof start === 'number' ? start : start.value;
		const endValue = typeof end === 'number' ? end : end.value;
		const first =
			startTicks ?? Math.round(startValue * tickFrequency);
		const last = endTicks ?? Math.round(endValue * tickFrequency);

		return `${last - first}`;
	}
}
